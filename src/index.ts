import * as fs from "fs";
import * as path from "path";
import { fetchContributions } from "./api/github";
import { generateSpaceInvadersSvg } from "./games/space-invaders";

function usage(): never {
  console.error(`
Usage:
  ts-node src/index.ts --token <GITHUB_TOKEN> --username <USERNAME> [--out ./dist]

Environment variables (fallbacks):
  GITHUB_TOKEN
  GITHUB_REPOSITORY_OWNER
`);
  process.exit(1);
}

function parseArgs(): { token: string; username: string; outDir: string } {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };

  const token    = get("--token")    ?? process.env.GITHUB_TOKEN ?? "";
  const username = get("--username") ?? process.env.GITHUB_REPOSITORY_OWNER ?? "";
  const outDir   = get("--out")      ?? "./dist";

  if (!token)    { console.error("Missing --token"); usage(); }
  if (!username) { console.error("Missing --username"); usage(); }

  return { token, username, outDir };
}

async function main() {
  const { token, username, outDir } = parseArgs();

  console.log(`Fetching contributions for ${username}...`);
  const data = await fetchContributions(username, token);
  console.log(`Total contributions: ${data.totalCount}`);
  console.log(`Cells: ${data.cells.length}`);

  fs.mkdirSync(outDir, { recursive: true });

  console.log("Generating Space Invaders SVG...");
  const svg = generateSpaceInvadersSvg(data);
  const outPath = path.join(outDir, "contrib-space-invaders-dark.svg");
  fs.writeFileSync(outPath, svg, "utf-8");
  console.log(`Written: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
