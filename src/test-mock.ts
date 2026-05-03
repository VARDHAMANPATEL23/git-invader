import * as fs from "fs";
import * as path from "path";
import {
	generateSpaceInvadersSvg,
	ThemeColor,
	ThemeMode,
	ShipVariant,
} from "./games/space-invaders";
import { ContribData, Cell } from "./types";

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
