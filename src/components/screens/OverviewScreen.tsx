import { useMemo } from "react";
import {
  useExpenses,
  useCategories,
  useBudgetTargets,
  useSettings,
  getExpensesForMonth,
  getExpensesForDate,
  sumExpenses,
  getTargetForPeriod,
  formatCurrency,
  todayStr,
  getBudgetStatus,
} from "@/lib/store";
import { BudgetBar } from "@/components/BudgetBar";
import { StatusBadge } from "@/components/StatusBadge";
import { TrendingUp, TrendingDown, Minus, Wallet } from "lucide-react";

export function OverviewScreen() {
  const [expenses] = useExpenses();
  const [categories] = useCategories();
  const [targets] = useBudgetTargets();
  const [settings] = useSettings();

  const today = todayStr();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const monthExpenses = useMemo(() => getExpensesForMonth(expenses, year, month), [expenses, year, month]);
  const todayExpenses = useMemo(() => getExpensesForDate(expenses, today), [expenses, today]);
  const prevMonthExpenses = useMemo(() => {
    const pm = month === 0 ? 11 : month - 1;
    const py = month === 0 ? year - 1 : year;
    return getExpensesForMonth(expenses, py, pm);
  }, [expenses, year, month]);

  const monthTotal = sumExpenses(monthExpenses);
  const todayTotal = sumExpenses(todayExpenses);
  const prevMonthTotal = sumExpenses(prevMonthExpenses);

  const dailyTarget = getTargetForPeriod(targets, "daily");
  const monthlyTarget = getTargetForPeriod(targets, "monthly");

  const delta = prevMonthTotal > 0 ? ((monthTotal - prevMonthTotal) / prevMonthTotal) * 100 : 0;

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    monthExpenses.forEach((e) => {
      map.set(e.categoryId, (map.get(e.categoryId) || 0) + e.amount);
    });
    return Array.from(map.entries())
      .map(([catId, amount]) => {
        const cat = categories.find((c) => c.id === catId);
        return { catId, name: cat?.name || "Unknown", icon: cat?.icon || "📦", color: cat?.color || "#6b7280", amount, pct: monthTotal > 0 ? (amount / monthTotal) * 100 : 0 };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [monthExpenses, categories, monthTotal]);

  const monthName = now.toLocaleString("default", { month: "long" });

  // Burn rate
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysLeft = daysInMonth - dayOfMonth;
  const burnRate = monthlyTarget && monthlyTarget.amount > monthTotal && daysLeft > 0
    ? (monthlyTarget.amount - monthTotal) / daysLeft
    : null;

  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      <header className="mb-6">
        <p className="text-sm font-medium text-muted-foreground">Good {getGreeting()}</p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {monthName} Overview
        </h1>
      </header>

      {/* Month total card */}
      <div className="mb-4 rounded-2xl bg-card p-5 shadow-sm border border-border/50">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total spent this month</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">
              {formatCurrency(monthTotal, settings.currency)}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
        </div>
        {prevMonthTotal > 0 && (
          <div className="mt-3 flex items-center gap-1.5 text-sm">
            {delta > 0 ? (
              <TrendingUp className="h-4 w-4 text-status-over" />
            ) : delta < 0 ? (
              <TrendingDown className="h-4 w-4 text-status-safe" />
            ) : (
              <Minus className="h-4 w-4 text-muted-foreground" />
            )}
            <span className={delta > 0 ? "text-status-over" : delta < 0 ? "text-status-safe" : "text-muted-foreground"}>
              {Math.abs(delta).toFixed(1)}% vs last month
            </span>
          </div>
        )}
      </div>

      {/* Daily target strip */}
      {dailyTarget && dailyTarget.amount > 0 ? (
        <div className="mb-4 rounded-2xl bg-card p-4 shadow-sm border border-border/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Today</span>
            <StatusBadge status={getBudgetStatus(todayTotal, dailyTarget.amount)} />
          </div>
          <BudgetBar spent={todayTotal} limit={dailyTarget.amount} currency={settings.currency} />
        </div>
      ) : (
        <div className="mb-4 rounded-2xl bg-card p-4 shadow-sm border border-border/50">
          <p className="text-sm text-muted-foreground">
            Today: <span className="font-semibold text-foreground">{formatCurrency(todayTotal, settings.currency)}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Set a daily target in Settings to track your progress here.
          </p>
        </div>
      )}

      {/* Monthly budget */}
      {monthlyTarget && monthlyTarget.amount > 0 && (
        <div className="mb-4 rounded-2xl bg-card p-4 shadow-sm border border-border/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Monthly Budget</span>
            <StatusBadge status={getBudgetStatus(monthTotal, monthlyTarget.amount)} />
          </div>
          <BudgetBar spent={monthTotal} limit={monthlyTarget.amount} currency={settings.currency} />
          {burnRate !== null && (
            <p className="mt-2 text-xs text-muted-foreground">
              ~{formatCurrency(burnRate, settings.currency)}/day to stay on track ({daysLeft} days left)
            </p>
          )}
        </div>
      )}

      {/* Category breakdown */}
      <div className="mb-4 rounded-2xl bg-card p-4 shadow-sm border border-border/50">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Spending by Category</h2>
        {categoryBreakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No expenses yet this month. Start logging to see insights! 💡
          </p>
        ) : (
          <div className="space-y-3">
            {categoryBreakdown.map((cat) => (
              <div key={cat.catId} className="flex items-center gap-3">
                <span className="text-lg">{cat.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground truncate">{cat.name}</span>
                    <span className="text-muted-foreground ml-2">{cat.pct.toFixed(0)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${cat.pct}%`, backgroundColor: cat.color }}
                    />
                  </div>
                </div>
                <span className="text-sm font-semibold text-foreground w-20 text-right">
                  {formatCurrency(cat.amount, settings.currency)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}