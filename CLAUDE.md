# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Bun/TypeScript CLI that scrapes video metadata from vixen network sites. Replaces a zsh script that shelled out to `purl` (Puppeteer CLI), `htmlq`, and `jq` — now all logic is in-process.

## Running

```bash
bun install                             # install deps (also downloads chromium)
bun run src/cli.ts [sites...]          # scrape + compress
bun run src/cli.ts --compress-only     # skip scraping, just sort + minify
bun run src/cli.ts -o /path/to/dir     # custom output dir (default: $DOTFILES/data/vixen)
```

Install as global binary: `bun link` (symlinks to `~/.bun/bin/vixen-scrape`).

## Architecture

- **cli.ts** — Entry point, Commander arg parsing, orchestrates scrape then compress
- **browser.ts** — Puppeteer-extra with StealthPlugin (absorbed from `purl` project). Single browser instance shared across all sites. `fetchPage()` creates a tab, sets cookies, navigates with `networkidle0`, returns HTML
- **scraper.ts** — Per-site scrape: fetches paginated video listings, extracts `#__NEXT_DATA__` JSON via cheerio, deduplicates against existing entries using a `Set<videoId>`, stops when duplicates found
- **compress.ts** — Sorts entries by `videoId` descending, generates `.min.json` (strips `expertReview`, `previews`, `images`, `cursor`)
- **sites.ts** — Auto-discovers sites from `*.json` files (excluding `*.min.json`) in output dir

Sites are scraped in parallel (`Promise.all`), pages within a site are sequential (need dedup to decide when to stop).

## Gotchas

- Target sites use Next.js — video data lives in `#__NEXT_DATA__` script tag at `.props.pageProps.edges`
- Each entry is `{ node: { videoId, ... }, cursor }` — videoId is the dedup key
- Bun shebang must be `#!/usr/bin/env -S bun run`, not `#!/usr/bin/env bun`
- `vixen_checkout` must be run before this CLI — it does not handle data dir setup
- Git operations (commit/push) are intentionally excluded — handled externally
