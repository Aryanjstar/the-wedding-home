import type { Metadata } from "next";

import { daysUntilWedding } from "@/data/sample";
import { Dashboard } from "@/components/workspace/views";

export const metadata: Metadata = { title: "Dashboard · The Wedding Home" };

export default function DashboardPage() {
  return <Dashboard days={daysUntilWedding(new Date())} />;
}
