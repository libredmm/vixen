import { existsSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";
import { load } from "cheerio";
import type { Browser } from "puppeteer";
import { fetchPage } from "./browser.ts";
import { compressSite } from "./compress.ts";
import { logger } from "./log.ts";
import { discoverSites } from "./sites.ts";

const COOKIES = [{ name: "consent", value: "0" }];

async function scrapeSite(
	browser: Browser,
	site: string,
	outputDir: string,
): Promise<number> {
	logger.debug(`[${site}] Start scraping`);

	const siteJson = join(outputDir, `${site}.json`);
	if (!existsSync(siteJson)) {
		await Bun.write(siteJson, "[]\n");
	}

	const existing: any[] = JSON.parse(await Bun.file(siteJson).text());
	const existingIds = new Set(existing.map((e) => e.node.videoId));

	// Fetch page 1 and extract page count
	const firstPageHtml = await fetchPage(
		browser,
		`https://www.${site}.com/videos`,
		COOKIES,
	);
	const $first = load(firstPageHtml);
	const lastPageLink = $first("a[data-test-component='PaginationLast']").attr(
		"href",
	);
	const pageMatch = lastPageLink?.match(/page=(\d+)/);
	if (!pageMatch) {
		logger.error(`[${site}] Failed to get # of pages`);
		return 0;
	}
	const totalPages = Number(pageMatch[1]);

	// Scrape pages, collecting new entries
	const newEntries: any[] = [];

	for (let idx = 1; idx <= totalPages; idx++) {
		logger.debug(`[${site}] Scraping page ${idx}/${totalPages}`);

		const html =
			idx === 1
				? firstPageHtml
				: await fetchPage(
						browser,
						`https://www.${site}.com/videos?page=${idx}`,
						COOKIES,
					);

		const $ = load(html);
		const nextDataText = $("#__NEXT_DATA__").text();
		if (!nextDataText) {
			logger.error(`[${site}] No __NEXT_DATA__ on page ${idx}, skipping`);
			continue;
		}

		const nextData = JSON.parse(nextDataText);
		const edges: any[] = nextData.props.pageProps.edges;

		let dupCount = 0;
		for (const entry of edges) {
			if (existingIds.has(entry.node.videoId)) {
				dupCount++;
			} else {
				newEntries.push(entry);
				existingIds.add(entry.node.videoId);
			}
		}

		if (dupCount > 0) {
			logger.debug(
				`[${site}] Found ${dupCount} duplicate(s) on page ${idx}/${totalPages}, stopping`,
			);
			break;
		}
	}

	if (newEntries.length > 0) {
		const merged = [...newEntries, ...existing];
		await Bun.write(siteJson, `${JSON.stringify(merged, null, 2)}\n`);
		logger.success(`[${site}] Added ${newEntries.length} new video(s)`);
	} else {
		const lastDate = existing[0]?.node.releaseDate?.split("T")[0] ?? "unknown";
		logger.info(`[${site}] Already up to date (${lastDate})`);
	}

	return newEntries.length;
}

export async function runScrape(
	dataDir: string,
	push: boolean,
	sites: string[],
): Promise<void> {
	if (sites.length === 0) {
		sites = await discoverSites(dataDir);
		logger.info(`No site specified, scraping all sites: ${sites.join(", ")}`);
	}

	const { createBrowser } = await import("./browser.ts");
	const browser = await createBrowser();
	let counts: number[];
	try {
		counts = await Promise.all(
			sites.map((site) => scrapeSite(browser, site, dataDir)),
		);
	} finally {
		await browser.close();
	}

	await Promise.all(sites.map((site) => compressSite(site, dataDir)));

	// Commit and push if there are changes
	const summary = sites
		.map((site, i) => ({ site, count: counts[i] }))
		.filter(({ count }) => count > 0)
		.map(({ site, count }) => `${site} (+${count})`)
		.join(", ");

	if (!summary) {
		logger.info("Nothing changed, skipping commit");
		return;
	}

	await $`git -C ${dataDir} add .`;
	await $`git -C ${dataDir} commit -m ${`Update ${summary}`}`;
	if (push) {
		await $`git -C ${dataDir} push`;
	}
}
