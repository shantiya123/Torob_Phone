"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, apiClient, authApi, type ApiClient } from "@/lib/api";
import type { CustomerRegistrationInput } from "@/types/api";
import {
  customerRegistrationSchema,
  type CustomerRegistrationFormValues,
  type LoginFormValues,
} from "../schemas";
import {
  resolveAuthenticatedUser,
  type AuthenticatedUser,
  type AuthErrorState,
  type AuthStatus,
} from "../types";
import { AuthContext } from "./auth-context";

export function AuthProvider({
  children,
  client = apiClient,
}: {
  children: ReactNode;
  client?: ApiClient;
}) {
  const [status, setStatus] = useState<AuthStatus>("initializing");
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [error, setError] = useState<AuthErrorState | null>(null);
  const initializationStarted = useRef(false);

  const resolveSession = useCallback(async (): Promise<AuthenticatedUser | null> => {
    try {
      await authApi.refresh(client);
      const current = resolveAuthenticatedUser(await authApi.getCurrentUser(client));
      setUser(current);
      setStatus("authenticated");
      setError(null);
      return current;
    } catch (caught) {
      client.tokenProvider.setAccessToken(null);
      if (
        caught instanceof ApiError &&
        (caught.code === "unauthenticated" ||
          caught.backendCode === "refresh_cookie_missing" ||
          caught.backendCode === "refresh_token_invalid")
      ) {
        setUser(null);
        setStatus("unauthenticated");
        setError(null);
        return null;
      }
      setUser(null);
      setStatus("error");
      setError({
        message: caught instanceof ApiError ? caught.message : "بازیابی نشست انجام نشد.",
        retryable: true,
      });
      return null;
    }
  }, [client]);

  useEffect(() => {
    if (initializationStarted.current) return;
    initializationStarted.current = true;
    void resolveSession();
  }, [resolveSession]);

  const login = useCallback(
    async (input: LoginFormValues) => {
      setError(null);
      await authApi.login(input, client);
      try {
        const resolved = resolveAuthenticatedUser(await authApi.getCurrentUser(client));
        setUser(resolved);
        setStatus("authenticated");
        return resolved;
      } catch (caught) {
        client.tokenProvider.setAccessToken(null);
        setStatus("error");
        const message =
          caught instanceof ApiError ? caught.message : "اطلاعات حساب قابل دریافت نیست.";
        setError({ message, retryable: false });
        throw caught;
      }
    },
    [client],
  );

  const registerCustomer = useCallback(
    async (input: CustomerRegistrationFormValues) => {
      const parsed = customerRegistrationSchema.parse(input);
      const request: CustomerRegistrationInput = {
        username: parsed.username,
        email: parsed.email,
        password: parsed.password,
      };
      await authApi.registerCustomer(request, client);
    },
    [client],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout(client);
    } finally {
      setUser(null);
      setError(null);
      setStatus("unauthenticated");
    }
  }, [client]);

  const refreshSession = useCallback(() => resolveSession(), [resolveSession]);
  const value = {
    status,
    user,
    error,
    login,
    registerCustomer,
    logout,
    refreshSession,
    hasRole: (role: AuthenticatedUser["role"]) => status === "authenticated" && user?.role === role,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
