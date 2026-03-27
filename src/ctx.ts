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
