import type { Metadata } from "next";

import { AccountScreen, TextLink } from "@/components/account-screen";

export const metadata: Metadata = { title: "The wedding · The Wedding Home" };

export default function CreateWeddingPage() {
  return (
    <AccountScreen
      kind="wedding"
      title="The wedding"
      lede="Bride, groom, date, and city. The functions come after this."
      action="Create the wedding"
      links={<TextLink href="/app">Back to the wedding</TextLink>}
    />
  );
}
