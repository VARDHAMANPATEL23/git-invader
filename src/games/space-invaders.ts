import { Cell, ContribData } from "../types";

// ─── Layout ───────────────────────────────────────────────────────────────────
const CELL = 12;
const GAP = 2;
const STEP = CELL + GAP;
const COLS = 53;
const ROWS = 7;
const PAD_X = 16;
const PAD_Y = 36;
const W = COLS * STEP + PAD_X * 2;
const H = ROWS * STEP + PAD_Y + 68;
const SHIP_Y = PAD_Y + ROWS * STEP + 26;

// ─── Timing constants ────────────────────────────────────────────────────────
const MARCH = 2.0; // alien march phase before shooting starts
const TRAVEL = 0.35; // bullet travel time
const FLASH = 0.08; // kill-flash duration
const SHOT_T = 0.55; // time per shot (travel + gap before next)
const COL_GAP = 0.12; // pause between cells
const BULLET_H = 5; // bullet rect height px
const BULLET_W = 2; // bullet rect width px
const END_HOLD = 1.5; // pause after last kill before loop restarts

// ─── Themes ───────────────────────────────────────────────────────────────────
export type ThemeColor =
	| "green"
	| "blue"
	| "orange"
	| "pink"
	| "yellow"
	| "multi";
export type ThemeMode = "dark" | "light";

const ACCENT: Record<ThemeColor, Record<ThemeMode, string>> = {
	green: { dark: "#39d353", light: "#216e39" },
	blue: { dark: "#58A6FF", light: "#0969da" },
	orange: { dark: "#F78166", light: "#bc4c00" },
	pink: { dark: "#FF79C6", light: "#bf3989" },
	yellow: { dark: "#FBBF24", light: "#9a6700" },
	multi: { dark: "#39d353", light: "#216e39" }, // fallback, unused when color=="multi"
};
const BG: Record<ThemeMode, string> = { dark: "#0d1117", light: "#ffffff" };

const CELL_BG: Record<ThemeMode, string> = {
	dark: "#161b22",
	light: "#ebedf0",
};

// ─── Multi-mode ship color palette ───────────────────────────────────────────
const MULTI_SHIP_COLORS: Record<ThemeMode, string[]> = {
	dark: [
		"#39d353", // green
		"#58A6FF", // blue
		"#F78166", // orange
		"#FF79C6", // pink
		"#FBBF24", // yellow
		"#a78bfa", // violet
		"#34d399", // teal
		"#fb923c", // amber
		"#e879f9", // fuchsia
		"#22d3ee", // cyan
		"#f43f5e", // rose
		"#a3e635", // lime
	],
	light: [
		"#216e39", // green
		"#0969da", // blue
		"#bc4c00", // orange
		"#bf3989", // pink
		"#9a6700", // yellow
		"#7c3aed", // violet
		"#059669", // teal
		"#ea580c", // amber
		"#c026d3", // fuchsia
		"#0891b2", // cyan
		"#be123c", // rose
		"#65a30d", // lime
	],
};

// ─── Health calculation ───────────────────────────────────────────────────────
function getHealth(count: number): number {
	if (count === 0) return 0;
	if (count > 15) {
		const h = count % 15;
		return h === 0 ? 15 : h;
	}
	if (count > 12) {
		const h = count % 12;
		return h === 0 ? 12 : h;
	}
	return count;
}

