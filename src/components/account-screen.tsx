"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { useSession } from "@/components/session";
import { Icon } from "@/components/ui/icon";
import { Button, Field, PasswordInput, TextInput } from "@/components/ui/kit";

function Mandap() {
  return (
    <svg className="auth-mandap" viewBox="0 0 400 300" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="M40 290V120M360 290V120M40 120Q200 10 360 120M70 120V290M330 120V290" />
      <path d="M40 120h320M60 104q140-80 280 0" />
      {Array.from({ length: 13 }, (_, index) => (
        <path key={index} d={`M${60 + index * 23} 120v${14 + (index % 2) * 8}`} />
      ))}
      {Array.from({ length: 13 }, (_, index) => (
        <circle key={`m${index}`} cx={60 + index * 23} cy={138 + (index % 2) * 8} r="4" />
      ))}
      <path d="M150 290v-50h100v50M170 240v-22h60v22M200 218v-16" />
      <path d="M192 196q8-14 16 0q-8 8-16 0z" />
      <path d="M0 290h400" />
    </svg>
  );
}

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth-art">
        <Link href="/" className="ws-mark" aria-label="The Wedding Home">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5M6 10v9h12v-9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="14" r="1.6" fill="currentColor" /></svg>
          <span>The Wedding Home</span>
        </Link>
        <div className="auth-art-copy">
          <p lang="hi">॥ शुभ विवाह ॥</p>
          <h2>The whole week, in one home.</h2>
          <p>Functions with their maps, households and RSVPs with veg, non-veg and Jain, tasks, a rupee spend log, a themed site, and one gallery for every phone.</p>
        </div>
        <div className="auth-art-foot">
          <span><Icon name="shield" size={15} /> Guests never need an account</span>
          <span><Icon name="whatsapp" size={15} /> Invites on WhatsApp</span>
        </div>
        <Mandap />
      </aside>
      <main className="auth-panel">
        <div className="auth-card">
          <div className="auth-mobile-brand">
            <Link href="/" className="ws-mark">
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5M6 10v9h12v-9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="14" r="1.6" fill="currentColor" /></svg>
              <span>The Wedding Home</span>
            </Link>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

export function Heading({ title, lede }: { title: string; lede?: ReactNode }) {
  return (
    <header>
      <h1>{title}</h1>
      {lede ? <p className="ws-lede">{lede}</p> : null}
    </header>
  );
}

export function SignInForm({ returnTo, defaultEmail }: { returnTo?: string; defaultEmail?: string }) {
  const router = useRouter();
  const session = useSession();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session.ready && session.me && !busy) router.replace(returnTo || (session.me.wedding ? "/app" : "/plan"));
  }, [session.ready, session.me, busy, returnTo, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    const result = await session.signIn(String(data.get("email") ?? ""), String(data.get("password") ?? ""));
    if (result.error) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.push(returnTo || result.next);
  }

  return (
    <AuthLayout>
      <Heading title="Welcome back" lede="Sign in to the wedding you are organising." />
      <form className="ui-form ui-form-1" onSubmit={(event) => void submit(event)}>
        <Field label="Email"><TextInput name="email" type="email" autoComplete="email" defaultValue={defaultEmail} required autoFocus={!defaultEmail} /></Field>
        <Field label="Password"><PasswordInput name="password" autoComplete="current-password" required autoFocus={Boolean(defaultEmail)} /></Field>
        {error ? <p className="auth-alert" role="alert">{error}</p> : null}
        <Button type="submit" size="lg" busy={busy}>Sign in</Button>
      </form>
      <div className="auth-links">
        <Link href="/reset-password">Forgot password?</Link>
        <Link href={returnTo ? `/create-account?next=${encodeURIComponent(returnTo)}${defaultEmail ? `&email=${encodeURIComponent(defaultEmail)}` : ""}` : "/plan"}>{returnTo ? "Create an account" : "Plan a new wedding"}</Link>
      </div>
    </AuthLayout>
  );
}

