import * as fs from "fs";
import * as path from "path";
import { generateSpaceInvadersSvg, ThemeColor, ThemeMode } from "./games/space-invaders";
import { ContribData, Cell } from "./types";

function mockData(seed = 42): ContribData {
  const cells: Cell[] = [];
  const start = new Date("2024-04-28T00:00:00Z");
  let s = seed;
  const rand = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0x100000000; };

  for (let col = 0; col < 53; col++) {
    for (let row = 0; row < 7; row++) {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + col * 7 + row);
      const date = d.toISOString().slice(0, 10);
      const isWeekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;

      let count = 0;
      if (col >= 10 && col <= 13) { count = 0; }
      else if (!isWeekend) {
        const r = rand();
        if (r < 0.15) count = 0;
        else if (r < 0.35) count = Math.ceil(rand() * 2);
        else if (r < 0.60) count = 2 + Math.ceil(rand() * 5);
        else if (r < 0.80) count = 6 + Math.ceil(rand() * 9);
        else count = 12 + Math.ceil(rand() * 10);
      } else {
        count = rand() < 0.25 ? Math.ceil(rand() * 5) : 0;
      }

      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (count >= 10) level = 4;
      else if (count >= 6) level = 3;
      else if (count >= 3) level = 2;
      else if (count > 0)  level = 1;

      const colorMap = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"];
      cells.push({ x: col, y: row, level, count, date, color: colorMap[level] });
    }
  }

  const totalCount = cells.reduce((s, c) => s + c.count, 0);
  return { cells, totalCount };
}

const data = mockData();
const nonEmpty = data.cells.filter(c => c.level > 0);
console.log(`Cells: ${data.cells.length}, Non-empty: ${nonEmpty.length}, Total: ${data.totalCount}`);

const themes: Array<{ color: ThemeColor; mode: ThemeMode }> = [
  { color: "green",  mode: "dark"  },
  { color: "blue",   mode: "dark"  },
  { color: "orange", mode: "dark"  },
  { color: "pink",   mode: "dark"  },
  { color: "yellow", mode: "light" },
];

const outDir = path.join(__dirname, "../dist");
fs.mkdirSync(outDir, { recursive: true });

for (const theme of themes) {
  const svg  = generateSpaceInvadersSvg(data, theme);
  const name = `space-invaders-${theme.color}-${theme.mode}.svg`;
  const out  = path.join(outDir, name);
  fs.writeFileSync(out, svg, "utf-8");
  console.log(`${name}: ${(svg.length / 1024).toFixed(1)} KB`);
}
