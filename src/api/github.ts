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

	// Build a map from td id -> actual contribution count via tooltip text.
	// Tooltip format: <label for="contribution-day-component-0-3" ...>4 contributions on ...</label>
	// or "No contributions on ..."
	const countById = new Map<string, number>();
	const tooltipRegex =
		/for="(contribution-day-component-[\d-]+)"[^>]*>(\d+) contributions/g;
	let m: RegExpExecArray | null;
	while ((m = tooltipRegex.exec(html)) !== null) {
		countById.set(m[1], parseInt(m[2], 10));
	}

	// Match entire <td ...> tags that are contribution day cells (order-independent attribute parsing)
	const tdTagRegex =
		/<td\s[^>]*class="[^"]*ContributionCalendar-day[^"]*"[^>]*>/g;
	const attrRegex = /([\w-]+)="([^"]*)"/g;

	const cells: Cell[] = [];
	let totalCount = 0;

	while ((m = tdTagRegex.exec(html)) !== null) {
		const tag = m[0];
		const attrs: Record<string, string> = {};
		let a: RegExpExecArray | null;
		attrRegex.lastIndex = 0;
		while ((a = attrRegex.exec(tag)) !== null) attrs[a[1]] = a[2];

		const id = attrs["id"];
		const date = attrs["data-date"];
		const level = parseInt(attrs["data-level"] ?? "0", 10) as
			| 0
			| 1
			| 2
			| 3
			| 4;
		const colIdx = parseInt(attrs["data-ix"] ?? "0", 10);
		if (!id || !date) continue;

		const count = countById.get(id) ?? (level > 0 ? level : 0);
		const dayOfWeek = new Date(date + "T00:00:00Z").getUTCDay();

		cells.push({
			x: colIdx,
			y: dayOfWeek,
			level,
			count,
			date,
			color: "",
		});

		totalCount += count;
	}

	if (cells.length === 0) {
		throw new Error(
			`Could not parse contribution data for "${username}". GitHub HTML structure may have changed.`,
		);
	}

	return { cells, totalCount };
}
