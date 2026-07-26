export function createIdempotencyKey(): string {
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
    throw new Error("A cryptographically secure UUID generator is required.");
  }
  return crypto.randomUUID();
}
