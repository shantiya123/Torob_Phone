import type { IsoDateTime, PublicStoreSummary } from "./common";

export type PublicStoreListItem = PublicStoreSummary;
export interface PublicStoreDetail extends PublicStoreSummary {
  description: string;
  created_at: IsoDateTime;
}
export type StoreStatus = "pending" | "active" | "rejected" | "suspended";
export interface StoreOwnerProfile extends PublicStoreDetail {
  business_phone: string;
  business_email: string | null;
  address: string;
  status: StoreStatus;
  reviewed_by: number | null;
  reviewed_at: IsoDateTime | null;
  rejection_reason: string;
  updated_at: IsoDateTime;
}
export interface RestrictedStoreDashboard {
  operational_access: false;
  reason: "store_not_active";
  status: StoreStatus;
  metrics: null;
}
export interface ActiveStoreDashboard {
  operational_access: true;
  status: "active";
  metrics: Record<string, number>;
  recent_orders: unknown[];
  recent_offers: unknown[];
}
export type StoreDashboardResponse = RestrictedStoreDashboard | ActiveStoreDashboard;
