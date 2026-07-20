# Changelog

## v0.0.4 - 2026-07-20

### Chores
- Remove `just release` recipe — releases are now cut via the agent `/release` skill

## v0.0.3 - 2026-07-20

### Features
- Add `--version` flag sourced from package.json
- Add predefined SITES list so all brands are available before first scrape
- Add `--full` scrape mode; move `--no-push` to the scrape subcommand
- Add zsh completion for commands, flags, and site names

### Refactoring
- Rename `guess` command to `canonical`
- Remove `.min.json` generation, read from `.json` directly

## v0.0.2 - 2026-03-26

### Features
- Add `--repo` flag to override the metadata repo; drop `VIXEN_DATA_DIR` env var

### Docs
- Update README and CLAUDE.md for the `--repo` flag and accuracy fixes

### Chores
- Add `just release` recipe
- Bump actions/checkout to v5

## v0.0.1 - 2026-03-26

Initial release.

### Features
- Bun CLI for scraping vixen network video metadata, structured as `scrape`, `checkout`, and `guess` subcommands with XDG data-dir default
- Add `guess` command to look up canonical video filenames
- Auto-checkout metadata repo before scrape/guess
- Add `-v`/`--verbose` and `-q` log verbosity with a minimal colored logger
- Add GitHub Actions workflow to build and publish release binaries

### Fixes
- `guess` exits non-zero on failure; suppress git stdout in checkout

### Refactoring
- Lazy-load scrape deps so the compiled binary excludes puppeteer
- Extract `Ctx` to hold dir/sites/siteTag; fold compress and sites into scrape and ctx

### Chores
- Add justfile with tsc, biome, and deploy-linux; check in bun.lock
