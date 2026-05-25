// Core models and helper functions for Penny Pay. Pure business logic.

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
  type?: "cash-in" | "cash-out";
}

export interface BudgetTarget {
  id: string;
  period: "daily" | "monthly" | "yearly";
  amount: number;
}

export interface DayFlag {
  date: string; // YYYY-MM-DD
  metTarget: boolean;
  label?: string;
}

export interface DayGoal {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  done: boolean;
}

export interface ImportantNoteItem {
  id: string;
  text: string;
}

export type HabitPlanPeriod = "daily" | "weekly" | "monthly" | "yearly";
export type HabitPlanTextPeriod = "weekly" | "monthly" | "yearly";

export interface AppSettings {
  currency: string;
  theme: "light" | "dark" | "system";
  notes?: string;
  dailyHabitItems?: ImportantNoteItem[];
  habitPlans?: Partial<Record<HabitPlanTextPeriod, string>>;
  importantNoteItems?: ImportantNoteItem[];
  dailyUpdateRemindersEnabled?: boolean;
  dailyUpdateReminderTimes?: string[];
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "food", name: "Food & Drinks", color: "#10b981", icon: "🍔" },
  { id: "transport", name: "Transport", color: "#3b82f6", icon: "🚌" },
  { id: "shopping", name: "Shopping", color: "#f59e0b", icon: "🛍️" },
  { id: "bills", name: "Bills & Utilities", color: "#ef4444", icon: "📱" },
  { id: "entertainment", name: "Entertainment", color: "#8b5cf6", icon: "🎬" },
  { id: "health", name: "Health", color: "#ec4899", icon: "💊" },
  { id: "education", name: "Education", color: "#06b6d4", icon: "📚" },
  { id: "other", name: "Other", color: "#6b7280", icon: "📦" },
];

export const DEFAULT_DAILY_REMINDER_TIMES = ["09:00", "14:00", "19:00"] as const;

export const DEFAULT_SETTINGS: AppSettings = {
  currency: "$",
  theme: "system",
  notes: "",
  dailyHabitItems: [],
  habitPlans: {},
  importantNoteItems: [],
  dailyUpdateRemindersEnabled: false,
  dailyUpdateReminderTimes: [...DEFAULT_DAILY_REMINDER_TIMES],
};

const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidReminderTime(s: string): boolean {
  return HH_MM.test(s.trim());
}

export function normalizeDailyReminderTimes(times: string[] | undefined): string[] {
  if (!times?.length) return [...DEFAULT_DAILY_REMINDER_TIMES];
  const valid = times.map((t) => t.trim()).filter(isValidReminderTime);
  if (!valid.length) return [...DEFAULT_DAILY_REMINDER_TIMES];
  return [...new Set(valid)].sort();
}

export function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function formatCurrency(amount: number, currency: string) {
  return `${currency}${amount.toFixed(2)}`;
}

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

export function isExpenseDebit(e: Expense): boolean {
  return e.type !== "cash-in";
}

export function sumDebits(expenses: Expense[]) {
  return expenses.filter(isExpenseDebit).reduce((s, e) => s + e.amount, 0);
}

export function sumCredits(expenses: Expense[]) {
  return expenses.filter((e) => !isExpenseDebit(e)).reduce((s, e) => s + e.amount, 0);
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
