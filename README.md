<div align="center">

# git-invader

**Turn your GitHub contribution graph into a Space Invaders battle.**

Every contribution cell becomes an alien. The ship hunts them down — column by column, lowest row first — in a looping, pure CSS/SVG animation that drops straight into any GitHub profile README.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/runtime-bun-FBF0DF?style=flat-square&logo=bun)](https://bun.sh/)
[![GitHub Action](https://img.shields.io/badge/GitHub_Action-docker-2088FF?style=flat-square&logo=github-actions&logoColor=white)](https://github.com/features/actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

---

<!-- EXAMPLE — replace USERNAME with your own -->
<picture>
  <source media="(prefers-color-scheme: dark)"
    srcset="https://raw.githubusercontent.com/USERNAME/USERNAME/output/git-invader-multi-dark.svg" />
  <source media="(prefers-color-scheme: light)"
    srcset="https://raw.githubusercontent.com/USERNAME/USERNAME/output/git-invader-multi-light.svg" />
  <img alt="git-invader preview"
    src="https://raw.githubusercontent.com/USERNAME/USERNAME/output/git-invader-multi-dark.svg" />
</picture>

</div>

---

## How it works

1. Fetches your last 52 weeks of contributions via the GitHub GraphQL API.
2. Maps each day to an alien — type and HP scale with your commit count.
3. Generates a self-contained SVG with CSS `@keyframes` animations (no JavaScript).
4. Commits all SVG variants to the `output` branch of your profile repo.
5. You embed the raw URL in your README — GitHub renders it as a live animation.

---

## Features

- **Smart targeting** — shoots the lowest-row alien first, column by column; never fires through living units
- **Dynamic HP** — alien health scales with daily commit count; high-volume days take multiple hits
- **4 alien types** — squid, crab, octopus, spider; type is determined by contribution level (1–4)
- **4 ship variants** — rocket, saucer, delta, cruiser; chosen deterministically from total commit count
- **6 color modes** — five single-accent colors plus `multi` (per-alien gradient: blue → green → yellow → red)
- **Dark + light themes** — distinct palettes for both, tuned for GitHub's native contrast
- **Pure SVG/CSS** — no JS, no external dependencies; embeds directly in any GitHub README

---

## Alien types

| Level | Commits/day | Shape   | `multi` color |
| ----- | ----------- | ------- | ------------- |
| 1     | 1–2         | Squid   | Blue          |
| 2     | 3–5         | Crab    | Green         |
| 3     | 6–9         | Octopus | Yellow        |
| 4     | 10+         | Spider  | Red           |

Level 0 (no commits) renders as empty space — the ship skips it.

---

## Color modes

| `color`  | Description                                                         |
| -------- | ------------------------------------------------------------------- |
| `green`  | Single neon green accent                                            |
| `blue`   | Single blue accent                                                  |
| `orange` | Single orange accent                                                |
| `pink`   | Single pink accent                                                  |
| `yellow` | Single yellow accent                                                |
| `multi`  | Per-alien color based on commit count — blue → green → yellow → red |

Leave `color` blank to generate all 6 variants. Leave `mode` blank to generate both `dark` and `light`.

---

## Ship variants

| `ship`    | Shape                                          |
| --------- | ---------------------------------------------- |
| `rocket`  | Narrow nose, wide base, side exhaust nozzles   |
| `saucer`  | Wide dome body, flat underbelly, dangling legs |
| `delta`   | Arrowhead hull, symmetrically swept wings      |
| `cruiser` | Wide body, twin side pods, sensor dish on top  |

Leave `ship` blank to auto-select based on `total_commits % 4` — different users get different ships with no config required.

---

## Setup

### 1. Fork or copy this repo

This repo must be **public** so your profile repo can reference it as a GitHub Action.

```
github.com/VARDHAMANPATEL23/git-invader   ← must be public
```

### 2. Add the workflow to your profile repo

Your profile repo is `github.com/USERNAME/USERNAME`.

Copy `examples/git-invader.yml` from this repo into:

```
.github/workflows/git-invader.yml
```

Full template:

```git-invader/examples/git-invader.yml#L1-50
# Copy this file to .github/workflows/git-invader.yml in your profile repo
# (the repo named the same as your GitHub username, e.g. github.com/alice/alice)
#
# Replace YOUR_USERNAME below with your actual GitHub username.
# Then go to Actions → git-invaders → Run workflow to run it the first time.

name: git-invaders

on:
    schedule:
        - cron: "0 */12 * * *" # refresh every 12 hours
    workflow_dispatch: # allow manual trigger
    push:
        branches: [main, master]

jobs:
    generate:
        runs-on: ubuntu-latest
        permissions:
            contents: write

        steps:
            - uses: actions/checkout@v4

            - name: Generate SVG
              uses: VARDHAMANPATEL23/git-invader@main
              with:
                  github_token: ${{ secrets.GITHUB_TOKEN }}
                  github_username: ${{ github.repository_owner }}
                  color: multi # green | blue | orange | pink | yellow | multi | (blank = all 6)
                  mode: dark # dark | light | (blank = both)
                  ship: rocket # rocket | saucer | delta | cruiser | (blank = auto from commit count)
                  # output_dir:    dist   # default is dist

            - name: Push to output branch
              uses: crazy-max/ghaction-github-pages@v4
              with:
                  target_branch: output
                  build_dir: dist
                  keep_history: true
              env:
                  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 3. Run it

Go to your profile repo → **Actions** → **git-invaders** → **Run workflow**.

After it finishes, SVGs are pushed to the `output` branch.

### 4. Embed in your profile README

**Single image:**

```/dev/null/example.md#L1-3
![git-invaders](https://raw.githubusercontent.com/USERNAME/USERNAME/output/git-invader-green-dark.svg)
```

**Auto dark/light switch:**

```/dev/null/picture-dark-light.html#L1-17
<picture>
  <source
    media="(prefers-color-scheme: dark)"
    srcset="https://raw.githubusercontent.com/USERNAME/USERNAME/output/git-invader-multi-dark.svg"
  />
  <source
    media="(prefers-color-scheme: light)"
    srcset="https://raw.githubusercontent.com/USERNAME/USERNAME/output/git-invader-multi-light.svg"
  />
  <img
    alt="git-invaders"
    src="https://raw.githubusercontent.com/USERNAME/USERNAME/output/git-invader-multi-dark.svg"
  />
</picture>
```

**Output URL pattern:**

```/dev/null/url-pattern.txt#L1-2
https://raw.githubusercontent.com/USERNAME/USERNAME/output/git-invader-{color}-{mode}.svg
```

---

## Action inputs

| Input             | Required | Default   | Description                                     |
| ----------------- | -------- | --------- | ----------------------------------------------- |
| `github_token`    | yes      | —         | `${{ secrets.GITHUB_TOKEN }}` is sufficient     |
| `github_username` | yes      | —         | Username whose contributions to render          |
| `color`           | no       | _(all 6)_ | `green` `blue` `orange` `pink` `yellow` `multi` |
| `mode`            | no       | _(both)_  | `dark` `light`                                  |
| `ship`            | no       | _(auto)_  | `rocket` `saucer` `delta` `cruiser`             |
| `output_dir`      | no       | `dist`    | Directory to write SVG files into               |

---

## Run locally

**With mock data** (no token needed):

```/dev/null/terminal.sh#L1-4
git clone https://github.com/VARDHAMANPATEL23/git-invader
cd git-invader
bun install
bun src/test-mock.ts
# writes all 12 SVGs (6 colors × 2 modes) to dist/
```

**With real GitHub data:**

```/dev/null/terminal.sh#L1-2
bun src/index.ts --token YOUR_GITHUB_PAT --username YOUR_USERNAME
```

**CLI flags:**

| Flag         | Description                                     |
| ------------ | ----------------------------------------------- |
| `--token`    | GitHub personal access token                    |
| `--username` | Target GitHub username                          |
| `--color`    | `green` `blue` `orange` `pink` `yellow` `multi` |
| `--mode`     | `dark` `light`                                  |
| `--ship`     | `rocket` `saucer` `delta` `cruiser`             |
| `--out`      | Output directory (default: `dist`)              |

---

## Project structure

```/dev/null/tree.txt#L1-13
git-invader/
├── src/
│   ├── index.ts                CLI + GitHub Action entry point
│   ├── test-mock.ts            Local test with generated fake data
│   ├── types.ts                Shared types (Cell, ContribData)
│   ├── api/
│   │   └── github.ts           GitHub GraphQL API client
│   └── games/
│       └── space-invaders.ts   SVG generator (4 alien + 4 ship bitmaps)
├── examples/
│   └── git-invader.yml         Workflow template to copy into your profile repo
├── action.yml                  GitHub Action definition
└── Dockerfile                  Container the action runs in
```

---

## Tech stack

| Layer     | Choice                                  |
| --------- | --------------------------------------- |
| Language  | TypeScript 5.4                          |
| Runtime   | Bun                                     |
| HTTP      | Built-in `fetch` — GitHub GraphQL API   |
| SVG       | Hand-generated template-literal strings |
| Animation | Pure CSS `@keyframes` — no JavaScript   |
| Action    | Docker container                        |

No external SVG libraries. No runtime dependencies.

---

## Constraints

- **No JS in SVG.** GitHub strips `<script>` from SVGs rendered as `<img>`. All animation is CSS `@keyframes`.
- **Self-contained.** No external font requests, no CDN `href`s. Pixel font is embedded as base64.
- **Fixed 900px width.** Matches GitHub profile README max content width; scales down on smaller screens via `width="100%"`.
- **Infinite loop.** All keyframe animations use `animation-iteration-count: infinite`.

---

## Acknowledgements

Inspired by [Platane/snk](https://github.com/Platane/snk) — the classic GitHub snake action.
