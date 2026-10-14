"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Mark } from "@/components/mark";
import { usePreview } from "@/components/preview-session";

type Invite = {
  wedding: { brideName: string; groomName: string };
  role: "admin" | "manager";
  email: string;
};

export function JoinInvite({ token }: { token: string }) {
  const router = useRouter();
  const preview = usePreview();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const next = `/join/${token}`;

  useEffect(() => {
    let active = true;
    fetch(`/api/public/member-invite/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) {
          const body = await response.json().catch(() => null) as { detail?: string } | null;
          setProblem(body?.detail || "That invitation was not found.");
          return;
        }
        setInvite(await response.json() as Invite);
      })
      .catch(() => {
        if (active) setProblem("That invitation could not be opened.");
      });
    return () => {
      active = false;
    };
  }, [token]);

  async function accept() {
    setPending(true);
    setProblem(null);
    const response = await fetch("/api/members/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { detail?: string } | null;
      setProblem(body?.detail || "Could not accept the invitation.");
      setPending(false);
      return;
    }
    router.push("/app");
    router.refresh();
  }

  const sameEmail = preview.person?.email === invite?.email;
  const role = invite?.role === "admin" ? "an Admin" : "a Manager";

  return (
    <main className="account">
      <div className="glass account-card">
        <Mark />
        <h1 className="serif">Join the wedding</h1>
        {!invite && !problem ? <p className="muted">Opening the invitation…</p> : null}
        {problem ? <p className="form-error" role="alert">{problem}</p> : null}
        {invite ? (
          <>
            <p>{invite.wedding.brideName} & {invite.wedding.groomName} invited {invite.email} to organise as {role}.</p>
            {preview.ready && preview.person && preview.wedding ? (
              <Link className="btn" href="/app">Open the wedding</Link>
            ) : null}
            {preview.ready && sameEmail && !preview.wedding ? (
              <button className="btn" type="button" disabled={pending} onClick={() => void accept()}>
                {pending ? "Joining…" : "Accept"}
              </button>
            ) : null}
            {preview.ready && !preview.person ? (
              <div className="actions">
                <Link className="btn" href={`/create-account?next=${encodeURIComponent(next)}&email=${encodeURIComponent(invite.email)}`}>Create account</Link>
                <Link className="btn-text" href={`/sign-in?next=${encodeURIComponent(next)}&email=${encodeURIComponent(invite.email)}`}>Sign in</Link>
              </div>
            ) : null}
            {preview.ready && preview.person && !sameEmail ? (
              <p className="fine">This invitation is for {invite.email}. Sign in with that address.</p>
            ) : null}
          </>
        ) : null}
      </div>
    </main>
  );
}
