"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import type {
  AppSettings,
  BudgetTarget,
  Category,
  DayFlag,
  DayGoal,
  Expense,
  ImportantNoteItem,
} from "./store";
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS as STORE_DEFAULT_SETTINGS } from "./store";
import { createBrowserSupabase } from "@/lib/supabase/client";

const DEFAULT_SETTINGS: AppSettings = STORE_DEFAULT_SETTINGS;

const SNAPSHOT_KEY = "et_snapshot";

const LS_OLD = {
  categories: "et_categories",
  expenses: "et_expenses",
  targets: "et_targets",
  dayflags: "et_dayflags",
  daygoals: "et_day_goals",
  settings: "et_settings",
} as const;

type GlobalState = {
  categories: Category[];
  expenses: Expense[];
  budgetTargets: BudgetTarget[];
  dayFlags: DayFlag[];
  dayGoals: DayGoal[];
  settings: AppSettings;
};

function readLocalSnapshot(): GlobalState {
  if (typeof window === "undefined") {
    return {
      categories: DEFAULT_CATEGORIES,
      expenses: [],
      budgetTargets: [],
      dayFlags: [],
      dayGoals: [],
      settings: DEFAULT_SETTINGS,
    };
  }
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (raw) {
      return JSON.parse(raw) as GlobalState;
    }
  } catch {
    // fall through to legacy keys
  }
  // Migrate from legacy individual keys
  const read = <T,>(key: string, fallback: T): T => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  };
  const legacy: GlobalState = {
    categories: read(LS_OLD.categories, DEFAULT_CATEGORIES),
    expenses: read(LS_OLD.expenses, []),
    budgetTargets: read(LS_OLD.targets, []),
    dayFlags: read(LS_OLD.dayflags, []),
    dayGoals: read(LS_OLD.daygoals, []),
    settings: read(LS_OLD.settings, DEFAULT_SETTINGS),
  };
  // Persist in new single-key format and clean up old keys
  writeLocalSnapshot(legacy);
  cleanupLegacyKeys();
  return legacy;
}

function writeLocalSnapshot(s: GlobalState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(s));
}

function cleanupLegacyKeys() {
  for (const key of Object.values(LS_OLD)) {
    localStorage.removeItem(key);
  }
}

type Ctx = {
  ready: boolean;
  cloud: boolean;
  categories: Category[];
  setCategories: (u: Category[] | ((p: Category[]) => Category[])) => void;
  expenses: Expense[];
  setExpenses: (
    u: Expense[] | ((p: Expense[]) => Expense[]),
    immediate?: boolean,
  ) => Promise<void> | void;
  budgetTargets: BudgetTarget[];
  setBudgetTargets: (u: BudgetTarget[] | ((p: BudgetTarget[]) => BudgetTarget[])) => void;
  dayFlags: DayFlag[];
  setDayFlags: (u: DayFlag[] | ((p: DayFlag[]) => DayFlag[])) => void;
  dayGoals: DayGoal[];
  setDayGoals: (u: DayGoal[] | ((p: DayGoal[]) => DayGoal[])) => void;
  settings: AppSettings;
  setSettings: (u: AppSettings | ((p: AppSettings) => AppSettings)) => void;
};

const SpendCtx = createContext<Ctx | null>(null);

function useSpendCtx() {
  const ctx = useContext(SpendCtx);
  if (!ctx) {
    throw new Error("Spend hooks must be used within SpendDataProvider");
  }
  return ctx;
}

