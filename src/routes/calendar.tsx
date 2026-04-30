import { createFileRoute } from "@tanstack/react-router";
import { CalendarScreen } from "@/components/screens/CalendarScreen";

export const Route = createFileRoute("/calendar")({
  component: CalendarScreen,
  head: () => ({
    meta: [
      { title: "SpendWise — Calendar" },
      { name: "description", content: "Browse your expenses by date on a monthly calendar." },
    ],
  }),
});