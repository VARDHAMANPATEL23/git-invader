import * as fs from "fs";
import * as path from "path";
import {
	generateSpaceInvadersSvg,
	ThemeColor,
	ThemeMode,
	ShipVariant,
} from "./games/space-invaders";
import { ContribData, Cell } from "./types";

// ─── Demo intro: GIT-INVADERS pixel font (3 cols × 7 rows) ──────────────────
// Each row = 3-bit number: bit2=left, bit1=mid, bit0=right.
const DEMO_FONT: Record<string, number[]> = {
	G: [0b011, 0b100, 0b100, 0b111, 0b101, 0b011, 0b000],
	I: [0b111, 0b010, 0b010, 0b010, 0b010, 0b111, 0b000],
	T: [0b111, 0b010, 0b010, 0b010, 0b010, 0b010, 0b000],
	"-": [0b000, 0b000, 0b000, 0b111, 0b000, 0b000, 0b000],
	N: [0b101, 0b111, 0b101, 0b101, 0b101, 0b101, 0b000],
	V: [0b101, 0b101, 0b101, 0b101, 0b101, 0b010, 0b000],
	A: [0b010, 0b101, 0b101, 0b111, 0b101, 0b101, 0b000],
	D: [0b110, 0b101, 0b101, 0b101, 0b101, 0b110, 0b000],
	E: [0b111, 0b100, 0b110, 0b100, 0b100, 0b111, 0b000],
	R: [0b110, 0b101, 0b110, 0b110, 0b101, 0b101, 0b000],
	S: [0b111, 0b100, 0b111, 0b001, 0b001, 0b111, 0b000],
};

// Returns grid {col, row} coordinates for every lit pixel in "GIT-INVADERS".
// Grid is 53 cols × 7 rows; text (47 cols wide) is centered starting at col 3.
function buildDemoFormation(): Array<{ col: number; row: number }> {
	const TEXT = "GIT-INVADERS";
	const CHAR_W = 3;
	const CHAR_GAP = 1;
	const GRID_COLS = 53;
	const totalW = TEXT.length * CHAR_W + (TEXT.length - 1) * CHAR_GAP; // 47
	const startCol = Math.floor((GRID_COLS - totalW) / 2); // 3

	const cells: Array<{ col: number; row: number }> = [];
	for (let ci = 0; ci < TEXT.length; ci++) {
		const rows = DEMO_FONT[TEXT[ci]];
		if (!rows) continue;
		const charCol = startCol + ci * (CHAR_W + CHAR_GAP);
		for (let r = 0; r < 7; r++) {
			for (let bc = 0; bc < CHAR_W; bc++) {
				if (rows[r] & (1 << (CHAR_W - 1 - bc)))
					cells.push({ col: charCol + bc, row: r });
			}
		}
	}
	return cells;
}

// ─── Showcase SVG generator ───────────────────────────────────────────────────
// Renders a grid of sprites from an 11×8 bitmap record for README use.

type BitmapRecord = Record<number, number[]>;

const ALIEN_BITMAP: BitmapRecord = {
	1: [
		0b00100000100, 0b00010001000, 0b01111111110, 0b11011111011,
		0b11111111111, 0b01010101010, 0b10001010001, 0b00000000000,
	],
	2: [
		0b01000000010, 0b00101110100, 0b01111111110, 0b11010101011,
		0b11111111111, 0b10110101101, 0b10000000001, 0b00000000000,
	],
	3: [
		0b00111111100, 0b01111111110, 0b11010101011, 0b11111111111,
		0b01101110110, 0b00100100100, 0b01000000010, 0b00000000000,
	],
	4: [
		0b10010001001, 0b01001010010, 0b00111111100, 0b11101110111,
		0b11111111111, 0b10101110101, 0b10010001001, 0b00000000000,
	],
	5: [
		0b00001010000, 0b00011111000, 0b01111111110, 0b11110110111,
		0b11111111111, 0b00111111100, 0b01000000010, 0b00000000000,
	],
	6: [
		0b01111111110, 0b11111111111, 0b11010101011, 0b11111111111,
		0b01011101010, 0b01001001010, 0b10000000001, 0b00000000000,
	],
	7: [
		0b10001110001, 0b01001110010, 0b00111111100, 0b11111111111,
		0b11111111111, 0b10100000101, 0b11000000011, 0b00000000000,
	],
	8: [
		0b00010001000, 0b01110001110, 0b11111111111, 0b10111111101,
		0b11111111111, 0b11010101011, 0b00101010100, 0b00000000000,
	],
	9: [
		0b00111111100, 0b01100001100, 0b11111111111, 0b11111111111,
		0b11111111111, 0b10101010101, 0b01010101010, 0b00000000000,
	],
	10: [
		0b11000000011, 0b11011111011, 0b01111111110, 0b00111111100,
		0b11111111111, 0b10111111101, 0b00010101000, 0b00000000000,
	],
	11: [
		0b10001010001, 0b11011111011, 0b11111111111, 0b01111111110,
		0b11111111111, 0b10010110001, 0b11000000011, 0b00000000000,
	],
	12: [
		0b01001010010, 0b10110101101, 0b01111111110, 0b11100000111,
		0b11111111111, 0b01101110110, 0b10010001001, 0b00000000000,
	],
};

