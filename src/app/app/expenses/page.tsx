import type { Metadata } from "next";

import { Expenses } from "@/components/workspace/views";

export const metadata: Metadata = { title: "Expenses · The Wedding Home" };

export default function ExpensesPage() {
  return <Expenses />;
}
