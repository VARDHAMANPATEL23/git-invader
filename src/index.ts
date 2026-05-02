import * as fs from "fs";
import * as path from "path";
import { fetchContributions } from "./api/github";
import {
	generateSpaceInvadersSvg,
	ThemeColor,
	ThemeMode,
	ShipVariant,
} from "./games/space-invaders";

const VALID_COLORS: ThemeColor[] = [
	"green",
	"blue",
	"orange",
	"pink",
	"yellow",
];
const VALID_MODES: ThemeMode[] = ["dark", "light"];
const VALID_SHIPS: ShipVariant[] = ["rocket", "saucer", "delta", "cruiser"];

function usage(): never {
	console.error(`
Usage (CLI):
  bun src/index.ts --token <TOKEN> --username <USER> [--out ./dist] [--color green] [--mode dark] [--ship rocket]

Colors: ${VALID_COLORS.join(" | ")}
Modes:  ${VALID_MODES.join(" | ")}
Ships:  ${VALID_SHIPS.join(" | ")}  (leave blank to auto-select from commit count)
`);
	process.exit(1);
}

function getInput(cliFlag: string, inputName: string, fallback = ""): string {
	// 1. CLI flag (local use)
	const args = process.argv.slice(2);
	const i = args.indexOf(cliFlag);
	if (i !== -1 && args[i + 1]) return args[i + 1];

	// 2. INPUT_* env var (GitHub Actions injects these automatically for every input)
	const envKey = `INPUT_${inputName.toUpperCase().replace(/ /g, "_")}`;
	const fromEnv = process.env[envKey] ?? "";
	if (fromEnv.trim()) return fromEnv.trim();

	// 3. Fallback env vars for common cases
	if (inputName === "GITHUB_TOKEN")
		return process.env.GITHUB_TOKEN ?? fallback;
	if (inputName === "GITHUB_USERNAME")
		return process.env.GITHUB_REPOSITORY_OWNER ?? fallback;

	return fallback;
}

function parseArgs() {
	const token = getInput("--token", "GITHUB_TOKEN");
	const username = getInput("--username", "GITHUB_USERNAME");
	const outDir = getInput("--out", "OUTPUT_DIR", "dist");
	const rawColor = getInput("--color", "COLOR").trim();
	const rawMode = getInput("--mode", "MODE").trim();
	const rawShip = getInput("--ship", "SHIP").trim();

	const color = VALID_COLORS.includes(rawColor as ThemeColor)
		? (rawColor as ThemeColor)
		: undefined;
	const mode = VALID_MODES.includes(rawMode as ThemeMode)
		? (rawMode as ThemeMode)
		: undefined;
	const ship = VALID_SHIPS.includes(rawShip as ShipVariant)
		? (rawShip as ShipVariant)
		: undefined;

	if (rawColor && !color) {
		console.error(`Invalid color "${rawColor}"`);
		usage();
	}
	if (rawMode && !mode) {
		console.error(`Invalid mode "${rawMode}"`);
		usage();
	}
	if (rawShip && !ship) {
		console.error(`Invalid ship "${rawShip}" — choose from: ${VALID_SHIPS.join(" | ")}`);
		usage();
	}
	if (!token) {
		console.error("Missing token");
		usage();
	}
	if (!username) {
		console.error("Missing username");
		usage();
	}

	// When running inside the GitHub Actions Docker container the workspace is
	// mounted at /github/workspace. Relative paths must be resolved from there,
	// not from /app (the container WORKDIR).
	const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();
	const resolvedOut = path.isAbsolute(outDir)
		? outDir
		: path.join(workspace, outDir);

	return { token, username, outDir: resolvedOut, color, mode, ship };
}

async function main() {
	const { token, username, outDir, color, mode, ship } = parseArgs();

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
			const svg = generateSpaceInvadersSvg(data, { color: c, mode: m, ship });
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
