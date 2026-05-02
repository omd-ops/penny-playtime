import type { Metadata } from "next";
import { SettingsScreen } from "@/components/screens/SettingsScreen";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage categories, budgets, and preferences.",
};

export default function SettingsPage() {
  return <SettingsScreen />;
}
