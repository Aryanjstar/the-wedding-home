"use client";

import { SoundToggle, Soundtrack } from "@/components/guest/sound";
import { functionWorlds, type MotifId } from "@/data/function-worlds";
import { musicLabel, occasionMusic, type MusicId } from "@/data/worlds";
import type { FunctionId } from "@/data/sample";

export function FunctionTone({ kind }: { kind: FunctionId }) {
  return (
    <div className="fn-sound-block">
      <Soundtrack music={(occasionMusic[kind] ?? "none") as MusicId} />
      <SoundToggle inline />
      <p className="fn-credit">{musicLabel(occasionMusic[kind])?.credit ?? functionWorlds[kind].credit}</p>
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
          <circle key={index} cx={360 + index * 28} cy={Math.round(210 - Math.sin(index / 2) * 70)} r={index % 3 === 0 ? 7 : 4} />
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
