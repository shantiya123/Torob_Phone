import type { z } from "zod";
import { env } from "@/config/env";
import { ApiError, normalizeResponseError } from "./errors";
import { accessTokenSchema } from "./schemas";
import type { AccessTokenProvider } from "./token";
import { createMemoryTokenProvider } from "./token";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export interface ApiRequestOptions<TBody = never, TResponse = unknown> {
  method?: HttpMethod;
  auth?: boolean;
  json?: TBody;
  body?: BodyInit;
  headers?: HeadersInit;
  credentials?: RequestCredentials;
  signal?: AbortSignal;
  timeoutMs?: number;
  cache?: RequestCache;
  next?: { revalidate?: number | false; tags?: string[] };
  idempotencyKey?: string;
  expectedStatuses?: readonly number[];
  schema?: z.ZodType<TResponse>;
}
export interface ApiLogEvent {
  method: HttpMethod;
  path: string;
  status: number | null;
  durationMs: number;
  requestId?: string;
  errorCode?: string;
}
export type ApiLogger = (event: ApiLogEvent) => void;

export interface ApiClientOptions {
  baseUrl?: string;
  tokenProvider?: AccessTokenProvider;
  fetch?: typeof fetch;
  logger?: ApiLogger;
}

function joinUrl(baseUrl: string, path: string) {
  if (/^https?:\/\//i.test(path)) throw new TypeError("API paths must be relative.");
  return `${baseUrl}/${path.replace(/^\/+/, "")}`;
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("json"))
    return response.ok ? text : { detail: "The API returned an unexpected response." };
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError({
      code: "invalid_response",
      status: response.status,
      message: "The API returned invalid JSON.",
      retryable: false,
    });
  }
}

export class ApiClient {
  readonly tokenProvider: AccessTokenProvider;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly logger: ApiLogger | undefined;
  private refreshPromise: Promise<string> | null = null;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? env.apiBaseUrl).replace(/\/+$/, "");
    this.tokenProvider = options.tokenProvider ?? createMemoryTokenProvider();
    this.fetchImpl = options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
    this.logger = options.logger;
  }

  async request<TResponse, TBody = never>(
    path: string,
    options: ApiRequestOptions<TBody, TResponse> = {},
  ): Promise<TResponse> {
    return this.execute(path, options, false);
  }

  private async execute<TResponse, TBody>(
    path: string,
    options: ApiRequestOptions<TBody, TResponse>,
    retried: boolean,
  ): Promise<TResponse> {
    const method = options.method ?? "GET";
    const started = performance.now();
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, options.timeoutMs ?? 15_000);
    const abort = () => controller.abort();
    options.signal?.addEventListener("abort", abort, { once: true });
    const headers = new Headers(options.headers);
    const token = options.auth ? this.tokenProvider.getAccessToken() : null;
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (options.idempotencyKey) headers.set("Idempotency-Key", options.idempotencyKey);
    let body = options.body;
    if (options.json !== undefined) {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(options.json);
    }
    let status: number | null = null;
    try {
      const response = await this.fetchImpl(joinUrl(this.baseUrl, path), {
        method,
        headers,
        ...(body === undefined ? {} : { body }),
        credentials: options.credentials ?? "same-origin",
        signal: controller.signal,
        ...(options.auth
          ? { cache: "no-store" as const }
          : options.cache
            ? { cache: options.cache }
            : {}),
        ...(options.next ? { next: options.next } : {}),
      });
      status = response.status;
      if (response.status === 401 && options.auth && token && !retried) {
        await this.refreshAccessToken();
        return this.execute(path, options, true);
      }
      const payload = await parseResponse(response);
      const expected = options.expectedStatuses;
      if (!response.ok || (expected && !expected.includes(response.status)))
        throw normalizeResponseError(response.status, payload, response.headers);
      if (options.schema) {
        const parsed = options.schema.safeParse(payload);
        if (!parsed.success)
          throw new ApiError({
            code: "invalid_response",
            status,
            message: "The API response did not match its contract.",
            retryable: false,
          });
        return parsed.data;
      }
      return payload as TResponse;
    } catch (error) {
        console.error("RAW CAUGHT ERROR:", error?.name, error?.message, error);
      if (error instanceof ApiError) {

        this.log(method, path, status, started, error);
        throw error;
      }
      const normalized = controller.signal.aborted
        ? new ApiError({
            code: timedOut ? "timeout" : "aborted",
            status: null,
            message: timedOut ? "The request timed out." : "The request was aborted.",
            retryable: timedOut,
          })
        : new ApiError({
            code: "network_error",
            status: null,
            message: "The network request failed.",
            retryable: true,
          });
      this.log(method, path, status, started, normalized);
      throw normalized;
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abort);
    }
  }

  private refreshAccessToken(): Promise<string> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.execute<unknown, never>(
        "auth/token/refresh/",
        { method: "POST", credentials: "include", expectedStatuses: [200] },
        true,
      )
        .then((value) => {
          const parsed = accessTokenSchema.safeParse(value);
          if (!parsed.success)
            throw new ApiError({
              code: "invalid_response",
              status: 200,
              message: "Refresh returned an invalid response.",
            });
          this.tokenProvider.setAccessToken(parsed.data.access);
          return parsed.data.access;
        })
        .catch((error: unknown) => {
          this.tokenProvider.setAccessToken(null);
          if (error instanceof ApiError && error.code === "unauthenticated") throw error;
          throw new ApiError({
            code: "unauthenticated",
            status: error instanceof ApiError ? error.status : null,
            message: "Authentication could not be refreshed.",
          });
        })
        .finally(() => {
          this.refreshPromise = null;
        });
    }
    return this.refreshPromise;
  }

  private log(
    method: HttpMethod,
    path: string,
    status: number | null,
    started: number,
    error: ApiError,
  ) {
    if (!this.logger) return;
    const requestId = error.requestId;
    this.logger({
      method,
      path: path.split("?")[0] ?? path,
      status,
      durationMs: Math.round(performance.now() - started),
      ...(requestId ? { requestId } : {}),
      errorCode: error.code,
    });
  }
}

export const apiClient = new ApiClient();
