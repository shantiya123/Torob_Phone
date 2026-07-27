import type { TorobcheOrdering, TorobcheQuerySet } from "@/types/api";

export type TorobcheCharacterState =
  "idle" | "focused" | "thinking" | "results" | "empty" | "error" | "recovery";

export interface TorobcheHistoryEntry {
  id: string;
  request: string;
  response: string;
  resultCount: number;
  createdAt: string;
  warning?: string;
}

export interface TorobcheSessionSnapshot {
  version: 1;
  history: TorobcheHistoryEntry[];
  querySet: TorobcheQuerySet | null;
  ordering: TorobcheOrdering;
}
