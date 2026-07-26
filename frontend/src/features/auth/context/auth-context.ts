"use client";

import { createContext, useContext } from "react";
import type { AuthRole, AuthenticatedUser, AuthErrorState, AuthStatus } from "../types";
import type { CustomerRegistrationFormValues, LoginFormValues } from "../schemas";

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthenticatedUser | null;
  error: AuthErrorState | null;
  login(input: LoginFormValues): Promise<AuthenticatedUser>;
  registerCustomer(input: CustomerRegistrationFormValues): Promise<void>;
  logout(): Promise<void>;
  refreshSession(): Promise<AuthenticatedUser | null>;
  hasRole(role: AuthRole): boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider.");
  return value;
}
