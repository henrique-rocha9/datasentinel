/**
 * Recharts theme tokens — read CSS variables defined in styles.css so charts
 * always match the active light/dark theme without re-rendering.
 *
 * Usage:
 *   <Line stroke={CHART.primary} />
 *   <Tooltip contentStyle={chartTooltipStyle} />
 *
 * SSR-safe: values are CSS var() strings; the browser resolves them at paint time.
 */
export const CHART = {
  primary: "var(--color-chart-1)",
  amber: "var(--color-chart-2)",
  success: "var(--color-chart-3)",
  danger: "var(--color-chart-4)",
  violet: "var(--color-chart-5)",
  grid: "var(--color-border)",
  axis: "var(--color-muted-foreground)",
  riskLow: "var(--color-risk-low)",
  riskMedium: "var(--color-risk-medium)",
  riskHigh: "var(--color-risk-high)",
  riskCritical: "var(--color-risk-critical)",
} as const;

export const chartTooltipStyle: React.CSSProperties = {
  background: "var(--color-popover)",
  color: "var(--color-popover-foreground)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  fontSize: "12px",
  padding: "8px 10px",
};
