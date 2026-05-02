import type { Metadata } from "next";
import { OverviewScreen } from "@/components/screens/OverviewScreen";

export const metadata: Metadata = {
  title: "Overview",
  description: "Your spending snapshot at a glance.",
};

export default function HomePage() {
  return <OverviewScreen />;
}
