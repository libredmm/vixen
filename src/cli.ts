#!/usr/bin/env -S bun run

import { Command, Option } from "commander";
import { createBrowser } from "./browser.ts";
import { compressSite } from "./compress.ts";
import { logger, setLevel } from "./log.ts";
import { scrapeSite } from "./scraper.ts";
import { discoverSites } from "./sites.ts";

const program = new Command();

program
  .name("vixen-scrape")
  .description("Scrape video metadata from vixen sites")
  .argument("[sites...]", "Sites to scrape")
  .option("-c, --compress-only", "Compress only, skip scraping")
  .addOption(new Option("-v, --verbose", "Enable verbose output").conflicts("quiet"))
  .addOption(new Option("-q, --quiet", "Suppress info messages").conflicts("verbose"))
  .option(
    "-o, --output <dir>",
    "Output directory",
    `${process.env.DOTFILES}/data/vixen`,
  )
  .parse();

const options = program.opts<{ compressOnly?: boolean; verbose?: boolean; quiet?: boolean; output: string }>();
setLevel(options);
const outputDir = options.output;

let sites = program.args;
if (sites.length === 0) {
  sites = await discoverSites(outputDir);
  logger.info(`No site specified, scraping all sites: ${sites.join(", ")}`);
}

if (!options.compressOnly) {
  const browser = await createBrowser();
  try {
    await Promise.all(
      sites.map((site) => scrapeSite(browser, site, outputDir)),
    );
  } finally {
    await browser.close();
  }
}

await Promise.all(sites.map((site) => compressSite(site, outputDir)));