const SHIP_BMP: BitmapRecord = {
	1: [
		0b00000100000, 0b00000100000, 0b00001110000, 0b00011111000,
		0b01111111110, 0b11111111111, 0b10001110001, 0b00000000000,
	],
	2: [
		0b00011111000, 0b01111111110, 0b11111111111, 0b11111111111,
		0b01010101010, 0b00101110100, 0b01000000010, 0b00000000000,
	],
	3: [
		0b00000100000, 0b00001110000, 0b00011111000, 0b00111111100,
		0b01111111110, 0b11111111111, 0b10000000001, 0b00000000000,
	],
	4: [
		0b00010101000, 0b00011111000, 0b01101110110, 0b11111111111,
		0b11111111111, 0b10011111001, 0b11000000011, 0b00000000000,
	],
	5: [
		0b00000100000, 0b00001110000, 0b00011111000, 0b00111111100,
		0b11111111111, 0b11100111011, 0b11000000011, 0b00000000000,
	],
	6: [
		0b10000100001, 0b01001110010, 0b01111111110, 0b11111111111,
		0b11111111111, 0b01111111110, 0b10000100001, 0b00000000000,
	],
	7: [
		0b00000100000, 0b00001110000, 0b11110111111, 0b11111111111,
		0b11111111111, 0b01110111011, 0b10000000001, 0b00000000000,
	],
	8: [
		0b00100010100, 0b00111111100, 0b01111111110, 0b11111111111,
		0b11111111111, 0b01111111110, 0b11001110011, 0b00000000000,
	],
	9: [
		0b00000100000, 0b00011111000, 0b01111111110, 0b11110011111,
		0b11110011111, 0b01111111110, 0b11100000111, 0b00000000000,
	],
	10: [
		0b11000000011, 0b01000100010, 0b11101110111, 0b11111111111,
		0b11111111111, 0b11100000111, 0b10000100001, 0b00000000000,
	],
	11: [
		0b00011111000, 0b00111111100, 0b01111111110, 0b11111111111,
		0b11111111111, 0b11001010011, 0b11010001011, 0b00000000000,
	],
	12: [
		0b00000100000, 0b00001110000, 0b11001110011, 0b11111111111,
		0b11111111111, 0b11001110011, 0b01001010010, 0b00000000000,
	],
};

const ALIEN_NAMES = [
	"Squid",
	"Crab",
	"Octopus",
	"Spider",
	"Hornet",
	"Jellyfish",
	"Mantis",
	"Beetle",
	"Ghost",
	"Scorpion",
	"Moth",
	"Watcher",
];

const SHIP_NAMES = [
	"Rocket",
	"Saucer",
	"Delta",
	"Cruiser",
	"Viper",
	"Phantom",
	"Hornet",
	"Wraith",
	"Specter",
	"Predator",
	"Eclipse",
	"Nova",
];

