import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "safe" | "warning" | "over";
  className?: string;
}

const labels: Record<string, string> = {
  safe: "On Track",
  warning: "Nearing Limit",
  over: "Over Budget",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        status === "safe" && "bg-status-safe/15 text-status-safe",
        status === "warning" && "bg-status-warning/15 text-status-warning-foreground",
        status === "over" && "bg-status-over/15 text-status-over",
        className,
      )}
    >
      {labels[status]}
    </span>
  );
}