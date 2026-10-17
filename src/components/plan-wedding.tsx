"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { AuthLayout, Heading } from "@/components/account-screen";
import { useSession, type SessionWedding } from "@/components/session";
import { Button, Field, PasswordInput, TextArea, TextInput } from "@/components/ui/kit";

const empty: SessionWedding = { bride: "", groom: "", date: "", city: "", title: "", story: "" };
const draftKey = "twh-plan-draft";

/** Couple, date, and city first. Then the account, which becomes the first Admin. */
export function PlanWedding() {
  const router = useRouter();
  const session = useSession();
  const [step, setStep] = useState<"wedding" | "account">("wedding");
  const [draft, setDraft] = useState<SessionWedding>(empty);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = sessionStorage.getItem(draftKey);
        if (saved) setDraft({ ...empty, ...(JSON.parse(saved) as Partial<SessionWedding>) });
      } catch {
        sessionStorage.removeItem(draftKey);
      }
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (session.ready && session.me?.wedding && !busy) router.replace("/app");
  }, [session.ready, session.me, busy, router]);

  async function finish(wedding: SessionWedding) {
    const failure = await session.createWedding(wedding);
    if (failure) {
      setError(failure);
      setBusy(false);
      return;
    }
    sessionStorage.removeItem(draftKey);
    router.push("/app/events?welcome=1");
  }

  async function submitWedding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    const next = { bride: text("bride"), groom: text("groom"), date: text("date"), city: text("city"), title: text("title"), story: text("story") };
    if (!next.bride || !next.groom || !next.date || !next.city) return setError("Enter the bride, the groom, the date, and the city.");
    setDraft(next);
    sessionStorage.setItem(draftKey, JSON.stringify(next));
    setError(null);
    if (session.me) {
      setBusy(true);
      await finish(next);
      return;
    }
    setStep("account");
  }

  async function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    const created = await session.createAccount(String(data.get("name") ?? ""), String(data.get("email") ?? ""), String(data.get("password") ?? ""), String(data.get("confirm") ?? ""));
    if (created.error) {
      setError(created.error);
      setBusy(false);
      return;
    }
    if (created.next === "/app") {
      // An invitation was waiting for this email, so they joined that wedding instead.
      sessionStorage.removeItem(draftKey);
      router.push("/app");
      return;
    }
    await finish(draft);
  }

  if (!loaded || !session.ready) {
    return (
      <div className="ws-loading"><span className="ui-spinner" aria-hidden="true" /><p>Opening…</p></div>
    );
  }

  const accountStep = step === "account" && !session.me;

  return (
    <AuthLayout>
      <ol className="auth-steps" aria-label={accountStep ? "Step 2 of 2" : "Step 1 of 2"}>
        <li data-state={accountStep ? "done" : "current"} />
        <li data-state={accountStep ? "current" : "later"} />
      </ol>
      {accountStep ? (
        <>
          <Heading title="Your account" lede={<>You become the first Admin of {draft.bride.split(" ")[0]} &amp; {draft.groom.split(" ")[0]}. Invite the rest of the family next.</>} />
          <form className="ui-form ui-form-1" onSubmit={(event) => void submitAccount(event)} key="account">
            <Field label="Your name"><TextInput name="name" autoComplete="name" required maxLength={100} autoFocus /></Field>
            <Field label="Email"><TextInput name="email" type="email" autoComplete="email" required /></Field>
            <Field label="Password" hint="10 to 128 characters. Not a common password."><PasswordInput name="password" autoComplete="new-password" required /></Field>
            <Field label="Confirm password"><PasswordInput name="confirm" autoComplete="new-password" required /></Field>
            {error ? <p className="auth-alert" role="alert">{error}</p> : null}
            <Button type="submit" size="lg" busy={busy}>Create the wedding</Button>
          </form>
          <div className="auth-links">
            <button type="button" onClick={() => { setError(null); setStep("wedding"); }}>← Back to the couple</button>
            <Link href="/sign-in">I already have an account</Link>
          </div>
        </>
      ) : (
        <>
          <Heading title="Plan the wedding" lede={session.me ? `Signed in as ${session.me.user.email}. One account plans one wedding.` : "Start with the couple, the date, and the city. Everything else can come later."} />
          <form className="ui-form" onSubmit={(event) => void submitWedding(event)} key="wedding">
            <Field label="Bride"><TextInput name="bride" defaultValue={draft.bride} required maxLength={100} autoComplete="off" placeholder="Aanya Sharma" autoFocus /></Field>
            <Field label="Groom"><TextInput name="groom" defaultValue={draft.groom} required maxLength={100} autoComplete="off" placeholder="Kabir Mehta" /></Field>
            <Field label="Wedding date"><TextInput name="date" type="date" defaultValue={draft.date} required /></Field>
            <Field label="City"><TextInput name="city" defaultValue={draft.city} required maxLength={80} placeholder="Jaipur" /></Field>
            <Field label="Title" span={2} optional hint="Shown instead of the two names."><TextInput name="title" defaultValue={draft.title} maxLength={120} placeholder="Aanya weds Kabir" /></Field>
            <Field label="Your story" span={2} optional><TextArea name="story" defaultValue={draft.story} maxLength={2000} placeholder="How it started, in a few lines." /></Field>
            {error ? <p className="ui-span-2 auth-alert" role="alert">{error}</p> : null}
            <div className="ui-span-2" style={{ display: "grid" }}><Button type="submit" size="lg" busy={busy}>{session.me ? "Create the wedding" : "Continue"}</Button></div>
          </form>
          <div className="auth-links">
            {session.me ? <Link href="/app/account">Account</Link> : <Link href="/sign-in">I already have an account</Link>}
            <Link href="/">Home</Link>
          </div>
        </>
      )}
    </AuthLayout>
  );
}
