import type { IsoDateTime } from "./common";
import type { StoreStatus } from "./stores";

export interface StaffStoreReview {
  id: number;
  name: string;
  status: StoreStatus;
  rejection_reason: string;
  reviewed_by: { id: number; username: string; email: string } | null;
  reviewed_at: IsoDateTime | null;
  created_at: IsoDateTime;
  owner?: unknown;
  legal_profile?: unknown;
}
