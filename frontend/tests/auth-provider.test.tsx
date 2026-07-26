import { HttpResponse, http } from "msw";
import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthProvider } from "@/features/auth/context/auth-provider";
import { useAuth } from "@/features/auth/context/auth-context";
import { ApiClient } from "@/lib/api";
import { apiMockServer } from "./setup";

const baseUrl = "http://127.0.0.1:8000/api";

function Probe() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="status">{auth.status}</span>
      <span data-testid="role">{auth.user?.role ?? "none"}</span>
      <span data-testid="error">{auth.error?.message ?? ""}</span>
      <button onClick={() => void auth.logout().catch(() => undefined)}>logout</button>
    </div>
  );
}

describe("FE004 AuthProvider", () => {
  it("restores a Staff session once and does not require AccountProfile", async () => {
    let refreshCalls = 0;
    apiMockServer.use(
      http.post(`${baseUrl}/auth/token/refresh/`, () => {
        refreshCalls += 1;
        return HttpResponse.json({ access: "staff-token" });
      }),
      http.get(`${baseUrl}/auth/me/`, () =>
        HttpResponse.json({
          id: 1,
          username: "staff",
          email: "staff@example.test",
          is_staff: true,
          is_superuser: false,
          account_type: null,
          created_at: null,
        }),
      ),
    );
    render(
      <AuthProvider client={new ApiClient({ baseUrl })}>
        <Probe />
      </AuthProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("authenticated"));
    expect(screen.getByTestId("role")).toHaveTextContent("staff");
    expect(refreshCalls).toBe(1);
  });

  it("treats a missing refresh cookie as a normal signed-out state", async () => {
    apiMockServer.use(
      http.post(`${baseUrl}/auth/token/refresh/`, () =>
        HttpResponse.json({ code: "refresh_cookie_missing", detail: "missing" }, { status: 400 }),
      ),
    );
    render(
      <AuthProvider client={new ApiClient({ baseUrl })}>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated"));
    expect(screen.getByTestId("role")).toHaveTextContent("none");
  });

  it("clears local state even when logout is unavailable", async () => {
    apiMockServer.use(
      http.post(`${baseUrl}/auth/token/refresh/`, () =>
        HttpResponse.json({ code: "refresh_cookie_missing", detail: "missing" }, { status: 400 }),
      ),
    );
    render(
      <AuthProvider client={new ApiClient({ baseUrl })}>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated"));
    await act(async () => {
      screen.getByRole("button", { name: "logout" }).click();
    });
    expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated");
  });
});
