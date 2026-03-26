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
vixen scrape [sites...]           # checkout, scrape, compress, commit, push
vixen guess <files...>            # checkout, guess canonical filename
vixen guess -s tushy <files...>   # override site detection
```

### Global options

| Flag | Description |
|------|-------------|
| `-d, --data <dir>` | Data directory (default: `$VIXEN_DATA_DIR` or `$XDG_DATA_HOME/vixen`) |
| `-v, --verbose` | Enable debug output |
| `-q, --quiet` | Suppress info messages |
| `-n, --no-push` | Skip git push after commit |

## Deploy

Build a standalone binary and deploy to a remote Linux host:

```bash
just deploy-linux <host>              # deploys to ~/.local/bin/
just deploy-linux <host> /usr/local/bin
```

The compiled binary includes `checkout` and `guess` commands. `scrape` requires a full Bun environment with puppeteer.

## Dev

```bash
just check    # tsc + biome
just fix      # biome auto-fix
```
