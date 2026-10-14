"use client";

import { useState } from "react";

function countAtLeastZero(value: string) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.trunc(number);
}

export function PublicRsvp({ token, maxPeople }: { token: string; maxPeople: number }) {
  const [people, setPeople] = useState(Math.min(2, maxPeople));
  const [veg, setVeg] = useState(1);
  const [nonVeg, setNonVeg] = useState(0);
  const [jain, setJain] = useState(0);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sum = veg + nonVeg + jain;
  const mismatch = sum !== people;

  return (
    <form
      className="glass card"
      onSubmit={(event) => {
        event.preventDefault();
        if (mismatch) return;
        setError(null);
        void fetch(`/api/public/invite/${token}/rsvp`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ people, veg, nonVeg, jain }),
        }).then(async (response) => {
          if (!response.ok) {
            const body = await response.json().catch(() => null) as { detail?: string } | null;
            setError(body?.detail ?? "Could not save the reply.");
            return;
          }
          setSent(true);
        });
      }}
    >
      <p className="kicker">Your reply</p>
      <h2 className="serif">How many of you</h2>
      <label>
        People coming
        <input type="number" min={0} max={maxPeople} value={people} onChange={(event) => {
          const number = Number(event.target.value);
          if (Number.isFinite(number)) setPeople(Math.min(maxPeople, Math.max(0, Math.trunc(number))));
        }} />
      </label>
      <div className="diet" style={{ marginTop: "0.8rem" }}>
        <label>Veg<input type="number" min={0} value={veg} onChange={(event) => setVeg(countAtLeastZero(event.target.value))} /></label>
        <label>Non-veg<input type="number" min={0} value={nonVeg} onChange={(event) => setNonVeg(countAtLeastZero(event.target.value))} /></label>
        <label>Jain<input type="number" min={0} value={jain} onChange={(event) => setJain(countAtLeastZero(event.target.value))} /></label>
      </div>
      {mismatch ? <p className="fine">Veg, non-veg, and Jain must add up to the people coming.</p> : null}
      {error ? <p className="fine">{error}</p> : null}
      <button className="btn" type="submit" disabled={mismatch || sent}>{sent ? "Saved" : "Send reply"}</button>
    </form>
  );
}
