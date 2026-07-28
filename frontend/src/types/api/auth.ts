import type { IsoDateTime } from "./common";

export type AccountType = "customer" | "store" | null;
export interface AccessTokenResponse {
  access: string;
}
export interface LoginRequest {
  username: string;
  password: string;
}
export interface CurrentUser {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
  account_type: AccountType;
  created_at: IsoDateTime | null;
}
export interface CustomerRegistrationInput {
  account_type: "customer";
  username: string;
  email: string;
  password: string;
}
export interface CustomerRegistrationResponse {
  id: number;
  username: string;
  email: string;
  account_type: "customer";
}
export interface LogoutResponse {
  detail: string;
}

export type StoreApprovalStatus = "pending" | "active" | "rejected" | "suspended";

export interface StoreRegistrationInput {
  account_type: "store";
  username: string;
  email: string;
  password: string;
  store: {
    name: string;
    description?: string | null;
    business_phone: string;
    business_email?: string | null;
    address: string;
  };
  legal_profile: {
    legal_name: string;
    business_type: string;
    business_registration_number?: string | null;
    national_identifier?: string | null;
    tax_identifier?: string | null;
    legal_representative_name: string;
    legal_representative_national_identifier?: string | null;
  };
}

export interface StoreRegistrationResponse {
  id: number;
  username: string;
  email: string;
  account_type: "store";
  store: {
    id: number;
    name: string;
    slug: string;
    status: StoreApprovalStatus;
  };
}
