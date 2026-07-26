import type { PublicStoreListItem } from "@/types/api";

export type HomeStoreState =
  | { status: "ready"; stores: PublicStoreListItem[] }
  | { status: "empty"; stores: [] }
  | { status: "error"; stores: [] };
