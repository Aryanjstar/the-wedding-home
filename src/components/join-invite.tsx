"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { api, errorText } from "@/components/api";
import { AuthLayout, Heading } from "@/components/account-screen";
import { useSession, type Me } from "@/components/session";
import { Button, ButtonLink } from "@/components/ui/kit";

type Invite = { wedding: { brideName: string; groomName: string }; role: "admin" | "manager"; email: string };

export function JoinInvite({ token }: { token: string }) {
  const router = useRouter();
  const session = useSession();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const next = `/join/${token}`;

  useEffect(() => {
    let active = true;
    api<Invite>(`/api/public/member-invite/${encodeURIComponent(token)}`)
      .then((value) => active && setInvite(value))
      .catch((error) => active && setProblem(errorText(error)));
    return () => {
      active = false;
    };
  }, [token]);

  async function accept() {
    setBusy(true);
    setProblem(null);
    try {
      session.setMe(await api<Me>("/api/members/join", { method: "POST", body: { token } }));
      router.push("/app");
    } catch (error) {
      setProblem(errorText(error));
      setBusy(false);
    }
  }

  const me = session.me;
  const sameEmail = me?.user.email === invite?.email;
  const role = invite?.role === "admin" ? "an Admin" : "a Manager";

  return (
    <AuthLayout>
      <Heading title="Join the wedding" lede={invite ? <>{invite.wedding.brideName} &amp; {invite.wedding.groomName} invited <strong>{invite.email}</strong> to organise as {role}.</> : undefined} />
      {!invite && !problem ? <p className="ui-hint">Opening the invitation…</p> : null}
      {problem ? <p className="auth-alert" role="alert">{problem}</p> : null}
      {invite && session.ready ? (
        me?.wedding && sameEmail ? (
          <ButtonLink href="/app" size="lg">Open the wedding</ButtonLink>
        ) : me?.wedding ? (
          <p className="auth-alert">You are signed in as {me.user.email}, who already organises a wedding. One account plans one wedding. Sign out and sign in as {invite.email}.</p>
        ) : me && sameEmail ? (
          <Button size="lg" busy={busy} onClick={() => void accept()}>Accept and open the wedding</Button>
        ) : me ? (
          <p className="auth-alert">This invitation is for {invite.email}. You are signed in as {me.user.email}. Sign out, then sign in with that address.</p>
        ) : (
          <div className="ui-form ui-form-1">
            <ButtonLink href={`/create-account?next=${encodeURIComponent(next)}&email=${encodeURIComponent(invite.email)}`} size="lg">Create an account</ButtonLink>
            <ButtonLink href={`/sign-in?next=${encodeURIComponent(next)}&email=${encodeURIComponent(invite.email)}`} size="lg" tone="secondary">I already have an account</ButtonLink>
          </div>
        )
      ) : null}
      <div className="auth-links"><Link href="/">The Wedding Home</Link></div>
    </AuthLayout>
  );
}