// Vivid multi-mode colors, one per sprite index (same order as MULTI_SHIP_COLORS dark)
const SHOWCASE_COLORS = [
	"#39d353",
	"#58A6FF",
	"#F78166",
	"#FF79C6",
	"#FBBF24",
	"#a78bfa",
	"#34d399",
	"#fb923c",
	"#e879f9",
	"#22d3ee",
	"#f43f5e",
	"#a3e635",
];
const SHOWCASE_COLORS_LIGHT = [
	"#216e39",
	"#0969da",
	"#bc4c00",
	"#bf3989",
	"#9a6700",
	"#7c3aed",
	"#059669",
	"#ea580c",
	"#c026d3",
	"#0891b2",
	"#be123c",
	"#65a30d",
];

function renderBitmap(bmp: number[], color: string, scale: number): string {
	let rects = "";
	bmp.forEach((row, r) => {
		for (let c = 0; c < 11; c++) {
			if (row & (1 << (10 - c)))
				rects += `<rect x="${c * scale}" y="${r * scale}" width="${scale}" height="${scale}" fill="${color}"/>`;
		}
	});
	return rects;
}

function generateShowcase(
	bitmaps: BitmapRecord,
	names: string[],
	title: string,
	mode: "dark" | "light",
): string {
	const COLS = 6;
	const ROWS = 2;
	const SCALE = 5; // px per bitmap pixel
	const SPR_W = 11 * SCALE; // 55px
	const SPR_H = 8 * SCALE; // 40px
	const CELL_W = 200;
	const CELL_H = 130;
	const PAD = 40;
	const TITLE_H = 50;
	const LABEL_H = 30;
	const W = COLS * CELL_W + PAD * 2;
	const H = ROWS * CELL_H + TITLE_H + PAD * 2;

	const bg = mode === "dark" ? "#0d1117" : "#ffffff";
	const fg = mode === "dark" ? "#39d353" : "#216e39";
	const labelFg = mode === "dark" ? "#8b949e" : "#57606a";
	const colors = mode === "dark" ? SHOWCASE_COLORS : SHOWCASE_COLORS_LIGHT;

	let body = "";

	for (let i = 0; i < 12; i++) {
		const col = i % COLS;
		const row = Math.floor(i / COLS);
		const cx = PAD + col * CELL_W + CELL_W / 2;
		const cy = TITLE_H + PAD + row * CELL_H + (CELL_H - LABEL_H) / 2;
		const sx = cx - SPR_W / 2;
		const sy = cy - SPR_H / 2;
		body += `<g transform="translate(${sx},${sy})">${renderBitmap(bitmaps[i + 1], colors[i], SCALE)}</g>`;
		body += `<text x="${cx}" y="${cy + SPR_H / 2 + 22}" text-anchor="middle" font-family="monospace" font-size="13" font-weight="bold" fill="${colors[i]}">${names[i]}</text>`;
	}

	return [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
		`<rect width="${W}" height="${H}" fill="${bg}"/>`,
		`<text x="${W / 2}" y="32" text-anchor="middle" font-family="monospace" font-size="13" font-weight="bold" letter-spacing="2" fill="${fg}">${title}</text>`,
		body,
		`</svg>`,
	].join("\n");
}

function mockData(seed = 42): ContribData {
	const cells: Cell[] = [];
	const start = new Date("2024-04-28T00:00:00Z");
	let s = seed;
	const rand = () => {
		s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
		return s / 0x100000000;
	};

	for (let col = 0; col < 53; col++) {
		for (let row = 0; row < 7; row++) {
			const d = new Date(start);
			d.setUTCDate(d.getUTCDate() + col * 7 + row);
			const date = d.toISOString().slice(0, 10);
			const isWeekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;

			let count = 0;
			if (col >= 10 && col <= 13) {
				count = 0;
			} else if (!isWeekend) {
				const r = rand();
				if (r < 0.15) count = 0;
				else if (r < 0.35) count = Math.ceil(rand() * 2);
				else if (r < 0.6) count = 2 + Math.ceil(rand() * 5);
				else if (r < 0.8) count = 6 + Math.ceil(rand() * 9);
				else count = 12 + Math.ceil(rand() * 10);
			} else {
				count = rand() < 0.25 ? Math.ceil(rand() * 5) : 0;
			}

			let level: 0 | 1 | 2 | 3 | 4 = 0;
			if (count >= 10) level = 4;
			else if (count >= 6) level = 3;
			else if (count >= 3) level = 2;
			else if (count > 0) level = 1;

			const colorMap = [
				"#161b22",
				"#0e4429",
				"#006d32",
				"#26a641",
				"#39d353",
			];
			cells.push({
				x: col,
				y: row,
				level,
				count,
				date,
				color: colorMap[level],
			});
		}
	}

	const totalCount = cells.reduce((s, c) => s + c.count, 0);
	return { cells, totalCount };
}

