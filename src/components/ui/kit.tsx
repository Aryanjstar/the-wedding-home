"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import { formatInr } from "@/data/format";

type Tone = "primary" | "secondary" | "ghost" | "danger" | "soft";

export function Button({
  tone = "primary",
  size = "md",
  icon,
  busy,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; size?: "sm" | "md" | "lg"; icon?: IconName; busy?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || busy}
      aria-busy={busy || undefined}
      className={`ui-btn ui-btn-${tone} ui-btn-${size}${className ? ` ${className}` : ""}`}
    >
      {busy ? <span className="ui-spinner" aria-hidden="true" /> : icon ? <Icon name={icon} size={size === "sm" ? 15 : 17} /> : null}
      {children ? <span>{children}</span> : null}
    </button>
  );
}

export function ButtonLink({
  href,
  tone = "primary",
  size = "md",
  icon,
  children,
  external,
  className,
  download,
}: {
  href: string;
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  icon?: IconName;
  children?: ReactNode;
  external?: boolean;
  className?: string;
  download?: boolean;
}) {
  const classes = `ui-btn ui-btn-${tone} ui-btn-${size}${className ? ` ${className}` : ""}`;
  const inner = (
    <>
      {icon ? <Icon name={icon} size={size === "sm" ? 15 : 17} /> : null}
      {children ? <span>{children}</span> : null}
    </>
  );
  if (external || download) {
    return (
      <a className={classes} href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} download={download || undefined}>
        {inner}
      </a>
    );
  }
  return <Link className={classes} href={href}>{inner}</Link>;
}

export function IconButton({ icon, label, tone = "ghost", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string; tone?: Tone }) {
  return (
    <button type="button" {...props} className={`ui-icon-btn ui-btn-${tone}${props.className ? ` ${props.className}` : ""}`} aria-label={label} title={label}>
      <Icon name={icon} size={17} />
    </button>
  );
}

export function Field({ label, hint, error, children, span, optional }: { label: string; hint?: ReactNode; error?: string | null; children: ReactNode; span?: 1 | 2; optional?: boolean }) {
  return (
    <label className={`ui-field${span === 2 ? " ui-span-2" : ""}${error ? " ui-field-error" : ""}`}>
      <span className="ui-label">
        {label}
        {optional ? <em>Optional</em> : null}
      </span>
      {children}
      {error ? <span className="ui-error" role="alert">{error}</span> : hint ? <span className="ui-hint">{hint}</span> : null}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`ui-input${props.className ? ` ${props.className}` : ""}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className="ui-input ui-textarea" />;
}

export function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="ui-select-wrap">
      <select {...props} className="ui-input ui-select">{children}</select>
      <Icon name="chevronDown" size={16} />
    </span>
  );
}

export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [shown, setShown] = useState(false);
  return (
    <span className="ui-affix">
      <input {...props} type={shown ? "text" : "password"} className="ui-input ui-input-suffixed" />
      <button type="button" className="ui-affix-btn" onClick={() => setShown((value) => !value)} aria-label={shown ? "Hide password" : "Show password"} aria-pressed={shown}>
        <Icon name={shown ? "eyeOff" : "eye"} size={18} />
      </button>
    </span>
  );
}

/** Whole rupees, typed with Indian grouping and a ₹ sign. The form value is the plain number. */
export function MoneyInput({ name, defaultValue, required, placeholder, onValue, autoFocus }: { name: string; defaultValue?: number | null; required?: boolean; placeholder?: string; onValue?: (value: number | null) => void; autoFocus?: boolean }) {
  const [raw, setRaw] = useState(defaultValue ? String(defaultValue) : "");
  const digits = raw.replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "").slice(0, 10);
  const shown = digits ? new Intl.NumberFormat("en-IN").format(Number(digits)) : "";
  return (
    <span className="ui-affix ui-money">
      <span className="ui-affix-pre" aria-hidden="true">₹</span>
      <input
        className="ui-input ui-input-prefixed"
        inputMode="numeric"
        autoComplete="off"
        autoFocus={autoFocus}
        value={shown}
        required={required}
        placeholder={placeholder ?? "0"}
        aria-label={name}
        onChange={(event) => {
          const next = event.target.value.replace(/[^\d]/g, "");
          setRaw(next);
          onValue?.(next ? Number(next) : null);
        }}
      />
      <input type="hidden" name={name} value={digits} />
      {digits && Number(digits) >= 100000 ? <span className="ui-affix-post">{formatInr(Number(digits), { compact: true })}</span> : null}
    </span>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (value: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="ui-toggle-row">
      <div>
        <label htmlFor={id} className="ui-toggle-label">{label}</label>
        {description ? <p className="ui-hint">{description}</p> : null}
      </div>
      <button id={id} type="button" role="switch" aria-checked={checked} disabled={disabled} className="ui-switch" onClick={() => onChange(!checked)}>
        <span />
      </button>
    </div>
  );
}

/** A multi-select of small chips, for "invited to" and "related functions". */
export function ChipPicker({ options, value, onChange, empty }: { options: { id: string; label: string }[]; value: string[]; onChange: (value: string[]) => void; empty?: string }) {
  if (options.length === 0) return <p className="ui-hint">{empty ?? "Nothing to choose yet."}</p>;
  return (
    <div className="ui-chips" role="group">
      {options.map((option) => {
        const on = value.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            className="ui-chip"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((id) => id !== option.id) : [...value, option.id])}
          >
            {on ? <Icon name="check" size={14} /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Segmented<T extends string>({ options, value, onChange, label }: { options: { id: T; label: string; count?: number }[]; value: T; onChange: (value: T) => void; label: string }) {
  return (
    <div className="ui-segmented" role="tablist" aria-label={label}>
      {options.map((option) => (
        <button key={option.id} type="button" role="tab" aria-selected={value === option.id} onClick={() => onChange(option.id)}>
          {option.label}
          {typeof option.count === "number" ? <span className="ui-count">{option.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "good" | "warn" | "bad" | "info" | "gold"; children: ReactNode }) {
  return <span className={`ui-badge ui-badge-${tone}`}>{children}</span>;
}

export function Card({ children, className, title, action, kicker }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode; kicker?: string }) {
  return (
    <section className={`ui-card${className ? ` ${className}` : ""}`}>
      {title || action || kicker ? (
        <header className="ui-card-head">
          <div>
            {kicker ? <p className="ui-kicker">{kicker}</p> : null}
            {title ? <h2 className="ui-card-title">{title}</h2> : null}
          </div>
          {action ? <div className="ui-card-action">{action}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function PageHeader({ kicker, title, lede, actions }: { kicker?: string; title: ReactNode; lede?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="ws-page-head">
      <div>
        {kicker ? <p className="ui-kicker">{kicker}</p> : null}
        <h1 className="ws-title">{title}</h1>
        {lede ? <p className="ws-lede">{lede}</p> : null}
      </div>
      {actions ? <div className="ws-head-actions">{actions}</div> : null}
    </header>
  );
}

export function EmptyState({ icon, title, children, action }: { icon: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="ui-empty">
      <span className="ui-empty-icon"><Icon name={icon} size={26} /></span>
      <h3>{title}</h3>
      {children ? <p>{children}</p> : null}
      {action}
    </div>
  );
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="ui-skeleton" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => <span key={index} />)}
    </div>
  );
}

export function ErrorNote({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="ui-error-note" role="alert">
      <p>{message}</p>
      {retry ? <Button tone="secondary" size="sm" onClick={retry}>Try again</Button> : null}
    </div>
  );
}

/* ---------- Drawer: the edit form for one thing ---------- */

export function Drawer({ open, title, onClose, children, footer, wide }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`ui-drawer${wide ? " ui-drawer-wide" : ""}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      aria-label={title}
    >
      {open ? (
        <div className="ui-drawer-panel">
          <header className="ui-drawer-head">
            <h2>{title}</h2>
            <IconButton icon="close" label="Close" onClick={onClose} />
          </header>
          <div className="ui-drawer-body">{children}</div>
          {footer ? <footer className="ui-drawer-foot">{footer}</footer> : null}
        </div>
      ) : null}
    </dialog>
  );
}

