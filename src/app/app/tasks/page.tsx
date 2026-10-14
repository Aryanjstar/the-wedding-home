import type { Metadata } from "next";

import { Tasks } from "@/components/workspace/views";

export const metadata: Metadata = { title: "Tasks · The Wedding Home" };

export default function TasksPage() {
  return <Tasks />;
}