const data = mockData();
const nonEmpty = data.cells.filter((c) => c.level > 0);
console.log(
	`Cells: ${data.cells.length}, Non-empty: ${nonEmpty.length}, Total: ${data.totalCount}`,
);

const colors: ThemeColor[] = [
	"green",
	"blue",
	"orange",
	"pink",
	"yellow",
	"multi",
];
const modes: ThemeMode[] = ["dark", "light"];
const ships: ShipVariant[] = [
	"rocket",
	"saucer",
	"delta",
	"cruiser",
	"viper",
	"phantom",
	"hornet",
	"wraith",
	"specter",
	"predator",
	"eclipse",
	"nova",
];

const DEFAULT_USERNAME = "VARDHAMANPATEL23";

const outDir = path.join(__dirname, "../dist");
fs.mkdirSync(outDir, { recursive: true });

// All color × mode combinations (auto ship)
for (const color of colors) {
	for (const mode of modes) {
		const svg = generateSpaceInvadersSvg(data, {
			color,
			mode,
			username: DEFAULT_USERNAME,
		});
		const name = `space-invaders-${color}-${mode}.svg`;
		fs.writeFileSync(path.join(outDir, name), svg, "utf-8");
		console.log(`${name}: ${(svg.length / 1024).toFixed(1)} KB`);
	}
}

// All ship variants in multi mode (dark + light)
for (const mode of modes) {
	for (const ship of ships) {
		const svg = generateSpaceInvadersSvg(data, {
			color: "multi",
			mode,
			ship,
			username: DEFAULT_USERNAME,
		});
		const name = `space-invaders-ship-${ship}-multi-${mode}.svg`;
		fs.writeFileSync(path.join(outDir, name), svg, "utf-8");
		console.log(`${name}: ${(svg.length / 1024).toFixed(1)} KB`);
	}
}

// Merged color-strip SVGs — 5 solid colors stacked into one file per mode
const solidColors: ThemeColor[] = ["green", "blue", "orange", "pink", "yellow"];

for (const mode of modes) {
	const svgs = solidColors.map((color) =>
		generateSpaceInvadersSvg(data, { color, mode }),
	);
	const srcW = 774;
	const srcH = 202;
	const totalH = srcH * svgs.length;
	const b64s = svgs.map((s) => Buffer.from(s).toString("base64"));
	const bg = mode === "dark" ? "#0d1117" : "#ffffff";
	let images = "";
	b64s.forEach((b64, i) => {
		images += `<image href="data:image/svg+xml;base64,${b64}" x="0" y="${i * srcH}" width="${srcW}" height="${srcH}"/>`;
	});
	const merged =
		`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${srcW}" height="${totalH}" viewBox="0 0 ${srcW} ${totalH}">` +
		`<rect width="${srcW}" height="${totalH}" fill="${bg}"/>` +
		images +
		`</svg>`;
	const name = `space-invaders-colors-${mode}.svg`;
	fs.writeFileSync(path.join(outDir, name), merged, "utf-8");
	console.log(`${name}: ${(merged.length / 1024).toFixed(1)} KB`);
}

// Showcase grids for README
const showcases: Array<{
	bitmaps: BitmapRecord;
	names: string[];
	title: string;
	file: string;
}> = [
	{
		bitmaps: ALIEN_BITMAP,
		names: ALIEN_NAMES,
		title: "ALIEN TYPES — ALL 12 DESIGNS",
		file: "showcase-aliens-dark.svg",
	},
	{
		bitmaps: ALIEN_BITMAP,
		names: ALIEN_NAMES,
		title: "ALIEN TYPES — ALL 12 DESIGNS",
		file: "showcase-aliens-light.svg",
	},
	{
		bitmaps: SHIP_BMP,
		names: SHIP_NAMES,
		title: "SHIP VARIANTS — ALL 12 DESIGNS",
		file: "showcase-ships-dark.svg",
	},
	{
		bitmaps: SHIP_BMP,
		names: SHIP_NAMES,
		title: "SHIP VARIANTS — ALL 12 DESIGNS",
		file: "showcase-ships-light.svg",
	},
];
const showcaseModes: ("dark" | "light")[] = ["dark", "light", "dark", "light"];

