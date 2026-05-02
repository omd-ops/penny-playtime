/** Re-exports data hooks + provider. Import from here (not `@/lib/store`) to avoid circular deps with `store.ts`. */
export {
  SpendDataProvider,
  useCategories,
  useExpenses,
  useBudgetTargets,
  useDayFlags,
  useDayGoals,
  useSettings,
} from "./spend-data-provider";
