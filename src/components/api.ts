"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly reason: string | null,
    message: string,
    readonly details: Record<string, unknown> | null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/** JSON in, JSON out. A problem response becomes an ApiError carrying the server's own sentence. */
export async function api<T = unknown>(path: string, options: { method?: Method; body?: unknown } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method ?? "GET",
      cache: "no-store",
      headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(0, "NETWORK", "No connection. Check the internet and try again.", null);
  }
  if (response.status === 204) return undefined as T;
  const body = (await response.json().catch(() => null)) as (Record<string, unknown> & { detail?: string; reason?: string; details?: Record<string, unknown> }) | null;
  if (!response.ok) {
    throw new ApiError(response.status, body?.reason ?? null, body?.detail ?? "Something went wrong. Try again.", body?.details ?? null);
  }
  return body as T;
}

export function errorText(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Try again.";
}

const cache = new Map<string, unknown>();
const listeners = new Map<string, Set<() => void>>();

/** Tell every screen showing these paths to load again. */
export function invalidate(...paths: string[]) {
  for (const path of paths) {
    for (const key of [...listeners.keys()]) {
      if (key === path || key.startsWith(`${path}?`)) listeners.get(key)?.forEach((reload) => reload());
    }
  }
}

export function clearCache() {
  cache.clear();
}

/** Load once, show the last known copy straight away, refresh in the background. */
export function useResource<T>(path: string | null) {
  const [data, setData] = useState<T | undefined>(() => (path ? (cache.get(path) as T | undefined) : undefined));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const active = useRef(true);

  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      const next = await api<T>(path);
      cache.set(path, next);
      if (active.current) {
        setData(next);
        setError(null);
      }
    } catch (failure) {
      if (active.current) setError(errorText(failure));
    } finally {
      if (active.current) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    active.current = true;
    if (!path) return;
    const set = listeners.get(path) ?? new Set();
    const listener = () => void reload();
    set.add(listener);
    listeners.set(path, set);
    const timer = window.setTimeout(() => void reload(), 0);
    return () => {
      active.current = false;
      window.clearTimeout(timer);
      set.delete(listener);
    };
  }, [path, reload]);

  return { data, error, loading: loading && data === undefined, refreshing: loading, reload, setData };
}
