import type { CSSProperties, ReactNode } from "react";

import { worldStyle, type MotifId, type ResolvedTheme } from "@/data/worlds";

export function Motif({ motif, className = "g-motif" }: { motif: MotifId; className?: string }) {
  if (motif === "bandhani") {
    return (
      <svg className={className} viewBox="0 0 1200 320" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {Array.from({ length: 36 }, (_, index) => (
          <circle key={index} cx={60 + (index % 12) * 28} cy={40 + Math.floor(index / 12) * 28} r="4" />
        ))}
        {Array.from({ length: 10 }, (_, index) => (
          <ellipse key={`p${index}`} cx="860" cy="150" rx={18 + index * 9} ry={8 + index * 3.4} transform={`rotate(${index * 18} 860 150)`} />
        ))}
        <path d="M730 280 Q860 100 990 280M780 280V170h160V280M820 170Q860 128 900 170" />
        {Array.from({ length: 9 }, (_, index) => <circle key={`g${index}`} cx={1040 + (index % 3) * 26} cy={60 + Math.floor(index / 3) * 26} r="9" />)}
      </svg>
    );
  }
  if (motif === "jaali") {
    return (
      <svg className={className} viewBox="0 0 1200 320" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {Array.from({ length: 8 }, (_, row) =>
          Array.from({ length: 16 }, (_, column) => (
            <path key={`${row}-${column}`} d={`M${560 + column * 40} ${20 + row * 38} l18 18 l-18 18 l-18 -18 z`} />
          )),
        )}
        <path d="M120 260 C160 120 240 80 300 150 C240 190 200 210 160 260" />
        <path d="M200 270 C240 160 300 130 350 180" />
        <circle cx="300" cy="150" r="10" />
      </svg>
    );
  }
  if (motif === "ghungroo") {
    return (
      <svg className={className} viewBox="0 0 1200 320" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {Array.from({ length: 22 }, (_, index) => (
          <circle key={index} cx={560 + index * 26} cy={210 - Math.sin(index / 2) * 70} r={index % 3 === 0 ? 8 : 4.5} />
        ))}
        <path d="M480 270 Q660 40 960 80 Q1120 110 1180 250" />
        <path d="M760 270 L840 90 L930 270" />
        {Array.from({ length: 18 }, (_, index) => <circle key={`s${index}`} cx={80 + (index * 97) % 420} cy={30 + (index * 53) % 120} r="1.8" />)}
      </svg>
    );
  }
  if (motif === "chhatri") {
    return (
      <svg className={className} viewBox="0 0 1200 320" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path d="M480 270 Q570 130 660 270M530 270V190M610 270V190" />
        <path d="M660 270 Q820 60 980 270M740 270V160M900 270V160M820 90V60M808 66h24" />
        <path d="M980 270 Q1070 140 1160 270M1030 270V196M1110 270V196" />
        <path d="M440 284H1200" />
        <circle cx="200" cy="80" r="34" />
        {Array.from({ length: 14 }, (_, index) => <circle key={index} cx={60 + (index * 71) % 380} cy={40 + (index * 37) % 140} r="1.6" />)}
      </svg>
    );
  }
  if (motif === "toran") {
    return (
      <svg className={className} viewBox="0 0 1200 320" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path d="M0 40 Q600 120 1200 40" />
        {Array.from({ length: 24 }, (_, index) => {
          const x = 25 + index * 50;
          const y = 40 + Math.sin((index / 23) * Math.PI) * 38;
          return <path key={index} d={`M${x} ${y} q-12 30 0 58 q12 -28 0 -58z`} />;
        })}
        {Array.from({ length: 12 }, (_, index) => <circle key={`m${index}`} cx={50 + index * 100} cy={48 + Math.sin((index / 11) * Math.PI) * 38} r="9" />)}
        <path d="M820 290 V200 Q900 140 980 200 V290" />
        <path d="M860 210 Q900 180 940 210" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 1200 340" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <path d="M690 320 V250 H1110 V320M730 250 V200 H1070 V250M770 200 V160 H1030 V200M810 160 V128 H990 V160M848 128 V102 H952 V128M900 102 V72M886 72 h28 l-14 -16 z" />
      <path d="M560 320 V140 h10 l8 -22 h28 l8 22 h10 V320" />
      {Array.from({ length: 16 }, (_, index) => <circle key={index} cx={160 + (index % 4) * 22} cy={60 + Math.floor(index / 4) * 22} r="2.6" />)}
      <path d="M120 300 Q200 200 280 300 Q200 270 120 300z" />
      <path d="M200 236 V200" />
    </svg>
  );
}

export function Stage({ theme, children, compact = false, className }: { theme: ResolvedTheme; children?: ReactNode; compact?: boolean; className?: string }) {
  return (
    <div
      className={`g-stage g-motion-${theme.world.motion}${compact ? " g-stage-compact" : ""}${theme.world.dark ? " g-dark" : ""}${className ? ` ${className}` : ""}`}
      style={worldStyle(theme) as CSSProperties}
    >
      <Motif motif={theme.world.motif} />
      {children ? <div className="g-stage-copy">{children}</div> : null}
    </div>
  );
}
