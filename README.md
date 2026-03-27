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
vixen guess <files...>            # guess canonical filename
vixen guess -s tushy <files...>   # override site detection
```

### Global options

| Flag | Description |
|------|-------------|
| `-d, --data <dir>` | Data directory (default: `$XDG_DATA_HOME/vixen`) |
| `-v, --verbose` | Enable debug output |
| `-q, --quiet` | Suppress info messages |
| `-n, --no-push` | Skip git push after commit (useful without write access) |
| `-r, --repo <url>` | Metadata repo URL (default: [`libredmm/vixen_metadata`](https://github.com/libredmm/vixen_metadata)) |

## Deploy

Build a standalone binary and deploy to a remote Linux host:

```bash
just deploy-linux <host>                 # deploys to ~/.local/bin/ by default
just deploy-linux <host> /usr/local/bin  # custom remote path
```

The compiled binary includes `checkout` and `guess` commands. `scrape` requires a full Bun environment with puppeteer.

## Dev

```bash
just check    # tsc + biome
just fix      # biome auto-fix
```
