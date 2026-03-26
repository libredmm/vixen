import { readdir } from "node:fs/promises";

export interface Ctx {
	dir: string;
	sites: string[];
	siteTag: (site: string) => string;
}

export async function createCtx(dir: string): Promise<Ctx> {
	const entries = await readdir(dir);
	const sites = entries
		.filter((f) => f.endsWith(".json") && !f.endsWith(".min.json"))
		.map((f) => f.replace(/\.json$/, ""));
	const maxLen = Math.max(...sites.map((s) => s.length), 0);
	return {
		dir,
		sites,
		siteTag: (site) => `[${site.padEnd(maxLen)}]`,
	};
}
