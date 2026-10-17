import type { Metadata } from "next";

import { TasksPage } from "@/components/workspace/tasks";

export const metadata: Metadata = { title: "Tasks · The Wedding Home" };

export default function Page() {
  return <TasksPage />;
}
