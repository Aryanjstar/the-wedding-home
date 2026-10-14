import Link from "next/link";

export function Roof({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 14 L12 8 L21 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Mark({ href = "/", words = true, compact = false }: { href?: string; words?: boolean; compact?: boolean }) {
  return (
    <Link className={compact ? "mark mark-compact" : "mark"} href={href}>
      <Roof className="roof" />
      {words ? <span>The Wedding Home</span> : <span className="sr-only">The Wedding Home</span>}
    </Link>
  );
}
