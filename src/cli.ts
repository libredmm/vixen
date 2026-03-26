#!/usr/bin/env -S bun run

import { existsSync } from "node:fs";
import { $ } from "bun";
import { Command, Option } from "commander";
import { createBrowser } from "./browser.ts";
import { compressSite } from "./compress.ts";
import { logger, setLevel } from "./log.ts";
import { scrapeSite } from "./scraper.ts";
import { discoverSites } from "./sites.ts";

const program = new Command();

program
	.name("vixen")
	.description("CLI for vixen video metadata")
	.addOption(
		new Option("-v, --verbose", "Enable verbose output").conflicts("quiet"),
	)
	.addOption(
		new Option("-q, --quiet", "Suppress info messages").conflicts("verbose"),
	)
	.option(
		"-d, --data <dir>",
		"Data directory",
		process.env.VIXEN_DATA_DIR ??
			`${process.env.XDG_DATA_HOME ?? `${process.env.HOME}/.local/share`}/vixen`,
	)
	.option("-n, --no-push", "Skip git push after commit")
	.hook("preAction", (thisCommand) => {
		const opts = thisCommand.optsWithGlobals<{
			verbose?: boolean;
			quiet?: boolean;
		}>();
		setLevel(opts);
	})
	.action(async () => {
		await program.parseAsync(["checkout"], { from: "user" });
		await program.parseAsync(["scrape"], { from: "user" });
	});

program
	.command("scrape")
	.description("Scrape video metadata, compress, commit, and push")
	.argument("[sites...]", "Sites to scrape")
	.action(async (sites: string[], _options: object, command: Command) => {
		const { data: dataDir, push } = command.optsWithGlobals<{
			data: string;
			push: boolean;
		}>();
		if (!dataDir) {
			program.error("--data or VIXEN_DATA_DIR is required");
		}

		if (sites.length === 0) {
			sites = await discoverSites(dataDir);
			logger.info(`No site specified, scraping all sites: ${sites.join(", ")}`);
		}

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
	});

const REPO = "git@github.com:libredmm/vixen_metadata.git";

program
	.command("checkout")
	.description("Clone or update the vixen metadata repo")
	.action(async (_options: object, command: Command) => {
		const { data: dataDir } = command.optsWithGlobals<{ data: string }>();
		if (!dataDir) {
			program.error("--data or VIXEN_DATA_DIR is required");
		}
		if (existsSync(dataDir)) {
			await $`git -C ${dataDir} pull --rebase`;
		} else {
			await $`git clone ${REPO} ${dataDir}`;
		}
		const lastUpdated = await $`git -C ${dataDir} log -1 --format=%cd`.text();
		logger.info(`Last updated at: ${lastUpdated.trim()}`);
	});

program.parse();
