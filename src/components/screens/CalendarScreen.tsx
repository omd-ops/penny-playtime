import { useState, useMemo } from "react";
import {
  useExpenses,
  useCategories,
  useBudgetTargets,
  useDayFlags,
  useSettings,
  getExpensesForDate,
  sumExpenses,
  getTargetForPeriod,
  formatCurrency,
  getBudgetStatus,
  todayStr,
} from "@/lib/store";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { BudgetBar } from "@/components/BudgetBar";
import { StatusBadge } from "@/components/StatusBadge";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function CalendarScreen() {
  const [expenses] = useExpenses();
  const [categories] = useCategories();
  const [targets] = useBudgetTargets();
  const [dayFlags, setDayFlags] = useDayFlags();
  const [settings] = useSettings();

  const today = todayStr();
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const dailyTarget = getTargetForPeriod(targets, "daily");

  // Build calendar grid
  const grid = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    let startWeekday = firstDay.getDay() - 1; // Mon=0
    if (startWeekday < 0) startWeekday = 6;

    const cells: { day: number; dateStr: string; inMonth: boolean }[] = [];
    // Fill leading blanks
    for (let i = 0; i < startWeekday; i++) {
      cells.push({ day: 0, dateStr: "", inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, dateStr: toDateStr(viewYear, viewMonth, d), inMonth: true });
    }
    return cells;
  }, [viewYear, viewMonth]);

  // Day totals for the month
  const dayTotals = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => {
      if (e.date.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`)) {
        map.set(e.date, (map.get(e.date) || 0) + e.amount);
      }
    });
    return map;
  }, [expenses, viewYear, viewMonth]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  const monthLabel = new Date(viewYear, viewMonth).toLocaleString("default", { month: "long", year: "numeric" });

  // Day detail
  const selExpenses = selectedDate ? getExpensesForDate(expenses, selectedDate) : [];
  const selTotal = sumExpenses(selExpenses);
  const selFlag = dayFlags.find((f) => f.date === selectedDate);

  function toggleFlag() {
    if (!selectedDate) return;
    const exists = dayFlags.find((f) => f.date === selectedDate);
    if (exists) {
      setDayFlags((prev) => prev.map((f) => f.date === selectedDate ? { ...f, metTarget: !f.metTarget } : f));
    } else {
      setDayFlags((prev) => [...prev, { date: selectedDate, metTarget: true }]);
    }
  }

  const getCat = (id: string) => categories.find((c) => c.id === id);

  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      <header className="mb-4 flex items-center justify-between">
        <button onClick={prevMonth} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted" aria-label="Previous month">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-foreground">{monthLabel}</h1>
        <button onClick={nextMonth} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted" aria-label="Next month">
          <ChevronRight className="h-5 w-5" />
        </button>
      </header>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="text-center text-xs font-medium text-muted-foreground py-2">{wd}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {grid.map((cell, i) => {
          if (!cell.inMonth) return <div key={i} />;
          const total = dayTotals.get(cell.dateStr) || 0;
          const hasExpenses = total > 0;
          const isToday = cell.dateStr === today;
          const flag = dayFlags.find((f) => f.date === cell.dateStr);

          return (
            <button
              key={i}
              onClick={() => setSelectedDate(cell.dateStr)}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-xl py-2 min-h-[52px] text-sm transition-colors",
                isToday && "ring-2 ring-primary ring-inset",
                hasExpenses && "bg-accent",
                !hasExpenses && "hover:bg-muted",
                selectedDate === cell.dateStr && "bg-primary/10",
              )}
            >
              <span className={cn("font-medium", isToday ? "text-primary" : "text-foreground")}>
                {cell.day}
              </span>
              {hasExpenses && (
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {settings.currency}{total.toFixed(0)}
                </span>
              )}
              {flag?.metTarget && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-status-safe" />
              )}
            </button>
          );
        })}
      </div>

      {/* Day detail sheet */}
      <Sheet open={!!selectedDate} onOpenChange={(open) => { if (!open) setSelectedDate(null); }}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {selectedDate && new Date(selectedDate + "T12:00:00").toLocaleDateString("default", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </SheetTitle>
            <SheetDescription>Day detail and expenses</SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* Totals */}
            <div className="flex items-center justify-between rounded-xl bg-surface p-3">
              <div>
                <p className="text-xs text-muted-foreground">Debited</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(selTotal, settings.currency)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Credited</p>
                <p className="text-lg font-bold text-foreground">{formatCurrency(0, settings.currency)}</p>
              </div>
            </div>

            {/* Daily target */}
            {dailyTarget && dailyTarget.amount > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Daily Target</span>
                  <StatusBadge status={getBudgetStatus(selTotal, dailyTarget.amount)} />
                </div>
                <BudgetBar spent={selTotal} limit={dailyTarget.amount} currency={settings.currency} />
              </div>
            )}

            {/* Met target checkbox */}
            <button
              onClick={toggleFlag}
              className="flex w-full items-center gap-3 rounded-xl bg-card border border-border/50 p-3 min-h-[44px]"
            >
              <div className={cn(
                "flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors",
                selFlag?.metTarget ? "bg-status-safe border-status-safe" : "border-muted-foreground",
              )}>
                {selFlag?.metTarget && <Check className="h-4 w-4 text-status-safe-foreground" />}
              </div>
              <span className="text-sm font-medium text-foreground">I met my daily target today</span>
            </button>

            {/* Expense list */}
            {selExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No expenses on this day. 🎉
              </p>
            ) : (
              <div className="space-y-2">
                {selExpenses.map((exp) => {
                  const cat = getCat(exp.categoryId);
                  return (
                    <div key={exp.id} className="flex items-center gap-3 rounded-xl bg-card p-3 border border-border/50">
                      <span className="text-lg">{cat?.icon || "📦"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{cat?.name || "Unknown"}</p>
                        {exp.note && <p className="text-xs text-muted-foreground truncate">{exp.note}</p>}
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        {formatCurrency(exp.amount, settings.currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}