import type { Metadata } from "next";

import { PhotosPage } from "@/components/workspace/photos";

export const metadata: Metadata = { title: "Photos & videos · The Wedding Home" };

export default function Page() {
  return <PhotosPage />;
}
