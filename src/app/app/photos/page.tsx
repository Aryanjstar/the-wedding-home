import type { Metadata } from "next";

import { Photos } from "@/components/workspace/views";

export const metadata: Metadata = { title: "Photos · The Wedding Home" };

export default function PhotosPage() {
  return <Photos />;
}
