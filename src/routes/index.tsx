import { createFileRoute } from "@tanstack/react-router";
import { OverviewScreen } from "@/components/screens/OverviewScreen";

export const Route = createFileRoute("/")({
  component: OverviewScreen,
  head: () => ({
    meta: [
      { title: "SpendWise — Overview" },
      { name: "description", content: "Your spending snapshot at a glance." },
    ],
  }),
});
