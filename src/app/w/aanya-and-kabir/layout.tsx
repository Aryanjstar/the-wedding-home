import type { ReactNode } from "react";

import { SoundProvider } from "@/components/guest/sound";

/** The designed sample shares one player across its pages, like a real wedding's site. */
export default function SampleSiteLayout({ children }: { children: ReactNode }) {
  return (
    <SoundProvider>
      <div className="g-sample">{children}</div>
    </SoundProvider>
  );
}
