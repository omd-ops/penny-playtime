import type { Metadata } from "next";
import { NotesScreen } from "@/components/screens/NotesScreen";

export const metadata: Metadata = {
  title: "Notes",
  description: "Spending caps, habit and TODO plans by period, and important notes.",
};

export default function NotesPage() {
  return <NotesScreen />;
}