// ─── Alien symbols ────────────────────────────────────────────────────────────
// 11 cols × 8 rows. Bit 10 (MSB) = col 0 (left), bit 0 (LSB) = col 10 (right).
// All designs are left-right symmetric. Row 7 always empty.
const BITMAP: Record<number, number[]> = {
	// 1: Squid — narrow body, twin antennae, alternating belly
	1: [
		0b00100000100, // . . X . . . . . X . .
		0b00010001000, // . . . X . . . X . . .
		0b01111111110, // . X X X X X X X X X .
		0b11011111011, // X X . X X X X X . X X
		0b11111111111, // X X X X X X X X X X X
		0b01010101010, // . X . X . X . X . X .
		0b10001010001, // X . . . X . X . . . X
		0b00000000000,
	],
	// 2: Crab — wide claws, bumpy shoulders, splayed legs
	2: [
		0b01000000010, // . X . . . . . . . X .
		0b00101110100, // . . X . X X X . X . .
		0b01111111110, // . X X X X X X X X X .
		0b11010101011, // X X . X . X . X . X X
		0b11111111111, // X X X X X X X X X X X
		0b10110101101, // X . X X . X . X X . X
		0b10000000001, // X . . . . . . . . . X
		0b00000000000,
	],
	// 3: Octopus — round dome, eye row, three dangling legs
	3: [
		0b00111111100, // . . X X X X X X X . .
		0b01111111110, // . X X X X X X X X X .
		0b11010101011, // X X . X . X . X . X X
		0b11111111111, // X X X X X X X X X X X
		0b01101110110, // . X X . X X X . X X .
		0b00100100100, // . . X . . X . . X . .
		0b01000000010, // . X . . . . . . . X .
		0b00000000000,
	],
	// 4: Spider — 4-point spike crown, wide shoulders, spread legs
	4: [
		0b10010001001, // X . . X . . . X . . X
		0b01001010010, // . X . . X . X . . X .
		0b00111111100, // . . X X X X X X X . .
		0b11101110111, // X X X . X X X . X X X
		0b11111111111, // X X X X X X X X X X X
		0b10101110101, // X . X . X X X . X . X
		0b10010001001, // X . . X . . . X . . X
		0b00000000000,
	],
	// 5: Hornet — narrow waist, blade wings, stinger tail
	5: [
		0b00001010000, // . . . . X . X . . . .
		0b00011111000, // . . . X X X X X . . .
		0b01111111110, // . X X X X X X X X X .
		0b11110110111, // X X X X . X X . X X X
		0b11111111111, // X X X X X X X X X X X
		0b00111111100, // . . X X X X X X X . .
		0b01000000010, // . X . . . . . . . X .
		0b00000000000,
	],
	// 6: Jellyfish — dome cap, spotted body, trailing tendrils
	6: [
		0b01111111110, // . X X X X X X X X X .
		0b11111111111, // X X X X X X X X X X X
		0b11010101011, // X X . X . X . X . X X
		0b11111111111, // X X X X X X X X X X X
		0b01011101010, // . X . X X X . X . X .  (tentacle roots)
		0b01001001010, // . X . . X . . X . X .
		0b10000000001, // X . . . . . . . . . X
		0b00000000000,
	],
	// 7: Mantis — tall blade arms, triangular head, forked feet
	7: [
		0b10001110001, // X . . . X X X . . . X
		0b01001110010, // . X . . X X X . . X .
		0b00111111100, // . . X X X X X X X . .
		0b11111111111, // X X X X X X X X X X X
		0b11111111111, // X X X X X X X X X X X
		0b10100000101, // X . X . . . . . X . X
		0b11000000011, // X X . . . . . . . X X
		0b00000000000,
	],
	// 8: Beetle — armored shell ridges, stubby antennae, claw feet
	8: [
		0b00010001000, // . . . X . . . X . . .
		0b01110001110, // . X X X . . . X X X .
		0b11111111111, // X X X X X X X X X X X
		0b10111111101, // X . X X X X X X X . X
		0b11111111111, // X X X X X X X X X X X
		0b11010101011, // X X . X . X . X . X X
		0b00101010100, // . . X . X . X . X . .
		0b00000000000,
	],
	// 9: Ghost — floating oval body, hollow eyes, wispy skirt
	9: [
		0b00111111100, // . . X X X X X X X . .
		0b01100001100, // . X X . . . . X X . .  (hollow eyes)
		0b11111111111, // X X X X X X X X X X X
		0b11111111111, // X X X X X X X X X X X
		0b11111111111, // X X X X X X X X X X X
		0b10101010101, // X . X . X . X . X . X
		0b01010101010, // . X . X . X . X . X .
		0b00000000000,
	],
	// 10: Scorpion — wide pincer arms, segmented tail curl, barb tip
	10: [
		0b11000000011, // X X . . . . . . . X X
		0b11011111011, // X X . X X X X X . X X
		0b01111111110, // . X X X X X X X X X .
		0b00111111100, // . . X X X X X X X . .
		0b11111111111, // X X X X X X X X X X X
		0b10111111101, // X . X X X X X X X . X
		0b00010101000, // . . . X . X . X . . .
		0b00000000000,
	],
	// 11: Moth — broad dusty wings, feathery antennae, fluffy body
	11: [
		0b10001010001, // X . . . X . X . . . X
		0b11011111011, // X X . X X X X X . X X
		0b11111111111, // X X X X X X X X X X X
		0b01111111110, // . X X X X X X X X X .
		0b11111111111, // X X X X X X X X X X X
		0b10010110001, // X . . X . X X . . . X
		0b11000000011, // X X . . . . . . . X X
		0b00000000000,
	],
	// 12: Watcher — cyclopean eye ring, sensor spines, hover pods
	12: [
		0b01001010010, // . X . . X . X . . X .
		0b10110101101, // X . X X . X . X X . X
		0b01111111110, // . X X X X X X X X X .
		0b11100000111, // X X X . . . . . X X X  (hollow eye)
		0b11111111111, // X X X X X X X X X X X
		0b01101110110, // . X X . X X X . X X .
		0b10010001001, // X . . X . . . X . . X
		0b00000000000,
	],
};

