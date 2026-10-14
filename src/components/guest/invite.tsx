"use client";

import { useState } from "react";

import { functions } from "@/data/sample";

function countAtLeastZero(value: string) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.trunc(number);
}

export function InviteForm() {
  const [people, setPeople] = useState(2);
  const [veg, setVeg] = useState(1);
  const [nonVeg, setNonVeg] = useState(1);
  const [jain, setJain] = useState(0);
  const [sent, setSent] = useState(false);
  const sum = veg + nonVeg + jain;
  const mismatch = sum !== people;

  return (
    <form
      className="glass card"
      onSubmit={(event) => {
        event.preventDefault();
        if (!mismatch) setSent(true);
      }}
    >
      <p className="kicker">Your reply</p>
      <h2 className="serif">How many of you</h2>
      <label>
        People coming
        <input type="number" min={1} max={6} value={people} onChange={(event) => {
          const number = Number(event.target.value);
          if (Number.isFinite(number)) setPeople(Math.min(6, Math.max(1, Math.trunc(number))));
        }} />
      </label>
      <div className="diet" style={{ marginTop: "0.8rem" }}>
        <label>Veg<input type="number" min={0} value={veg} onChange={(event) => setVeg(countAtLeastZero(event.target.value))} /></label>
        <label>Non-veg<input type="number" min={0} value={nonVeg} onChange={(event) => setNonVeg(countAtLeastZero(event.target.value))} /></label>
        <label>Jain<input type="number" min={0} value={jain} onChange={(event) => setJain(countAtLeastZero(event.target.value))} /></label>
      </div>
      {mismatch ? <p className="note">Veg, non-veg, and Jain need to add up to {people}.</p> : null}
      {sent ? <p>Saved for the Mehta household. The family sees the count, not a public list of names.</p> : <button className="btn" type="submit" style={{ marginTop: "1rem" }} disabled={mismatch}>Send RSVP</button>}
      <div className="list" style={{ marginTop: "1rem" }}>
        {functions.map((item) => (
          <div key={item.id} className="list-row">
            <span>{item.title}</span>
            <span className="muted">{item.when}</span>
          </div>
        ))}
      </div>
    </form>
  );
}
