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
export type ThemeColor = "green" | "blue" | "orange" | "pink" | "yellow";
export type ThemeMode = "dark" | "light";

const ACCENT: Record<ThemeColor, Record<ThemeMode, string>> = {
	green: { dark: "#39d353", light: "#216e39" },
	blue: { dark: "#58A6FF", light: "#0969da" },
	orange: { dark: "#F78166", light: "#bc4c00" },
	pink: { dark: "#FF79C6", light: "#bf3989" },
	yellow: { dark: "#FBBF24", light: "#9a6700" },
};
const BG: Record<ThemeMode, string> = { dark: "#0d1117", light: "#ffffff" };

const CELL_BG: Record<ThemeMode, string> = {
	dark: "#161b22",
	light: "#ebedf0",
};

// ─── Health calculation ───────────────────────────────────────────────────────
function getHealth(count: number): number {
	if (count === 0) return 0;
	if (count > 15) {
		const h = count % 15;
		return h === 0 ? 15 : h;
	}
	if (count > 10) {
		const h = count % 10;
		return h === 0 ? 10 : h;
	}
	return count;
}

// ─── Alien symbols ────────────────────────────────────────────────────────────
const BITMAP: Record<number, number[]> = {
	1: [
		0b00100000100, 0b00111111100, 0b01101110110, 0b11111111111,
		0b10111111101, 0b10100000101, 0b00011011000, 0b00000000000,
	],
	2: [
		0b00010001000, 0b10111111101, 0b11101110111, 0b11111111111,
		0b01111111110, 0b00100000100, 0b01000000010, 0b00000000000,
	],
	3: [
		0b01111111110, 0b11011111011, 0b11111111111, 0b01011111010,
		0b00110110011, 0b11000000011, 0b00110110011, 0b00000000000,
	],
	4: [
		0b11111111111, 0b10111111101, 0b11011001011, 0b11111111111,
		0b01110110111, 0b10001100001, 0b01110110111, 0b00000000000,
	],
};

function buildDefs(accent: string): string {
	let d = "<defs>\n";
	// Hard clip for bullets — CSS transforms bypass SVG viewport overflow
	d += `<clipPath id="bulletclip"><rect width="${W}" height="${H}"/></clipPath>\n`;
	for (const lv of [1, 2, 3, 4]) {
		let rects = "";
		BITMAP[lv].forEach((row, r) => {
			for (let c = 0; c < 11; c++) {
				if (row & (1 << (10 - c)))
					rects += `<rect x="${c}" y="${r}" width="1" height="1" fill="${accent}"/>`;
			}
		});
		d += `<symbol id="a${lv}" viewBox="0 0 11 8" preserveAspectRatio="xMidYMid meet">${rects}</symbol>\n`;
	}
	// Ship symbol: simple rocket, monochrome
	d += `<symbol id="ship" viewBox="-6 -5 12 12">
<rect x="-1" y="-5" width="2" height="3" fill="${accent}"/>
<rect x="-3" y="-2" width="6" height="2" fill="${accent}"/>
<rect x="-5" y="0"  width="10" height="3" fill="${accent}"/>
<rect x="-6" y="3"  width="12" height="2" fill="${accent}"/>
<rect x="-6" y="3"  width="3"  height="2" fill="${accent}" opacity=".5"/>
<rect x="3"  y="3"  width="3"  height="2" fill="${accent}" opacity=".5"/>
</symbol>\n`;
	d += "</defs>\n";
	return d;
}

// ─── Main generator ───────────────────────────────────────────────────────────
export interface InvaderOptions {
	color?: ThemeColor;
	mode?: ThemeMode;
}

