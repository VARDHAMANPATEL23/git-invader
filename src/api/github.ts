import { Cell, ContribData } from "../types";

const COLOR_TO_LEVEL: Record<string, 0 | 1 | 2 | 3 | 4> = {
	"#ebedf0": 0,
	"#9be9a8": 1,
	"#40c463": 2,
	"#30a14e": 3,
	"#216e39": 4,
	"#161b22": 0,
	"#0e4429": 1,
	"#006d32": 2,
	"#26a641": 3,
	"#39d353": 4,
};

function colorToLevel(hex: string): 0 | 1 | 2 | 3 | 4 {
	return (
		COLOR_TO_LEVEL[hex.toLowerCase()] ??
		(hex === "#ebedf0" || hex === "#161b22" ? 0 : 1)
	);
}

export async function fetchContributions(
	username: string,
	_token: string,
): Promise<ContribData> {
	const url = `https://github.com/users/${username}/contributions`;
	const res = await fetch(url, {
		headers: { "X-Requested-With": "XMLHttpRequest" },
	});

	if (!res.ok) {
		throw new Error(
			`GitHub contributions fetch error: ${res.status} ${res.statusText}`,
		);
	}

	const html = await res.text();

	// Parse <td data-date="..." data-level="..."> or <rect ... data-date="..." data-count="..." fill="...">
	const cells: Cell[] = [];
	let totalCount = 0;

	// GitHub renders contribution cells as <td> with data-date and data-level
	const tdRegex =
		/<td[^>]+data-date="(\d{4}-\d{2}-\d{2})"[^>]+data-level="(\d)"[^>]*>/g;
	let match: RegExpExecArray | null;
	let weekIdx = -1;
	let prevWeek = "";

	while ((match = tdRegex.exec(html)) !== null) {
		const date = match[1];
		const level = parseInt(match[2], 10) as 0 | 1 | 2 | 3 | 4;
		const week = date.slice(0, 7); // YYYY-MM
		if (week !== prevWeek) {
			weekIdx++;
			prevWeek = week;
		}
		const dayOfWeek = new Date(date + "T00:00:00Z").getUTCDay();
		cells.push({
			x: weekIdx,
			y: dayOfWeek,
			level,
			count: level,
			date,
			color: "",
		});
	}

	// If <td> parsing yielded nothing, fall back to <rect> (older GitHub markup)
	if (cells.length === 0) {
		const rectRegex =
			/<rect[^>]+data-date="(\d{4}-\d{2}-\d{2})"[^>]+data-count="(\d+)"[^>]+fill="(#[0-9a-fA-F]+)"[^>]*>/g;
		weekIdx = -1;
		prevWeek = "";
		while ((match = rectRegex.exec(html)) !== null) {
			const date = match[1];
			const count = parseInt(match[2], 10);
			const color = match[3];
			const week = date.slice(0, 7);
			if (week !== prevWeek) {
				weekIdx++;
				prevWeek = week;
			}
			const dayOfWeek = new Date(date + "T00:00:00Z").getUTCDay();
			const level = count === 0 ? 0 : colorToLevel(color);
			cells.push({ x: weekIdx, y: dayOfWeek, level, count, date, color });
			totalCount += count;
		}
	} else {
		// count is approximated from level for <td> path; sum levels as proxy
		totalCount = cells.reduce((s, c) => s + c.count, 0);
	}

	if (cells.length === 0) {
		throw new Error(
			`Could not parse contribution data for "${username}". The GitHub HTML structure may have changed.`,
		);
	}

	return { cells, totalCount };
}
