"use client";

import { useEffect, useRef, useState } from "react";

import { functionWorlds, type MotifId } from "@/data/function-worlds";
import type { FunctionId } from "@/data/sample";

const ratios = {
  S: 1,
  R: 9 / 8,
  G: 5 / 4,
  g: 6 / 5,
  M: 4 / 3,
  m: 45 / 32,
  P: 3 / 2,
  D: 5 / 3,
  n: 16 / 9,
  N: 15 / 8,
  S2: 2,
} as const;

type Degree = keyof typeof ratios;
type Note = { degree: Degree; beats: number };

const pieces: Record<FunctionId, { sa: number; bpm: number; melody: Note[]; pulse: "dhol" | "dadra" | "tabla" | "bell" | "none" }> = {
  haldi: {
    sa: 220,
    bpm: 112,
    pulse: "dhol",
    melody: [
      { degree: "S", beats: 1 },
      { degree: "R", beats: 1 },
      { degree: "G", beats: 1 },
      { degree: "P", beats: 1 },
      { degree: "G", beats: 1 },
      { degree: "R", beats: 1 },
      { degree: "S", beats: 2 },
    ],
  },
  mehendi: {
    sa: 174.61,
    bpm: 72,
    pulse: "dadra",
    melody: [
      { degree: "S", beats: 2 },
      { degree: "n", beats: 1 },
      { degree: "D", beats: 1 },
      { degree: "P", beats: 2 },
      { degree: "M", beats: 1 },
      { degree: "g", beats: 1 },
      { degree: "R", beats: 2 },
      { degree: "S", beats: 2 },
    ],
  },
  sangeet: {
    sa: 196,
    bpm: 138,
    pulse: "tabla",
    melody: [
      { degree: "N", beats: 0.5 },
      { degree: "R", beats: 0.5 },
      { degree: "G", beats: 0.5 },
      { degree: "m", beats: 0.5 },
      { degree: "P", beats: 1 },
      { degree: "D", beats: 0.5 },
      { degree: "N", beats: 0.5 },
      { degree: "S2", beats: 1 },
    ],
  },
  wedding: {
    sa: 146.83,
    bpm: 52,
    pulse: "bell",
    melody: [
      { degree: "S", beats: 2 },
      { degree: "R", beats: 2 },
      { degree: "G", beats: 2 },
      { degree: "P", beats: 2 },
      { degree: "G", beats: 2 },
      { degree: "R", beats: 2 },
      { degree: "S", beats: 4 },
    ],
  },
  reception: {
    sa: 110,
    bpm: 60,
    pulse: "none",
    melody: [],
  },
};

type Performance = { stop: () => void };

