import { env } from "@/config/env";

const backendOrigin = new URL(env.apiBaseUrl).origin;

export function resolveMediaUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, backendOrigin);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}
