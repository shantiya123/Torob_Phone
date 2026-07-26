import { z } from "zod";
import type {
  AccessTokenResponse,
  CurrentUser,
  CustomerRegistrationInput,
  CustomerRegistrationResponse,
  LoginRequest,
  LogoutResponse,
} from "@/types/api";
import { apiClient, type ApiClient } from "./client";
import { accessTokenSchema, currentUserSchema } from "./schemas";

export const authApi = {
  async login(credentials: LoginRequest, client: ApiClient = apiClient) {
    const response = await client.request<AccessTokenResponse, LoginRequest>("auth/login/", {
      method: "POST",
      json: credentials,
      credentials: "include",
      schema: accessTokenSchema,
    });
    client.tokenProvider.setAccessToken(response.access);
    return response;
  },
  async refresh(client: ApiClient = apiClient) {
    const response = await client.request<AccessTokenResponse>("auth/token/refresh/", {
      method: "POST",
      credentials: "include",
      schema: accessTokenSchema,
    });
    client.tokenProvider.setAccessToken(response.access);
    return response;
  },
  registerCustomer(input: CustomerRegistrationInput, client: ApiClient = apiClient) {
    return client.request<CustomerRegistrationResponse, CustomerRegistrationInput>(
      "auth/register/",
      {
        method: "POST",
        json: input,
        expectedStatuses: [201],
      },
    );
  },
  async logout(client: ApiClient = apiClient) {
    try {
      return await client.request<LogoutResponse>("auth/logout/", {
        method: "POST",
        credentials: "include",
        schema: z.object({ detail: z.string() }).strict(),
      });
    } finally {
      client.tokenProvider.setAccessToken(null);
    }
  },
  getCurrentUser(client: ApiClient = apiClient) {
    return client.request<CurrentUser>("auth/me/", { auth: true, schema: currentUserSchema });
  },
  updateCurrentUser(email: string, client: ApiClient = apiClient) {
    return client.request<CurrentUser, { email: string }>("auth/me/", {
      method: "PATCH",
      auth: true,
      json: { email },
    });
  },
};
