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
import type { AppSettings, BudgetTarget, Category, DayFlag, DayGoal, Expense } from "./store";
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

  const debouncedCloudUpsert = useCallback(() => {
    const uid = userIdRef.current;
    if (!uid || !cloud) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      pushTimerRef.current = null;
      const s = stateRef.current;
      void (async () => {
        try {
          const supabase = createBrowserSupabase();
          const { error } = await supabase.from("spend_snapshots").upsert(
            {
              user_id: uid,
              categories: s.categories,
              expenses: s.expenses,
              budget_targets: s.budgetTargets,
              day_flags: s.dayFlags,
              day_goals: s.dayGoals,
              settings: s.settings,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );
          if (error) throw error;
        } catch (e) {
          console.error(e);
          toast.error("Could not sync to Supabase.");
        }
      })();
    }, 800);
  }, [cloud]);

  const patch = useCallback(
    (fn: (prev: GlobalState) => GlobalState, immediate = false): Promise<void> | void => {
      let nextState: GlobalState | null = null;
      setState((prev) => {
        const next = fn(prev);
        stateRef.current = next;
        nextState = next;
        writeLocalSnapshot(next);
        return next;
      });
      if (immediate) {
        if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
        pushTimerRef.current = null;
        const uid = userIdRef.current;
        if (!uid || !cloud) return Promise.resolve();
        return (async () => {
          try {
            const supabase = createBrowserSupabase();
            const s = nextState || stateRef.current;
            const { error } = await supabase.from("spend_snapshots").upsert(
              {
                user_id: uid,
                categories: s.categories,
                expenses: s.expenses,
                budget_targets: s.budgetTargets,
                day_flags: s.dayFlags,
                day_goals: s.dayGoals,
                settings: s.settings,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id" },
            );
            if (error) throw error;
          } catch (e) {
            console.error(e);
            throw e;
          }
        })();
      } else {
        debouncedCloudUpsert();
      }
    },
    [cloud, debouncedCloudUpsert],
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

        const { data: row, error: rowErr } = await supabase
          .from("spend_snapshots")
          .select("categories,expenses,budget_targets,day_flags,day_goals,settings")
          .eq("user_id", user.id)
          .maybeSingle();

        if (gate.cancelled || gate.timedOut) return;
        if (rowErr) throw rowErr;

        if (row) {
          const remoteExpenses = (row.expenses as Expense[] | null) ?? [];
          const local = readLocalSnapshot();

          // If local has expenses but remote does not, sync local state to the cloud database
          const shouldUploadLocal = local.expenses.length > 0 && remoteExpenses.length === 0;
          if (shouldUploadLocal) {
            const { error: syncErr } = await supabase.from("spend_snapshots").upsert({
              user_id: user.id,
              categories: local.categories,
              expenses: local.expenses,
              budget_targets: local.budgetTargets,
              day_flags: local.dayFlags,
              day_goals: local.dayGoals,
              settings: local.settings,
              updated_at: new Date().toISOString(),
            });
            if (syncErr) throw syncErr;
            if (!gate.cancelled && !gate.timedOut) {
              stateRef.current = local;
              setState(local);
              setCloud(true);
              setReady(true);
            }
            return;
          }

          const next: GlobalState = {
            categories: (row.categories as Category[] | null) ?? DEFAULT_CATEGORIES,
            expenses: remoteExpenses,
            budgetTargets: (row.budget_targets as BudgetTarget[] | null) ?? [],
            dayFlags: (row.day_flags as DayFlag[] | null) ?? [],
            dayGoals: (row.day_goals as DayGoal[] | null) ?? [],
            settings: (row.settings as AppSettings | null) ?? DEFAULT_SETTINGS,
          };
          if (!gate.cancelled && !gate.timedOut) {
            stateRef.current = next;
            setState(next);
            writeLocalSnapshot(next);
            setCloud(true);
            setReady(true);
          }
          return;
        }

        const local = readLocalSnapshot();
        if (gate.cancelled || gate.timedOut) return;
        stateRef.current = local;
        setState(local);
        writeLocalSnapshot(local);

        const { error: insErr } = await supabase.from("spend_snapshots").insert({
          user_id: user.id,
          categories: local.categories,
          expenses: local.expenses,
          budget_targets: local.budgetTargets,
          day_flags: local.dayFlags,
          day_goals: local.dayGoals,
          settings: local.settings,
        });

        if (gate.cancelled || gate.timedOut) return;
        if (insErr) throw insErr;
        if (!gate.cancelled && !gate.timedOut) {
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
        console.error(e);
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
  }, []);

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
