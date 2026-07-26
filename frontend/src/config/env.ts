const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_API_BASE_URL is required. Copy frontend/.env.example to frontend/.env.local.",
  );
}

export const env = {
  apiBaseUrl: apiBaseUrl.replace(/\/+$/, ""),
} as const;
