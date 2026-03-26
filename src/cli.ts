#!/usr/bin/env -S bun run

import { existsSync } from "node:fs";
import { $ } from "bun";
import { Command, Option } from "commander";
import { guessFilename } from "./guess.ts";
import { logger, setLevel } from "./log.ts";

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
		await checkout(dataDir);
		// Variable prevents Bun from resolving this at bundle time,
		// keeping puppeteer out of the compiled binary
		const mod = "./scrape.ts";
		const { runScrape } = await import(mod);
		await runScrape(dataDir, push, sites);
	});

const REPO = "git@github.com:libredmm/vixen_metadata.git";

async function checkout(dataDir: string) {
	if (existsSync(dataDir)) {
		await $`git -C ${dataDir} pull --rebase`;
	} else {
		await $`git clone ${REPO} ${dataDir}`;
	}
	const lastUpdated = await $`git -C ${dataDir} log -1 --format=%cd`.text();
	logger.info(`Last updated at: ${lastUpdated.trim()}`);
}

program
	.command("checkout")
	.description("Clone or update the vixen metadata repo")
	.action(async (_options: object, command: Command) => {
		const { data: dataDir } = command.optsWithGlobals<{ data: string }>();
		if (!dataDir) {
			program.error("--data or VIXEN_DATA_DIR is required");
		}
		await checkout(dataDir);
	});

program
	.command("guess")
	.description("Guess the canonical filename for a video file")
	.argument("<files...>", "Video files to guess names for")
	.option("-s, --site <site>", "Override site detection")
	.action(
		async (files: string[], options: { site?: string }, command: Command) => {
			const { data: dataDir } = command.optsWithGlobals<{ data: string }>();
			if (!dataDir) {
				program.error("--data or VIXEN_DATA_DIR is required");
			}
			await checkout(dataDir);
			for (const file of files) {
				const name = await guessFilename(file, dataDir, options.site);
				if (name) {
					console.log(name);
				}
			}
		},
	);

program.parse();