export function CreateAccountForm({ returnTo, defaultEmail }: { returnTo?: string; defaultEmail?: string }) {
  const router = useRouter();
  const session = useSession();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session.ready && session.me && !busy) router.replace(returnTo || (session.me.wedding ? "/app" : "/plan"));
  }, [session.ready, session.me, busy, returnTo, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    const result = await session.createAccount(String(data.get("name") ?? ""), String(data.get("email") ?? ""), String(data.get("password") ?? ""), String(data.get("confirm") ?? ""));
    if (result.error) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.push(returnTo || result.next);
  }

  return (
    <AuthLayout>
      <Heading title={returnTo ? "Join the family" : "Create your account"} lede={returnTo ? "Use the same email the invitation was sent to." : "Your name, your email, and a password."} />
      <form className="ui-form ui-form-1" onSubmit={(event) => void submit(event)}>
        <Field label="Your name"><TextInput name="name" autoComplete="name" required maxLength={100} /></Field>
        <Field label="Email"><TextInput name="email" type="email" autoComplete="email" defaultValue={defaultEmail} required /></Field>
        <Field label="Password" hint="10 to 128 characters. Not a common password."><PasswordInput name="password" autoComplete="new-password" required /></Field>
        <Field label="Confirm password"><PasswordInput name="confirm" autoComplete="new-password" required /></Field>
        {error ? <p className="auth-alert" role="alert">{error}</p> : null}
        <Button type="submit" size="lg" busy={busy}>Create account</Button>
      </form>
      <div className="auth-links">
        <Link href={returnTo ? `/sign-in?next=${encodeURIComponent(returnTo)}${defaultEmail ? `&email=${encodeURIComponent(defaultEmail)}` : ""}` : "/sign-in"}>I already have an account</Link>
      </div>
    </AuthLayout>
  );
}

export function ResetRequestForm() {
  const session = useSession();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    setBusy(true);
    setError(null);
    const failure = await session.requestReset(email);
    setBusy(false);
    if (failure) setError(failure);
    else setSent(true);
  }

  return (
    <AuthLayout>
      <Heading title="Reset your password" lede="Enter the email on the account. If it has one, a reset link is on its way." />
      {sent ? (
        <div className="auth-ok" role="status">
          <strong>Check that inbox.</strong>
          <p style={{ margin: "0.3rem 0 0" }}>If that address has an account, we have sent a link. It works once, for one hour.</p>
        </div>
      ) : (
        <form className="ui-form ui-form-1" onSubmit={(event) => void submit(event)}>
          <Field label="Email"><TextInput name="email" type="email" autoComplete="email" required autoFocus /></Field>
          {error ? <p className="auth-alert" role="alert">{error}</p> : null}
          <Button type="submit" size="lg" busy={busy}>Send the reset link</Button>
        </form>
      )}
      <div className="auth-links"><Link href="/sign-in">Back to sign in</Link></div>
    </AuthLayout>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const session = useSession();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    const failure = await session.resetPassword(token, String(data.get("password") ?? ""), String(data.get("confirm") ?? ""));
    setBusy(false);
    if (failure) setError(failure);
    else setDone(true);
  }

  return (
    <AuthLayout>
      <Heading title="Choose a new password" lede="10 to 128 characters, and not a common one. This link works once." />
      {done ? (
        <div className="auth-ok" role="status">
          <strong>Saved.</strong>
          <p style={{ margin: "0.3rem 0 0" }}>Every device was signed out. Sign in with the new password.</p>
        </div>
      ) : (
        <form className="ui-form ui-form-1" onSubmit={(event) => void submit(event)}>
          <Field label="New password"><PasswordInput name="password" autoComplete="new-password" required autoFocus /></Field>
          <Field label="Confirm password"><PasswordInput name="confirm" autoComplete="new-password" required /></Field>
          {error ? <p className="auth-alert" role="alert">{error}</p> : null}
          <Button type="submit" size="lg" busy={busy}>Save password</Button>
        </form>
      )}
      <div className="auth-links"><Link href="/sign-in">Sign in</Link></div>
    </AuthLayout>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link className="quiet-link" href={href}>{children}</Link>;
}
