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
