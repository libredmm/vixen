import { readdir } from "node:fs/promises";

export const SITES = [
	"blacked",
	"blackedraw",
	"deeper",
	"milfy",
	"slayed",
	"tushy",
	"tushyraw",
	"vixen",
	"wifey",
];

// How each network site brands itself; unknown sites fall back to uppercase
const SITE_NAMES: Record<string, string> = {
	blackedraw: "BLACKED RAW",
	tushyraw: "TUSHY RAW",
};

export function siteName(site: string): string {
	return SITE_NAMES[site] ?? site.toUpperCase();
}

export interface Ctx {
	dir: string;
	sites: string[];
	siteTag: (site: string) => string;
}

export async function createCtx(dir: string): Promise<Ctx> {
	const entries = await readdir(dir);
	const discovered = entries
		.filter((f) => f.endsWith(".json"))
		.map((f) => f.replace(/\.json$/, ""));
	const sites = [...new Set([...SITES, ...discovered])];
	const maxLen = Math.max(...sites.map((s) => s.length), 0);
	return {
		dir,
		sites,
		siteTag: (site) => `[${site.padEnd(maxLen)}]`,
	};
}
