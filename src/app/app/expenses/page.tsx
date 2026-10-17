import type { Metadata } from "next";

import { ExpensesPage } from "@/components/workspace/expenses";

export const metadata: Metadata = { title: "Expenses · The Wedding Home" };

export default function Page() {
  return <ExpensesPage />;
}