/* ---------- Confirm and toast, shared across the workspace ---------- */

type ConfirmRequest = { title: string; body?: string; confirm: string; danger?: boolean };
type Toast = { id: number; tone: "good" | "bad" | "info"; text: string };

type Feedback = {
  toast: (text: string, tone?: Toast["tone"]) => void;
  confirm: (request: ConfirmRequest) => Promise<boolean>;
};

const FeedbackContext = createContext<Feedback | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState<(ConfirmRequest & { resolve: (value: boolean) => void }) | null>(null);
  const counter = useRef(0);
  const dialog = useRef<HTMLDialogElement>(null);

  const toast = useCallback((text: string, tone: Toast["tone"] = "good") => {
    counter.current += 1;
    const id = counter.current;
    setToasts((current) => [...current.slice(-2), { id, tone, text }]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), tone === "bad" ? 6500 : 3800);
  }, []);

  const confirm = useCallback((request: ConfirmRequest) => new Promise<boolean>((resolve) => setPending({ ...request, resolve })), []);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (pending && !node.open) node.showModal();
    if (!pending && node.open) node.close();
  }, [pending]);

  function settle(value: boolean) {
    pending?.resolve(value);
    setPending(null);
  }

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}
      <div className="ui-toasts" aria-live="polite">
        {toasts.map((item) => (
          <div key={item.id} className={`ui-toast ui-toast-${item.tone}`} role={item.tone === "bad" ? "alert" : "status"}>
            <Icon name={item.tone === "bad" ? "close" : item.tone === "info" ? "bell" : "check"} size={16} />
            <span>{item.text}</span>
          </div>
        ))}
      </div>
      <dialog
        ref={dialog}
        className="ui-confirm"
        onCancel={(event) => {
          event.preventDefault();
          settle(false);
        }}
      >
        {pending ? (
          <div>
            <h2>{pending.title}</h2>
            {pending.body ? <p>{pending.body}</p> : null}
            <div className="ui-confirm-actions">
              <Button tone="secondary" onClick={() => settle(false)}>Cancel</Button>
              <Button tone={pending.danger ? "danger" : "primary"} onClick={() => settle(true)} autoFocus>{pending.confirm}</Button>
            </div>
          </div>
        ) : null}
      </dialog>
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const value = useContext(FeedbackContext);
  if (!value) throw new Error("FeedbackProvider is missing.");
  return value;
}
