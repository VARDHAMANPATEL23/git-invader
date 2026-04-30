// Normalized contribution cell
export type Cell = {
  x: number;      // column index (week), 0-based, 0 = oldest
  y: number;      // row index (day of week), 0 = Sunday
  level: 0 | 1 | 2 | 3 | 4;
  count: number;  // raw contribution count
  date: string;   // "YYYY-MM-DD"
  color: string;  // github hex color string
};

export type ContribData = {
  cells: Cell[];
  totalCount: number;
};
