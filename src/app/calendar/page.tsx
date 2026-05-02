import type { Metadata } from "next";
import { CalendarScreen } from "@/components/screens/CalendarScreen";

export const metadata: Metadata = {
  title: "Calendar",
  description: "Browse your expenses by date on a monthly calendar.",
};

export default function CalendarPage() {
  return <CalendarScreen />;
}
