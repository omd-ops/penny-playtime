"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  useExpenses,
  useCategories,
  useBudgetTargets,
  useDayFlags,
  useDayGoals,
  useSettings,
} from "@/lib/spend-store";
import {
  getExpensesForDate,
  sumDebits,
  sumCredits,
  isExpenseDebit,
  getTargetForPeriod,
  formatCurrency,
  getBudgetStatus,
  todayStr,
  generateId,
  type DayGoal,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { BudgetBar } from "@/components/BudgetBar";
import { StatusBadge } from "@/components/StatusBadge";
import { ChevronLeft, ChevronRight, Check, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DEFAULT_DAY_TARGET_LABEL = "Done today's habits (gym, wake time, …)";

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function CalendarScreen() {
  const [expenses] = useExpenses();
  const [categories] = useCategories();
  const [targets] = useBudgetTargets();
  const [dayFlags, setDayFlags] = useDayFlags();
  const [dayGoals, setDayGoals] = useDayGoals();
  const [settings] = useSettings();

  const today = todayStr();
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayTargetNote, setDayTargetNote] = useState(DEFAULT_DAY_TARGET_LABEL);
  const dayTargetNoteRef = useRef(dayTargetNote);
  dayTargetNoteRef.current = dayTargetNote;

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

  const flagMap = useMemo(() => new Map(dayFlags.map((f) => [f.date, f])), [dayFlags]);
  const goalsMap = useMemo(() => {
    const m = new Map<string, DayGoal[]>();
    for (const g of dayGoals) {
      const list = m.get(g.date);
      if (list) list.push(g);
      else m.set(g.date, [g]);
    }
    return m;
  }, [dayGoals]);

  // Day totals for the month
  const dayRollups = useMemo(() => {
    const map = new Map<string, { debit: number; credit: number }>();
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
    expenses.forEach((e) => {
      if (!e.date.startsWith(prefix)) return;
      const cur = map.get(e.date) || { debit: 0, credit: 0 };
      if (isExpenseDebit(e)) cur.debit += e.amount;
      else cur.credit += e.amount;
      map.set(e.date, cur);
    });
    return map;
  }, [expenses, viewYear, viewMonth]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  }

  const monthLabel = new Date(viewYear, viewMonth).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const dailyHabitLines = useMemo(() => {
    const fromItems = (settings.dailyHabitItems ?? []).map((i) => i.text.trim()).filter(Boolean);
    if (fromItems.length) return fromItems;
    const raw = (settings.habitPlans as { daily?: string } | undefined)?.daily?.trim();
    if (!raw) return [];
    return raw
      .split(/\n+/)
      .map((l) => l.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean);
  }, [settings.dailyHabitItems, settings.habitPlans]);

  // Day detail
  const selExpenses = selectedDate ? getExpensesForDate(expenses, selectedDate) : [];
  const selDebited = sumDebits(selExpenses);
  const selCredited = sumCredits(selExpenses);
  const selFlag = dayFlags.find((f) => f.date === selectedDate);

  useEffect(() => {
    if (!selectedDate) return;
    const t = selFlag?.label?.trim();
    setDayTargetNote(t ? t : DEFAULT_DAY_TARGET_LABEL);
  }, [selectedDate, selFlag?.label]);

  function labelFromNoteDraft(): string | undefined {
    const raw = dayTargetNoteRef.current.trim();
    if (raw === "" || raw === DEFAULT_DAY_TARGET_LABEL) return undefined;
    return raw;
  }

  function commitFlagLabel() {
    if (!selectedDate) return;
    const labelToStore = labelFromNoteDraft();

    setDayFlags((prev) => {
      const idx = prev.findIndex((f) => f.date === selectedDate);
      if (idx < 0) {
        if (labelToStore === undefined) return prev;
        return [...prev, { date: selectedDate, metTarget: false, label: labelToStore }];
      }
      const cur = prev[idx];
      const next = { ...cur, label: labelToStore };
      if (!next.metTarget && next.label === undefined) {
        return prev.filter((f) => f.date !== selectedDate);
      }
      return prev.map((f) => (f.date === selectedDate ? next : f));
    });
  }

  function toggleFlag() {
    if (!selectedDate) return;
    const extraLabel = labelFromNoteDraft();

    setDayFlags((prev) => {
      const exists = prev.find((f) => f.date === selectedDate);
      if (exists) {
        return prev.map((f) => (f.date === selectedDate ? { ...f, metTarget: !f.metTarget } : f));
      }
      return [
        ...prev,
        {
          date: selectedDate,
          metTarget: true,
          ...(extraLabel ? { label: extraLabel } : {}),
        },
      ];
    });
  }

  function addDayGoal() {
    if (!selectedDate) return;
    setDayGoals((prev) => [
      ...prev,
      { id: generateId(), date: selectedDate, title: "New goal", done: false },
    ]);
  }

  function toggleDayGoal(id: string) {
    setDayGoals((prev) => prev.map((g) => (g.id === id ? { ...g, done: !g.done } : g)));
  }

  function updateDayGoalTitle(id: string, title: string) {
    setDayGoals((prev) => prev.map((g) => (g.id === id ? { ...g, title } : g)));
  }

  function removeDayGoal(id: string) {
    setDayGoals((prev) => prev.filter((g) => g.id !== id));
  }

  const goalsForSelected = selectedDate ? dayGoals.filter((g) => g.date === selectedDate) : [];

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      <header className="mb-4 flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-foreground">{monthLabel}</h1>
        <button
          onClick={nextMonth}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </header>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="text-center text-xs font-medium text-muted-foreground py-2">
            {wd}
          </div>
        ))}
      </div>

      {/* Calendar grid — day + colored out/in amounts (labels only in aria-label) */}
      <div className="grid grid-cols-7 gap-1.5">
        {grid.map((cell, i) => {
          if (!cell.inMonth) return <div key={i} className="min-h-[3.25rem]" aria-hidden />;
          const roll = dayRollups.get(cell.dateStr);
          const debited = roll?.debit ?? 0;
          const credited = roll?.credit ?? 0;
          const hasOut = debited > 0;
          const hasIn = credited > 0;
          const showAmounts = hasOut || hasIn;
          const isToday = cell.dateStr === today;
          const flag = flagMap.get(cell.dateStr);
          const goalsForDay = goalsMap.get(cell.dateStr) ?? [];
          const anyCustomGoalDone = goalsForDay.some((g) => g.done);

          const hasHabitLines = dailyHabitLines.length > 0;
          const ariaParts = [
            hasOut ? `cash out ${formatCurrency(debited, settings.currency)}` : "",
            hasIn ? `cash in ${formatCurrency(credited, settings.currency)}` : "",
          ].filter(Boolean);
          const ariaHabits = hasHabitLines
            ? ` Habits: ${dailyHabitLines.slice(0, 4).join("; ")}${dailyHabitLines.length > 4 ? "…" : ""}.`
            : "";
          const ariaLabel = `${cell.dateStr}${ariaParts.length ? `: ${ariaParts.join(", ")}` : ", no cash entries"}.${ariaHabits} Open day detail.`;

          const cellTall = showAmounts || hasHabitLines;

          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedDate(cell.dateStr)}
              aria-label={ariaLabel}
              className={cn(
                "relative flex w-full flex-col rounded-xl border border-border/40 px-1 py-1.5 text-left transition-colors",
                cellTall ? "min-h-[7rem]" : "min-h-[3.25rem] justify-center",
                isToday && "ring-2 ring-primary ring-inset",
                showAmounts && "bg-accent",
                !showAmounts && "hover:bg-muted/80",
                selectedDate === cell.dateStr && "bg-primary/10",
              )}
            >
              <span
                className={cn(
                  "shrink-0 text-center text-base font-semibold leading-none",
                  isToday ? "text-primary" : "text-foreground",
                )}
              >
                {cell.day}
              </span>
              {showAmounts && (
                <div className="mt-1 flex w-full flex-col items-center gap-0.5 border-t border-border/50 pt-1">
                  {hasOut && (
                    <p className="w-full truncate text-center text-xs font-semibold tabular-nums leading-tight text-red-600 dark:text-red-400">
                      {formatCurrency(debited, settings.currency)}
                    </p>
                  )}
                  {hasIn && (
                    <p className="w-full truncate text-center text-xs font-semibold tabular-nums leading-tight text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(credited, settings.currency)}
                    </p>
                  )}
                </div>
              )}
              {hasHabitLines && (
                <ul
                  className={cn(
                    "mt-1 w-full min-h-0 flex-1 space-y-px overflow-hidden",
                    showAmounts ? "border-t border-border/50 pt-1" : "",
                  )}
                  aria-hidden
                >
                  {dailyHabitLines.slice(0, 5).map((text, idx) => (
                    <li
                      key={idx}
                      className="flex min-h-0 gap-0.5 text-[9px] leading-tight text-muted-foreground"
                    >
                      <span className="shrink-0 text-primary/90">•</span>
                      <span className="min-w-0 truncate">{text}</span>
                    </li>
                  ))}
                  {dailyHabitLines.length > 5 && (
                    <li className="pl-2 text-[9px] text-muted-foreground">
                      +{dailyHabitLines.length - 5} more
                    </li>
                  )}
                </ul>
              )}
              {(flag?.metTarget || anyCustomGoalDone) && (
                <span
                  className="absolute right-1 top-1 h-2 w-2 rounded-full bg-status-safe"
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Day detail sheet */}
      <Sheet
        open={!!selectedDate}
        onOpenChange={(open) => {
          if (!open) setSelectedDate(null);
        }}
      >
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {selectedDate &&
                new Date(selectedDate + "T12:00:00").toLocaleDateString("default", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
            </SheetTitle>
            <SheetDescription>Money in/out, spending budget, and daily habits</SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* Totals */}
            <div className="flex items-center justify-between rounded-xl bg-surface p-3">
              <div>
                <p className="text-xs text-muted-foreground">Debited</p>
                <p className="text-lg font-bold text-foreground">
                  {formatCurrency(selDebited, settings.currency)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Credited</p>
                <p className="text-lg font-bold text-foreground">
                  {formatCurrency(selCredited, settings.currency)}
                </p>
              </div>
            </div>

            {/* Spending vs daily budget (from Settings / Notes — not habits) */}
            {dailyTarget && dailyTarget.amount > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">
                    Spending budget (this day)
                  </span>
                  <StatusBadge status={getBudgetStatus(selDebited, dailyTarget.amount)} />
                </div>
                <BudgetBar
                  spent={selDebited}
                  limit={dailyTarget.amount}
                  currency={settings.currency}
                />
              </div>
            )}

            {/* Daily habits / tasks (editable) + add extra goals */}
            <div className="flex w-full items-stretch gap-2 rounded-xl bg-card border border-border/50 p-2 min-h-[44px]">
              <button
                type="button"
                onClick={toggleFlag}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg min-h-[44px] min-w-[44px]"
                aria-pressed={selFlag?.metTarget ?? false}
                aria-label="Toggle daily habits done"
              >
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors",
                    selFlag?.metTarget
                      ? "bg-status-safe border-status-safe"
                      : "border-muted-foreground",
                  )}
                >
                  {selFlag?.metTarget && <Check className="h-4 w-4 text-status-safe-foreground" />}
                </div>
              </button>
              <Input
                value={dayTargetNote}
                onChange={(e) => setDayTargetNote(e.target.value)}
                onBlur={commitFlagLabel}
                className="h-11 min-h-[44px] flex-1 border-0 bg-transparent px-2 text-sm font-medium shadow-none focus-visible:ring-1"
                placeholder={DEFAULT_DAY_TARGET_LABEL}
                aria-label="Daily habits description"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  addDayGoal();
                }}
                aria-label="Add another goal for this day"
              >
                <Plus className="h-5 w-5" strokeWidth={2.25} />
              </Button>
            </div>

            {goalsForSelected.length > 0 && (
              <div className="space-y-2">
                {goalsForSelected.map((goal) => (
                  <div
                    key={goal.id}
                    className="flex items-center gap-2 rounded-xl border border-border/50 bg-card p-2"
                  >
                    <button
                      type="button"
                      onClick={() => toggleDayGoal(goal.id)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                      aria-label={goal.done ? "Mark goal not done" : "Mark goal done"}
                    >
                      <div
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors",
                          goal.done
                            ? "bg-status-safe border-status-safe"
                            : "border-muted-foreground",
                        )}
                      >
                        {goal.done && <Check className="h-4 w-4 text-status-safe-foreground" />}
                      </div>
                    </button>
                    <Input
                      value={goal.title}
                      onChange={(e) => updateDayGoalTitle(goal.id, e.target.value)}
                      className="h-10 flex-1 border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
                      placeholder="Goal title"
                      aria-label="Goal title"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeDayGoal(goal.id)}
                      aria-label="Remove goal"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Expense list */}
            {selExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No expenses on this day. 🎉
              </p>
            ) : (
              <div className="space-y-2">
                {selExpenses.map((exp) => {
                  const cat = catMap.get(exp.categoryId);
                  return (
                    <div
                      key={exp.id}
                      className="flex items-center gap-3 rounded-xl bg-card p-3 border border-border/50"
                    >
                      <span className="text-lg">{cat?.icon || "📦"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {cat?.name || "Unknown"}
                        </p>
                        {exp.note && (
                          <p className="text-xs text-muted-foreground truncate">{exp.note}</p>
                        )}
                      </div>
                      <span
                        className={`text-sm font-semibold ${
                          isExpenseDebit(exp) ? "text-red-600" : "text-emerald-600"
                        }`}
                      >
                        {isExpenseDebit(exp) ? "−" : "+"}
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
