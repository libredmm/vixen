import { join } from "node:path";
import { logger } from "./log.ts";

export async function compressSite(
	site: string,
	outputDir: string,
): Promise<void> {
	const siteJson = join(outputDir, `${site}.json`);
	const siteMinJson = join(outputDir, `${site}.min.json`);

	const entries: any[] = JSON.parse(await Bun.file(siteJson).text());

	// Sort by videoId descending
	entries.sort((a, b) => Number(b.node.videoId) - Number(a.node.videoId));
	await Bun.write(siteJson, `${JSON.stringify(entries, null, 2)}\n`);
	logger.debug(`[${site}] JSON sorted: ${siteJson}`);

	// Generate minified version
	const minEntries = entries.map((entry) => {
		const clone = structuredClone(entry);
		delete clone.node.expertReview;
		delete clone.node.previews;
		delete clone.node.images;
		delete clone.cursor;
		return clone;
	});
	await Bun.write(siteMinJson, `${JSON.stringify(minEntries, null, 2)}\n`);
	logger.debug(`[${site}] Min JSON generated: ${siteMinJson}`);
}