export function generateSpaceInvadersSvg(
	data: ContribData,
	opts: InvaderOptions = {},
): string {
	const color = opts.color ?? "green";
	const mode = opts.mode ?? "dark";
	const accent = ACCENT[color][mode];
	const bg = BG[mode];
	const dimBg = CELL_BG[mode];

	const { cells, totalCount } = data;

	// ── Build per-column alien stacks (bottom row = index 0 = frontmost) ─────────
	// Each entry tracks remaining HP so hits accumulate across visits.
	type Alien = { col: number; row: number; hp: number; maxHp: number; cy: number };

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
			const opAfter = (maxHp - (i + 1)) / maxHp; // base opacity after this hit
			hfCss +=
				// brief flash-dim on impact
				`${pct(ht)}{opacity:${(opAfter * 0.3).toFixed(2)}}` +
				// settle at new lower base
				`${pct(ht + FLASH)}{opacity:${opAfter.toFixed(2)}}`;
		}

		const fillOpacity = mode === "dark" ? "0.15" : "0.12";
		cellSvg.push(
			`<g id="${id}">` +
				`<rect x="${cx}" y="${cy}" width="${CELL}" height="${CELL}" fill="${accent}" opacity="${fillOpacity}" rx="1"/>` +
				`<use href="#a${c.level}" x="${cx}" y="${cy}" width="${CELL}" height="${CELL}"/>` +
				`</g>`,
		);

		// Compute opacity just before the kill flash (last sustained level after all hits)
		const opBeforeKill = hitTimes.length > 0 ? (1 / maxHp) : 1;
		cellCss.push(
			`#${id}{animation:k${id} ${TOTAL}s linear infinite}` +
				`@keyframes k${id}{` +
				`0%{opacity:1}` +
				hfCss +
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
	// Off-screen parking position (below SVG bottom edge, clipped)
	const PARK_Y = H + 10;

	for (const s of shots) {
		const bx = s.shipX - BULLET_W / 2;
		// Bullet rect is placed at PARK_Y (off-screen below)
		const by = PARK_Y;

		// translateY values relative to PARK_Y base position
		const dyToBarrel = BARREL_Y - BULLET_H - PARK_Y; // snap up to barrel tip
		const dyToTarget = s.targetCY - PARK_Y;           // travel to alien centre

		// Keyframe timing
		const p0  = pct(Math.max(0, s.fireAt - 0.002));   // last "hidden off-screen" frame
		const p0b = pct(Math.max(0, s.fireAt - 0.001));   // snap to barrel (still invisible)
		const p1  = pct(s.fireAt);                         // appear at barrel
		const p2  = pct(s.hitAt);                          // reach target
		const fadeEnd = Math.min(s.hitAt + 0.04, TOTAL);
		const snapBack = Math.min(fadeEnd + 0.001, TOTAL);
		const p2b = pct(fadeEnd);   // fade out in place
		const p2c = pct(snapBack);  // snap back off-screen

		const bulletColor = mode === "dark" ? "#ffffff" : "#24292f";
		bulletSvg.push(
			`<rect id="${s.id}" x="${bx}" y="${by}" width="${BULLET_W}" height="${BULLET_H}" fill="${bulletColor}" opacity="0" rx="1"/>`,
		);

		bulletCss.push(
			`#${s.id}{animation:bm${s.id} ${TOTAL}s linear infinite}` +
				`@keyframes bm${s.id}{` +
				// Parked off-screen below viewport — clipped even if opacity glitches
				`0%,${p0}{transform:translateY(0);opacity:0}` +
				// Snap to barrel position while still invisible
				`${p0b}{transform:translateY(${dyToBarrel}px);opacity:0}` +
				// Appear at barrel and fire
				`${p1}{transform:translateY(${dyToBarrel}px);opacity:1}` +
				// Travel up to alien
				`${p2}{transform:translateY(${dyToTarget}px);opacity:1}` +
				// Fade out in place (no transform snap = no flash artifact)
				`${p2b}{transform:translateY(${dyToTarget}px);opacity:0}` +
				// Snap back off-screen, stay there until loop restarts
				`${p2c},100%{transform:translateY(0);opacity:0}}`,
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
	const score = totalCount.toString().padStart(6, "0");
	const hud =
		`<text x="${PAD_X}" y="20" fill="${accent}" font-size="8" font-family="monospace" font-weight="bold" letter-spacing="1">SCORE: ${score}</text>` +
		`<text x="${W / 2}" y="20" fill="${accent}" font-size="8" font-family="monospace" font-weight="bold" letter-spacing="1" text-anchor="middle">CONTRIB-ARCADE</text>` +
		`<text x="${W - PAD_X}" y="20" fill="${accent}" font-size="8" font-family="monospace" font-weight="bold" letter-spacing="1" text-anchor="end">HI: ${score}</text>`;

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
		buildDefs(accent),
		`<style>${allCss}</style>`,
		hud,
		gridBg,
		`<g id="marchg">${cellSvg.join("")}</g>`,
		`<g clip-path="url(#bulletclip)">${bulletSvg.join("")}</g>`,
		ground,
		// x="-6" shifts the use element left so the ship's visual center (symbol x=0)
		// aligns with the group origin, matching the bullet's x position.
		`<g id="shipg"><use href="#ship" x="-6" width="12" height="10"/></g>`,
		scanOverlay,
		`</svg>`,
	].join("\n");
}
