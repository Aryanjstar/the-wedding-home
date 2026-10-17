import type { Metadata } from "next";

import { VendorsPage } from "@/components/workspace/vendors";

export const metadata: Metadata = { title: "Vendors · The Wedding Home" };

export default function Page() {
  return <VendorsPage />;
}
