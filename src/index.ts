import * as fs from "fs";
import * as path from "path";
import { fetchContributions } from "./api/github";
import {
	generateSpaceInvadersSvg,
	ThemeColor,
	ThemeMode,
} from "./games/space-invaders";

const VALID_COLORS: ThemeColor[] = [
	"green",
	"blue",
	"orange",
	"pink",
	"yellow",
];
const VALID_MODES: ThemeMode[] = ["dark", "light"];

function usage(): never {
	console.error(`
Usage:
  bun src/index.ts --token <TOKEN> --username <USER> [--out ./dist] [--color green] [--mode dark]

Or via environment variables (used when running as a GitHub Action):
  GITHUB_TOKEN, GI_USERNAME, GI_OUT, GI_COLOR, GI_MODE

Colors: ${VALID_COLORS.join(" | ")}
Modes:  ${VALID_MODES.join(" | ")}
`);
	process.exit(1);
}

function parseArgs() {
	const args = process.argv.slice(2);
	const flag = (name: string) => {
		const i = args.indexOf(name);
		return i !== -1 ? args[i + 1] : undefined;
	};

	// CLI flags take priority; fall back to env vars set by action.yml
	const token = flag("--token") ?? process.env.GITHUB_TOKEN ?? "";
	const username =
		flag("--username") ??
		process.env.GI_USERNAME ??
		process.env.GITHUB_REPOSITORY_OWNER ??
		"";
	const outDir = flag("--out") ?? process.env.GI_OUT ?? "./dist";

	// Treat blank string (what action.yml sends when input is empty) as undefined
	const rawColor = (flag("--color") ?? process.env.GI_COLOR ?? "").trim();
	const rawMode = (flag("--mode") ?? process.env.GI_MODE ?? "").trim();

	const color = VALID_COLORS.includes(rawColor as ThemeColor)
		? (rawColor as ThemeColor)
		: undefined;
	const mode = VALID_MODES.includes(rawMode as ThemeMode)
		? (rawMode as ThemeMode)
		: undefined;

	if (rawColor && !color) {
		console.error(
			`Invalid --color "${rawColor}". Valid values: ${VALID_COLORS.join(", ")}`,
		);
		usage();
	}
	if (rawMode && !mode) {
		console.error(
			`Invalid --mode "${rawMode}". Valid values: ${VALID_MODES.join(", ")}`,
		);
		usage();
	}
	if (!token) {
		console.error("Missing --token / GITHUB_TOKEN");
		usage();
	}
	if (!username) {
		console.error("Missing --username / GI_USERNAME");
		usage();
	}

	return { token, username, outDir, color, mode };
}

async function main() {
	const { token, username, outDir, color, mode } = parseArgs();

	console.log(`Fetching contributions for ${username}...`);
	const data = await fetchContributions(username, token);
	console.log(
		`Total contributions: ${data.totalCount}, cells: ${data.cells.length}`,
	);

	fs.mkdirSync(outDir, { recursive: true });

	const colors = color ? [color] : VALID_COLORS;
	const modes = mode ? [mode] : VALID_MODES;

	for (const c of colors) {
		for (const m of modes) {
			const svg = generateSpaceInvadersSvg(data, { color: c, mode: m });
			const name = `git-invader-${c}-${m}.svg`;
			fs.writeFileSync(path.join(outDir, name), svg, "utf-8");
			console.log(
				`  Written: ${name} (${(svg.length / 1024).toFixed(1)} KB)`,
			);
		}
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