// ─── Commit-count color scale ─────────────────────────────────────────────────
// Interpolates through: blue → green → yellow → orange → red
// based on the raw commit count relative to a soft maximum.
function commitCountColor(count: number, mode: ThemeMode): string {
	if (count === 0) return mode === "dark" ? "#58A6FF" : "#0969da";
	// Soft cap: counts above 20 are treated as max
	const t = Math.min(count / 20, 1);
	// Dark stops: bright, saturated — readable on #0d1117
	const darkStops = [
		[0x58, 0xa6, 0xff], // blue
		[0x26, 0xd9, 0xb8], // cyan
		[0x39, 0xd3, 0x53], // green
		[0xfb, 0xbf, 0x24], // yellow
		[0xff, 0x3b, 0x30], // red
	];
	// Light stops: darker, higher-contrast — readable on #ffffff
	const lightStops = [
		[0x09, 0x69, 0xda], // blue
		[0x00, 0x7a, 0x6e], // teal
		[0x1a, 0x7f, 0x37], // green
		[0x9a, 0x67, 0x00], // amber
		[0xcf, 0x22, 0x2e], // red
	];
	const stops = mode === "dark" ? darkStops : lightStops;
	const seg = (stops.length - 1) * t;
	const lo = Math.floor(seg);
	const hi = Math.min(lo + 1, stops.length - 1);
	const f = seg - lo;
	const r = Math.round(stops[lo][0] + (stops[hi][0] - stops[lo][0]) * f);
	const g = Math.round(stops[lo][1] + (stops[hi][1] - stops[lo][1]) * f);
	const b = Math.round(stops[lo][2] + (stops[hi][2] - stops[lo][2]) * f);
	return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// Ship bitmaps: 11 cols × 8 rows, same encoding as alien BITMAP.
// Row 7 always empty. Bit 10 (MSB) = col 0 (left).
const SHIP_BITMAP: Record<number, number[]> = {
	// Rocket — narrow nose, wide base, side nozzles
	1: [
		0b00000100000, // . . . . . X . . . . .
		0b00000100000, // . . . . . X . . . . .
		0b00001110000, // . . . . X X X . . . .
		0b00011111000, // . . . X X X X X . . .
		0b01111111110, // . X X X X X X X X X .
		0b11111111111, // X X X X X X X X X X X
		0b10001110001, // X . . . X X X . . . X
		0b00000000000,
	],
	// Saucer — wide dome body, flat underbelly, dangling legs
	2: [
		0b00011111000, // . . . X X X X X . . .
		0b01111111110, // . X X X X X X X X X .
		0b11111111111, // X X X X X X X X X X X
		0b11111111111, // X X X X X X X X X X X
		0b01010101010, // . X . X . X . X . X .
		0b00101110100, // . . X . X X X . X . .
		0b01000000010, // . X . . . . . . . X .
		0b00000000000,
	],
	// Delta fighter — arrowhead hull, swept wings, twin exhausts
	3: [
		0b00000100000, // . . . . . X . . . . .
		0b00001110000, // . . . . X X X . . . .
		0b00011111000, // . . . X X X X X . . .
		0b00111111100, // . . X X X X X X X . .
		0b01111111110, // . X X X X X X X X X .
		0b11111111111, // X X X X X X X X X X X
		0b10000000001, // X . . . . . . . . . X
		0b00000000000,
	],
	// Cruiser — wide body, twin side pods, sensor dish on top
	4: [
		0b00010101000, // . . . X . X . X . . .
		0b00011111000, // . . . X X X X X . . .
		0b01101110110, // . X X . X X X . X X .
		0b11111111111, // X X X X X X X X X X X
		0b11111111111, // X X X X X X X X X X X
		0b10011111001, // X . . X X X X X . . X
		0b11000000011, // X X . . . . . . . X X
		0b00000000000,
	],
	// Viper — arrowhead with triple engine pods and swept tail
	5: [
		0b00000100000, // . . . . . X . . . . .
		0b00001110000, // . . . . X X X . . . .
		0b00011111000, // . . . X X X X X . . .
		0b00111111100, // . . X X X X X X X . .
		0b11111111111, // X X X X X X X X X X X
		0b11100111011, // X X X . . X X X . X X
		0b11000000011, // X X . . . . . . . X X
		0b00000000000,
	],
	// Phantom — diamond frame, hollow center window, spiked wing tips
	6: [
		0b10000100001, // X . . . . X . . . . X
		0b01001110010, // . X . . X X X . . X .
		0b01111111110, // . X X X X X X X X X .
		0b11111111111, // X X X X X X X X X X X
		0b11111111111, // X X X X X X X X X X X
		0b01111111110, // . X X X X X X X X X .
		0b10000100001, // X . . . . X . . . . X
		0b00000000000,
	],
	// Hornet — swept wings with center spine, split quad exhausts
	7: [
		0b00000100000, // . . . . . X . . . . .
		0b00001110000, // . . . . X X X . . . .
		0b11110111111, // X X X X . X X X X X X
		0b11111111111, // X X X X X X X X X X X
		0b11111111111, // X X X X X X X X X X X
		0b01110111011, // . X X X . X X X . X X
		0b10000000001, // X . . . . . . . . . X
		0b00000000000,
	],
	// Wraith — broad oval hull, triple crown spikes, twin claw legs
	8: [
		0b00100010100, // . . X . . . X . X . .
		0b00111111100, // . . X X X X X X X . .
		0b01111111110, // . X X X X X X X X X .
		0b11111111111, // X X X X X X X X X X X
		0b11111111111, // X X X X X X X X X X X
		0b01111111110, // . X X X X X X X X X .
		0b11001110011, // X X . . X X X . . X X
		0b00000000000,
	],
	// Specter — bat-wing silhouette with split fuselage
	9: [
		0b00000100000, // . . . . . X . . . . .
		0b00011111000, // . . . X X X X X . . .
		0b01111111110, // . X X X X X X X X X .
		0b11110011111, // X X X X . . X X X X X
		0b11110011111, // X X X X . . X X X X X
		0b01111111110, // . X X X X X X X X X .
		0b11100000111, // X X X . . . . . X X X
		0b00000000000,
	],
	// Predator — wide shoulders, claw feet, sensor dish crown
	10: [
		0b11000000011, // X X . . . . . . . X X
		0b01000100010, // . X . . . X . . . X .
		0b11101110111, // X X X . X X X . X X X
		0b11111111111, // X X X X X X X X X X X
		0b11111111111, // X X X X X X X X X X X
		0b11100000111, // X X X . . . . . X X X
		0b10000100001, // X . . . . X . . . . X
		0b00000000000,
	],
	// Eclipse — rounded dome, swept engine skirt, notched belly
	11: [
		0b00011111000, // . . . X X X X X . . .
		0b00111111100, // . . X X X X X X X . .
		0b01111111110, // . X X X X X X X X X .
		0b11111111111, // X X X X X X X X X X X
		0b11111111111, // X X X X X X X X X X X
		0b11001010011, // X X . . X . X . . X X
		0b11010001011, // X X . X . . . X . X X
		0b00000000000,
	],
	// Nova — star fighter with angled strakes and quad nozzles
	12: [
		0b00000100000, // . . . . . X . . . . .
		0b00001110000, // . . . . X X X . . . .
		0b11001110011, // X X . . X X X . . X X
		0b11111111111, // X X X X X X X X X X X
		0b11111111111, // X X X X X X X X X X X
		0b11001110011, // X X . . X X X . . X X
		0b01001010010, // . X . . X . X . . X .
		0b00000000000,
	],
};

function buildDefs(
	accent: string,
	shipAccent: string,
	shipVariant: number,
): string {
	let d = "<defs>\n";
	// Hard clip for bullets — CSS transforms bypass SVG viewport overflow
	d += `<clipPath id="bulletclip"><rect width="${W}" height="${H}"/></clipPath>\n`;
	for (const lv of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
		let rects = "";
		BITMAP[lv].forEach((row, r) => {
			for (let c = 0; c < 11; c++) {
				if (row & (1 << (10 - c)))
					rects += `<rect x="${c}" y="${r}" width="1" height="1" fill="currentColor"/>`;
			}
		});
		d += `<symbol id="a${lv}" viewBox="0 0 11 8" preserveAspectRatio="xMidYMid meet">${rects}</symbol>\n`;
	}
	// Ship symbol rendered from SHIP_BITMAP with its own accent color
	let shipRects = "";
	SHIP_BITMAP[shipVariant].forEach((row, r) => {
		for (let c = 0; c < 11; c++) {
			if (row & (1 << (10 - c)))
				shipRects += `<rect x="${c}" y="${r}" width="1" height="1" fill="${shipAccent}"/>`;
		}
	});
	d += `<symbol id="ship" viewBox="0 0 11 8" preserveAspectRatio="xMidYMid meet">${shipRects}</symbol>\n`;
	d += "</defs>\n";
	return d;
}

// ─── Main generator ───────────────────────────────────────────────────────────
export type ShipVariant =
	| "rocket"
	| "saucer"
	| "delta"
	| "cruiser"
	| "viper"
	| "phantom"
	| "hornet"
	| "wraith"
	| "specter"
	| "predator"
	| "eclipse"
	| "nova";

const SHIP_VARIANT_INDEX: Record<ShipVariant, number> = {
	rocket: 1,
	saucer: 2,
	delta: 3,
	cruiser: 4,
	viper: 5,
	phantom: 6,
	hornet: 7,
	wraith: 8,
	specter: 9,
	predator: 10,
	eclipse: 11,
	nova: 12,
};

export interface InvaderOptions {
	color?: ThemeColor;
	mode?: ThemeMode;
	/** rocket | saucer | delta | cruiser | viper | phantom | hornet | wraith | specter | predator | eclipse | nova */
	ship?: ShipVariant;
	/** GitHub username shown in the centre of the HUD */
	username?: string;
}

export function generateSpaceInvadersSvg(
	data: ContribData,
	opts: InvaderOptions = {},
): string {
	const color = opts.color ?? "green";
	const mode = opts.mode ?? "dark";
	const accentColor: ThemeColor = color === "multi" ? "green" : color;
	const accent = ACCENT[accentColor][mode];
	const bg = BG[mode];
	const dimBg = CELL_BG[mode];
	// Ship variant: explicit option takes priority, else rotate across all 12 designs
	const shipVariant = opts.ship
		? SHIP_VARIANT_INDEX[opts.ship]
		: (data.totalCount % 12) + 1;

	// Ship accent color:
	//   - specific color mode  → same accent as the aliens
	//   - multi mode           → random vivid color picked fresh on every render
	const shipAccent =
		color === "multi"
			? MULTI_SHIP_COLORS[mode][
					Math.floor(Math.random() * MULTI_SHIP_COLORS[mode].length)
				]
			: accent;

	const { cells, totalCount } = data;

	// ── Build per-column alien stacks (bottom row = index 0 = frontmost) ─────────
	// Each entry tracks remaining HP so hits accumulate across visits.
	type Alien = {
		col: number;
		row: number;
		hp: number;
		maxHp: number;
		cy: number;
	};

	// cellMaxHp tracks original HP per cell for opacity stepping
	const cellMaxHp = new Map<string, number>();

	// columnStack[col] = aliens sorted bottom-first (highest row index first)
	const columnStack = new Map<number, Alien[]>();
	for (const c of cells) {
		const h = getHealth(c.count);
		if (h === 0) continue;
		const key = `${c.x}-${c.y}`;
		cellMaxHp.set(key, h);
		if (!columnStack.has(c.x)) columnStack.set(c.x, []);
		columnStack.get(c.x)!.push({
			col: c.x,
			row: c.y,
			hp: h,
			maxHp: h,
			cy: PAD_Y + c.y * STEP + CELL / 2,
		});
	}
	// Sort each column so index 0 = bottom-most (largest row index)
	for (const stack of columnStack.values())
		stack.sort((a, b) => b.row - a.row);

	// ── Pre-compute shot schedule ─────────────────────────────────────────────
	type Shot = {
		id: string;
		shipX: number;
		targetCY: number;
		fireAt: number;
		hitAt: number;
		isKill: boolean;
	};
	// hitTimes: ordered list of all hit times (non-kill + kill last)
	type CellAnim = { killAt: number; hitTimes: number[] };

	const shots: Shot[] = [];
	const cellAnim = new Map<string, CellAnim>();
	// accumulated hit times per cell (non-kill hits)
	const cellHitFlashes = new Map<string, number[]>();
	const shipSnaps: Array<{ x: number; t: number }> = [];

	let t = MARCH;
	let shotIdx = 0;

	// ── Simulation: one bullet per position, move after bullet hits ────────────
	// Each iteration:
	//   1. Find the frontmost (lowest row = closest to ship) alien across all columns.
	//      Among ties pick lowest HP (easiest kill).
	//   2. Fire ONE bullet at it. Wait until bullet hits (TRAVEL time).
	//   3. Reduce HP by 1. If dead, record killAt and pop it from the stack.
	//   4. Ship moves (COL_GAP pause) then picks next target.
	//
	// Ship keyframe contract:
	//   - Push (shipX, t) at arrival       — hold start
	//   - Push (shipX, hitAt) at departure — hold end (ship waits for bullet to land)
	//   - Push (nextX, hitAt+0.001)        — instant snap to next column

	const getTarget = (): Alien | null => {
		let best: Alien | null = null;
		for (const stack of columnStack.values()) {
			if (stack.length === 0) continue;
			const front = stack[0];
			if (
				!best ||
				front.row > best.row || // lower on screen = closer to ship
				(front.row === best.row && front.hp < best.hp) // tie-break: lowest HP
			)
				best = front;
		}
		return best;
	};

	// Pin ship during march phase
	const firstTarget = getTarget();
	const firstX = firstTarget
		? PAD_X + firstTarget.col * STEP + CELL / 2
		: PAD_X + CELL / 2;
	shipSnaps.push({ x: firstX, t: 0 });
	shipSnaps.push({ x: firstX, t: MARCH });

	// No time cap — run until every alien is dead
	while (true) {
		const alien = getTarget();
		if (!alien) break;

		const shipX = PAD_X + alien.col * STEP + CELL / 2;
		const fireAt = t;
		const hitAt = t + TRAVEL;
		const key = `${alien.col}-${alien.row}`;

		// Ship holds at shipX from arrival (t) until bullet lands (hitAt)
		shipSnaps.push({ x: shipX, t: fireAt }); // hold start
		shipSnaps.push({ x: shipX, t: hitAt }); // hold end

		alien.hp -= 1;
		const isKill = alien.hp === 0;

		shots.push({
			id: `b${shotIdx++}`,
			shipX,
			targetCY: alien.cy,
			fireAt,
			hitAt,
			isKill,
		});

		if (isKill) {
			const killAt = hitAt + FLASH;
			const prevHits = cellHitFlashes.get(key) ?? [];
			cellAnim.set(key, { killAt, hitTimes: prevHits });
			// Pop this alien — exposes the one behind it in the same column
			const stack = columnStack.get(alien.col)!;
			stack.shift();
			if (stack.length === 0) columnStack.delete(alien.col);
		} else {
			// Non-kill hit: accumulate hit time for opacity stepping
			if (!cellHitFlashes.has(key)) cellHitFlashes.set(key, []);
			cellHitFlashes.get(key)!.push(hitAt);
		}

		// After bullet lands, ship moves to next target (COL_GAP travel time)
		const nextAlien = getTarget();
		const nextX = nextAlien
			? PAD_X + nextAlien.col * STEP + CELL / 2
			: shipX;
		shipSnaps.push({ x: nextX, t: hitAt + 0.001 }); // snap after hit

		t = hitAt + COL_GAP;
	}

	// TOTAL is the true animation duration: covers every shot + hold before restart
	const TOTAL = t + END_HOLD;
	const pct = (v: number) =>
		((Math.min(v, TOTAL) / TOTAL) * 100).toFixed(5) + "%";

	// Hold ship at final position through end
	shipSnaps.push({ x: shipSnaps[shipSnaps.length - 1].x, t: TOTAL });

	// ── SVG elements ──────────────────────────────────────────────────────────
	// Grid background
	let gridBg = "";
	for (let col = 0; col < COLS; col++)
		for (let row = 0; row < ROWS; row++)
			gridBg += `<rect x="${PAD_X + col * STEP}" y="${PAD_Y + row * STEP}" width="${CELL}" height="${CELL}" fill="${dimBg}" rx="1"/>`;

	// Cell elements + CSS
	const cellSvg: string[] = [];
	const cellCss: string[] = [];

	for (const c of cells) {
		if (c.level === 0) continue;
		const key = `${c.x}-${c.y}`;
		const anim = cellAnim.get(key);
		const id = `c${c.x}x${c.y}`;
		const cx = PAD_X + c.x * STEP;
		const cy = PAD_Y + c.y * STEP;
		const ka = Math.min(anim?.killAt ?? TOTAL * 0.99, TOTAL - 0.01);
		const hitTimes = anim?.hitTimes ?? [];
		const maxHp = cellMaxHp.get(key) ?? 1;

		// Build opacity keyframes: each hit permanently steps opacity down by 1/maxHp
		// so high-HP aliens glow at full brightness and dim progressively with damage.
		let hfCss = "";
		for (let i = 0; i < hitTimes.length; i++) {
			const ht = hitTimes[i];
			const opBefore = (maxHp - i) / maxHp; // opacity level before this hit
			const opAfter = (maxHp - (i + 1)) / maxHp; // base opacity after this hit
			hfCss +=
				// Hold at current brightness until just before impact (no premature fade)
				`${pct(ht - 0.001)}{opacity:${opBefore.toFixed(2)}}` +
				// brief flash-dim on impact
				`${pct(ht)}{opacity:${(opAfter * 0.3).toFixed(2)}}` +
				// settle at new lower base
				`${pct(ht + FLASH)}{opacity:${opAfter.toFixed(2)}}`;
		}

		const alienColor =
			color === "multi" ? commitCountColor(c.count, mode) : accent;
		const fillOpacity = mode === "dark" ? "0.15" : "0.12";
		cellSvg.push(
			`<g id="${id}" color="${alienColor}">` +
				`<rect x="${cx}" y="${cy}" width="${CELL}" height="${CELL}" fill="${alienColor}" opacity="${fillOpacity}" rx="1"/>` +
				`<use href="#a${((c.x * 7 + c.y) % 12) + 1}" x="${cx}" y="${cy}" width="${CELL}" height="${CELL}"/>` +
				`</g>`,
		);

		// Compute opacity just before the kill flash (last sustained level after all hits)
		const opBeforeKill = hitTimes.length > 0 ? 1 / maxHp : 1;
		cellCss.push(
			`#${id}{animation:k${id} ${TOTAL}s linear infinite}` +
				`@keyframes k${id}{` +
				`0%{opacity:1}` +
				hfCss +
				// Hold at full brightness until just before kill flash (prevents linear fade-in from start)
				`${pct(ka - FLASH - 0.001)}{opacity:${opBeforeKill.toFixed(2)}}` +
				`${pct(ka - FLASH)}{opacity:${(opBeforeKill * 0.3).toFixed(2)}}` +
				`${pct(ka)}{opacity:0}` +
				`100%{opacity:0}}`,
		);
	}

	// Bullet elements + CSS
	// Each bullet parks BELOW the SVG viewport at rest (y = H + 10).
	// The SVG clips overflow, so even if opacity glitches the bullet is invisible.
	// A near-instant snap at fireAt-epsilon brings it to barrel while still opacity:0.
	const bulletSvg: string[] = [];
	const bulletCss: string[] = [];

	// Ship barrel tip y position in SVG coords
	const BARREL_Y = SHIP_Y - 4;

	for (const s of shots) {
		const bx = s.shipX - BULLET_W / 2;
		// Bullet rect is placed perfectly at the firing position
		const by = BARREL_Y;

		// translateY value travels to the alien centre
		const dyToTarget = s.targetCY - BARREL_Y;

		// Keyframe timing
		const pWait = pct(Math.max(0, s.fireAt - 0.001));
		const pFire = pct(s.fireAt);
		const pHit = pct(s.hitAt);
		const pDone = pct(Math.min(s.hitAt + 0.001, TOTAL));

		const bulletColor = mode === "dark" ? "#ffffff" : "#24292f";
		bulletSvg.push(
			`<rect id="${s.id}" x="${bx}" y="${by}" width="${BULLET_W}" height="${BULLET_H}" fill="${bulletColor}" opacity="0" rx="1"/>`,
		);

		bulletCss.push(
			`#${s.id}{animation:bm${s.id} ${TOTAL}s linear infinite}` +
				`@keyframes bm${s.id}{` +
				// Wait invisibly at the firing position
				`0%,${pWait}{transform:translateY(0);opacity:0}` +
				// Appear at the barrel
				`${pFire}{transform:translateY(0);opacity:1}` +
				// Travel up to the alien
				`${pHit}{transform:translateY(${dyToTarget}px);opacity:1}` +
				// Disappear on hit and stay there until loop restarts
				`${pDone},100%{transform:translateY(${dyToTarget}px);opacity:0}}`,
		);
	}

	// Ship keyframes — instant snap via near-duplicate keyframe stops
	const shipKf = shipSnaps
		.map((s) => `${pct(s.t)}{transform:translate(${s.x}px,${SHIP_Y}px)}`)
		.join("");
	const shipCss =
		`#shipg{animation:shipm ${TOTAL}s linear infinite}` +
		`@keyframes shipm{${shipKf}}`;

	// March oscillation
	const marchCss =
		`#marchg{animation:march ${TOTAL}s linear infinite}` +
		`@keyframes march{` +
		`0%{transform:translateX(0)}` +
		`${pct(MARCH * 0.25)}{transform:translateX(4px)}` +
		`${pct(MARCH * 0.75)}{transform:translateX(-4px)}` +
		`${pct(MARCH)}{transform:translateX(0)}` +
		`100%{transform:translateX(0)}}`;

	// Scanline flicker (retro CRT effect)
	const scanCss =
		`#scan{animation:scanf ${TOTAL}s linear infinite}` +
		`@keyframes scanf{0%{opacity:.04}50%{opacity:.08}100%{opacity:.04}}`;

	// HUD
	const hudAttr = `font-size="8" font-family="monospace" font-weight="bold" letter-spacing="1"`;
	const commits = totalCount.toString();
	const centerText = opts.username ? `@${opts.username.toUpperCase()}` : "";
	const hud =
		`<text x="${PAD_X}" y="20" fill="${accent}" ${hudAttr} text-anchor="start">GIT-INVADERS</text>` +
		(centerText
			? `<text x="${W / 2}" y="20" fill="${accent}" ${hudAttr} text-anchor="middle">${centerText}</text>`
			: "") +
		`<text x="${W - PAD_X}" y="20" fill="${accent}" ${hudAttr} text-anchor="end">COMMITS: ${commits}</text>`;

	// Ground line
	const ground = `<line x1="${PAD_X}" y1="${SHIP_Y + 14}" x2="${W - PAD_X}" y2="${SHIP_Y + 14}" stroke="${accent}" stroke-width="1" opacity=".5"/>`;

	// CRT scanline overlay
	const scanOverlay = `<rect id="scan" width="${W}" height="${H}" fill="none" stroke="${accent}" stroke-width="2" opacity=".04" pointer-events="none"/>`;

	const allCss = [marchCss, shipCss, scanCss, ...cellCss, ...bulletCss].join(
		"\n",
	);

	return [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
		`<rect width="${W}" height="${H}" fill="${bg}"/>`,
		buildDefs(accent, shipAccent, shipVariant),
		`<style>${allCss}</style>`,
		hud,
		gridBg,
		`<g id="marchg">${cellSvg.join("")}</g>`,
		`<g clip-path="url(#bulletclip)">${bulletSvg.join("")}</g>`,
		ground,
		// Ship use: offset x/y so the bitmap's column 5 (center) aligns with shipX.
		// Symbol is 11×8px, scale to 14×10 to match original ship footprint.
		`<g id="shipg"><use href="#ship" x="-7" y="-9" width="14" height="10"/></g>`,
		scanOverlay,
		`</svg>`,
	].join("\n");
}
