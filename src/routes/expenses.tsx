import { createFileRoute } from "@tanstack/react-router";
import { ExpensesScreen } from "@/components/screens/ExpensesScreen";

export const Route = createFileRoute("/expenses")({
  component: ExpensesScreen,
  head: () => ({
    meta: [
      { title: "SpendWise — Expenses" },
      { name: "description", content: "Log and manage your daily expenses." },
    ],
  }),
});