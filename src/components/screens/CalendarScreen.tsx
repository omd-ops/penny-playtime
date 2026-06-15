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
  calculateHabitStreaks,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { BudgetBar } from "@/components/BudgetBar";
import { StatusBadge } from "@/components/StatusBadge";
import { StreakModal } from "@/components/StreakModal";
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
  const [importanceText, setImportanceText] = useState("");
  const [emojiText, setEmojiText] = useState("");
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);

  const dailyTarget = getTargetForPeriod(targets, "daily");

  const streaks = useMemo(() => {
    return calculateHabitStreaks(dayFlags, settings.dailyHabitItems ?? []);
  }, [dayFlags, settings.dailyHabitItems]);

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
    setImportanceText(selFlag?.importance || "");
    setEmojiText(selFlag?.emoji || "");
  }, [selectedDate, selFlag?.label, selFlag?.importance, selFlag?.emoji]);

  function toggleGlobalHabit(habitId: string) {
    if (!selectedDate) return;
    setDayFlags((prev) => {
      const idx = prev.findIndex((f) => f.date === selectedDate);
      if (idx < 0) {
        return [
          ...prev,
          {
            date: selectedDate,
            metTarget: false,
            completedHabitIds: [habitId],
          },
        ];
      }
      const cur = prev[idx];
      const completed = cur.completedHabitIds || [];
      const nextCompleted = completed.includes(habitId)
        ? completed.filter((id) => id !== habitId)
        : [...completed, habitId];
      return prev.map((f) =>
        f.date === selectedDate ? { ...f, completedHabitIds: nextCompleted } : f,
      );
    });
  }

  function commitImportance() {
    if (!selectedDate) return;
    setDayFlags((prev) => {
      const idx = prev.findIndex((f) => f.date === selectedDate);
      if (idx < 0) {
        if (!importanceText.trim() && !emojiText.trim()) return prev;
        return [
          ...prev,
          {
            date: selectedDate,
            metTarget: false,
            importance: importanceText.trim(),
            emoji: emojiText.trim(),
          },
        ];
      }
      const cur = prev[idx];
      const next = { ...cur, importance: importanceText.trim(), emoji: emojiText.trim() };
      if (
        !next.metTarget &&
        next.label === undefined &&
        !next.importance?.trim() &&
        !next.emoji?.trim()
      ) {
        return prev.filter((f) => f.date !== selectedDate);
      }
      return prev.map((f) => (f.date === selectedDate ? next : f));
    });
  }

  function toggleAllHabits() {
    if (!selectedDate) return;
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
          ...(importanceText.trim() ? { importance: importanceText.trim() } : {}),
          ...(emojiText.trim() ? { emoji: emojiText.trim() } : {}),
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

  const { totalMonthIn, totalMonthOut } = useMemo(() => {
    let inTotal = 0;
    let outTotal = 0;
    dayRollups.forEach((roll) => {
      inTotal += roll.credit;
      outTotal += roll.debit;
    });
    return { totalMonthIn: inTotal, totalMonthOut: outTotal };
  }, [dayRollups]);
  const monthBalance = totalMonthIn - totalMonthOut;

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 flex flex-col h-[calc(100dvh-5rem)] pb-4">
      <header className="mb-4 flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-lg font-bold text-foreground leading-tight">{monthLabel}</h1>
          {streaks.currentStreak > 0 && (
            <button
              onClick={() => setIsStreakModalOpen(true)}
              className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5 hover:underline cursor-pointer focus:outline-none"
            >
              🔥 {streaks.currentStreak} day streak
            </button>
          )}
        </div>
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
      <div className="grid grid-cols-7 gap-1.5 flex-1 auto-rows-fr">
        {grid.map((cell, i) => {
          if (!cell.inMonth) return <div key={i} className="min-h-[4rem] h-full" aria-hidden />;
          const roll = dayRollups.get(cell.dateStr);
          const debited = roll?.debit ?? 0;
          const credited = roll?.credit ?? 0;
          const hasOut = debited > 0;
          const hasIn = credited > 0;
          const isToday = cell.dateStr === today;
          const flag = flagMap.get(cell.dateStr);
          const goalsForDay = goalsMap.get(cell.dateStr) ?? [];
          const completedGlobalCount = flag?.completedHabitIds?.length ?? 0;
          const anyCustomGoalDone = goalsForDay.some((g) => g.done) || completedGlobalCount > 0;

          const hasHabitLines = dailyHabitLines.length > 0;
          const ariaParts = [
            hasOut ? `cash out ${formatCurrency(debited, settings.currency)}` : "",
            hasIn ? `cash in ${formatCurrency(credited, settings.currency)}` : "",
          ].filter(Boolean);
          const ariaHabits = hasHabitLines
            ? ` Habits: ${dailyHabitLines.slice(0, 4).join("; ")}${dailyHabitLines.length > 4 ? "…" : ""}.`
            : "";
          const ariaLabel = `${cell.dateStr}${ariaParts.length ? `: ${ariaParts.join(", ")}` : ", no cash entries"}.${ariaHabits} Open day detail.`;

          const cellTall = hasHabitLines;

          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedDate(cell.dateStr)}
              aria-label={ariaLabel}
              className={cn(
                "relative flex h-full w-full flex-col rounded-xl border border-border/40 px-1 py-1.5 text-left transition-colors",
                cellTall ? "min-h-[7rem]" : "min-h-[4rem] justify-center",
                isToday && "ring-2 ring-primary ring-inset",
                "hover:bg-muted/80",
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
              <div className="flex flex-col items-center mt-1 space-y-0.5 text-[10px] shrink-0">
                {hasIn && (
                  <span className="text-emerald-600 font-medium">
                    {formatCurrency(credited, settings.currency)}
                  </span>
                )}
                {hasOut && (
                  <span className="text-red-600 font-medium">
                    {formatCurrency(debited, settings.currency)}
                  </span>
                )}
              </div>
              {hasHabitLines && (
                <ul
                  className={cn("mt-1 w-full min-h-0 flex-1 space-y-px overflow-hidden")}
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
              {flag?.emoji && (
                <span
                  className={cn(
                    "absolute top-1 text-xs leading-none",
                    flag?.metTarget || anyCustomGoalDone ? "right-4" : "right-1",
                  )}
                  aria-hidden
                >
                  {flag.emoji}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-3 divide-x divide-border rounded-xl border border-border/40 bg-card text-center overflow-hidden shrink-0 shadow-sm">
        <div className="flex flex-col py-2">
          <span className="text-[11px] font-semibold text-emerald-600">Total Cash In</span>
          <span className="text-sm font-bold text-emerald-600">
            {formatCurrency(totalMonthIn, settings.currency)}
          </span>
        </div>
        <div className="flex flex-col py-2">
          <span className="text-[11px] font-semibold text-red-600">Total Cash Out</span>
          <span className="text-sm font-bold text-red-600">
            {formatCurrency(totalMonthOut, settings.currency)}
          </span>
        </div>
        <div className="flex flex-col py-2">
          <span className="text-[11px] font-semibold text-foreground">Balance</span>
          <span
            className={cn(
              "text-sm font-bold",
              monthBalance >= 0 ? "text-emerald-600" : "text-red-600",
            )}
          >
            {formatCurrency(monthBalance, settings.currency)}
          </span>
        </div>
      </div>

      {/* Day detail sheet */}
      <Drawer
        open={!!selectedDate}
        onOpenChange={(open) => {
          if (!open) setSelectedDate(null);
        }}
      >
        <DrawerContent className="max-h-[85vh]">
          <div className="mx-auto w-full max-w-lg overflow-y-auto px-4 pb-8 pt-2">
            <DrawerHeader className="px-0 flex flex-row items-start justify-between gap-4 text-left">
              <div>
                <DrawerTitle>
                  {selectedDate &&
                    new Date(selectedDate + "T12:00:00").toLocaleDateString("default", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                </DrawerTitle>
                <DrawerDescription>
                  Money in/out, spending budget, and daily habits
                </DrawerDescription>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Importance..."
                  className="h-8 text-xs w-[100px]"
                  value={importanceText}
                  onChange={(e) => setImportanceText(e.target.value)}
                  onBlur={commitImportance}
                  aria-label="Importance of the day"
                />
                <Input
                  placeholder="🌟"
                  className="h-8 w-10 text-center text-sm px-1"
                  maxLength={2}
                  value={emojiText}
                  onChange={(e) => setEmojiText(e.target.value)}
                  onBlur={commitImportance}
                  aria-label="Emoji for the day"
                />
              </div>
            </DrawerHeader>

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

              {/* Daily Plan Checklists & Add Goal */}
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-sm font-semibold text-foreground">Daily tasks</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 rounded-lg text-muted-foreground hover:text-foreground"
                    onClick={addDayGoal}
                    aria-label="Add custom goal for this day"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add</span>
                  </Button>
                </div>

                {/* Render global daily habits */}
                {(settings.dailyHabitItems ?? []).map((habit) => {
                  const isDone = selFlag?.completedHabitIds?.includes(habit.id) || false;
                  return (
                    <div
                      key={habit.id}
                      className="flex w-full items-stretch gap-2 rounded-xl bg-card border border-border/50 p-2 min-h-[44px]"
                    >
                      <button
                        type="button"
                        onClick={() => toggleGlobalHabit(habit.id)}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg min-h-[44px] min-w-[44px]"
                        aria-pressed={isDone}
                        aria-label={`Mark habit done: ${habit.text}`}
                      >
                        <div
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors",
                            isDone
                              ? "bg-status-safe border-status-safe"
                              : "border-muted-foreground",
                          )}
                        >
                          {isDone && <Check className="h-4 w-4 text-status-safe-foreground" />}
                        </div>
                      </button>
                      <div className="flex flex-1 items-center px-2">
                        <span className="text-sm font-medium text-foreground">{habit.text}</span>
                      </div>
                    </div>
                  );
                })}

                {/* Fallback legacy checkbox if no global habits but legacy exists */}
                {!settings.dailyHabitItems?.length && selFlag?.label && (
                  <div className="flex w-full items-stretch gap-2 rounded-xl bg-card border border-border/50 p-2 min-h-[44px]">
                    <button
                      type="button"
                      onClick={toggleAllHabits}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg min-h-[44px] min-w-[44px]"
                      aria-pressed={selFlag?.metTarget ?? false}
                    >
                      <div
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors",
                          selFlag?.metTarget
                            ? "bg-status-safe border-status-safe"
                            : "border-muted-foreground",
                        )}
                      >
                        {selFlag?.metTarget && (
                          <Check className="h-4 w-4 text-status-safe-foreground" />
                        )}
                      </div>
                    </button>
                    <div className="flex flex-1 items-center px-2">
                      <span className="text-sm font-medium text-foreground">{selFlag.label}</span>
                    </div>
                  </div>
                )}
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
                            {exp.note ? exp.note : cat?.name || "Unknown"}
                          </p>
                          {exp.note && (
                            <p className="text-xs text-muted-foreground truncate">
                              {cat?.name || "Unknown"}
                            </p>
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
          </div>
        </DrawerContent>
      </Drawer>
      <StreakModal isOpen={isStreakModalOpen} onOpenChange={setIsStreakModalOpen} />
    </div>
  );
}