for (let i = 0; i < showcases.length; i++) {
	const { bitmaps, names, title, file } = showcases[i];
	const svg = generateShowcase(bitmaps, names, title, showcaseModes[i]);
	fs.writeFileSync(path.join(outDir, file), svg, "utf-8");
	console.log(`${file}: ${(svg.length / 1024).toFixed(1)} KB`);
}

// ─── Demo SVG generator ───────────────────────────────────────────────────────
// Produces a standalone animated SVG with three phases:
//   Phase 1 (0–3 s)   : aliens form "GIT-INVADERS" text and march
//   Phase 2 (3–4.5 s) : scan line sweeps left→right; demo cells fade out
//                        column-by-column, real commit cells fade in
//   Phase 3 (4.5 s+)  : normal shooting game on actual commit positions
function generateDemoSvg(d: ContribData, mode: "dark" | "light"): string {
	// ── layout ────────────────────────────────────────────────────────────
	const CELL = 12, STEP = 14, COLS = 53, ROWS = 7, PX = 16, PY = 36;
	const W = COLS * STEP + PX * 2;       // 774
	const H = ROWS * STEP + PY + 68;      // 202
	const SY = PY + ROWS * STEP + 26;     // ship Y = 160
	const BY = SY - 4;                    // barrel Y

	// ── timing ────────────────────────────────────────────────────────────
	const DMARCH = 3.0, SCAN = 1.5, INTRO = 4.5;
	const TRAVEL = 0.35, FLASH = 0.08, CGAP = 0.12, HOLD = 1.5;
	const BH = 5, BW = 2;

	// ── colors ────────────────────────────────────────────────────────────
	const bg     = mode === "dark" ? "#0d1117" : "#ffffff";
	const cellBg = mode === "dark" ? "#161b22" : "#ebedf0";
	const accent = mode === "dark" ? "#39d353" : "#216e39";
	const bulletC = mode === "dark" ? "#ffffff" : "#24292f";
	const MULTI = mode === "dark"
		? ["#39d353","#58A6FF","#F78166","#FF79C6","#FBBF24","#a78bfa",
		   "#34d399","#fb923c","#e879f9","#22d3ee","#f43f5e","#a3e635"]
		: ["#216e39","#0969da","#bc4c00","#bf3989","#9a6700","#7c3aed",
		   "#059669","#ea580c","#c026d3","#0891b2","#be123c","#65a30d"];
	const shipClr = MULTI[d.totalCount % MULTI.length];

	// ── health helper ─────────────────────────────────────────────────────
	const getHealth = (count: number): number => {
		if (count === 0) return 0;
		if (count > 15) { const h = count % 15; return h === 0 ? 15 : h; }
		if (count > 12) { const h = count % 12; return h === 0 ? 12 : h; }
		return count;
	};

	// ── build column stacks from real commit data ──────────────────────────
	type Alien = { col: number; row: number; hp: number; maxHp: number; cy: number };
	const cellMaxHp = new Map<string, number>();
	const colStack   = new Map<number, Alien[]>();
	for (const c of d.cells) {
		const h = getHealth(c.count);
		if (h === 0) continue;
		const key = `${c.x}-${c.y}`;
		cellMaxHp.set(key, h);
		if (!colStack.has(c.x)) colStack.set(c.x, []);
		colStack.get(c.x)!.push({ col: c.x, row: c.y, hp: h, maxHp: h,
			cy: PY + c.y * STEP + CELL / 2 });
	}
	for (const s of colStack.values()) s.sort((a, b) => b.row - a.row);

	// ── shooting simulation (starts at t = INTRO) ──────────────────────────
	type Shot = { id: string; shipX: number; targetCY: number;
	              fireAt: number; hitAt: number; isKill: boolean };
	type CellAnim = { killAt: number; hitTimes: number[] };

	const shots: Shot[] = [];
	const cellAnim = new Map<string, CellAnim>();
	const cellHits  = new Map<string, number[]>();
	const shipSnaps: Array<{ x: number; t: number }> = [];

	const getTarget = (): Alien | null => {
		let best: Alien | null = null;
		for (const s of colStack.values()) {
			if (!s.length) continue;
			const f = s[0];
			if (!best || f.row > best.row || (f.row === best.row && f.hp < best.hp))
				best = f;
		}
		return best;
	};

	// ship holds at first-target column during intro
	const ft = getTarget();
	const fx = ft ? PX + ft.col * STEP + CELL / 2 : PX + CELL / 2;
	shipSnaps.push({ x: fx, t: 0 }, { x: fx, t: INTRO });

	let t = INTRO, idx = 0;
	while (true) {
		const alien = getTarget();
		if (!alien) break;
		const sx = PX + alien.col * STEP + CELL / 2;
		const fireAt = t, hitAt = t + TRAVEL;
		const key = `${alien.col}-${alien.row}`;
		shipSnaps.push({ x: sx, t: fireAt }, { x: sx, t: hitAt });
		alien.hp -= 1;
		const isKill = alien.hp === 0;
		shots.push({ id: `db${idx++}`, shipX: sx, targetCY: alien.cy,
			fireAt, hitAt, isKill });
		if (isKill) {
			const ka = hitAt + FLASH;
			cellAnim.set(key, { killAt: ka, hitTimes: cellHits.get(key) ?? [] });
			const st = colStack.get(alien.col)!;
			st.shift();
			if (!st.length) colStack.delete(alien.col);
		} else {
			if (!cellHits.has(key)) cellHits.set(key, []);
			cellHits.get(key)!.push(hitAt);
		}
		const na = getTarget();
		shipSnaps.push({ x: na ? PX + na.col * STEP + CELL / 2 : sx, t: hitAt + 0.001 });
		t = hitAt + CGAP;
	}

	const TOTAL = t + HOLD;
	const pct = (v: number) => ((Math.min(v, TOTAL) / TOTAL) * 100).toFixed(4) + "%";
	shipSnaps.push({ x: shipSnaps[shipSnaps.length - 1].x, t: TOTAL });

	// ── defs: alien symbols + rocket ship ─────────────────────────────────
	let defs = "<defs>\n";
	defs += `<clipPath id="dbc"><rect width="${W}" height="${H}"/></clipPath>\n`;
	for (let lv = 1; lv <= 12; lv++) {
		let r = "";
		ALIEN_BITMAP[lv].forEach((row, ri) => {
			for (let c = 0; c < 11; c++)
				if (row & (1 << (10 - c)))
					r += `<rect x="${c}" y="${ri}" width="1" height="1" fill="currentColor"/>`;
		});
		defs += `<symbol id="da${lv}" viewBox="0 0 11 8" preserveAspectRatio="xMidYMid meet">${r}</symbol>\n`;
	}
	let sr = "";
	SHIP_BMP[1].forEach((row, ri) => { // rocket variant
		for (let c = 0; c < 11; c++)
			if (row & (1 << (10 - c)))
				sr += `<rect x="${c}" y="${ri}" width="1" height="1" fill="${shipClr}"/>`;
	});
	defs += `<symbol id="dship" viewBox="0 0 11 8" preserveAspectRatio="xMidYMid meet">${sr}</symbol>\n`;
	defs += "</defs>\n";

	// ── grid background ────────────────────────────────────────────────────
	let gridBg = "";
	for (let col = 0; col < COLS; col++)
		for (let row = 0; row < ROWS; row++)
			gridBg += `<rect x="${PX + col * STEP}" y="${PY + row * STEP}" width="${CELL}" height="${CELL}" fill="${cellBg}" rx="1"/>`;

	// ── Phase 1: demo formation (GIT-INVADERS text, march, fade out on scan) ─
	const formation = buildDemoFormation();
	const demoEls: string[] = [];
	const demoCss: string[] = [];
	for (const { col, row } of formation) {
		const id = `dm${col}x${row}`;
		const x  = PX + col * STEP, y = PY + row * STEP;
		const clr = MULTI[(col * 7 + row) % MULTI.length];
		const fadeAt   = DMARCH + (col / (COLS - 1)) * SCAN;
		const fadeDone = Math.min(fadeAt + 0.15, INTRO - 0.01);
		demoEls.push(
			`<g id="${id}" color="${clr}">` +
			`<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" fill="${clr}" opacity="0.15" rx="1"/>` +
			`<use href="#da${((col * 7 + row) % 12) + 1}" x="${x}" y="${y}" width="${CELL}" height="${CELL}"/>` +
			`</g>`,
		);
		demoCss.push(
			`#${id}{animation:kd${id} ${TOTAL}s linear infinite}` +
			`@keyframes kd${id}{` +
			`0%{opacity:1}` +
			`${pct(fadeAt - 0.001)}{opacity:1}` +
			`${pct(fadeAt)}{opacity:0.35}` +
			`${pct(fadeDone)}{opacity:0}` +
			`100%{opacity:0}}`,
		);
	}
	// march oscillation for demo formation
	const marchCss =
		`#dmg{animation:dmarch ${TOTAL}s linear infinite}` +
		`@keyframes dmarch{` +
		`0%{transform:translateX(0)}` +
		`${pct(DMARCH * 0.25)}{transform:translateX(4px)}` +
		`${pct(DMARCH * 0.75)}{transform:translateX(-4px)}` +
		`${pct(DMARCH)}{transform:translateX(0)}` +
		`100%{transform:translateX(0)}}`;

	// ── Phase 2: scan line ─────────────────────────────────────────────────
	const scanCss =
		`#dscan{animation:dscanm ${TOTAL}s linear infinite}` +
		`@keyframes dscanm{` +
		`0%,${pct(DMARCH - 0.001)}{transform:translateX(0);opacity:0}` +
		`${pct(DMARCH)}{transform:translateX(0);opacity:1}` +
		`${pct(INTRO - 0.05)}{transform:translateX(${COLS * STEP}px);opacity:1}` +
		`${pct(INTRO)}{transform:translateX(${COLS * STEP}px);opacity:0}` +
		`100%{transform:translateX(${COLS * STEP}px);opacity:0}}`;
	const scanEl =
		`<rect id="dscan" x="${PX}" y="${PY}" width="3" height="${ROWS * STEP}" ` +
		`fill="${accent}" opacity="0" rx="1"/>`;

	// ── Phase 3: real commit cells ──────────────────────────────────────────
	const realEls: string[] = [];
	const realCss: string[] = [];
	for (const c of d.cells) {
		if (c.level === 0) continue;
		const key = `${c.x}-${c.y}`;
		const anim   = cellAnim.get(key);
		const id     = `dc${c.x}x${c.y}`;
		const cx     = PX + c.x * STEP, cy = PY + c.y * STEP;
		const ka     = Math.min(anim?.killAt ?? TOTAL * 0.99, TOTAL - 0.01);
		const hitTimes = anim?.hitTimes ?? [];
		const maxHp  = cellMaxHp.get(key) ?? 1;
		const clr    = MULTI[(c.x * 7 + c.y) % MULTI.length];

		// fade in as scan passes this column
		const fadeIn     = DMARCH + (c.x / (COLS - 1)) * SCAN;
		const fadeInDone = fadeIn + 0.15;

		// non-kill hit keyframes
		let hfCss = "";
		for (let i = 0; i < hitTimes.length; i++) {
			const ht = hitTimes[i];
			const opBefore = (maxHp - i) / maxHp;
			const opAfter  = (maxHp - (i + 1)) / maxHp;
			hfCss +=
				`${pct(ht - 0.001)}{opacity:${opBefore.toFixed(2)}}` +
				`${pct(ht)}{opacity:${(opAfter * 0.3).toFixed(2)}}` +
				`${pct(ht + FLASH)}{opacity:${opAfter.toFixed(2)}}`;
		}
		const opBeforeKill = hitTimes.length > 0 ? 1 / maxHp : 1;

		realEls.push(
			`<g id="${id}" color="${clr}">` +
			`<rect x="${cx}" y="${cy}" width="${CELL}" height="${CELL}" fill="${clr}" opacity="0.15" rx="1"/>` +
			`<use href="#da${((c.x * 7 + c.y) % 12) + 1}" x="${cx}" y="${cy}" width="${CELL}" height="${CELL}"/>` +
			`</g>`,
		);
		realCss.push(
			`#${id}{animation:kr${id} ${TOTAL}s linear infinite}` +
			`@keyframes kr${id}{` +
			`0%,${pct(fadeIn)}{opacity:0}` +
			`${pct(fadeInDone)}{opacity:1}` +
			hfCss +
			`${pct(ka - FLASH - 0.001)}{opacity:${opBeforeKill.toFixed(2)}}` +
			`${pct(ka - FLASH)}{opacity:${(opBeforeKill * 0.3).toFixed(2)}}` +
			`${pct(ka)}{opacity:0}` +
			`100%{opacity:0}}`,
		);
	}

	// ── Bullets ────────────────────────────────────────────────────────────
	const bulletEls: string[] = [];
	const bulletCss: string[] = [];
	for (const s of shots) {
		const bx = s.shipX - BW / 2;
		const dy = s.targetCY - BY;
		const pW = pct(Math.max(0, s.fireAt - 0.001));
		const pF = pct(s.fireAt), pH = pct(s.hitAt);
		const pD = pct(Math.min(s.hitAt + 0.001, TOTAL));
		bulletEls.push(
			`<rect id="${s.id}" x="${bx}" y="${BY}" width="${BW}" height="${BH}" fill="${bulletC}" opacity="0" rx="1"/>`,
		);
		bulletCss.push(
			`#${s.id}{animation:bm${s.id} ${TOTAL}s linear infinite}` +
			`@keyframes bm${s.id}{` +
			`0%,${pW}{transform:translateY(0);opacity:0}` +
			`${pF}{transform:translateY(0);opacity:1}` +
			`${pH}{transform:translateY(${dy}px);opacity:1}` +
			`${pD},100%{transform:translateY(${dy}px);opacity:0}}`,
		);
	}

	// ── Ship ───────────────────────────────────────────────────────────────
	const shipKf = shipSnaps
		.map((s) => `${pct(s.t)}{transform:translate(${s.x}px,${SY}px)}`)
		.join("");
	const shipCss =
		`#dshipg{animation:dshipm ${TOTAL}s linear infinite}` +
		`@keyframes dshipm{${shipKf}}`;

	// ── HUD ───────────────────────────────────────────────────────────────
	const hudAttr = `font-size="8" font-family="monospace" font-weight="bold" letter-spacing="1"`;
	const hud =
		`<text x="${PX}" y="20" fill="${accent}" ${hudAttr} text-anchor="start">GIT-INVADERS</text>` +
		`<text x="${W / 2}" y="20" fill="${accent}" ${hudAttr} text-anchor="middle">DEMO</text>` +
		`<text x="${W - PX}" y="20" fill="${accent}" ${hudAttr} text-anchor="end">COMMITS: ${d.totalCount}</text>`;

	const ground = `<line x1="${PX}" y1="${SY + 14}" x2="${W - PX}" y2="${SY + 14}" stroke="${accent}" stroke-width="1" opacity=".5"/>`;

	const allCss = [marchCss, scanCss, shipCss, ...demoCss, ...realCss, ...bulletCss].join("\n");

	return [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
		`<rect width="${W}" height="${H}" fill="${bg}"/>`,
		defs,
		`<style>${allCss}</style>`,
		hud,
		gridBg,
		`<g id="dmg">${demoEls.join("")}</g>`,
		scanEl,
		`<g clip-path="url(#dbc)">${bulletEls.join("")}</g>`,
		`<g>${realEls.join("")}</g>`,
		ground,
		`<g id="dshipg"><use href="#dship" x="-7" y="-9" width="14" height="10"/></g>`,
		`</svg>`,
	].join("\n");
}

// Generate demo SVGs: multi-color, rocket ship, both modes
for (const demoMode of ["dark", "light"] as const) {
	const svg  = generateDemoSvg(data, demoMode);
	const name = `space-invaders-demo-${demoMode}.svg`;
	fs.writeFileSync(path.join(outDir, name), svg, "utf-8");
	console.log(`${name}: ${(svg.length / 1024).toFixed(1)} KB`);
}
