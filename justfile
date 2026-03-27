install:
    bun install
    bun link

check:
    bunx tsc
    bunx biome check

fix:
    bunx biome check --fix

# Bump version, tag, and push to trigger release workflow
release level="patch":
    npm version {{level}}
    git push origin main --tags

# Build standalone binary and deploy to remote Linux host
deploy-linux host path="~/.local/bin":
    bun build src/cli.ts --compile --target=bun-linux-x64 --packages=bundle --outfile=dist/vixen
    scp -O dist/vixen {{host}}:{{path}}/
