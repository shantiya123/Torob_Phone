import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { setupServer } from "msw/node";

process.env.NEXT_PUBLIC_API_BASE_URL ??= "http://127.0.0.1:8000/api";

export const apiMockServer = setupServer();
beforeAll(() => apiMockServer.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  cleanup();
  apiMockServer.resetHandlers();
});
afterAll(() => apiMockServer.close());
