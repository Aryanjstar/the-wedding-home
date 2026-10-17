"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { api, clearCache, errorText } from "@/components/api";
import { passwordProblem } from "@/data/password-rules";

export type Role = "admin" | "manager";

export type Me = {
  user: { id: string; name: string; email: string };
  membership: { weddingId: string; role: Role } | null;
  wedding: { id: string; brideName: string; groomName: string; title: string | null; weddingDate: string; city: string } | null;
};

export type SessionWedding = { bride: string; groom: string; date: string; city: string; title: string; story: string };

type Session = {
  ready: boolean;
  me: Me | null;
  person: { name: string; email: string; role: Role } | null;
  wedding: SessionWedding | null;
  refresh: () => Promise<Me | null>;
  setMe: (me: Me | null) => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null; next: string }>;
  createAccount: (name: string, email: string, password: string, confirm: string) => Promise<{ error: string | null; next: string }>;
  createWedding: (wedding: SessionWedding) => Promise<string | null>;
  signOut: () => Promise<void>;
  requestReset: (email: string) => Promise<string | null>;
  resetPassword: (token: string, password: string, confirm: string) => Promise<string | null>;
};

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const next = await api<Me>("/api/me");
      setMe(next);
      return next;
    } catch {
      setMe(null);
      return null;
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const value: Session = {
    ready,
    me,
    person: me ? { name: me.user.name, email: me.user.email, role: me.membership?.role ?? "admin" } : null,
    wedding: me?.wedding
      ? { bride: me.wedding.brideName, groom: me.wedding.groomName, date: me.wedding.weddingDate, city: me.wedding.city, title: me.wedding.title ?? "", story: "" }
      : null,
    refresh,
    setMe,
    async signIn(email, password) {
      try {
        clearCache();
        const next = await api<Me>("/api/auth/login", { method: "POST", body: { email, password } });
        setMe(next);
        return { error: null, next: next.wedding ? "/app" : "/plan" };
      } catch (error) {
        return { error: errorText(error), next: "" };
      }
    },
    async createAccount(name, email, password, confirm) {
      const weak = passwordProblem(password);
      if (weak) return { error: weak, next: "" };
      if (password !== confirm) return { error: "Those passwords do not match.", next: "" };
      try {
        clearCache();
        const next = await api<Me>("/api/auth/signup", { method: "POST", body: { name, email, password } });
        setMe(next);
        return { error: null, next: next.wedding ? "/app" : "/plan" };
      } catch (error) {
        return { error: errorText(error), next: "" };
      }
    },
    async createWedding(wedding) {
      try {
        const next = await api<Me>("/api/wedding", {
          method: "POST",
          body: {
            brideName: wedding.bride,
            groomName: wedding.groom,
            weddingDate: wedding.date,
            city: wedding.city,
            title: wedding.title || null,
            story: wedding.story || null,
          },
        });
        setMe(next);
        return null;
      } catch (error) {
        return errorText(error);
      }
    },
    async signOut() {
      await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
      clearCache();
      setMe(null);
    },
    async requestReset(email) {
      try {
        await api("/api/auth/forgot-password", { method: "POST", body: { email } });
        return null;
      } catch (error) {
        return errorText(error);
      }
    },
    async resetPassword(token, password, confirm) {
      const weak = passwordProblem(password);
      if (weak) return weak;
      if (password !== confirm) return "Those passwords do not match.";
      try {
        await api("/api/auth/reset-password", { method: "POST", body: { token, password } });
        return null;
      } catch (error) {
        return errorText(error);
      }
    },
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("SessionProvider is missing.");
  return value;
}
