# git-invaders

Generates a dynamic retro arcade SVG animation from your GitHub contribution graph.
Your contribution grid transforms into an alien armada — the ship hunts them down one by one.

---

## Features

- **Smart targeting** — the ship shoots the lowest-row alien first, column by column, never firing through living units
- **Dynamic HP** — alien health scales with your daily commit count; high-volume days take multiple hits to kill
- **4 alien types** — squid, crab, octopus, spider; type is determined by contribution level (1–4)
- **Multi-color mode** — each alien colored individually by commit count: blue (low) → green → yellow → red (high)
- **Dark + light themes** — distinct palettes for both, tuned for GitHub's native contrast on each background
- **Pure SVG/CSS** — no JavaScript, embeds directly in any GitHub README

---

## Color modes

| `color` value | Description                                                         |
| ------------- | ------------------------------------------------------------------- |
| `green`       | Single neon green accent                                            |
| `blue`        | Single blue accent                                                  |
| `orange`      | Single orange accent                                                |
| `pink`        | Single pink accent                                                  |
| `yellow`      | Single yellow accent                                                |
| `multi`       | Per-alien color based on commit count — blue → green → yellow → red |

Leave `color` blank to generate all 6 variants. Leave `mode` blank to generate both `dark` and `light`.

---

## Setup

### 1. Fork or copy this repo

This repo must be public so your profile repo can reference it as a GitHub Action.

```
github.com/YOUR_USERNAME/git-invader   (must be public)
```

### 2. Add the workflow to your profile repo

Your profile repo is `github.com/USERNAME/USERNAME`. Copy the example workflow into it:

```
.github/workflows/git-invader.yml
```

Use the template below or copy from `examples/git-invader.yml` in this repo.

### 3. Run it

Go to your profile repo → **Actions** → **git-invader** → **Run workflow**.

After it finishes, the SVGs are pushed to the `output` branch. The URL pattern is:

```
https://raw.githubusercontent.com/USERNAME/USERNAME/output/git-invader-{color}-{mode}.svg
```

For example:

```
https://raw.githubusercontent.com/USERNAME/USERNAME/output/git-invader-green-dark.svg
https://raw.githubusercontent.com/USERNAME/USERNAME/output/git-invader-multi-dark.svg
```

### 4. Embed in your profile README

Single image:

```markdown
![git-invaders](https://raw.githubusercontent.com/USERNAME/USERNAME/output/git-invader-green-dark.svg)
```

Auto dark/light switch:

```html
<picture>
	<source
		media="(prefers-color-scheme: dark)"
		srcset="
			https://raw.githubusercontent.com/USERNAME/USERNAME/output/git-invader-green-dark.svg
		"
	/>
	<source
		media="(prefers-color-scheme: light)"
		srcset="
			https://raw.githubusercontent.com/USERNAME/USERNAME/output/git-invader-green-light.svg
		"
	/>
	<img
		alt="git-invaders"
		src="https://raw.githubusercontent.com/USERNAME/USERNAME/output/git-invader-green-dark.svg"
	/>
</picture>
```

Multi-color with auto dark/light:

```html
<picture>
	<source
		media="(prefers-color-scheme: dark)"
		srcset="
			https://raw.githubusercontent.com/USERNAME/USERNAME/output/git-invader-multi-dark.svg
		"
	/>
	<source
		media="(prefers-color-scheme: light)"
		srcset="
			https://raw.githubusercontent.com/USERNAME/USERNAME/output/git-invader-multi-light.svg
		"
	/>
	<img
		alt="git-invaders"
		src="https://raw.githubusercontent.com/USERNAME/USERNAME/output/git-invader-multi-dark.svg"
	/>
</picture>
```

---

## Workflow template

Copy this into `.github/workflows/git-invader.yml` in your profile repo:

```yaml
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
              uses: YOUR_USERNAME/git-invader@main
              with:
                  github_token: ${{ secrets.GITHUB_TOKEN }}
                  github_username: ${{ github.repository_owner }}
                  color: multi # green | blue | orange | pink | yellow | multi | (blank = all)
                  mode: dark # dark | light | (blank = both)

            - name: Push to output branch
              uses: crazy-max/ghaction-github-pages@v4
              with:
                  target_branch: output
                  build_dir: dist
                  keep_history: true
              env:
                  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

> Replace `YOUR_USERNAME` with your actual GitHub username.

---

## Action inputs

| Input             | Required | Default  | Description                                     |
| ----------------- | -------- | -------- | ----------------------------------------------- |
| `github_token`    | yes      | —        | `${{ secrets.GITHUB_TOKEN }}` is sufficient     |
| `github_username` | yes      | —        | The username whose contributions to render      |
| `color`           | no       | _(all)_  | `green` `blue` `orange` `pink` `yellow` `multi` |
| `mode`            | no       | _(both)_ | `dark` `light`                                  |
| `output_dir`      | no       | `dist`   | Directory to write SVG files into               |

---

## Run locally

No token needed for mock data:

```bash
git clone https://github.com/YOUR_USERNAME/git-invader
cd git-invader
bun install
bun src/test-mock.ts
# writes all 12 SVGs (6 colors × 2 modes) to dist/
```

With real GitHub data:

```bash
bun src/index.ts --token YOUR_GITHUB_PAT --username YOUR_USERNAME
```

---

## Project layout

```
src/
  index.ts                 CLI + GitHub Action entry point
  test-mock.ts             Local test with generated fake data
  types.ts                 Shared types
  api/
    github.ts              GitHub GraphQL API client
  games/
    space-invaders.ts      SVG generator
examples/
  git-invader.yml          Workflow template to copy into your profile repo
action.yml                 GitHub Action definition
Dockerfile                 Container the action runs in
```
