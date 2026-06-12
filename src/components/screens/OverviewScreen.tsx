"use client";

import { useState, useMemo } from "react";
import { useExpenses, useCategories, useBudgetTargets, useSettings } from "@/lib/spend-store";
import {
  getExpensesForMonth,
  getExpensesForDate,
  getExpensesForYear,
  sumDebits,
  isExpenseDebit,
  getTargetForPeriod,
  formatCurrency,
  todayStr,
  getBudgetStatus,
  formatCompactCurrency,
} from "@/lib/store";
import { BudgetBar } from "@/components/BudgetBar";
import { StatusBadge } from "@/components/StatusBadge";
import { TrendingUp, TrendingDown, Minus, Wallet } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function OverviewScreen() {
  const [expenses] = useExpenses();
  const [categories] = useCategories();
  const [targets] = useBudgetTargets();
  const [settings] = useSettings();

  const today = todayStr();
  const now = useMemo(() => new Date(), []);
  const year = now.getFullYear();
  const month = now.getMonth();

  const monthExpenses = useMemo(
    () => getExpensesForMonth(expenses, year, month),
    [expenses, year, month],
  );
  const todayExpenses = useMemo(() => getExpensesForDate(expenses, today), [expenses, today]);
  const prevMonthExpenses = useMemo(() => {
    const pm = month === 0 ? 11 : month - 1;
    const py = month === 0 ? year - 1 : year;
    return getExpensesForMonth(expenses, py, pm);
  }, [expenses, year, month]);

  const monthTotal = sumDebits(monthExpenses);
  const todayTotal = sumDebits(todayExpenses);
  const prevMonthTotal = sumDebits(prevMonthExpenses);

  const dailyTarget = getTargetForPeriod(targets, "daily");
  const monthlyTarget = getTargetForPeriod(targets, "monthly");

  const delta = prevMonthTotal > 0 ? ((monthTotal - prevMonthTotal) / prevMonthTotal) * 100 : 0;

  // Tab-based visual representation of spends (weekly, monthly, yearly)
  const [periodTab, setPeriodTab] = useState<"weekly" | "monthly" | "yearly">("weekly");

  // Calculations for Weekly (last 7 days rolling)
  const last7DaysData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const dayName = d.toLocaleDateString("default", { weekday: "short" });
      const dayExpenses = expenses.filter((e) => e.date === dateStr && isExpenseDebit(e));
      const total = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
      data.push({ label: dayName, amount: total, dateStr });
    }
    return data;
  }, [expenses]);

  const weeklyTotal = useMemo(
    () => last7DaysData.reduce((sum, d) => sum + d.amount, 0),
    [last7DaysData],
  );
  const weeklyTargetAmount = dailyTarget ? dailyTarget.amount * 7 : 0;

  // Calculations for Monthly (last 6 months rolling)
  const last6MonthsData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const yearVal = d.getFullYear();
      const monthVal = d.getMonth();
      const monthName = d.toLocaleString("default", { month: "short" });
      const monthExpenses = getExpensesForMonth(expenses, yearVal, monthVal);
      const total = sumDebits(monthExpenses);
      data.push({ label: monthName, amount: total, year: yearVal, month: monthVal });
    }
    return data;
  }, [expenses]);

  const monthlyTargetAmount = monthlyTarget ? monthlyTarget.amount : 0;

  // Calculations for Yearly (last 3 years rolling)
  const last3YearsData = useMemo(() => {
    const data = [];
    const currentYear = now.getFullYear();
    for (let i = 2; i >= 0; i--) {
      const targetYear = currentYear - i;
      const yearExpenses = getExpensesForYear(expenses, targetYear);
      const total = sumDebits(yearExpenses);
      data.push({ label: String(targetYear), amount: total, year: targetYear });
    }
    return data;
  }, [expenses, now]);

  const yearlyTarget = getTargetForPeriod(targets, "yearly");
  const yearlyTargetAmount = yearlyTarget ? yearlyTarget.amount : 0;
  const currentYearExpenses = useMemo(
    () => getExpensesForYear(expenses, now.getFullYear()),
    [expenses, now],
  );
  const yearlyTotal = useMemo(() => sumDebits(currentYearExpenses), [currentYearExpenses]);

  // Bind values dynamically based on selected tab
  const { chartData, totalSpent, targetAmount, periodExpenses } = useMemo(() => {
    switch (periodTab) {
      case "weekly": {
        const d = new Date();
        d.setDate(d.getDate() - 6);
        const startStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const weeklyExpenses = expenses.filter(
          (e) => e.date >= startStr && e.date <= today && isExpenseDebit(e),
        );
        return {
          chartData: last7DaysData,
          totalSpent: weeklyTotal,
          targetAmount: weeklyTargetAmount,
          periodExpenses: weeklyExpenses,
        };
      }
      case "monthly":
        return {
          chartData: last6MonthsData,
          totalSpent: monthTotal,
          targetAmount: monthlyTargetAmount,
          periodExpenses: monthExpenses,
        };
      case "yearly":
        return {
          chartData: last3YearsData,
          totalSpent: yearlyTotal,
          targetAmount: yearlyTargetAmount,
          periodExpenses: currentYearExpenses,
        };
    }
  }, [
    periodTab,
    last7DaysData,
    weeklyTotal,
    weeklyTargetAmount,
    last6MonthsData,
    monthTotal,
    monthlyTargetAmount,
    last3YearsData,
    yearlyTotal,
    yearlyTargetAmount,
    expenses,
    today,
    monthExpenses,
    currentYearExpenses,
  ]);

  const pctCompletion = targetAmount > 0 ? (totalSpent / targetAmount) * 100 : 0;

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    periodExpenses.forEach((e) => {
      if (!isExpenseDebit(e)) return;
      map.set(e.categoryId, (map.get(e.categoryId) || 0) + e.amount);
    });
    return Array.from(map.entries())
      .map(([catId, amount]) => {
        const cat = categories.find((c) => c.id === catId);
        return {
          catId,
          name: cat?.name || "Unknown",
          icon: cat?.icon || "📦",
          color: cat?.color || "#6b7280",
          amount,
          pct: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [periodExpenses, categories, totalSpent]);

  const monthName = now.toLocaleString("default", { month: "long" });

  // Burn rate
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysLeft = daysInMonth - dayOfMonth;
  const burnRate =
    monthlyTarget && monthlyTarget.amount > monthTotal && daysLeft > 0
      ? (monthlyTarget.amount - monthTotal) / daysLeft
      : null;

  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      <header className="mb-6">
        <p className="text-sm font-medium text-muted-foreground">Good {getGreeting()}</p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{monthName} Overview</h1>
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
            <span
              className={
                delta > 0
                  ? "text-status-over"
                  : delta < 0
                    ? "text-status-safe"
                    : "text-muted-foreground"
              }
            >
              {Math.abs(delta).toFixed(1)}% vs last month
            </span>
          </div>
        )}
      </div>

      {/* Today's spending vs daily budget cap */}
      {dailyTarget && dailyTarget.amount > 0 ? (
        <div className="mb-4 rounded-2xl bg-card p-4 shadow-sm border border-border/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Spending today</span>
            <StatusBadge status={getBudgetStatus(todayTotal, dailyTarget.amount)} />
          </div>
          <BudgetBar spent={todayTotal} limit={dailyTarget.amount} currency={settings.currency} />
        </div>
      ) : (
        <div className="mb-4 rounded-2xl bg-card p-4 shadow-sm border border-border/50">
          <p className="text-sm text-muted-foreground">
            Today:{" "}
            <span className="font-semibold text-foreground">
              {formatCurrency(todayTotal, settings.currency)}
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Set a daily spending cap in Settings or Notes to compare spending here.
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
              ~{formatCurrency(burnRate, settings.currency)}/day to stay on track ({daysLeft} days
              left)
            </p>
          )}
        </div>
      )}

      {/* Visual Spending Trends Card */}
      <div className="mb-4 rounded-2xl bg-card p-5 shadow-sm border border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Spending Trends</h2>
          <div className="flex gap-1 bg-muted p-1 rounded-lg">
            {(["weekly", "monthly", "yearly"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setPeriodTab(tab)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors capitalize ${
                  periodTab === tab
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Visual Bar Chart */}
        <TooltipProvider delayDuration={50}>
          <div className="flex h-36 items-end justify-between px-2 pt-6 relative border-b border-border/50 pb-2">
            {chartData.map((d, idx) => {
              const maxAmount = Math.max(...chartData.map((item) => item.amount), 1);
              const heightPct = (d.amount / maxAmount) * 100;
              return (
                <Tooltip key={idx}>
                  <TooltipTrigger asChild>
                    <div className="flex flex-1 flex-col items-center justify-end h-full gap-1 cursor-pointer">
                      {/* Amount above the bar */}
                      <span className="text-[9px] font-bold text-foreground/80 truncate max-w-full text-center">
                        {d.amount > 0 ? formatCompactCurrency(d.amount, settings.currency) : "—"}
                      </span>
                      {/* Bar */}
                      <div
                        className="w-7 bg-muted/40 dark:bg-muted/15 rounded-t-md overflow-hidden flex items-end"
                        style={{ height: "65px" }}
                      >
                        <div
                          className="w-full bg-primary/75 hover:bg-primary rounded-t-md transition-all duration-300 ease-out"
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                      {/* Label */}
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                        {d.label}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <p className="font-medium">
                      Total:{" "}
                      <span className="font-bold">
                        {formatCurrency(d.amount, settings.currency)}
                      </span>
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>

        {/* Target Completion Progress */}
        {targetAmount > 0 ? (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {periodTab} Target Completion
              </span>
              <span className="text-xs font-semibold text-foreground">
                {formatCurrency(totalSpent, settings.currency)} /{" "}
                {formatCurrency(targetAmount, settings.currency)}
              </span>
            </div>
            <BudgetBar spent={totalSpent} limit={targetAmount} currency={settings.currency} />
            <p className="mt-2 text-xs text-muted-foreground">
              {pctCompletion >= 100 ? (
                <span className="text-status-over font-medium">⚠️ Budget limit reached</span>
              ) : (
                <span>
                  You have used{" "}
                  <strong className="text-foreground">{pctCompletion.toFixed(0)}%</strong> of your
                  target limit.
                </span>
              )}
            </p>
          </div>
        ) : (
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              No budget cap set for this period. Set one in Settings to track completion.
            </p>
          </div>
        )}
      </div>

      {/* Category breakdown */}
      <div className="mb-4 rounded-2xl bg-card p-4 shadow-sm border border-border/50">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Spending by Category</h2>
        {categoryBreakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No expenses in this period. Start logging to see insights! 💡
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
