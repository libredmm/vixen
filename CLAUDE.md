# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Bun/TypeScript CLI that scrapes video metadata from vixen network sites. Replaces a zsh script that shelled out to `purl` (Puppeteer CLI), `htmlq`, and `jq` — now all logic is in-process.

## Running

```bash
just install                  # install deps + link global binary
vixen checkout                # clone or update metadata repo
vixen scrape [sites...]       # checkout, scrape, compress, commit, push
vixen canonical <files...>    # build canonical filename
```

Default data directory: `$XDG_DATA_HOME/vixen` (override with `--data`). Default metadata repo: `libredmm/vixen_metadata` (override with `--repo`).

Global flags: `-v`/`--verbose`, `-q`/`--quiet`, `-n`/`--no-push` (skip git push), `-r`/`--repo` (metadata repo URL). Deploy to Linux: `just deploy-linux <host>`.

## Dev

- `just check` — tsc + biome
- `just fix` — biome auto-fix
- Biome uses tabs, double quotes, recommended rules

## Architecture

- **cli.ts** — Entry point, Commander subcommands (`checkout`, `scrape`, `canonical`). Scrape auto-checkouts first
- **browser.ts** — Puppeteer-extra with StealthPlugin (absorbed from `purl` project). Single browser instance shared across all sites. `fetchPage()` creates a tab, sets cookies, navigates with `networkidle0`, returns HTML
- **scrape.ts** — Per-site scrape + `runScrape` orchestrator. Lazy-loaded to keep puppeteer out of compiled binary
- **canonical.ts** — Looks up video in `.json` by date or 6-digit ID, builds canonical filename
- **ctx.ts** — `SITES` predefined list + auto-discovers additional sites from `*.json` files in output dir
- **log.ts** — Consola logger with verbosity levels (`-v` for debug, `-q` for warn-only)

Sites are scraped in parallel (`Promise.all`), pages within a site are sequential (need dedup to decide when to stop).

## Gotchas

- Target sites use Next.js — video data lives in `#__NEXT_DATA__` script tag at `.props.pageProps.edges`
- Each entry is `{ node: { videoId, ... }, cursor }` — videoId is the dedup key
- Bun shebang must be `#!/usr/bin/env -S bun run`, not `#!/usr/bin/env bun`
- `vixen scrape` commits and pushes to the **data** repo (libredmm/vixen_metadata), not this CLI repo
