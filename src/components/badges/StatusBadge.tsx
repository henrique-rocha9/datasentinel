import { cn } from "@/lib/utils";

type Tone = "neutral" | "info" | "success" | "warning" | "destructive";

const TONE_STYLES: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  info: "bg-info/15 text-info border-info/30",
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/25 text-warning-foreground border-warning/50",
  destructive: "bg-destructive/15 text-destructive border-destructive/30",
};

interface StatusBadgeProps {
  label: string;
  tone?: Tone;
  className?: string;
}

export function StatusBadge({ label, tone = "neutral", className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        TONE_STYLES[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
