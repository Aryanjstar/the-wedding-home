import type { Metadata } from "next";

import { Vendors } from "@/components/workspace/views";

export const metadata: Metadata = { title: "Vendors · The Wedding Home" };

export default function VendorsPage() {
  return <Vendors />;
}
