import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppSettings, BudgetTarget, Category, DayFlag, DayGoal, Expense } from "./store";
import { DEFAULT_SETTINGS, DEFAULT_CATEGORIES } from "./store";
import { supabase, isSupabaseConfigured } from "./supabase";

const LS = {
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

const INITIAL_STATE: GlobalState = {
  categories: DEFAULT_CATEGORIES,
  expenses: [],
  budgetTargets: [],
  dayFlags: [],
  dayGoals: [],
  settings: DEFAULT_SETTINGS,
};

type Ctx = {
  ready: boolean;
  cloud: boolean;
  categories: Category[];
  setCategories: (u: Category[] | ((p: Category[]) => Category[])) => void;
  expenses: Expense[];
  setExpenses: (u: Expense[] | ((p: Expense[]) => Expense[])) => void;
  budgetTargets: BudgetTarget[];
  setBudgetTargets: (u: BudgetTarget[] | ((p: BudgetTarget[]) => BudgetTarget[])) => void;
  dayFlags: DayFlag[];
  setDayFlags: (u: DayFlag[] | ((p: DayFlag[]) => DayFlag[])) => void;
  dayGoals: DayGoal[];
  setDayGoals: (u: DayGoal[] | ((p: DayGoal[]) => DayGoal[])) => void;
  settings: AppSettings;
  setSettings: (u: AppSettings | ((p: AppSettings) => AppSettings)) => void;
  syncError: string | null;
};

const SpendCtx = createContext<Ctx | null>(null);

export function useSpendCtx() {
  const ctx = useContext(SpendCtx);
  if (!ctx) {
    throw new Error("Spend hooks must be used within SpendDataProvider");
  }
  return ctx;
}

export function SpendDataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [cloud, setCloud] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [state, setState] = useState<GlobalState>(INITIAL_STATE);
  const stateRef = useRef(state);
  stateRef.current = state;

  const userIdRef = useRef<string | null>(null);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync to local AsyncStorage
  const writeLocalSnapshot = async (s: GlobalState) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(LS.categories, JSON.stringify(s.categories)),
        AsyncStorage.setItem(LS.expenses, JSON.stringify(s.expenses)),
        AsyncStorage.setItem(LS.targets, JSON.stringify(s.budgetTargets)),
        AsyncStorage.setItem(LS.dayflags, JSON.stringify(s.dayFlags)),
        AsyncStorage.setItem(LS.daygoals, JSON.stringify(s.dayGoals)),
        AsyncStorage.setItem(LS.settings, JSON.stringify(s.settings)),
      ]);
    } catch (err) {
      console.error("Failed to save snapshot to AsyncStorage:", err);
    }
  };

  // Sync snapshot to Supabase with debounce
  const debouncedCloudUpsert = useCallback(() => {
    const uid = userIdRef.current;
    if (!uid || !cloud) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      pushTimerRef.current = null;
      const s = stateRef.current;
      void (async () => {
        try {
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
          setSyncError(null);
        } catch (e) {
          console.error("Supabase sync error:", e);
          setSyncError("Cloud sync failed. Working offline.");
        }
      })();
    }, 800);
  }, [cloud]);

  const patch = useCallback(
    (fn: (prev: GlobalState) => GlobalState) => {
      setState((prev) => {
        const next = fn(prev);
        stateRef.current = next;
        void writeLocalSnapshot(next);
        queueMicrotask(() => debouncedCloudUpsert());
        return next;
      });
    },
    [debouncedCloudUpsert],
  );

  const setCategories = useCallback(
    (u: Category[] | ((p: Category[]) => Category[])) => {
      patch((prev) => ({
        ...prev,
        categories: typeof u === "function" ? (u as (p: Category[]) => Category[])(prev.categories) : u,
      }));
    },
    [patch],
  );

  const setExpenses = useCallback(
    (u: Expense[] | ((p: Expense[]) => Expense[])) => {
      patch((prev) => ({
        ...prev,
        expenses: typeof u === "function" ? (u as (p: Expense[]) => Expense[])(prev.expenses) : u,
      }));
    },
    [patch],
  );

  const setBudgetTargets = useCallback(
    (u: BudgetTarget[] | ((p: BudgetTarget[]) => BudgetTarget[])) => {
      patch((prev) => ({
        ...prev,
        budgetTargets:
          typeof u === "function" ? (u as (p: BudgetTarget[]) => BudgetTarget[])(prev.budgetTargets) : u,
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
        settings: typeof u === "function" ? (u as (p: AppSettings) => AppSettings)(prev.settings) : u,
      }));
    },
    [patch],
  );

  // Initialize app state
  useEffect(() => {
    let active = true;

    const init = async () => {
      // 1. Read local storage first for instant loading
      let local: GlobalState = { ...INITIAL_STATE };
      try {
        const read = async <T,>(key: string, fallback: T): Promise<T> => {
          const raw = await AsyncStorage.getItem(key);
          return raw ? (JSON.parse(raw) as T) : fallback;
        };

        local = {
          categories: await read(LS.categories, DEFAULT_CATEGORIES),
          expenses: await read(LS.expenses, []),
          budgetTargets: await read(LS.targets, []),
          dayFlags: await read(LS.dayflags, []),
          dayGoals: await read(LS.daygoals, []),
          settings: await read(LS.settings, DEFAULT_SETTINGS),
        };

        if (active) {
          setState(local);
          stateRef.current = local;
        }
      } catch (e) {
        console.error("Error reading local snapshot:", e);
      }

      // 2. Try online sync if Supabase is configured
      if (!isSupabaseConfigured) {
        if (active) {
          setCloud(false);
          setReady(true);
        }
        return;
      }

      try {
        // Authenticate anonymously
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;

        let currentSession = session;
        if (!currentSession) {
          const { data: anonData, error: anonErr } = await supabase.auth.signInAnonymously();
          if (anonErr) throw anonErr;
          currentSession = anonData.session;
        }

        const user = currentSession?.user;
        if (!user) throw new Error("No authenticated user session");

        userIdRef.current = user.id;

        // Fetch spend snapshot
        const { data: row, error: rowErr } = await supabase
          .from("spend_snapshots")
          .select("categories,expenses,budget_targets,day_flags,day_goals,settings")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!active) return;
        if (rowErr) throw rowErr;

        if (row) {
          const remoteState: GlobalState = {
            categories: (row.categories as Category[] | null) ?? local.categories,
            expenses: (row.expenses as Expense[] | null) ?? local.expenses,
            budgetTargets: (row.budget_targets as BudgetTarget[] | null) ?? local.budgetTargets,
            dayFlags: (row.day_flags as DayFlag[] | null) ?? local.dayFlags,
            dayGoals: (row.day_goals as DayGoal[] | null) ?? local.dayGoals,
            settings: (row.settings as AppSettings | null) ?? local.settings,
          };
          
          setState(remoteState);
          stateRef.current = remoteState;
          await writeLocalSnapshot(remoteState);
          setCloud(true);
          setReady(true);
        } else {
          // New account, push existing local snapshot
          const { error: insErr } = await supabase.from("spend_snapshots").insert({
            user_id: user.id,
            categories: local.categories,
            expenses: local.expenses,
            budget_targets: local.budgetTargets,
            day_flags: local.dayFlags,
            day_goals: local.dayGoals,
            settings: local.settings,
          });
          if (insErr) throw insErr;
          setCloud(true);
          setReady(true);
        }
      } catch (err) {
        console.error("Supabase init error, continuing offline:", err);
        if (active) {
          setSyncError("Cloud server unavailable. Using offline backup.");
          setCloud(false);
          setReady(true);
        }
      }
    };

    void init();

    return () => {
      active = false;
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
      syncError,
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
      syncError,
    ],
  );

  return <SpendCtx.Provider value={value}>{children}</SpendCtx.Provider>;
}

export function useCategories(): [Category[], (u: Category[] | ((p: Category[]) => Category[])) => void] {
  const { categories, setCategories } = useSpendCtx();
  return [categories, setCategories];
}

export function useExpenses(): [Expense[], (u: Expense[] | ((p: Expense[]) => Expense[])) => void] {
  const { expenses, setExpenses } = useSpendCtx();
  return [expenses, setExpenses];
}

export function useBudgetTargets(): [BudgetTarget[], (u: BudgetTarget[] | ((p: BudgetTarget[]) => BudgetTarget[])) => void] {
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

export function useSettings(): [AppSettings, (u: AppSettings | ((p: AppSettings) => AppSettings)) => void] {
  const { settings, setSettings } = useSpendCtx();
  return [settings, setSettings];
}
