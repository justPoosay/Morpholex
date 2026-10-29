import { useSyncExternalStore } from "react";

/**
 * A value kept in localStorage that every component using it stays in sync with, also across
 * browser tabs. If storage is unavailable (some private modes) the value lives in memory
 * until the page closes, so the app still works.
 */
export function createStore<T>(key: string, fallback: T) {
  const listeners = new Set<() => void>();
  let cachedRaw: string | null | undefined;
  let cachedValue: T = fallback;
  let memoryOnly = false;

  /** useSyncExternalStore needs the same object back until the value really changes. */
  function get(): T {
    if (memoryOnly) return cachedValue;

    let raw: string | null = null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      return cachedValue;
    }

    if (raw !== cachedRaw) {
      cachedRaw = raw;
      try {
        cachedValue = raw === null ? fallback : (JSON.parse(raw) as T);
      } catch {
        cachedValue = fallback;
      }
    }
    return cachedValue;
  }

  function emit() {
    listeners.forEach((listener) => listener());
  }

  function set(value: T) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      memoryOnly = true;
      cachedValue = value;
    }
    emit();
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  if (typeof window !== "undefined") {
    window.addEventListener("storage", (event) => {
      if (event.key === key) emit();
    });
  }

  function useValue(): T {
    return useSyncExternalStore(subscribe, get, () => fallback);
  }

  return { get, set, subscribe, useValue };
}
