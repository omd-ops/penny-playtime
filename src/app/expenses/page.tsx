import type { Metadata } from "next";
import { ExpensesScreen } from "@/components/screens/ExpensesScreen";

export const metadata: Metadata = {
  title: "Expenses",
  description: "Log and manage your daily expenses.",
};

export default function ExpensesPage() {
  return <ExpensesScreen />;
}
