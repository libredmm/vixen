import { basename, join } from "node:path";
import type { Ctx } from "./ctx.ts";
import { logger } from "./log.ts";

const DATE_PATTERN = /\d+[.-]\d+[.-]\d+/;

interface VideoEntry {
	node: {
		videoId: string;
		releaseDate: string;
		modelsSlugged: { name: string }[];
	};
}

function extractSite(filename: string, sites: string[]): string | null {
	// Longer names first so "blackedraw" matches before "blacked"
	const sorted = [...sites].sort((a, b) => b.length - a.length);
	const pattern = new RegExp(
		`\\b(${sorted.join("|").replace(/raw/g, " ?raw")})\\b`,
		"i",
	);
	const match = filename.match(pattern);
	if (!match) return null;
	return match[1].replace(/ /g, "").toLowerCase();
}

function extractDate(filename: string): string | null {
	const match = filename.match(DATE_PATTERN);
	if (!match) return null;
	// Normalize separators to dashes and expand 2-digit years
	const parts = match[0].split(/[.-]/);
	if (parts.length !== 3) return null;
	if (parts[0].length === 2) {
		parts[0] = `20${parts[0]}`;
	}
	const parsed = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
	if (Number.isNaN(parsed.getTime())) return null;
	return parsed.toISOString().slice(0, 10);
}

function extractId(filename: string): string | null {
	const match = filename.match(/[^0-9](\d{6})[^0-9]/);
	return match?.[1] ?? null;
}

function titleCase(s: string): string {
	return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function joinModels(names: string[]): string {
	return names.length > 1
		? `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`
		: (names[0] ?? "Unknown");
}

function formatModels(entry: VideoEntry): string {
	return joinModels(entry.node.modelsSlugged.map((m) => m.name));
}

// Keep basename + ".mp4" within the 255-byte filesystem limit
const MAX_BASENAME = 251;

function buildFilename(site: string, entry: VideoEntry): string {
	const date = entry.node.releaseDate.slice(0, 10);
	let names = entry.node.modelsSlugged.map((m) => m.name);
	let models = joinModels(names);
	while (names.length > 1) {
		const name = `${titleCase(`${site} - ${date} - ${models}`)} [${entry.node.videoId}]`;
		if (Buffer.byteLength(name) <= MAX_BASENAME) return name;
		names = names.slice(0, -1);
		models = `${names.join(", ")} et al`;
	}
	return `${titleCase(`${site} - ${date} - ${models}`)} [${entry.node.videoId}]`;
}

export async function canonicalFilename(
	ctx: Ctx,
	file: string,
	site?: string,
): Promise<string | null> {
	const filename = basename(file);

	if (!site) {
		site = extractSite(filename, ctx.sites) ?? undefined;
	}
	if (!site) {
		logger.error(`No site found in ${filename}`);
		return null;
	}

	const jsonPath = join(ctx.dir, `${site}.json`);
	const jsonFile = Bun.file(jsonPath);
	if (!(await jsonFile.exists())) {
		logger.error(`${jsonPath} does not exist`);
		return null;
	}

	const entries: VideoEntry[] = JSON.parse(await jsonFile.text());

	const date = extractDate(filename);
	const id = extractId(filename);
	let entry: VideoEntry | undefined;

	if (date) {
		const candidates = entries.filter((e) =>
			e.node.releaseDate.startsWith(date),
		);
		if (candidates.length > 1) {
			entry = id ? candidates.find((e) => e.node.videoId === id) : undefined;
			if (!entry) {
				logger.error(
					`Multiple videos on ${date} for ${filename}; put the 6-digit ID in the filename to disambiguate:`,
				);
				for (const c of candidates) {
					logger.error(`  ${c.node.videoId}: ${formatModels(c)}`);
				}
				return null;
			}
		} else {
			entry = candidates[0];
		}
	} else if (id) {
		entry = entries.find((e) => e.node.videoId === id);
	} else {
		logger.error(`No date or ID found in ${filename}`);
		return null;
	}

	if (!entry) {
		logger.error(`No video found for ${filename}`);
		return null;
	}

	return buildFilename(site, entry);
}
