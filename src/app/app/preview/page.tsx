import type { Metadata } from "next";

import { PreviewPage } from "@/components/workspace/settings";

export const metadata: Metadata = { title: "Preview as guest · The Wedding Home" };

export default function Page() {
  return <PreviewPage />;
}
