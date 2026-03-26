# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Bun/TypeScript CLI that scrapes video metadata from vixen network sites. Replaces a zsh script that shelled out to `purl` (Puppeteer CLI), `htmlq`, and `jq` — now all logic is in-process.

## Running

```bash
just install                                   # install deps + link global binary
export VIXEN_DATA_DIR=/path/to/data            # or --data; default: $XDG_DATA_HOME/vixen
vixen                                          # full pipeline: checkout → scrape → commit+push
vixen checkout                                 # clone or update metadata repo
vixen scrape [sites...]                        # scrape, compress, commit, push
```

Global flags: `-v`/`--verbose`, `-q`/`--quiet`, `-n`/`--no-push` (skip git push). Deploy to Linux: `just deploy-linux <host>`.

## Dev

- `just check` — tsc + biome
- `just fix` — biome auto-fix
- Biome uses tabs, double quotes, recommended rules

## Architecture

- **cli.ts** — Entry point, Commander subcommands (`checkout`, `scrape`), default action runs full pipeline
- **browser.ts** — Puppeteer-extra with StealthPlugin (absorbed from `purl` project). Single browser instance shared across all sites. `fetchPage()` creates a tab, sets cookies, navigates with `networkidle0`, returns HTML
- **scraper.ts** — Per-site scrape: fetches paginated video listings, extracts `#__NEXT_DATA__` JSON via cheerio, deduplicates against existing entries using a `Set<videoId>`, stops when duplicates found
- **compress.ts** — Sorts entries by `videoId` descending, generates `.min.json` (strips `expertReview`, `previews`, `images`, `cursor`)
- **sites.ts** — Auto-discovers sites from `*.json` files (excluding `*.min.json`) in output dir
- **log.ts** — Consola logger with verbosity levels (`-v` for debug, `-q` for warn-only)

Sites are scraped in parallel (`Promise.all`), pages within a site are sequential (need dedup to decide when to stop).

## Gotchas

- Target sites use Next.js — video data lives in `#__NEXT_DATA__` script tag at `.props.pageProps.edges`
- Each entry is `{ node: { videoId, ... }, cursor }` — videoId is the dedup key
- Bun shebang must be `#!/usr/bin/env -S bun run`, not `#!/usr/bin/env bun`
- `vixen scrape` commits and pushes to the **data** repo (libredmm/vixen_metadata), not this CLI repo