export function SpendDataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [cloud, setCloud] = useState(false);
  const [state, setState] = useState<GlobalState>(() => readLocalSnapshot());
  const stateRef = useRef(state);
  stateRef.current = state;

  const userIdRef = useRef<string | null>(null);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushFullStateToCloud = useCallback(async (userId: string, s: GlobalState) => {
    const supabase = createBrowserSupabase();

    // 1. Fetch current database states to reconcile collections (so we can delete items no longer present)
    const [catRes, expRes, tarRes, flaRes, goaRes] = await Promise.all([
      supabase.from("categories").select("id").eq("user_id", userId),
      supabase.from("expenses").select("id").eq("user_id", userId),
      supabase.from("budget_targets").select("id").eq("user_id", userId),
      supabase.from("day_flags").select("date").eq("user_id", userId),
      supabase.from("day_goals").select("id").eq("user_id", userId),
    ]);

    if (catRes.error) throw catRes.error;
    if (expRes.error) throw expRes.error;
    if (tarRes.error) throw tarRes.error;
    if (flaRes.error) throw flaRes.error;
    if (goaRes.error) throw goaRes.error;

    // 2. Sync user settings (single row)
    const { error: settingsErr } = await supabase.from("user_settings").upsert({
      user_id: userId,
      currency: s.settings.currency,
      theme: s.settings.theme,
      notes: s.settings.notes || "",
      daily_habit_items: s.settings.dailyHabitItems || [],
      habit_plans: s.settings.habitPlans || {},
      important_note_items: s.settings.importantNoteItems || [],
      daily_update_reminders_enabled: s.settings.dailyUpdateRemindersEnabled || false,
      daily_update_reminder_times: s.settings.dailyUpdateReminderTimes || [],
      ai_api_key: s.settings.aiApiKey || null,
      ai_model_name: s.settings.aiModelName || null,
      updated_at: new Date().toISOString(),
    });
    if (settingsErr) throw settingsErr;

    // 3. Sync Categories
    const localCatIds = new Set(s.categories.map((x) => x.id));
    const catToDelete = (catRes.data || []).filter((x) => !localCatIds.has(x.id)).map((x) => x.id);
    if (catToDelete.length > 0) {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("user_id", userId)
        .in("id", catToDelete);
      if (error) throw error;
    }
    if (s.categories.length > 0) {
      const payload = s.categories.map((c) => ({
        id: c.id,
        user_id: userId,
        name: c.name,
        color: c.color,
        icon: c.icon,
      }));
      const { error } = await supabase
        .from("categories")
        .upsert(payload, { onConflict: "user_id, name" });
      if (error) throw error;
    }

    // 4. Sync Expenses
    const localExpIds = new Set(s.expenses.map((x) => x.id));
    const expToDelete = (expRes.data || []).filter((x) => !localExpIds.has(x.id)).map((x) => x.id);
    if (expToDelete.length > 0) {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("user_id", userId)
        .in("id", expToDelete);
      if (error) throw error;
    }
    if (s.expenses.length > 0) {
      const payload = s.expenses.map((e) => ({
        id: e.id,
        user_id: userId,
        category_id: e.categoryId || null,
        amount: e.amount,
        note: e.note || "",
        date: e.date,
        type: e.type || "cash-out",
        created_at: e.createdAt || new Date().toISOString(),
      }));
      const { error } = await supabase.from("expenses").upsert(payload);
      if (error) throw error;
    }

    // 5. Sync Budget Targets
    const localTarIds = new Set(s.budgetTargets.map((x) => x.id));
    const tarToDelete = (tarRes.data || []).filter((x) => !localTarIds.has(x.id)).map((x) => x.id);
    if (tarToDelete.length > 0) {
      const { error } = await supabase
        .from("budget_targets")
        .delete()
        .eq("user_id", userId)
        .in("id", tarToDelete);
      if (error) throw error;
    }
    if (s.budgetTargets.length > 0) {
      const payload = s.budgetTargets.map((t) => ({
        id: t.id,
        user_id: userId,
        period: t.period,
        amount: t.amount,
      }));
      const { error } = await supabase
        .from("budget_targets")
        .upsert(payload, { onConflict: "user_id, period" });
      if (error) throw error;
    }

    // 6. Sync Day Flags
    const localDates = new Set(s.dayFlags.map((x) => x.date));
    const datesToDelete = (flaRes.data || [])
      .filter((x) => !localDates.has(x.date))
      .map((x) => x.date);
    if (datesToDelete.length > 0) {
      const { error } = await supabase
        .from("day_flags")
        .delete()
        .eq("user_id", userId)
        .in("date", datesToDelete);
      if (error) throw error;
    }
    if (s.dayFlags.length > 0) {
      const payload = s.dayFlags.map((f) => ({
        user_id: userId,
        date: f.date,
        met_target: f.metTarget,
        label: f.label || "",
        importance: f.importance || "normal",
        emoji: f.emoji || "",
        completed_habit_ids: f.completedHabitIds || [],
      }));
      const { error } = await supabase.from("day_flags").upsert(payload);
      if (error) throw error;
    }

    // 7. Sync Day Goals
    const localGoalIds = new Set(s.dayGoals.map((x) => x.id));
    const goalsToDelete = (goaRes.data || [])
      .filter((x) => !localGoalIds.has(x.id))
      .map((x) => x.id);
    if (goalsToDelete.length > 0) {
      const { error } = await supabase
        .from("day_goals")
        .delete()
        .eq("user_id", userId)
        .in("id", goalsToDelete);
      if (error) throw error;
    }
    if (s.dayGoals.length > 0) {
      const payload = s.dayGoals.map((g) => ({
        id: g.id,
        user_id: userId,
        date: g.date,
        title: g.title,
        done: g.done,
      }));
      const { error } = await supabase.from("day_goals").upsert(payload);
      if (error) throw error;
    }
  }, []);

  const debouncedCloudUpsert = useCallback(() => {
    const uid = userIdRef.current;
    if (!uid || !cloud) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      pushTimerRef.current = null;
      const s = stateRef.current;
      void (async () => {
        try {
          await pushFullStateToCloud(uid, s);
        } catch (e) {
          console.error(e);
          toast.error("Could not sync to Supabase.");
        }
      })();
    }, 800);
  }, [cloud, pushFullStateToCloud]);

  const patch = useCallback(
    (fn: (prev: GlobalState) => GlobalState, immediate = false): Promise<void> | void => {
      const next = fn(stateRef.current);
      stateRef.current = next;
      writeLocalSnapshot(next);
      setState(next);

      if (immediate) {
        if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
        pushTimerRef.current = null;
        const uid = userIdRef.current;
        if (!uid || !cloud) return Promise.resolve();
        return (async () => {
          try {
            await pushFullStateToCloud(uid, next);
          } catch (e) {
            console.error(e);
            throw e;
          }
        })();
      } else {
        debouncedCloudUpsert();
      }
    },
    [cloud, debouncedCloudUpsert, pushFullStateToCloud],
  );

  const setCategories = useCallback(
    (u: Category[] | ((p: Category[]) => Category[])) => {
      patch((prev) => ({
        ...prev,
        categories:
          typeof u === "function" ? (u as (p: Category[]) => Category[])(prev.categories) : u,
      }));
    },
    [patch],
  );

  const setExpenses = useCallback(
    (u: Expense[] | ((p: Expense[]) => Expense[]), immediate = false) => {
      return patch(
        (prev) => ({
          ...prev,
          expenses: typeof u === "function" ? (u as (p: Expense[]) => Expense[])(prev.expenses) : u,
        }),
        immediate,
      );
    },
    [patch],
  );

  const setBudgetTargets = useCallback(
    (u: BudgetTarget[] | ((p: BudgetTarget[]) => BudgetTarget[])) => {
      patch((prev) => ({
        ...prev,
        budgetTargets:
          typeof u === "function"
            ? (u as (p: BudgetTarget[]) => BudgetTarget[])(prev.budgetTargets)
            : u,
      }));
    },
    [patch],
  );

  const setDayFlags = useCallback(
    (u: DayFlag[] | ((p: DayFlag[]) => DayFlag[])) => {
      patch((prev) => ({
        ...prev,
        dayFlags: typeof u === "function" ? (u as (p: DayFlag[]) => DayFlag[])(prev.dayFlags) : u,
      }));
    },
    [patch],
  );

  const setDayGoals = useCallback(
    (u: DayGoal[] | ((p: DayGoal[]) => DayGoal[])) => {
      patch((prev) => ({
        ...prev,
        dayGoals: typeof u === "function" ? (u as (p: DayGoal[]) => DayGoal[])(prev.dayGoals) : u,
      }));
    },
    [patch],
  );

  const setSettings = useCallback(
    (u: AppSettings | ((p: AppSettings) => AppSettings)) => {
      patch((prev) => ({
        ...prev,
        settings:
          typeof u === "function" ? (u as (p: AppSettings) => AppSettings)(prev.settings) : u,
      }));
    },
    [patch],
  );

  useEffect(() => {
    const gate = { cancelled: false, timedOut: false };
    const INIT_TIMEOUT_MS = 30_000;

    async function init() {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
      const supabaseKey =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        "";

      if (!supabaseUrl || !supabaseKey) {
        if (!gate.cancelled) {
          setCloud(false);
          setState(readLocalSnapshot());
          setReady(true);
        }
        return;
      }

      async function runCloudInit() {
        const supabase = createBrowserSupabase();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (gate.cancelled || gate.timedOut) return;

        if (!session) {
          const { error: anonErr } = await supabase.auth.signInAnonymously();
          if (anonErr) {
            throw anonErr;
          }
        }
        if (gate.cancelled || gate.timedOut) return;

        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();
        if (userErr || !user) {
          throw userErr ?? new Error("No Supabase user");
        }

        if (gate.cancelled || gate.timedOut) return;
        userIdRef.current = user.id;

        // Fetch data from the 6 individual tables
        const [catRes, expRes, tarRes, flaRes, goaRes, setRes] = await Promise.all([
          supabase.from("categories").select("*").eq("user_id", user.id),
          supabase.from("expenses").select("*").eq("user_id", user.id),
          supabase.from("budget_targets").select("*").eq("user_id", user.id),
          supabase.from("day_flags").select("*").eq("user_id", user.id),
          supabase.from("day_goals").select("*").eq("user_id", user.id),
          supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
        ]);

        if (gate.cancelled || gate.timedOut) return;
        if (catRes.error) throw catRes.error;
        if (expRes.error) throw expRes.error;
        if (tarRes.error) throw tarRes.error;
        if (flaRes.error) throw flaRes.error;
        if (goaRes.error) throw goaRes.error;
        if (setRes.error) throw setRes.error;

        const remoteExpenses = expRes.data || [];
        const local = readLocalSnapshot();

        // If local has expenses but remote does not, sync local state to the cloud database
        const shouldUploadLocal = local.expenses.length > 0 && remoteExpenses.length === 0;
        if (shouldUploadLocal) {
          await pushFullStateToCloud(user.id, local);
          if (!gate.cancelled && !gate.timedOut) {
            stateRef.current = local;
            setState(local);
            setCloud(true);
            setReady(true);
          }
          return;
        }

        // Map settings
        const settings: AppSettings = setRes.data
          ? {
              currency: setRes.data.currency,
              theme: setRes.data.theme as "light" | "dark" | "system",
              notes: setRes.data.notes,
              dailyHabitItems:
                (setRes.data.daily_habit_items as unknown as ImportantNoteItem[] | null) ?? [],
              habitPlans:
                (setRes.data.habit_plans as unknown as Record<string, string> | null) ?? {},
              importantNoteItems:
                (setRes.data.important_note_items as unknown as ImportantNoteItem[] | null) ?? [],
              dailyUpdateRemindersEnabled: setRes.data.daily_update_reminders_enabled,
              dailyUpdateReminderTimes:
                (setRes.data.daily_update_reminder_times as string[] | null) ?? [],
              aiApiKey: setRes.data.ai_api_key ?? undefined,
              aiModelName: setRes.data.ai_model_name ?? undefined,
            }
          : DEFAULT_SETTINGS;

        // Map other collections
        const next: GlobalState = {
          categories:
            catRes.data && catRes.data.length > 0
              ? catRes.data.map((c) => ({
                  id: c.id,
                  name: c.name,
                  color: c.color,
                  icon: c.icon,
                }))
              : DEFAULT_CATEGORIES,
          expenses: remoteExpenses.map((e) => ({
            id: e.id,
            amount: Number(e.amount),
            categoryId: e.category_id || "",
            note: e.note || "",
            date: e.date,
            createdAt: e.created_at,
            type: e.type as "cash-in" | "cash-out",
          })),
          budgetTargets: (tarRes.data || []).map((t) => ({
            id: t.id,
            period: t.period as "daily" | "monthly" | "yearly",
            amount: Number(t.amount),
          })),
          dayFlags: (flaRes.data || []).map((f) => ({
            date: f.date,
            metTarget: f.met_target,
            label: f.label || "",
            importance: f.importance as "normal" | "low" | "high",
            emoji: f.emoji || "",
            completedHabitIds: (f.completed_habit_ids as string[] | null) ?? [],
          })),
          dayGoals: (goaRes.data || []).map((g) => ({
            id: g.id,
            date: g.date,
            title: g.title,
            done: g.done,
          })),
          settings,
        };

        // If there's no settings row in the database, insert the full state (so the database gets initialized)
        if (!setRes.data) {
          await pushFullStateToCloud(user.id, next);
        }

        if (!gate.cancelled && !gate.timedOut) {
          stateRef.current = next;
          setState(next);
          writeLocalSnapshot(next);
          setCloud(true);
          setReady(true);
        }
      }

      const cloudPromise = runCloudInit();
      void cloudPromise.catch(() => {
        /* handled in catch below; avoids unhandled rejection if timeout wins first */
      });

      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          cloudPromise,
          new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
              gate.timedOut = true;
              reject(new Error("TIMEOUT"));
            }, INIT_TIMEOUT_MS);
          }),
        ]);
      } catch (e) {
        console.error("Supabase init error:", JSON.stringify(e, Object.getOwnPropertyNames(e), 2));
        if (gate.cancelled) return;
        const isTimeout = gate.timedOut && e instanceof Error && e.message === "TIMEOUT";
        toast.error(
          isTimeout
            ? "Cloud sync is taking too long. Using this device only for now."
            : "Cloud sync unavailable (enable Anonymous sign-in and run the SQL migration, or check env keys). Using this device only.",
        );
        setCloud(false);
        setState(readLocalSnapshot());
        setReady(true);
      } finally {
        if (timeoutId !== undefined) clearTimeout(timeoutId);
      }
    }

    void init();
    return () => {
      gate.cancelled = true;
    };
  }, [pushFullStateToCloud]);

  const value = useMemo<Ctx>(
    () => ({
      ready,
      cloud,
      categories: state.categories,
      setCategories,
      expenses: state.expenses,
      setExpenses,
      budgetTargets: state.budgetTargets,
      setBudgetTargets,
      dayFlags: state.dayFlags,
      setDayFlags,
      dayGoals: state.dayGoals,
      setDayGoals,
      settings: state.settings,
      setSettings,
    }),
    [
      ready,
      cloud,
      state.categories,
      state.expenses,
      state.budgetTargets,
      state.dayFlags,
      state.dayGoals,
      state.settings,
      setCategories,
      setExpenses,
      setBudgetTargets,
      setDayFlags,
      setDayGoals,
      setSettings,
    ],
  );

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center text-muted-foreground">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-hidden
        />
        <p className="text-sm">Loading your data…</p>
      </div>
    );
  }

  return <SpendCtx.Provider value={value}>{children}</SpendCtx.Provider>;
}

