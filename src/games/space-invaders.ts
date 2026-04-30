import { Cell, ContribData } from "../types";

// ─── Layout ───────────────────────────────────────────────────────────────────
const CELL   = 12;
const GAP    = 2;
const STEP   = CELL + GAP;
const COLS   = 53;
const ROWS   = 7;
const PAD_X  = 16;
const PAD_Y  = 36;
const W      = COLS * STEP + PAD_X * 2;
const H      = ROWS * STEP + PAD_Y + 68;
const SHIP_Y = PAD_Y + ROWS * STEP + 26;

// ─── Fixed 30-second budget ───────────────────────────────────────────────────
const TOTAL   = 30;
const MARCH   = 2.0;
const TRAVEL  = 0.06;  // laser travel time
const FLASH   = 0.05;  // kill-flash before cell dies
const SHOT_T  = 0.10;  // total time spent per shot
const COL_GAP = 0.06;  // gap between columns

// ─── Themes ───────────────────────────────────────────────────────────────────
export type ThemeColor = "green" | "blue" | "orange" | "pink" | "yellow";
export type ThemeMode  = "dark"  | "light";

const ACCENT: Record<ThemeColor, string> = {
  green:  "#39d353",
  blue:   "#58A6FF",
  orange: "#F78166",
  pink:   "#FF79C6",
  yellow: "#FBBF24",
};
const BG:       Record<ThemeMode, string> = { dark: "#0d1117", light: "#f0f6ff" };
const TEXT_DIM: Record<ThemeMode, string> = { dark: "#30363d", light: "#d0d7de" };
const CELL_BG:  Record<ThemeMode, string> = { dark: "#161b22", light: "#eaeef2" };

// ─── Health calculation ───────────────────────────────────────────────────────
function getHealth(count: number): number {
  if (count === 0) return 0;
  if (count > 15) { const h = count % 15; return h === 0 ? 15 : h; }
  if (count > 10) { const h = count % 10; return h === 0 ? 10 : h; }
  return count;
}