function startPiece(kind: FunctionId): Performance {
  const piece = pieces[kind];
  const context = new AudioContext();
  const master = context.createGain();
  master.gain.value = kind === "reception" ? 0.07 : 0.09;
  master.connect(context.destination);
  const oscillators: OscillatorNode[] = [];

  function drone(ratio: number, amount: number, type: OscillatorType) {
    const tone = context.createOscillator();
    tone.type = type;
    tone.frequency.value = piece.sa * ratio;
    const gain = context.createGain();
    gain.gain.value = amount;
    tone.connect(gain);
    gain.connect(master);
    tone.start();
    oscillators.push(tone);
  }

  drone(1, kind === "reception" ? 0.55 : 0.22, "sine");
  drone(ratios.P, kind === "reception" ? 0.28 : 0.08, "sine");
  if (kind !== "haldi") drone(2, 0.05, "triangle");

  const beat = 60 / piece.bpm;
  const cycle = piece.melody.reduce((sum, note) => sum + note.beats, 0) || 8;

  function strike(time: number, frequency: number, amount: number, decay: number) {
    const tone = context.createOscillator();
    tone.type = "sine";
    tone.frequency.setValueAtTime(frequency, time);
    const gain = context.createGain();
    gain.gain.setValueAtTime(amount, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + decay);
    tone.connect(gain);
    gain.connect(master);
    tone.start(time);
    tone.stop(time + decay + 0.02);
  }

  function sing(time: number, ratio: number, duration: number) {
    const tone = context.createOscillator();
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = kind === "wedding" ? 880 : kind === "sangeet" ? 2200 : 1400;
    tone.type = kind === "wedding" ? "sawtooth" : kind === "mehendi" ? "triangle" : "sine";
    const startFrequency = piece.sa * ratio;
    tone.frequency.setValueAtTime(startFrequency * (kind === "wedding" ? 0.985 : 1), time);
    if (kind === "wedding") tone.frequency.linearRampToValueAtTime(startFrequency, time + duration * 0.65);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(kind === "sangeet" ? 0.16 : 0.12, time + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    tone.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    tone.start(time);
    tone.stop(time + duration + 0.05);
  }

  function bar(origin: number) {
    let cursor = 0;
    piece.melody.forEach((note) => {
      sing(origin + cursor * beat, ratios[note.degree], note.beats * beat * 0.92);
      cursor += note.beats;
    });
    const beats = Math.round(cycle);
    for (let step = 0; step < beats; step += 1) {
      const time = origin + step * beat;
      if (piece.pulse === "dhol" && step % 2 === 0) strike(time, step % 4 === 0 ? 90 : 140, 0.2, 0.12);
      if (piece.pulse === "dadra" && step % 3 === 0) strike(time, 180, 0.05, 0.08);
      if (piece.pulse === "tabla") strike(time, step % 4 === 0 ? 160 : 240, step % 2 === 0 ? 0.08 : 0.03, 0.05);
      if (piece.pulse === "bell" && step % 4 === 0) strike(time, 523.25, 0.06, 0.9);
    }
  }

  const origin = context.currentTime + 0.05;
  bar(origin);
  const timer = window.setInterval(() => bar(context.currentTime + 0.05), cycle * beat * 1000);

  return {
    stop: () => {
      window.clearInterval(timer);
      oscillators.forEach((tone) => tone.stop());
      void context.close();
    },
  };
}

export function FunctionTone({ kind }: { kind: FunctionId }) {
  const world = functionWorlds[kind];
  const [playing, setPlaying] = useState(false);
  const audio = useRef<Performance | null>(null);

  useEffect(() => () => audio.current?.stop(), []);

  function toggle() {
    if (playing) {
      audio.current?.stop();
      audio.current = null;
      setPlaying(false);
      return;
    }
    audio.current = startPiece(kind);
    setPlaying(true);
  }

  return (
    <div className="fn-sound-block">
      <button className="fn-sound" type="button" aria-pressed={playing} onClick={toggle}>
        {playing ? `Mute ${world.sound}` : `Play ${world.sound}`}
      </button>
      <p className="fn-credit">{world.credit}</p>
    </div>
  );
}

export function FunctionMotif({ motif }: { motif: MotifId }) {
  if (motif === "bandhani") {
    return (
      <svg className="fn-motif" viewBox="0 0 1200 320" aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => (
          <circle key={index} cx={80 + (index % 9) * 28} cy={36 + Math.floor(index / 9) * 28} r="4" />
        ))}
        {Array.from({ length: 10 }, (_, index) => (
          <ellipse key={index} cx="600" cy="150" rx={18 + index * 8} ry={8 + index * 3} transform={`rotate(${index * 18} 600 150)`} />
        ))}
        <path d="M470 250 Q600 90 730 250" />
        <path d="M520 250 V150 h160 V250" />
        <path d="M560 150 Q600 110 640 150" />
      </svg>
    );
  }
  if (motif === "jaali") {
    return (
      <svg className="fn-motif" viewBox="0 0 1200 320" aria-hidden="true">
        {Array.from({ length: 8 }, (_, row) =>
          Array.from({ length: 14 }, (_, column) => (
            <path key={`${row}-${column}`} d={`M${180 + column * 58} ${30 + row * 36} l18 18 l-18 18 l-18 -18 z`} />
          )),
        )}
        <path d="M860 250 C900 120 980 80 1040 150 C980 190 940 210 900 250" />
      </svg>
    );
  }
  if (motif === "ghungroo") {
    return (
      <svg className="fn-motif" viewBox="0 0 1200 320" aria-hidden="true">
        {Array.from({ length: 16 }, (_, index) => (
          <circle key={index} cx={360 + index * 28} cy={210 - Math.sin(index / 2) * 70} r={index % 3 === 0 ? 7 : 4} />
        ))}
        <path d="M280 260 Q460 40 760 80 Q980 110 1040 250" />
        <path d="M520 250 L600 90 L690 250" />
      </svg>
    );
  }
  if (motif === "chhatri") {
    return (
      <svg className="fn-motif" viewBox="0 0 1200 320" aria-hidden="true">
        <path d="M180 250 Q300 80 420 250" />
        <path d="M250 250 V150 M350 250 V150" />
        <path d="M430 250 Q600 40 770 250" />
        <path d="M520 250 V130 M680 250 V130" />
        <path d="M780 250 Q900 90 1020 250" />
        <path d="M850 250 V160 M950 250 V160" />
        <path d="M160 268 H1040" />
      </svg>
    );
  }
  return (
    <svg className="fn-motif" viewBox="0 0 1200 340" aria-hidden="true">
      <path d="M390 300 V230 H810 V300" />
      <path d="M430 230 V180 H770 V230" />
      <path d="M470 180 V140 H730 V180" />
      <path d="M510 140 V108 H690 V140" />
      <path d="M548 108 V82 H652 V108" />
      <path d="M600 82 V52" />
      <path d="M586 52 h28 l-14 -16 z" />
      <path d="M80 300 V120 h10 l8 -22 h28 l8 22 h10 V300" />
      <path d="M1060 300 V120 h10 l8 -22 h28 l8 22 h10 V300" />
      {Array.from({ length: 16 }, (_, index) => (
        <circle key={index} cx={980 + (index % 4) * 18} cy={48 + Math.floor(index / 4) * 18} r="2.2" />
      ))}
      <path d="M880 250 Q900 210 920 250 Q900 236 880 250" />
      <path d="M900 214 V196" />
    </svg>
  );
}

export function FunctionStage({
  id,
  badge,
  title,
  when,
  compact = false,
}: {
  id: FunctionId;
  badge: string;
  title: string;
  when: string;
  compact?: boolean;
}) {
  const world = functionWorlds[id];
  return (
    <div className={`fn-stage fn-${id} fn-${world.motion}${compact ? " fn-compact" : ""}`} data-motion={world.motion}>
      <FunctionMotif motif={world.motif} />
      <div className="fn-copy wrap">
        <p className="kicker">{world.region}</p>
        <p className="fn-script" lang="hi">{world.script}</p>
        <h1 className="fn-title">{title}</h1>
        <p>{[badge, when].filter(Boolean).join(" · ")}</p>
        <FunctionTone key={id} kind={id} />
      </div>
    </div>
  );
}
