import { useState, useEffect, useCallback } from "react";

// Types
export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface Expense {
  id: string;
  amount: number;
  categoryId: string;
  note: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
}

export interface BudgetTarget {
  id: string;
  period: "daily" | "monthly" | "yearly";
  amount: number;
}

export interface DayFlag {
  date: string; // YYYY-MM-DD
  metTarget: boolean;
}

export interface AppSettings {
  currency: string;
  theme: "light" | "dark" | "system";
}

// Default categories
const DEFAULT_CATEGORIES: Category[] = [
  { id: "food", name: "Food & Drinks", color: "#10b981", icon: "🍔" },
  { id: "transport", name: "Transport", color: "#3b82f6", icon: "🚌" },
  { id: "shopping", name: "Shopping", color: "#f59e0b", icon: "🛍️" },
  { id: "bills", name: "Bills & Utilities", color: "#ef4444", icon: "📱" },
  { id: "entertainment", name: "Entertainment", color: "#8b5cf6", icon: "🎬" },
  { id: "health", name: "Health", color: "#ec4899", icon: "💊" },
  { id: "education", name: "Education", color: "#06b6d4", icon: "📚" },
  { id: "other", name: "Other", color: "#6b7280", icon: "📦" },
];

const DEFAULT_SETTINGS: AppSettings = { currency: "$", theme: "system" };

// Storage helpers
function getItem<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

// Event-based reactivity for cross-component sync
const listeners = new Map<string, Set<() => void>>();

function notify(key: string) {
  listeners.get(key)?.forEach((fn) => fn());
}

function useStore<T>(key: string, fallback: T): [T, (updater: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => getItem(key, fallback));

  useEffect(() => {
    const set = listeners.get(key) ?? new Set();
    const handler = () => setValue(getItem(key, fallback));
    set.add(handler);
    listeners.set(key, set);
    return () => { set.delete(handler); };
  }, [key]);

  const update = useCallback(
    (updater: T | ((prev: T) => T)) => {
      const current = getItem(key, fallback);
      const next = typeof updater === "function" ? (updater as (prev: T) => T)(current) : updater;
      setItem(key, next);
      setValue(next);
      notify(key);
    },
    [key],
  );

  return [value, update];
}

// Hooks
export function useCategories() {
  return useStore<Category[]>("et_categories", DEFAULT_CATEGORIES);
}

export function useExpenses() {
  return useStore<Expense[]>("et_expenses", []);
}

export function useBudgetTargets() {
  return useStore<BudgetTarget[]>("et_targets", []);
}

export function useDayFlags() {
  return useStore<DayFlag[]>("et_dayflags", []);
}

export function useSettings() {
  return useStore<AppSettings>("et_settings", DEFAULT_SETTINGS);
}

// Helpers
export function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function formatCurrency(amount: number, currency: string) {
  return `${currency}${amount.toFixed(2)}`;
}

export function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export function getExpensesForDate(expenses: Expense[], date: string) {
  return expenses.filter((e) => e.date === date);
}

export function getExpensesForMonth(expenses: Expense[], year: number, month: number) {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  return expenses.filter((e) => e.date.startsWith(prefix));
}

export function getExpensesForYear(expenses: Expense[], year: number) {
  const prefix = `${year}-`;
  return expenses.filter((e) => e.date.startsWith(prefix));
}

export function sumExpenses(expenses: Expense[]) {
  return expenses.reduce((s, e) => s + e.amount, 0);
}

export function getBudgetStatus(spent: number, limit: number): "safe" | "warning" | "over" {
  if (limit <= 0) return "safe";
  const ratio = spent / limit;
  if (ratio >= 1) return "over";
  if (ratio >= 0.8) return "warning";
  return "safe";
}

export function getTargetForPeriod(targets: BudgetTarget[], period: "daily" | "monthly" | "yearly") {
  return targets.find((t) => t.period === period);
}