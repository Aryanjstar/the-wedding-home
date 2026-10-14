import type { Metadata } from "next";

import { PlanWedding } from "@/components/plan-wedding";

export const metadata: Metadata = { title: "Plan the wedding · The Wedding Home" };

export default function PlanPage() {
  return <PlanWedding />;
}
