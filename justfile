set fallback := true

install:
    bun install
    bun link
    just install-completions

install-completions:
    mkdir -p ~/.local/share/zsh/site-functions
    ln -sf {{justfile_directory()}}/completions/_vixen ~/.local/share/zsh/site-functions/_vixen

check:
    bunx tsc
    bunx biome check

fix:
    bunx biome check --fix
