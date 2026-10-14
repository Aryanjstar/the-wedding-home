"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { Mark } from "@/components/mark";
import { usePreview } from "@/components/preview-session";

type Kind = "sign-in" | "create" | "wedding" | "reset";
type Step = "account" | "wedding" | "functions" | "dashboard";

const steps: { id: Step; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "wedding", label: "Wedding" },
  { id: "functions", label: "Functions" },
  { id: "dashboard", label: "Dashboard" },
];

export function FlowSteps({ current }: { current: Step }) {
  const index = steps.findIndex((step) => step.id === current);
  return (
    <ol className="flow-steps" aria-label="Setup">
      {steps.map((step, i) => (
        <li key={step.id} aria-current={step.id === current ? "step" : undefined} data-state={i < index ? "done" : i === index ? "current" : "later"}>
          <span>{i + 1}</span>
          {step.label}
        </li>
      ))}
    </ol>
  );
}

export function AccountScreen({
  kind,
  title,
  lede,
  action,
  links,
  extra,
  token,
  returnTo,
  defaultEmail,
}: {
  kind: Kind;
  title: string;
  lede?: string;
  action: string;
  links: ReactNode;
  extra?: ReactNode;
  token?: string;
  returnTo?: string;
  defaultEmail?: string;
}) {
  const router = useRouter();
  const preview = usePreview();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    if (!preview.ready) return;
    if (preview.person && (kind === "sign-in" || kind === "create")) {
      router.replace(returnTo || (preview.wedding ? "/app" : "/wedding/new"));
    }
    if (!preview.person && kind === "wedding") router.replace("/plan");
  }, [preview.ready, preview.person, preview.wedding, kind, router, returnTo]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setError(null);
    setPending(true);
    try {
      if (kind === "sign-in") {
        const result = await preview.signIn(String(data.get("email") || ""), String(data.get("password") || ""));
        if (result.error) setError(result.error);
        else router.push(returnTo || result.next);
        return;
      }
      if (kind === "create") {
        const result = await preview.createAccount(
          String(data.get("name") || ""),
          String(data.get("email") || ""),
          String(data.get("password") || ""),
          String(data.get("confirm") || ""),
        );
        if (result.error) setError(result.error);
        else router.push(returnTo || result.next || "/wedding/new");
        return;
      }
      if (kind === "wedding") {
        const next = await preview.saveWedding({
          bride: String(data.get("bride") || ""),
          groom: String(data.get("groom") || ""),
          date: String(data.get("date") || ""),
          city: String(data.get("city") || ""),
          title: String(data.get("title") || ""),
          story: String(data.get("story") || ""),
        });
        if (!next) setError("Enter the bride, the groom, the date, and the city.");
        else router.push(next);
        return;
      }
      const failure = await preview.requestReset(String(data.get("email") || ""));
      if (failure) setError(failure);
      else setSent(true);
    } finally {
      setPending(false);
    }
  }

  async function saveReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setError(null);
    setPending(true);
    try {
      const failure = await preview.resetPassword(token ?? "", String(data.get("password") || ""), String(data.get("confirm") || ""));
      if (failure) setError(failure);
      else setResetDone(true);
    } finally {
      setPending(false);
    }
  }

  if (!preview.ready) {
    return (
      <main className="account">
        <p className="muted">Opening…</p>
      </main>
    );
  }

  if (kind === "reset" && token) {
    return (
      <main className="account">
        <div className="glass account-card">
          <Mark />
          <h1 className="serif">Choose a new password</h1>
          <p>Use 10 to 128 characters. Not a common password. This link works once.</p>
          {resetDone ? (
            <p>The new password is saved. Sign in with it.</p>
          ) : (
            <form className="fields" onSubmit={saveReset}>
              <Field label="New password" name="password" type="password" autoComplete="new-password" hint="10 to 128 characters." />
              <Field label="Confirm password" name="confirm" type="password" autoComplete="new-password" />
              {error ? <p className="form-error" role="alert">{error}</p> : null}
              <button className="btn" type="submit" disabled={pending}>{pending ? "Saving…" : "Save password"}</button>
            </form>
          )}
          <div className="account-links">
            <TextLink href="/sign-in">Back to sign in</TextLink>
          </div>
        </div>
      </main>
    );
  }

  if (kind === "reset" && sent) {
    return (
      <main className="account">
        <div className="glass account-card">
          <Mark />
          <h1 className="serif">Check that email</h1>
          <p>If that address has an account, we have sent a reset link.</p>
          <p className="fine">The note stays the same even when the address is new. The link works for one hour.</p>
          <div className="account-links">
            <TextLink href="/sign-in">Back to sign in</TextLink>
          </div>
        </div>
      </main>
    );
  }

  const wedding = preview.wedding;
  const formKey = kind === "wedding" ? `${wedding?.bride ?? ""}|${wedding?.groom ?? ""}|${wedding?.date ?? ""}|${wedding?.city ?? ""}|${wedding?.title ?? ""}|${wedding?.story ?? ""}` : kind;

  return (
    <main className="account">
      <form key={formKey} className="glass account-card" onSubmit={submit}>
        <Mark />
        {kind === "create" ? <FlowSteps current="account" /> : null}
        {kind === "wedding" ? <FlowSteps current="wedding" /> : null}
        <h1 className="serif">{title}</h1>
        {lede ? <p className="muted">{lede}</p> : null}
        <div className="fields">
          {kind === "sign-in" ? (
            <>
              <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={defaultEmail} />
              <Field label="Password" name="password" type="password" autoComplete="current-password" />
            </>
          ) : null}
          {kind === "create" ? (
            <>
              <Field label="Name" name="name" autoComplete="name" />
              <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={defaultEmail} />
              <Field label="Password" name="password" type="password" autoComplete="new-password" hint="10 to 128 characters. Not a common password." />
              <Field label="Confirm password" name="confirm" type="password" autoComplete="new-password" />
            </>
          ) : null}
          {kind === "wedding" ? (
            <>
              <Field label="Bride" name="bride" defaultValue={wedding?.bride ?? ""} autoComplete="off" />
              <Field label="Groom" name="groom" defaultValue={wedding?.groom ?? ""} autoComplete="off" />
              <Field label="Wedding date" name="date" type="date" defaultValue={wedding?.date ?? ""} />
              <Field label="City" name="city" defaultValue={wedding?.city ?? ""} autoComplete="address-level2" />
              <Field label="Title" name="title" defaultValue={wedding?.title ?? ""} autoComplete="off" required={false} hint="Optional. Shown instead of the two names." />
              <label>
                Story
                <textarea name="story" rows={3} defaultValue={wedding?.story ?? ""} />
                <span className="fine">Optional. A few lines about the wedding.</span>
              </label>
            </>
          ) : null}
          {kind === "reset" ? <Field label="Email" name="email" type="email" autoComplete="email" /> : null}
        </div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button className="btn" type="submit" disabled={pending}>
          {pending ? (kind === "sign-in" ? "Continuing…" : "Saving…") : kind === "wedding" && wedding ? "Save" : action}
        </button>
        <div className="account-links">{links}</div>
        {kind === "create" ? <p className="fine">One person starts the wedding. They can invite the rest of the family after the functions are in.</p> : null}
        {extra}
      </form>
    </main>
  );
}

export function Field({
  label,
  type = "text",
  defaultValue,
  name,
  autoComplete,
  hint,
  required = true,
}: {
  label: string;
  type?: string;
  defaultValue?: string;
  name: string;
  autoComplete?: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label>
      {label}
      <input name={name} type={type} defaultValue={defaultValue} required={required} autoComplete={autoComplete} />
      {hint ? <span className="fine">{hint}</span> : null}
    </label>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link className="quiet-link" href={href}>{children}</Link>;
}
