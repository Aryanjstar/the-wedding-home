import type { ReactNode } from "react";

import { Shell } from "@/components/workspace/shell";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <Shell>{children}</Shell>;
}
