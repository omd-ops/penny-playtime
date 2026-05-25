import { cn } from "@/lib/utils";
import { getBudgetStatus, formatCurrency } from "@/lib/store";

interface BudgetBarProps {
  spent: number;
  limit: number;
  currency: string;
  label?: string;
  showRemaining?: boolean;
}

export function BudgetBar({ spent, limit, currency, label, showRemaining = true }: BudgetBarProps) {
  const status = getBudgetStatus(spent, limit);
  const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const remaining = limit - spent;

  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">{label}</span>
          <span className="text-muted-foreground">
            {formatCurrency(spent, currency)} / {formatCurrency(limit, currency)}
          </span>
        </div>
      )}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            status === "safe" && "bg-status-safe",
            status === "warning" && "bg-status-warning",
            status === "over" && "bg-status-over",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showRemaining && limit > 0 && (
        <p
          className={cn(
            "text-xs font-medium",
            status === "safe" && "text-status-safe",
            status === "warning" && "text-status-warning-foreground",
            status === "over" && "text-status-over",
          )}
        >
          {remaining >= 0
            ? `${formatCurrency(remaining, currency)} remaining`
            : `${formatCurrency(Math.abs(remaining), currency)} over budget`}
        </p>
      )}
    </div>
  );
}
