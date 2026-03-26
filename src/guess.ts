import { basename, join } from "node:path";
import { logger } from "./log.ts";

const SITES = [
	"blackedraw",
	"blacked",
	"deeper",
	"milfy",
	"slayed",
	"tushyraw",
	"tushy",
	"vixen",
	"wifey",
];

// Longer names first so "blackedraw" matches before "blacked"
const SITE_PATTERN = new RegExp(
	`\\b(${SITES.join("|").replace(/raw/g, " ?raw")})\\b`,
	"i",
);

const DATE_PATTERN = /\d+[.-]\d+[.-]\d+/;

interface VideoEntry {
	node: {
		videoId: string;
		releaseDate: string;
		modelsSlugged: { name: string }[];
	};
}

function extractSite(filename: string): string | null {
	const match = filename.match(SITE_PATTERN);
	if (!match) return null;
	return match[1].replace(/ /g, "").toLowerCase();
}

function extractDate(filename: string): string | null {
	const match = filename.match(DATE_PATTERN);
	if (!match) return null;
	const parsed = new Date(match[0]);
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

function buildFilename(site: string, entry: VideoEntry): string {
	const date = entry.node.releaseDate.slice(0, 10);
	const names = entry.node.modelsSlugged.map((m) => m.name);
	const models =
		names.length > 1
			? `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`
			: (names[0] ?? "Unknown");
	return titleCase(`${site} - ${date} - ${models}`);
}

export async function guessFilename(
	file: string,
	dataDir: string,
	site?: string,
): Promise<string | null> {
	const filename = basename(file);

	if (!site) {
		site = extractSite(filename) ?? undefined;
	}
	if (!site) {
		logger.error(`No site found in ${filename}`);
		return null;
	}

	const jsonPath = join(dataDir, `${site}.min.json`);
	const jsonFile = Bun.file(jsonPath);
	if (!(await jsonFile.exists())) {
		logger.error(`${jsonPath} does not exist`);
		return null;
	}

	const entries: VideoEntry[] = JSON.parse(await jsonFile.text());

	const date = extractDate(filename);
	let entry: VideoEntry | undefined;

	if (date) {
		entry = entries.find((e) => e.node.releaseDate.startsWith(date));
	} else {
		const id = extractId(filename);
		if (!id) {
			logger.error(`No date or ID found in ${filename}`);
			return null;
		}
		entry = entries.find((e) => e.node.videoId === id);
	}

	if (!entry) {
		logger.error(`No video found for ${filename}`);
		return null;
	}

	return buildFilename(site, entry);
}
