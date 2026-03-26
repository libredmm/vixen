install:
    bun install
    bun link

check:
    bunx tsc
    bunx biome check

fix:
    bunx biome check --fix

# Build standalone binary and deploy to remote Linux host
deploy-linux host path="~/.local/bin":
    bun build src/cli.ts --compile --target=bun-linux-x64 --packages=bundle --outfile=dist/vixen
    scp -O dist/vixen {{host}}:{{path}}/
