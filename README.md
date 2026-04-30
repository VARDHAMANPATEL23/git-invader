# git-invader

Generates a Space Invaders SVG animation from your GitHub contribution graph.
Each contribution cell becomes an alien. The ship fires one bullet per move,
waits for it to land, then picks the next target. Aliens in the bottom row
(closest to the ship) are targeted first. High-contribution days take more hits.

---

## Setup for your GitHub profile

Your profile repo is the one named exactly the same as your username:
`github.com/USERNAME/USERNAME`

### Step 1 — Push this repo to GitHub (public)

The action runs from this repo directly. It must be public so other repos can
reference it.

```
github.com/YOUR_USERNAME/git-invader   (public)
```

### Step 2 — Add the workflow to your profile repo

Copy `examples/git-invader.yml` from this repo into your profile repo at:

```
.github/workflows/git-invader.yml
```

Open it and replace `YOUR_GITHUB_USERNAME` with your actual username:

```yaml
- name: Generate SVG
  uses: YOUR_GITHUB_USERNAME/git-invader@main # <-- change this
```

### Step 3 — Run it

Go to your profile repo → **Actions** → **git-invader** → **Run workflow**.

After it finishes, the SVG is on the `output` branch. The URL is:

```
https://raw.githubusercontent.com/USERNAME/USERNAME/output/git-invader-green-dark.svg
```

### Step 4 — Add to your profile README

Basic embed:

```markdown
![git-invader](https://raw.githubusercontent.com/USERNAME/USERNAME/output/git-invader-green-dark.svg)
```

Dark/light auto-switch:

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
		alt="git-invader"
		src="https://raw.githubusercontent.com/USERNAME/USERNAME/output/git-invader-green-dark.svg"
	/>
</picture>
```

---

## Options

| Input        | Values                                  | Default |
| ------------ | --------------------------------------- | ------- |
| `color`      | `green` `blue` `orange` `pink` `yellow` | all 5   |
| `mode`       | `dark` `light`                          | both    |
| `output_dir` | any path                                | `dist`  |

Leave `color` or `mode` blank to generate all variants at once.

---

## Run locally (no token needed for mock)

```bash
git clone https://github.com/YOUR_USERNAME/git-invader
cd git-invader
bun install
bun src/test-mock.ts          # generates dist/ from fake data — no token needed
```

With real data:

```bash
bun src/index.ts --token YOUR_GITHUB_PAT --username YOUR_USERNAME
```

---

## How others can use it

Once your `git-invader` repo is public, anyone can use it by adding
`uses: YOUR_USERNAME/git-invader@main` in their own workflow — no installation,
no extra secrets. The `GITHUB_TOKEN` GitHub provides automatically is sufficient.

---

## Project layout

```
src/
  index.ts              CLI + GitHub Action entry point
  types.ts              Shared types
  api/github.ts         GitHub GraphQL API client
  games/
    space-invaders.ts   SVG generator
examples/
  git-invader.yml       Workflow template to copy into your profile repo
action.yml              GitHub Action definition (read by GitHub)
Dockerfile              Container the action runs in

```
