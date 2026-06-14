/** Resolved theme colors handed to every chart option builder. */
export interface ChartPalette {
  text: string;
  textStrong: string;
  axis: string;
  split: string;
  tooltipBg: string;
  tooltipText: string;
  accent: string;
  /** Categorical series colors (8). */
  series: string[];
  /** Heatmap ramp, light → intense (4). */
  heat: string[];
  emptyCell: string;
  cellBorder: string;
}