export function useCategories(): [
  Category[],
  (u: Category[] | ((p: Category[]) => Category[])) => void,
] {
  const { categories, setCategories } = useSpendCtx();
  return [categories, setCategories];
}

export function useExpenses(): [
  Expense[],
  (u: Expense[] | ((p: Expense[]) => Expense[]), immediate?: boolean) => Promise<void> | void,
] {
  const { expenses, setExpenses } = useSpendCtx();
  return [expenses, setExpenses];
}

export function useBudgetTargets(): [
  BudgetTarget[],
  (u: BudgetTarget[] | ((p: BudgetTarget[]) => BudgetTarget[])) => void,
] {
  const { budgetTargets, setBudgetTargets } = useSpendCtx();
  return [budgetTargets, setBudgetTargets];
}

export function useDayFlags(): [DayFlag[], (u: DayFlag[] | ((p: DayFlag[]) => DayFlag[])) => void] {
  const { dayFlags, setDayFlags } = useSpendCtx();
  return [dayFlags, setDayFlags];
}

export function useDayGoals(): [DayGoal[], (u: DayGoal[] | ((p: DayGoal[]) => DayGoal[])) => void] {
  const { dayGoals, setDayGoals } = useSpendCtx();
  return [dayGoals, setDayGoals];
}

export function useSettings(): [
  AppSettings,
  (u: AppSettings | ((p: AppSettings) => AppSettings)) => void,
] {
  const { settings, setSettings } = useSpendCtx();
  return [settings, setSettings];
}

export function useCloudStatus(): { ready: boolean; cloud: boolean } {
  const { ready, cloud } = useSpendCtx();
  return { ready, cloud };
}
