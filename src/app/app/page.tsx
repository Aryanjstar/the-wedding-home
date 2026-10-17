import type { Metadata } from "next";

import { DashboardPage } from "@/components/workspace/dashboard";

export const metadata: Metadata = { title: "Dashboard · The Wedding Home" };

export default function Page() {
  return <DashboardPage />;
}
