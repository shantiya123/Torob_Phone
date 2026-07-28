import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { ApiClient, authApi } from "@/lib/api";
import { apiMockServer } from "./setup";

const baseUrl = "http://localhost:8000/api";

describe("FE020 Store registration API contract", () => {
  it("submits the exact nested JSON contract and validates pending success", async () => {
    apiMockServer.use(
      http.post(`${baseUrl}/auth/register/`, async ({ request }) => {
        expect(request.headers.get("content-type")).toContain("application/json");
        const body = await request.json();
        expect(body).toEqual({
          account_type: "store",
          username: "seller",
          email: "seller@example.test",
          password: "valid-password",
          store: {
            name: "Mobile Center",
            description: null,
            business_phone: "+98-21-00000000",
            business_email: null,
            address: "Tehran",
          },
          legal_profile: {
            legal_name: "Mobile Center LLC",
            business_type: "company",
            business_registration_number: null,
            national_identifier: "NI-1",
            tax_identifier: null,
            legal_representative_name: "Applicant",
            legal_representative_national_identifier: null,
          },
        });
        return HttpResponse.json(
          {
            id: 2,
            username: "seller",
            email: "seller@example.test",
            account_type: "store",
            store: { id: 1, name: "Mobile Center", slug: "mobile-center", status: "pending" },
          },
          { status: 201 },
        );
      }),
    );

    await expect(
      authApi.registerStore(
        {
          account_type: "store",
          username: "seller",
          email: "seller@example.test",
          password: "valid-password",
          store: {
            name: "Mobile Center",
            description: null,
            business_phone: "+98-21-00000000",
            business_email: null,
            address: "Tehran",
          },
          legal_profile: {
            legal_name: "Mobile Center LLC",
            business_type: "company",
            business_registration_number: null,
            national_identifier: "NI-1",
            tax_identifier: null,
            legal_representative_name: "Applicant",
            legal_representative_national_identifier: null,
          },
        },
        new ApiClient({ baseUrl }),
      ),
    ).resolves.toMatchObject({ account_type: "store", store: { status: "pending" } });
  });

  it("rejects an invalid success response instead of creating fake success", async () => {
    apiMockServer.use(
      http.post(`${baseUrl}/auth/register/`, () =>
        HttpResponse.json({ id: 2, account_type: "store" }, { status: 201 }),
      ),
    );
    await expect(
      authApi.registerStore(
        {
          account_type: "store",
          username: "seller",
          email: "seller@example.test",
          password: "valid-password",
          store: { name: "Store", business_phone: "1", address: "Address" },
          legal_profile: {
            legal_name: "Store LLC",
            business_type: "company",
            legal_representative_name: "Owner",
          },
        },
        new ApiClient({ baseUrl }),
      ),
    ).rejects.toMatchObject({ code: "invalid_response" });
  });
});
