"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { TextLink } from "@/components/account-screen";
import { Mark } from "@/components/mark";
import { usePreview } from "@/components/preview-session";
import { passwordProblem } from "@/data/password-rules";

type Draft = {
  bride: string;
  groom: string;
  date: string;
  city: string;
  title: string;
  story: string;
};

const emptyDraft: Draft = { bride: "", groom: "", date: "", city: "", title: "", story: "" };
const draftKey = "twh-plan-draft";

export function PlanWedding() {
  const router = useRouter();
  const preview = usePreview();
  const [step, setStep] = useState<"wedding" | "account">("wedding");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [draftReady, setDraftReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = sessionStorage.getItem(draftKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Partial<Draft>;
          setDraft({ ...emptyDraft, ...parsed });
        } catch {
          sessionStorage.removeItem(draftKey);
        }
      }
      setDraftReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!preview.ready || pending) return;
    if (preview.person && preview.wedding) router.replace("/app");
  }, [preview.ready, preview.person, preview.wedding, pending, router]);

  function remember(next: Draft) {
    setDraft(next);
    sessionStorage.setItem(draftKey, JSON.stringify(next));
  }

  async function submitWedding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const next = {
      bride: String(data.get("bride") || "").trim(),
      groom: String(data.get("groom") || "").trim(),
      date: String(data.get("date") || "").trim(),
      city: String(data.get("city") || "").trim(),
      title: String(data.get("title") || "").trim(),
      story: String(data.get("story") || "").trim(),
    };
    if (!next.bride || !next.groom || !next.date || !next.city) {
      setError("Enter the bride, the groom, the date, and the city.");
      return;
    }
    remember(next);
    setError(null);
    if (preview.person) {
      setPending(true);
      const path = await preview.saveWedding(next);
      if (!path) {
        setPending(false);
        setError("The wedding could not be saved.");
      } else {
        sessionStorage.removeItem(draftKey);
        router.push(path);
      }
      return;
    }
    setStep("account");
  }

  async function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") || "");
    const confirm = String(data.get("confirm") || "");
    const weak = passwordProblem(password);
    if (weak) {
      setError(weak);
      return;
    }
    if (password !== confirm) {
      setError("Those passwords do not match.");
      return;
    }
    setPending(true);
    setError(null);
    const created = await preview.createAccount(String(data.get("name") || ""), String(data.get("email") || ""), password, confirm);
    if (created.error) {
      setError(created.error);
      setPending(false);
      return;
    }
    if (created.next === "/app") {
      sessionStorage.removeItem(draftKey);
      router.push("/app");
      return;
    }
    const path = await preview.saveWedding(draft);
    if (!path) {
      setPending(false);
      setError("The account is ready. The wedding still needs to be saved.");
      router.push("/wedding/new");
      return;
    }
    sessionStorage.removeItem(draftKey);
    router.push(path);
  }

  if (!preview.ready || !draftReady || (preview.person && preview.wedding && !pending)) {
    return (
      <main className="account">
        <p className="muted">Opening the wedding…</p>
      </main>
    );
  }

  return (
    <main className="account">
      <form key={preview.person ? "signed-in" : step} className="glass account-card plan-card" onSubmit={step === "wedding" || preview.person ? submitWedding : submitAccount}>
        <Mark />
        <ol className="flow-steps" aria-label="Setup">
          {["Wedding", "Account", "Functions", "Dashboard"].map((label, index) => {
            const currentIndex = preview.person ? 0 : step === "wedding" ? 0 : 1;
            const state = preview.person && index === 1 ? "done" : index < currentIndex ? "done" : index === currentIndex ? "current" : "later";
            return (
              <li key={label} data-state={state} aria-current={state === "current" ? "step" : undefined}>
                <span>{index + 1}</span>
                {label}
              </li>
            );
          })}
        </ol>
        <h1 className="serif">{step === "account" ? "Your account" : "Plan the wedding"}</h1>
        <p className="muted">
          {step === "account"
            ? "This account becomes the first Admin. You can invite the rest of the family after this."
            : "Bride, groom, date, and city. Another family’s wedding stays in its own home."}
        </p>
        <div className="fields">
          {step === "wedding" || preview.person ? (
            <>
              <label>Bride<input name="bride" defaultValue={draft.bride} required autoComplete="off" /></label>
              <label>Groom<input name="groom" defaultValue={draft.groom} required autoComplete="off" /></label>
              <label>Wedding date<input name="date" type="date" defaultValue={draft.date} required /></label>
              <label>City<input name="city" defaultValue={draft.city} required autoComplete="address-level2" /></label>
              <label>
                Title
                <input name="title" defaultValue={draft.title} autoComplete="off" />
                <span className="fine">Optional. Shown instead of the two names.</span>
              </label>
              <label>
                Story
                <textarea name="story" rows={3} defaultValue={draft.story} />
                <span className="fine">Optional. A few lines about the wedding.</span>
              </label>
            </>
          ) : (
            <>
              <label>Your name<input name="name" required autoComplete="name" /></label>
              <label>Email<input name="email" type="email" required autoComplete="email" /></label>
              <label>
                Password
                <input name="password" type="password" required autoComplete="new-password" />
                <span className="fine">10 to 128 characters. Not a common password.</span>
              </label>
              <label>Confirm password<input name="confirm" type="password" required autoComplete="new-password" /></label>
            </>
          )}
        </div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Saving…" : step === "account" ? "Create the wedding" : preview.person ? "Create the wedding" : "Continue"}
        </button>
        <div className="account-links">
          {step === "account" ? (
            <button className="quiet-link" type="button" onClick={() => { setError(null); setStep("wedding"); }}>Back to the wedding</button>
          ) : (
            <TextLink href="/sign-in">Already have an account</TextLink>
          )}
        </div>
        <p className="fine">One account plans one wedding. Guests never make an account. <Link href="/">Home</Link></p>
      </form>
    </main>
  );
}
