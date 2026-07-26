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
  account_type: AccountType;
  created_at: IsoDateTime | null;
}
export interface LogoutResponse {
  detail: string;
}
