"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useBudgetTargets, useSettings } from "@/lib/spend-store";
import {
  generateId,
  getTargetForPeriod,
  formatCurrency,
  type AppSettings,
  type BudgetTarget,
  type HabitPlanPeriod,
  type HabitPlanTextPeriod,
  type ImportantNoteItem,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function legacyItemsFromNotes(notes: string | undefined): ImportantNoteItem[] {
  const raw = notes?.trim();
  if (!raw) return [];
  return raw
    .split(/\n+/)
    .filter(Boolean)
    .map((text, idx) => ({ id: `legacy-${idx}`, text }));
}

function notesPlainText(items: ImportantNoteItem[]): string {
  return items
    .map((i) => i.text.trim())
    .filter(Boolean)
    .join("\n");
}

function materializeNoteIds(items: ImportantNoteItem[]): ImportantNoteItem[] {
  return items.map((i) => (i.id.startsWith("legacy-") ? { ...i, id: generateId() } : i));
}

const SPENDING_PERIODS = [
  { id: "daily" as const, label: "Daily" },
  { id: "monthly" as const, label: "Monthly" },
  { id: "yearly" as const, label: "Yearly" },
];

const HABIT_PERIODS: { id: HabitPlanPeriod; label: string; hint: string }[] = [
  { id: "daily", label: "Daily", hint: "Typical day (gym, wake time, water, …)." },
  { id: "weekly", label: "Weekly", hint: "This week's focus (runs, meal prep, inbox zero, …)." },
  { id: "monthly", label: "Monthly", hint: "Month-level habits or reviews you care about." },
  { id: "yearly", label: "Yearly", hint: "Big-picture intentions or milestones for the year." },
];

export function NotesScreen() {
  const [targets, setTargets] = useBudgetTargets();
  const [settings, setSettings] = useSettings();

  const [periodTab, setPeriodTab] = useState<"daily" | "monthly" | "yearly">("daily");
  const [habitTab, setHabitTab] = useState<HabitPlanPeriod>("daily");
  const [amountDraft, setAmountDraft] = useState("");
  const newNoteInputRef = useRef<HTMLInputElement | null>(null);
  const newDailyHabitInputRef = useRef<HTMLInputElement | null>(null);
  const migratedLegacyDailyPlan = useRef(false);

  const importantNotes = useMemo((): ImportantNoteItem[] => {
    if (settings.importantNoteItems !== undefined) return settings.importantNoteItems;
    return legacyItemsFromNotes(settings.notes);
  }, [settings.importantNoteItems, settings.notes]);

  const dailyHabits = settings.dailyHabitItems ?? [];

  useEffect(() => {
    if (migratedLegacyDailyPlan.current) return;
    const legacyRaw = (settings.habitPlans as Partial<Record<string, string>> | undefined)?.daily;
    if (typeof legacyRaw !== "string" || !legacyRaw.trim()) return;
    if ((settings.dailyHabitItems ?? []).some((i) => i.text.trim())) {
      migratedLegacyDailyPlan.current = true;
      return;
    }
    migratedLegacyDailyPlan.current = true;
    const lines = legacyRaw
      .split(/\n+/)
      .map((l) => l.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean);
    setSettings((s) => {
      const hp = { ...((s.habitPlans ?? {}) as Record<string, string>) };
      delete hp.daily;
      const nextPlans = Object.keys(hp).length ? (hp as AppSettings["habitPlans"]) : undefined;
      return {
        ...s,
        dailyHabitItems: lines.map((text) => ({ id: generateId(), text })),
        habitPlans: nextPlans,
      };
    });
  }, [settings.habitPlans, settings.dailyHabitItems, setSettings]);

  function commitDailyHabits(next: ImportantNoteItem[]) {
    setSettings((s) => ({
      ...s,
      dailyHabitItems: materializeNoteIds(next),
    }));
  }

  function addDailyHabit() {
    const next = [...dailyHabits, { id: generateId(), text: "" }];
    commitDailyHabits(next);
    queueMicrotask(() => newDailyHabitInputRef.current?.focus());
  }

  function updateDailyHabitText(id: string, text: string) {
    commitDailyHabits(dailyHabits.map((n) => (n.id === id ? { ...n, text } : n)));
  }

  function removeDailyHabit(id: string) {
    commitDailyHabits(dailyHabits.filter((n) => n.id !== id));
  }

  function commitImportantNotes(next: ImportantNoteItem[]) {
    const normalized = materializeNoteIds(next);
    setSettings((s) => ({
      ...s,
      importantNoteItems: normalized,
      notes: notesPlainText(normalized),
    }));
  }

  function addNote() {
    const next = [...importantNotes, { id: generateId(), text: "" }];
    commitImportantNotes(next);
    queueMicrotask(() => newNoteInputRef.current?.focus());
  }

  function updateNoteText(id: string, text: string) {
    commitImportantNotes(importantNotes.map((n) => (n.id === id ? { ...n, text } : n)));
  }

  function removeNote(id: string) {
    commitImportantNotes(importantNotes.filter((n) => n.id !== id));
  }

  const activeTarget = getTargetForPeriod(targets, periodTab);

  useEffect(() => {
    const t = getTargetForPeriod(targets, periodTab);
    setAmountDraft(t ? String(t.amount) : "");
  }, [periodTab, targets]);

  function saveTarget() {
    const amt = parseFloat(amountDraft);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setTargets((prev) => {
      const filtered = prev.filter((t) => t.period !== periodTab);
      const existing = prev.find((t) => t.period === periodTab);
      const row: BudgetTarget = {
        id: existing?.id ?? generateId(),
        period: periodTab,
        amount: amt,
      };
      return [...filtered, row];
    });
    toast.success(
      `${SPENDING_PERIODS.find((p) => p.id === periodTab)?.label ?? "Budget"} spending cap saved`,
    );
  }

  function clearTarget() {
    setTargets((prev) => prev.filter((t) => t.period !== periodTab));
    setAmountDraft("");
    toast.success("Spending cap cleared");
  }

  const periodHint =
    periodTab === "daily"
      ? "Cap for a typical day's spending."
      : periodTab === "monthly"
        ? "Rough limit for the calendar month."
        : "Year-long spending guide.";

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">Notes</h1>
      <p className="text-sm text-muted-foreground mb-5">
        Set <strong className="font-medium text-foreground">spending caps</strong> and your{" "}
        <strong className="font-medium text-foreground">habits / TODO plans</strong> by period. The
        calendar still has a per-day checkbox for when you actually finished the habits you planned
        for that day.
      </p>

      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        Spending caps
      </p>
      <div className="mb-3 flex gap-1.5 rounded-xl border border-border/50 bg-card p-1.5">
        {SPENDING_PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriodTab(p.id)}
            className={cn(
              "min-h-[44px] flex-1 rounded-lg text-sm font-medium transition-colors",
              periodTab === p.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <section className="mb-6 rounded-xl border border-border/50 bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">
          {periodTab === "daily" && "Daily spending cap"}
          {periodTab === "monthly" && "Monthly spending cap"}
          {periodTab === "yearly" && "Yearly spending cap"}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{periodHint}</p>
        {activeTarget && activeTarget.amount > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            Current:{" "}
            <span className="font-semibold text-foreground">
              {formatCurrency(activeTarget.amount, settings.currency)}
            </span>
          </p>
        )}
        <label
          className="mt-3 block text-sm font-medium text-foreground"
          htmlFor="notes-target-amount"
        >
          Amount ({settings.currency})
        </label>
        <Input
          id="notes-target-amount"
          type="number"
          inputMode="decimal"
          value={amountDraft}
          onChange={(e) => setAmountDraft(e.target.value)}
          placeholder="0.00"
          className="mt-1 h-12 text-lg"
        />
        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            onClick={saveTarget}
            className="h-11 min-h-[44px] flex-1 rounded-xl"
          >
            Save target
          </Button>
          {activeTarget ? (
            <Button
              type="button"
              variant="outline"
              onClick={clearTarget}
              className="h-11 min-h-[44px] shrink-0 rounded-xl px-4"
            >
              Clear
            </Button>
          ) : null}
        </div>
      </section>

      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 mt-1">
        Habits and TODOs
      </p>
      <div className="mb-3 flex gap-1 rounded-xl border border-border/50 bg-card p-1.5">
        {HABIT_PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setHabitTab(p.id)}
            className={cn(
              "min-h-[44px] flex-1 rounded-lg text-xs font-medium transition-colors sm:text-sm",
              habitTab === p.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <section className="mb-6 rounded-xl border border-border/50 bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">
              {HABIT_PERIODS.find((p) => p.id === habitTab)?.label ?? "Habit"} plan
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {HABIT_PERIODS.find((p) => p.id === habitTab)?.hint}
            </p>
          </div>
          {habitTab === "daily" ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-11 w-11 shrink-0 rounded-xl text-foreground hover:bg-muted"
              onClick={addDailyHabit}
              aria-label="Add daily habit line"
            >
              <Plus className="h-5 w-5" />
            </Button>
          ) : null}
        </div>

        {habitTab === "daily" ? (
          <>
            <p className="mt-2 text-xs text-muted-foreground">
              Each line appears as a bullet on every calendar day. Tap + to add a line.
            </p>
            {dailyHabits.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground py-6 text-center rounded-xl border border-dashed border-border/60 bg-background/30">
                No habits yet. Tap + to add one.
              </p>
            ) : (
              <ul className="mt-3 space-y-2" aria-label="Daily habit checklist">
                {dailyHabits.map((row, index) => (
                  <li key={row.id} className="flex items-center gap-2">
                    <span
                      className="text-muted-foreground select-none w-5 text-center shrink-0"
                      aria-hidden
                    >
                      •
                    </span>
                    <Input
                      ref={index === dailyHabits.length - 1 ? newDailyHabitInputRef : undefined}
                      value={row.text}
                      onChange={(e) => updateDailyHabitText(row.id, e.target.value)}
                      placeholder="e.g. Gym, wake 7am, 10k steps"
                      className="h-11 flex-1 rounded-xl border-border/60 bg-background/50 text-base"
                      aria-label={`Daily habit ${index + 1}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 shrink-0 rounded-xl text-muted-foreground hover:text-destructive"
                      onClick={() => removeDailyHabit(row.id)}
                      aria-label={`Remove daily habit ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <label
              className="mt-3 block text-sm font-medium text-foreground"
              htmlFor="habit-plan-text"
            >
              Notes
            </label>
            <Textarea
              id="habit-plan-text"
              value={settings.habitPlans?.[habitTab as HabitPlanTextPeriod] ?? ""}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  habitPlans: { ...(s.habitPlans ?? {}), [habitTab]: e.target.value },
                }))
              }
              placeholder={
                habitTab === "weekly"
                  ? "e.g. 3× runs · Meal prep Sunday · Review budget"
                  : habitTab === "monthly"
                    ? "e.g. Dentist · Donate · Deep clean"
                    : "e.g. Emergency fund goal · Learn Spanish · Vacation fund"
              }
              className="mt-2 min-h-[160px] resize-y rounded-xl border-border/60 bg-background/50 text-base leading-relaxed"
              aria-label={`Habits and TODOs for ${habitTab} period`}
            />
          </>
        )}
      </section>

      <section className="rounded-xl border border-border/50 bg-card p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">Important notes</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Bills, reminders, or anything you want here. Add lines with +; each shows as a bullet.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-xl text-foreground hover:bg-muted"
            onClick={addNote}
            aria-label="Add note"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        {importantNotes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center rounded-xl border border-dashed border-border/60 bg-background/30">
            No notes yet. Tap + to add one.
          </p>
        ) : (
          <ul className="space-y-2" aria-label="Important notes list">
            {importantNotes.map((note, index) => (
              <li key={note.id} className="flex items-center gap-2">
                <span
                  className="text-muted-foreground select-none w-5 text-center shrink-0"
                  aria-hidden
                >
                  •
                </span>
                <Input
                  ref={index === importantNotes.length - 1 ? newNoteInputRef : undefined}
                  value={note.text}
                  onChange={(e) => updateNoteText(note.id, e.target.value)}
                  placeholder="e.g. Rent due on the 1st"
                  className="h-11 flex-1 rounded-xl border-border/60 bg-background/50 text-base"
                  aria-label={`Note ${index + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-xl text-muted-foreground hover:text-destructive"
                  onClick={() => removeNote(note.id)}
                  aria-label={`Remove note ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