// ─── Deterministic shuffle (seeded LCG) ──────────────────────────────────────
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed >>> 0;
  for (let i = out.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ─── Alien symbols ────────────────────────────────────────────────────────────
const BITMAP: Record<number, number[]> = {
  1: [0b00100000100, 0b00111111100, 0b01101110110, 0b11111111111,
      0b10111111101, 0b10100000101, 0b00011011000, 0b00000000000],
  2: [0b00010001000, 0b10111111101, 0b11101110111, 0b11111111111,
      0b01111111110, 0b00100000100, 0b01000000010, 0b00000000000],
  3: [0b01111111110, 0b11011111011, 0b11111111111, 0b01011111010,
      0b00110110011, 0b11000000011, 0b00110110011, 0b00000000000],
  4: [0b11111111111, 0b10111111101, 0b11011001011, 0b11111111111,
      0b01110110111, 0b10001100001, 0b01110110111, 0b00000000000],
};

function buildDefs(accent: string): string {
  let d = "<defs>\n";
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

// ─── Percent helper ───────────────────────────────────────────────────────────
const pct = (t: number) => (Math.min(t, TOTAL) / TOTAL * 100).toFixed(2) + "%";

// ─── Main generator ───────────────────────────────────────────────────────────
export interface InvaderOptions {
  color?: ThemeColor;
  mode?:  ThemeMode;
}

export function generateSpaceInvadersSvg(
  data: ContribData,
  opts: InvaderOptions = {}
): string {
  const color  = opts.color ?? "green";
  const mode   = opts.mode  ?? "dark";
  const accent = ACCENT[color];
  const bg     = BG[mode];
  const dimBg  = CELL_BG[mode];
  const textDim = TEXT_DIM[mode];

  const { cells, totalCount } = data;

  // Build target list: assign health per cell
  type Target = { col: number; row: number; health: number; cx: number; cy: number };
  const targets: Target[] = [];

  for (const c of cells) {
    const h = getHealth(c.count);
    if (h === 0) continue;
    targets.push({
      col: c.x, row: c.y, health: h,
      cx: PAD_X + c.x * STEP,
      cy: PAD_Y + c.y * STEP,
    });
  }

  // Budget: available time for shooting
  const shootBudget = TOTAL - MARCH;

  // Estimate time: per shot = SHOT_T, per column change = COL_GAP
  // Sort by health desc, take until budget exhausted
  targets.sort((a, b) => b.health - a.health);

  // Prune to fit in 30s
  let timeCost = 0;
  const selected: Target[] = [];
  const colSet = new Set<number>();
  for (const t of targets) {
    const extra = t.health * SHOT_T + (colSet.has(t.col) ? 0 : COL_GAP);
    if (timeCost + extra > shootBudget - 0.5) continue;
    timeCost += extra;
    colSet.add(t.col);
    selected.push(t);
  }

  // Group by column
  const byCol = new Map<number, Target[]>();
  for (const t of selected) {
    if (!byCol.has(t.col)) byCol.set(t.col, []);
    byCol.get(t.col)!.push(t);
  }
  // Within each column: bottom to top
  for (const [, arr] of byCol) arr.sort((a, b) => b.row - a.row);

  // Shuffle column order for "random snap" look
  const colOrder = seededShuffle([...byCol.keys()], totalCount);

  // ── Pre-compute shot schedule ─────────────────────────────────────────────
  type Shot = {
    id: string; shipX: number; targetCY: number;
    fireAt: number; hitAt: number; isKill: boolean;
  };
  type CellAnim = { killAt: number; hitFlashes: number[] };

  const shots: Shot[] = [];
  const cellAnim = new Map<string, CellAnim>();
  const shipSnaps: Array<{ x: number; t: number }> = [];

  let t = MARCH;
  let shotIdx = 0;

  shipSnaps.push({ x: PAD_X + (colOrder[0] ?? 0) * STEP + CELL / 2, t: 0 });

  for (const col of colOrder) {
    const colTargets = byCol.get(col)!;
    const shipX = PAD_X + col * STEP + CELL / 2;

    // Snap: two keyframes very close = instant teleport
    shipSnaps.push({ x: shipX, t: t - 0.001 });
    shipSnaps.push({ x: shipX, t });

    for (const tgt of colTargets) {
      const targetCY = tgt.cy + CELL / 2;
      const key = `${tgt.col}-${tgt.row}`;
      const hitFlashes: number[] = [];

      for (let s = 0; s < tgt.health; s++) {
        const isKill = s === tgt.health - 1;
        const fireAt = t;
        const hitAt  = t + TRAVEL;
        shots.push({ id: `ls${shotIdx++}`, shipX, targetCY, fireAt, hitAt, isKill });
        if (!isKill) hitFlashes.push(hitAt);
        t += SHOT_T;
      }

      cellAnim.set(key, { killAt: t - SHOT_T + TRAVEL + FLASH, hitFlashes });
    }
    t += COL_GAP;
  }

  // Final ship position stays at last column
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
    const id   = `c${c.x}x${c.y}`;
    const cx   = PAD_X + c.x * STEP;
    const cy   = PAD_Y + c.y * STEP;
    const ka   = Math.min(anim?.killAt ?? TOTAL * 0.99, TOTAL - 0.01);
    const hf   = anim?.hitFlashes ?? [];

    // Hit flash keyframe stops
    let hfCss = "";
    for (const ht of hf) {
      hfCss += `${pct(ht)}{opacity:.25}${pct(ht + FLASH * 0.5)}{opacity:1}`;
    }

    // Alien fill: monochrome — very dim accent bg, full accent sprite
    const fillOpacity = mode === "dark" ? "0.15" : "0.12";
    cellSvg.push(
      `<g id="${id}">`
      + `<rect x="${cx}" y="${cy}" width="${CELL}" height="${CELL}" fill="${accent}" opacity="${fillOpacity}" rx="1"/>`
      + `<use href="#a${c.level}" x="${cx}" y="${cy}" width="${CELL}" height="${CELL}"/>`
      + `</g>`
    );

    cellCss.push(
      `#${id}{animation:k${id} ${TOTAL}s linear infinite}`
      + `@keyframes k${id}{`
      + `0%{opacity:1}`
      + hfCss
      + `${pct(ka - FLASH)}{opacity:1;filter:brightness(5)}`
      + `${pct(ka)}{opacity:0;filter:none}`
      + `100%{opacity:0}}`
    );
  }

  // Laser elements + CSS (stroke-dashoffset trick)
  const laserSvg: string[] = [];
  const laserCss: string[] = [];

  for (const s of shots) {
    const len  = Math.round(SHIP_Y - s.targetCY);
    const p0   = pct(Math.max(0, s.fireAt - 0.005));
    const p1   = pct(s.fireAt);
    const p2   = pct(s.hitAt);
    const p2b  = pct(Math.min(s.hitAt + 0.03, TOTAL));

    laserSvg.push(
      `<line id="${s.id}" x1="${s.shipX}" y1="${SHIP_Y}" x2="${s.shipX}" y2="${s.targetCY}"`
      + ` stroke="${accent}" stroke-width="2" stroke-linecap="round"`
      + ` stroke-dasharray="${len}" stroke-dashoffset="${len}"/>`
    );

    laserCss.push(
      `#${s.id}{animation:la${s.id} ${TOTAL}s linear infinite}`
      + `@keyframes la${s.id}{`
      + `0%,${p0}{stroke-dashoffset:${len};opacity:0}`
      + `${p1}{stroke-dashoffset:${len};opacity:1}`
      + `${p2}{stroke-dashoffset:0;opacity:1}`
      + `${p2b}{stroke-dashoffset:0;opacity:0}`
      + `100%{stroke-dashoffset:0;opacity:0}}`
    );
  }

  // Ship keyframes — instant snap via near-duplicate keyframe stops
  const shipKf = shipSnaps.map(s => `${pct(s.t)}{transform:translate(${s.x}px,${SHIP_Y}px)}`).join("");
  const shipCss = `#shipg{animation:shipm ${TOTAL}s linear infinite}`
    + `@keyframes shipm{${shipKf}}`;

  // March oscillation
  const marchCss = `#marchg{animation:march ${TOTAL}s linear infinite}`
    + `@keyframes march{`
    + `0%{transform:translateX(0)}`
    + `${pct(MARCH * .25)}{transform:translateX(4px)}`
    + `${pct(MARCH * .75)}{transform:translateX(-4px)}`
    + `${pct(MARCH)}{transform:translateX(0)}`
    + `100%{transform:translateX(0)}}`;

  // Scanline flicker (retro CRT effect)
  const scanCss = `#scan{animation:scanf ${TOTAL}s linear infinite}`
    + `@keyframes scanf{0%{opacity:.04}50%{opacity:.08}100%{opacity:.04}}`;

  // HUD
  const score = totalCount.toString().padStart(6, "0");
  const hud = `<text x="${PAD_X}" y="20" fill="${accent}" font-size="8" font-family="monospace" font-weight="bold" letter-spacing="1">SCORE: ${score}</text>`
    + `<text x="${W / 2}" y="20" fill="${accent}" font-size="8" font-family="monospace" font-weight="bold" letter-spacing="1" text-anchor="middle">CONTRIB-ARCADE</text>`
    + `<text x="${W - PAD_X}" y="20" fill="${accent}" font-size="8" font-family="monospace" font-weight="bold" letter-spacing="1" text-anchor="end">HI: ${score}</text>`;

  // Ground line
  const ground = `<line x1="${PAD_X}" y1="${SHIP_Y + 14}" x2="${W - PAD_X}" y2="${SHIP_Y + 14}" stroke="${accent}" stroke-width="1" opacity=".5"/>`;

  // CRT scanline overlay
  const scanOverlay = `<rect id="scan" width="${W}" height="${H}" fill="none" stroke="${accent}" stroke-width="2" opacity=".04" pointer-events="none"/>`;

  const allCss = [marchCss, shipCss, scanCss, ...cellCss, ...laserCss].join("\n");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    `<rect width="${W}" height="${H}" fill="${bg}"/>`,
    buildDefs(accent),
    `<style>${allCss}</style>`,
    hud,
    gridBg,
    `<g id="marchg">${cellSvg.join("")}</g>`,
    laserSvg.join(""),
    ground,
    `<g id="shipg"><use href="#ship" width="12" height="10"/></g>`,
    scanOverlay,
    `</svg>`,
  ].join("\n");
}
