import { cn } from "@/lib/utils";

export type RiskLevel = "low" | "medium" | "high" | "critical";

const RISK_STYLES: Record<RiskLevel, string> = {
  low: "bg-risk-low/15 text-risk-low border-risk-low/30",
  medium: "bg-risk-medium/25 text-risk-medium-foreground border-risk-medium/50",
  high: "bg-risk-high/15 text-risk-high border-risk-high/30",
  critical: "bg-risk-critical text-risk-critical-foreground border-risk-critical",
};

const RISK_LABELS: Record<RiskLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
  children?: React.ReactNode;
}

export function RiskBadge({ level, className, children }: RiskBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-xs font-medium uppercase tracking-wider",
        RISK_STYLES[level],
        className,
      )}
      aria-label={`Risk level: ${RISK_LABELS[level]}`}
    >
      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {children ?? RISK_LABELS[level]}
    </span>
  );
}
