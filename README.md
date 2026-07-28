# vixen

Bun/TypeScript CLI for scraping and managing video metadata from vixen network sites.

## Install

```bash
bun install
bun link        # symlinks to ~/.bun/bin/vixen
```

Or: `just install` to do both.

## Usage

```bash
vixen checkout                    # clone or update the metadata repo
vixen scrape [sites...]           # checkout, scrape, compress, commit, push (needs write access)
vixen canonical <files...>            # build canonical filename
vixen canonical -s tushy <files...>   # override site detection
```

### Global options

| Flag | Description |
|------|-------------|
| `-d, --data <dir>` | Data directory (default: `$XDG_DATA_HOME/vixen`) |
| `-v, --verbose` | Enable debug output |
| `-q, --quiet` | Suppress info messages |
| `-r, --repo <url>` | Metadata repo URL (default: [`libredmm/vixen_metadata`](https://github.com/libredmm/vixen_metadata)) |

### Scrape options

| Flag | Description |
|------|-------------|
| `-f, --full` | Scrape all pages without stopping on duplicates |
| `-n, --no-push` | Skip git push after commit |

## Build

Compile a standalone binary for deployment to a machine without a Bun install:

```bash
bun build ./src/cli.ts --compile --target=bun-linux-x64 \
  --packages=bundle --outfile=dist/vixen
```

`--packages=bundle` inlines the `node_modules` dependencies; without it the binary still
expects them at runtime. Swap `--target` for another [Bun target](https://bun.sh/docs/bundler/executables#supported-targets)
(`bun-linux-arm64`, `bun-darwin-arm64`, …) to cross-compile; omit it to build for the host.

Copy the result wherever it needs to run:

```bash
scp -O dist/vixen <host>:~/.local/bin/
```

The compiled binary covers `checkout` and `canonical`. `scrape` needs a full Bun
environment with puppeteer, so the binary hides it from `--help` and errors out if it is
invoked anyway.

## Dev

```bash
just check    # tsc + biome
just fix      # biome auto-fix
```
