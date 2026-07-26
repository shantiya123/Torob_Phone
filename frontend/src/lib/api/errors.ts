export type ApiErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "validation_error"
  | "conflict"
  | "rate_limited"
  | "network_error"
  | "timeout"
  | "aborted"
  | "server_error"
  | "invalid_response"
  | "unknown";

export interface ApiErrorInit {
  code: ApiErrorCode;
  status?: number | null;
  message: string;
  detail?: string;
  backendCode?: string;
  fieldErrors?: Record<string, string[]>;
  requestId?: string;
  retryAfterSeconds?: number;
  retryable?: boolean;
}

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number | null;
  readonly detail?: string;
  readonly backendCode?: string;
  readonly fieldErrors: Readonly<Record<string, string[]>>;
  readonly requestId?: string;
  readonly retryAfterSeconds?: number;
  readonly retryable: boolean;

  constructor(init: ApiErrorInit) {
    super(init.message);
    this.name = "ApiError";
    this.code = init.code;
    this.status = init.status ?? null;
    this.fieldErrors = init.fieldErrors ?? {};
    this.retryable = init.retryable ?? false;
    if (init.detail !== undefined) this.detail = init.detail;
    if (init.backendCode !== undefined) this.backendCode = init.backendCode;
    if (init.requestId !== undefined) this.requestId = init.requestId;
    if (init.retryAfterSeconds !== undefined) this.retryAfterSeconds = init.retryAfterSeconds;
  }
}

function collectStrings(value: unknown, prefix = "", output: Record<string, string[]> = {}) {
  if (Array.isArray(value)) {
    const messages = value.filter((item): item is string => typeof item === "string");
    if (messages.length) output[prefix || "non_field_errors"] = messages;
    return output;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (key === "detail" || key === "code") continue;
      collectStrings(child, prefix ? `${prefix}.${key}` : key, output);
    }
  }
  return output;
}

export function normalizeResponseError(
  status: number,
  payload: unknown,
  headers?: Headers,
): ApiError {
  const object =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};
  const detail = typeof object.detail === "string" ? object.detail : undefined;
  const backendCode = typeof object.code === "string" ? object.code : undefined;
  const fieldErrors = collectStrings(object);
  const hasFields = Object.keys(fieldErrors).length > 0;
  const code: ApiErrorCode =
    status === 401
      ? "unauthenticated"
      : status === 403
        ? "forbidden"
        : status === 404
          ? "not_found"
          : status === 409
            ? "conflict"
            : status === 429
              ? "rate_limited"
              : status >= 500
                ? "server_error"
                : status === 400 && hasFields
                  ? "validation_error"
                  : "unknown";
  const retryAfter = headers?.get("retry-after");
  const retryAfterSeconds = retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) : undefined;
  return new ApiError({
    code,
    status,
    message:
      detail ?? (hasFields ? "The request contains invalid fields." : "The API request failed."),
    ...(detail === undefined ? {} : { detail }),
    ...(backendCode === undefined ? {} : { backendCode }),
    fieldErrors,
    ...(headers?.get("x-request-id") ? { requestId: headers.get("x-request-id")! } : {}),
    ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
    retryable: status === 429 || status >= 500,
  });
}

export function getFieldErrors(error: unknown): Readonly<Record<string, string[]>> {
  return error instanceof ApiError ? error.fieldErrors : {};
}
export function getErrorForField(error: unknown, field: string): string | undefined {
  return getFieldErrors(error)[field]?.[0];
}
export function getErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "An unexpected error occurred.";
}

const persianFallbacks: Record<ApiErrorCode, string> = {
  unauthenticated: "برای ادامه وارد حساب کاربری شوید.",
  forbidden: "اجازه انجام این عملیات را ندارید.",
  not_found: "مورد درخواستی پیدا نشد.",
  validation_error: "اطلاعات واردشده معتبر نیست.",
  conflict: "این عملیات با وضعیت فعلی سازگار نیست.",
  rate_limited: "تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.",
  network_error: "ارتباط با سرور برقرار نشد.",
  timeout: "پاسخ سرور بیش از حد طول کشید.",
  aborted: "درخواست متوقف شد.",
  server_error: "خطایی در سرور رخ داد.",
  invalid_response: "پاسخ سرور معتبر نبود.",
  unknown: "خطایی رخ داد.",
};
export function getPersianErrorMessage(error: unknown): string {
  return error instanceof ApiError && error.detail
    ? error.detail
    : persianFallbacks[error instanceof ApiError ? error.code : "unknown"];
}
