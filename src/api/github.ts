import { Cell, ContribData } from "../types";

// Maps GitHub's contribution color strings to levels 0–4
const COLOR_TO_LEVEL: Record<string, 0 | 1 | 2 | 3 | 4> = {
  "#ebedf0": 0,
  "#9be9a8": 1,
  "#40c463": 2,
  "#30a14e": 3,
  "#216e39": 4,
  // dark theme variants
  "#161b22": 0,
  "#0e4429": 1,
  "#006d32": 2,
  "#26a641": 3,
  "#39d353": 4,
};

function colorToLevel(hex: string): 0 | 1 | 2 | 3 | 4 {
  return COLOR_TO_LEVEL[hex.toLowerCase()] ?? (hex === "#ebedf0" || hex === "#161b22" ? 0 : 1);
}

/**
 * Fetches contribution data by scraping the GitHub contributions endpoint.
 * Same approach as Platane/snk — parses the SVG rect elements from the page.
 */
export async function fetchContributions(
  username: string,
  token: string
): Promise<ContribData> {
  // Use GraphQL API — more reliable than HTML scraping
  const query = `
    query($username: String!) {
      user(login: $username) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
                color
              }
            }
          }
        }
      }
    }
  `;

  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables: { username } }),
  });

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as any;

  if (json.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(json.errors)}`);
  }

  const calendar = json.data.user.contributionsCollection.contributionCalendar;
  const totalCount: number = calendar.totalContributions;

  const cells: Cell[] = [];

  calendar.weeks.forEach((week: any, weekIdx: number) => {
    week.contributionDays.forEach((day: any) => {
      const date: string = day.date;
      const count: number = day.contributionCount;
      const color: string = day.color;

      // Day of week from date string (0 = Sunday)
      const dayOfWeek = new Date(date + "T00:00:00Z").getUTCDay();

      cells.push({
        x: weekIdx,
        y: dayOfWeek,
        level: count === 0 ? 0 : colorToLevel(color),
        count,
        date,
        color,
      });
    });
  });

  return { cells, totalCount };
}
