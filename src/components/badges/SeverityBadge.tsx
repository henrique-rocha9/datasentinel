import { cn } from "@/lib/utils";

export type AlertSeverity = "medium" | "high" | "critical";

const STYLES: Record<AlertSeverity, string> = {
  medium: "bg-warning/25 text-warning-foreground border-warning/50",
  high: "bg-risk-high/15 text-risk-high border-risk-high/30",
  critical: "bg-risk-critical text-risk-critical-foreground border-risk-critical",
};

const LABELS: Record<AlertSeverity, string> = {
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

interface SeverityBadgeProps {
  severity: AlertSeverity;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider",
        STYLES[severity],
        className,
      )}
      aria-label={`Severity: ${LABELS[severity]}`}
    >
      {LABELS[severity]}
    </span>
  );
}
