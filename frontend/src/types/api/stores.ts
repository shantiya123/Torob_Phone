import type { IsoDateTime, PublicStoreSummary } from "./common";

export type PublicStoreListItem = PublicStoreSummary;
export interface PublicStoreDetail extends PublicStoreSummary {
  description: string | null;
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
export interface StoreDashboardIdentity {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  status: StoreStatus;
  rejection_reason: string;
}
interface StoreDashboardBase {
  store: StoreDashboardIdentity;
  generated_at: IsoDateTime;
  recent_orders: unknown[];
  recent_offers: unknown[];
}
export interface RestrictedStoreDashboard extends StoreDashboardBase {
  operational_access: false;
  reason: "store_not_active";
  offers: null;
  orders: null;
}
export interface ActiveStoreDashboard extends StoreDashboardBase {
  operational_access: true;
  reason: null;
  offers: {
    total: number;
    publicly_available: number;
    out_of_stock: number;
    unavailable_variant: number;
    reserved_units: number;
    total_available_units: number;
  };
  orders: { paid: number; completed: number; cancelled: number; open: number };
  store: StoreDashboardIdentity & { status: "active" };
}
export type StoreDashboardResponse = RestrictedStoreDashboard | ActiveStoreDashboard;
