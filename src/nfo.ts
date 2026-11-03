import { randomUUID } from "node:crypto";
import { rename, rm } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { findEntry, type VideoEntry, type VideoImage } from "./canonical.ts";
import { type Ctx, siteName } from "./ctx.ts";
import { logger } from "./log.ts";

// Plex's stock NFO agent reads a flat folder of movies by basename:
// <name>.nfo for metadata, <name>.jpg for the poster, <name>-fanart.jpg for art.

function xml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

export function renderNfo(site: string, entry: VideoEntry): string {
	const { node } = entry;
	const studio = siteName(site);
	const lines = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		"<movie>",
		`  <title>${xml(`${studio} - ${node.title}`)}</title>`,
		`  <year>${node.releaseDate.slice(0, 4)}</year>`,
		`  <premiered>${node.releaseDate.slice(0, 10)}</premiered>`,
		`  <studio>${xml(studio)}</studio>`,
		`  <set>\n    <name>${xml(studio)}</name>\n  </set>`,
		...node.modelsSlugged.map(
			(m, i) =>
				`  <actor>\n    <name>${xml(m.name)}</name>\n    <order>${i}</order>\n  </actor>`,
		),
		`  <uniqueid type="local" default="true">${xml(`${site}-${node.videoId}`)}</uniqueid>`,
		"</movie>",
	];
	return `${lines.join("\n")}\n`;
}

function imageUrl(image: VideoImage): string {
	return image.highdpi?.double || image.src;
}

// Poster: the portrait shot. Art: the widest landscape one.
export function pickImages(entry: VideoEntry): {
	poster?: string;
	fanart?: string;
} {
	const listing = entry.node.images?.listing ?? [];
	const portrait = listing.find((i) => i.height > i.width);
	const landscape = listing
		.filter((i) => i.width >= i.height)
		.sort((a, b) => b.width - a.width)[0];
	return {
		poster: portrait && imageUrl(portrait),
		fanart: landscape && imageUrl(landscape),
	};
}

const JPEG_MAGIC = [0xff, 0xd8, 0xff];

// Writes through a short hidden temp name in the same folder, then renames:
// an interrupted write never leaves a file that would block the next run, and
// the temp name never runs past the filesystem's name limit
async function writeAtomic(dest: string, data: string | Uint8Array) {
	const tmp = join(dirname(dest), `.vixen-${randomUUID().slice(0, 8)}.tmp`);
	try {
		await Bun.write(tmp, data);
		await rename(tmp, dest);
	} catch (err) {
		await rm(tmp, { force: true });
		throw err;
	}
}

// HTTP errors and non-JPEG responses are warnings, retried on the next run;
// filesystem errors throw
async function download(url: string, dest: string): Promise<boolean> {
	const res = await fetch(url);
	if (!res.ok) {
		logger.warn(`${basename(dest)}: HTTP ${res.status} for ${url}`);
		return false;
	}
	const bytes = new Uint8Array(await res.arrayBuffer());
	if (!JPEG_MAGIC.every((b, i) => bytes[i] === b)) {
		logger.warn(`${basename(dest)}: not a JPEG: ${url}`);
		return false;
	}
	await writeAtomic(dest, bytes);
	return true;
}

async function isCurrent(dest: string, content: string): Promise<boolean> {
	const file = Bun.file(dest);
	return (await file.exists()) && (await file.text()) === content;
}

// Returns false when the file couldn't be matched or a file couldn't be
// written; an image the site doesn't serve is only a warning
export async function writeNfo(
	ctx: Ctx,
	file: string,
	options: { site?: string; dryRun?: boolean } = {},
): Promise<boolean> {
	const found = await findEntry(ctx, file, options.site);
	if (!found) return false;
	const base = join(dirname(file), basename(file, extname(file)));
	const name = basename(base);

	let ok = true;
	const nfo = renderNfo(found.site, found.entry);
	if (!(await isCurrent(`${base}.nfo`, nfo))) {
		if (options.dryRun) {
			logger.info(`${name}: would write .nfo`);
		} else {
			try {
				await writeAtomic(`${base}.nfo`, nfo);
				logger.success(`${name}.nfo`);
			} catch (err) {
				logger.error(`${name}.nfo: ${err}`);
				ok = false;
			}
		}
	}

	const images = pickImages(found.entry);
	for (const [suffix, url] of [
		[".jpg", images.poster],
		["-fanart.jpg", images.fanart],
	] as const) {
		const dest = `${base}${suffix}`;
		if (!url || (await Bun.file(dest).exists())) continue;
		if (options.dryRun) {
			logger.info(`${name}: would download ${suffix}`);
		} else {
			try {
				if (await download(url, dest)) logger.success(`${name}${suffix}`);
			} catch (err) {
				logger.error(`${name}${suffix}: ${err}`);
				ok = false;
			}
		}
	}
	return ok;
}
