import type { RiskLevel } from "@/components/badges/RiskBadge";

export function riskClassFromString(value: string | null | undefined): RiskLevel {
  switch (value) {
    case "high":
      return "high";
    case "medium":
      return "medium";
    case "critical":
      return "critical";
    default:
      return "low";
  }
}

// Legacy "closed" maps to "resolved" for display.
export type InvestigationStatus = "open" | "in_progress" | "resolved" | "dismissed" | "closed";

export function normalizeInvestigationStatus(s: string): Exclude<InvestigationStatus, "closed"> {
  return s === "closed" ? "resolved" : (s as Exclude<InvestigationStatus, "closed">);
}

export function investigationStatusTone(s: string) {
  switch (normalizeInvestigationStatus(s)) {
    case "open":
      return "warning" as const;
    case "in_progress":
      return "info" as const;
    case "resolved":
      return "success" as const;
    case "dismissed":
      return "neutral" as const;
  }
}

export function fmtPct(n: number | null | undefined, digits = 1) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `${Number(n).toFixed(digits)}%`;
}

export function fmtNum(n: number | null | undefined, digits = 0) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}
