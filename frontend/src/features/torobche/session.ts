import type { TorobcheSessionSnapshot } from "./types";

export const TOROBCHE_SESSION_KEY = "torob-phone:torobche-session:v1";

export function readTorobcheSession(
  storage: Pick<Storage, "getItem">,
): TorobcheSessionSnapshot | null {
  try {
    const raw = storage.getItem(TOROBCHE_SESSION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<TorobcheSessionSnapshot>;
    if (value.version !== 1 || !Array.isArray(value.history) || typeof value.ordering !== "string")
      return null;
    return value as TorobcheSessionSnapshot;
  } catch {
    return null;
  }
}

export function writeTorobcheSession(
  storage: Pick<Storage, "setItem">,
  value: TorobcheSessionSnapshot,
) {
  try {
    storage.setItem(TOROBCHE_SESSION_KEY, JSON.stringify(value));
  } catch {
    // Search remains usable when storage is disabled or full.
  }
}

export function clearTorobcheSession(storage: Pick<Storage, "removeItem">) {
  try {
    storage.removeItem(TOROBCHE_SESSION_KEY);
  } catch {
    // Reset still clears in-memory state when storage is unavailable.
  }
}
