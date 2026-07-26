import { z } from "zod";

const apiUrlSchema = z
  .url()
  .refine(
    (value) => ["http:", "https:"].includes(new URL(value).protocol),
    "API URL must use HTTP(S)",
  );

export function normalizeApiBaseUrl(value: string): string {
  const normalized = value.replace(/\/+$/, "");
  const parsed = apiUrlSchema.parse(normalized);
  if (/\/api\/api$/i.test(parsed))
    throw new Error("NEXT_PUBLIC_API_BASE_URL must contain /api only once.");
  return parsed;
}

export const env = {
  apiBaseUrl: normalizeApiBaseUrl(
    process.env.NEXT_PUBLIC_API_BASE_URL ??
      (() => {
        throw new Error(
          "NEXT_PUBLIC_API_BASE_URL is required. Copy frontend/.env.example to frontend/.env.local.",
        );
      })(),
  ),
} as const;
