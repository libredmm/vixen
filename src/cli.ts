#!/usr/bin/env -S bun run

import { existsSync } from "node:fs";
import { $ } from "bun";
import { Command, Option } from "commander";
import pkg from "../package.json";
import { canonicalFilename } from "./canonical.ts";
import { createCtx } from "./ctx.ts";
import { logger, setLevel } from "./log.ts";

const program = new Command();

program
	.name("vixen")
	.version(pkg.version)
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
		`${process.env.XDG_DATA_HOME ?? `${process.env.HOME}/.local/share`}/vixen`,
	)
	.option(
		"-r, --repo <url>",
		"Metadata repo URL",
		"git@github.com:libredmm/vixen_metadata.git",
	)
	.hook("preAction", (thisCommand) => {
		const opts = thisCommand.optsWithGlobals<{
			verbose?: boolean;
			quiet?: boolean;
		}>();
		setLevel(opts);
	});

program
	.command("scrape")
	.description("Scrape video metadata, compress, commit, and push")
	.argument("[sites...]", "Sites to scrape")
	.option("-f, --full", "Scrape all pages without stopping on duplicates")
	.option("-n, --no-push", "Skip git push after commit")
	.action(
		async (
			sites: string[],
			options: { full?: boolean; push: boolean },
			command: Command,
		) => {
			const { data: dataDir, repo } = command.optsWithGlobals<{
				data: string;
				repo: string;
			}>();
			if (!dataDir) {
				program.error("--data is required");
			}
			await checkout(dataDir, repo);
			// Variable prevents Bun from resolving this at bundle time,
			// keeping puppeteer out of the compiled binary
			const mod = "./scrape.ts";
			const { runScrape } = await import(mod);
			const ctx = await createCtx(dataDir);
			await runScrape(ctx, options.push, sites, options.full);
		},
	);

async function checkout(dataDir: string, repo: string) {
	if (existsSync(dataDir)) {
		await $`git -C ${dataDir} pull --rebase`.quiet();
	} else {
		await $`git clone ${repo} ${dataDir}`.quiet();
	}
	const lastUpdated = await $`git -C ${dataDir} log -1 --format=%cd`.text();
	logger.info(`Last updated at: ${lastUpdated.trim()}`);
}

program
	.command("checkout")
	.description("Clone or update the vixen metadata repo")
	.action(async (_options: object, command: Command) => {
		const { data: dataDir, repo } = command.optsWithGlobals<{
			data: string;
			repo: string;
		}>();
		if (!dataDir) {
			program.error("--data is required");
		}
		await checkout(dataDir, repo);
	});

program
	.command("canonical")
	.description("Build the canonical filename for a video file")
	.argument("<files...>", "Video files to guess names for")
	.option("-s, --site <site>", "Override site detection")
	.action(
		async (files: string[], options: { site?: string }, command: Command) => {
			const { data: dataDir } = command.optsWithGlobals<{ data: string }>();
			if (!dataDir) {
				program.error("--data is required");
			}
			const ctx = await createCtx(dataDir);
			let failed = false;
			for (const file of files) {
				const name = await canonicalFilename(ctx, file, options.site);
				if (name) {
					console.log(name);
				} else {
					failed = true;
				}
			}
			if (failed) {
				process.exit(1);
			}
		},
	);

program.parse();
