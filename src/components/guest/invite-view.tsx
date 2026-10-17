"use client";

import { useEffect, useRef, useState } from "react";

import { useSound } from "@/components/guest/sound";
import { Icon } from "@/components/ui/icon";
import type { MusicId } from "@/data/worlds";

type Answer = { status: "yes" | "no" | null; count: number; veg: number; nonVeg: number; jain: number };

export type InviteEventLite = {
  id: string;
  title: string;
  music: MusicId;
  accent: string;
  rsvp: { status: "silent" } | { status: "yes" | "no"; attendingCount: number; diet: { veg: number; nonVeg: number; jain: number } };
};

/** As a function section scrolls into view, its music takes over. */
export function SectionMusic({ sections }: { sections: { id: string; music: MusicId }[] }) {
  const sound = useSound();
  const setTrack = sound?.setTrack;
  useEffect(() => {
    if (!setTrack || sections.length === 0) return;
    setTrack(sections[0].music);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const match = visible && sections.find((section) => `fn-${section.id}` === visible.target.id);
        if (match) setTrack(match.music);
      },
      { threshold: [0.35, 0.6] },
    );
    sections.forEach((section) => {
      const node = document.getElementById(`fn-${section.id}`);
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, [sections, setTrack]);
  return null;
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <div className="g-stepper">
      <span>{label}</span>
      <div>
        <button type="button" aria-label={`One fewer, ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}><Icon name="minus" size={16} /></button>
        <output aria-live="polite">{value}</output>
        <button type="button" aria-label={`One more, ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}><Icon name="plus" size={16} /></button>
      </div>
    </div>
  );
}

function initial(event: InviteEventLite, maxPeople: number): Answer {
  if (event.rsvp.status === "silent") return { status: null, count: Math.min(2, maxPeople), veg: Math.min(2, maxPeople), nonVeg: 0, jain: 0 };
  if (event.rsvp.status === "no") return { status: "no", count: Math.min(2, maxPeople), veg: Math.min(2, maxPeople), nonVeg: 0, jain: 0 };
  return { status: "yes", count: event.rsvp.attendingCount, veg: event.rsvp.diet.veg, nonVeg: event.rsvp.diet.nonVeg, jain: event.rsvp.diet.jain };
}

export function RsvpForm({ endpoint, events, maxPeople, household, preview }: { endpoint: string; events: InviteEventLite[]; maxPeople: number; household: string; preview: boolean }) {
  const [answers, setAnswers] = useState<Record<string, Answer>>(() => Object.fromEntries(events.map((event) => [event.id, initial(event, maxPeople)])));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(() => events.some((event) => event.rsvp.status !== "silent"));
  const [dirty, setDirty] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  function update(id: string, change: Partial<Answer>) {
    setDirty(true);
    setAnswers((current) => {
      const next = { ...current[id], ...change };
      // Keep the diet adding up: the veg count absorbs a change in the headcount.
      if (change.count !== undefined) next.veg = Math.max(0, next.count - next.nonVeg - next.jain);
      if (next.veg + next.nonVeg + next.jain > next.count && change.count !== undefined) {
        next.nonVeg = Math.min(next.nonVeg, next.count);
        next.jain = Math.min(next.jain, next.count - next.nonVeg);
        next.veg = next.count - next.nonVeg - next.jain;
      }
      return { ...current, [id]: next };
    });
  }

  function copyFirst() {
    const first = answers[events[0]?.id];
    if (!first?.status) return;
    setDirty(true);
    setAnswers(Object.fromEntries(events.map((event) => [event.id, { ...first }])));
  }

  async function submit() {
    const chosen = events.filter((event) => answers[event.id].status);
    if (chosen.length === 0) return setError("Choose yes or no for at least one function.");
    for (const event of chosen) {
      const answer = answers[event.id];
      if (answer.status === "yes" && answer.veg + answer.nonVeg + answer.jain !== answer.count) {
        return setError(`${event.title}: veg, non-veg, and Jain must add up to ${answer.count}.`);
      }
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responses: chosen.map((event) => {
            const answer = answers[event.id];
            return answer.status === "yes"
              ? { eventId: event.id, status: "yes", attendingCount: answer.count, diet: { veg: answer.veg, nonVeg: answer.nonVeg, jain: answer.jain } }
              : { eventId: event.id, status: "no" };
          }),
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(body?.detail ?? "Your reply did not save. Try again.");
      }
      setSaved(true);
      setDirty(false);
      top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Your reply did not save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const coming = events.filter((event) => answers[event.id].status === "yes");

  return (
    <div className="g-rsvp" ref={top} id="rsvp">
      <p className="g-kicker">Your reply</p>
      <h2>Will you join us?</h2>
      <p className="g-muted">For {household}, up to {maxPeople} {maxPeople === 1 ? "person" : "people"}. You can change this any time from the same link.</p>
      {saved && !dirty ? (
        <div className="g-saved" role="status">
          <Icon name="check" size={18} />
          <span>
            {preview ? "Preview only: this reply checked out and was not saved." : "Thank you. Your reply is saved."}
            {coming.length ? ` See you at the ${coming.map((event) => event.title).join(", ")}.` : ""}
          </span>
        </div>
      ) : null}
      <div className="g-rsvp-list">
        {events.map((event, index) => {
          const answer = answers[event.id];
          const sum = answer.veg + answer.nonVeg + answer.jain;
          return (
            <div key={event.id} className="g-rsvp-row" style={{ ["--fn-accent" as string]: event.accent }}>
              <div className="g-rsvp-head">
                <strong>{event.title}</strong>
                <div className="g-yesno" role="radiogroup" aria-label={`Coming to the ${event.title}?`}>
                  <button type="button" role="radio" aria-checked={answer.status === "yes"} onClick={() => update(event.id, { status: "yes" })}>Yes, coming</button>
                  <button type="button" role="radio" aria-checked={answer.status === "no"} onClick={() => update(event.id, { status: "no" })}>Can&apos;t come</button>
                </div>
              </div>
              {answer.status === "yes" ? (
                <div className="g-rsvp-detail">
                  <Stepper label="People coming" value={answer.count} min={1} max={maxPeople} onChange={(value) => update(event.id, { count: value })} />
                  <div className="g-diet">
                    <Stepper label="Veg" value={answer.veg} min={0} max={answer.count} onChange={(value) => update(event.id, { veg: value })} />
                    <Stepper label="Non-veg" value={answer.nonVeg} min={0} max={answer.count} onChange={(value) => update(event.id, { nonVeg: value })} />
                    <Stepper label="Jain" value={answer.jain} min={0} max={answer.count} onChange={(value) => update(event.id, { jain: value })} />
                  </div>
                  <p className={sum === answer.count ? "g-ok g-small" : "g-warn g-small"}>
                    {sum === answer.count ? `Adds up: ${answer.count} ${answer.count === 1 ? "plate" : "plates"}.` : `Veg, non-veg, and Jain add up to ${sum}. Make it ${answer.count}.`}
                  </p>
                  {index === 0 && events.length > 1 ? <button type="button" className="g-link g-small" onClick={copyFirst}>Same answer for every function</button> : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {error ? <p className="g-error" role="alert">{error}</p> : null}
      <button type="button" className="g-btn g-btn-lg" disabled={busy} onClick={() => void submit()}>
        {busy ? "Sending…" : saved ? "Update my reply" : "Send my reply"}
      </button>
    </div>
  );
}
