import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { ApiClient, authApi } from "@/lib/api";
import { apiMockServer } from "./setup";

const baseUrl = "http://localhost:8000/api";

describe("customer registration contract", () => {
  it("sends the backend-required customer account_type discriminator", async () => {
    apiMockServer.use(
      http.post(`${baseUrl}/auth/register/`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        expect(body).toEqual({
          account_type: "customer",
          username: "soroush",
          email: "user@example.test",
          password: "valid-password",
        });
        return HttpResponse.json(
          {
            id: 1,
            username: "soroush",
            email: "user@example.test",
            account_type: "customer",
          },
          { status: 201 },
        );
      }),
    );

    await expect(
      authApi.registerCustomer(
        {
          account_type: "customer",
          username: "soroush",
          email: "user@example.test",
          password: "valid-password",
        },
        new ApiClient({ baseUrl }),
      ),
    ).resolves.toMatchObject({ account_type: "customer" });
  });
});
