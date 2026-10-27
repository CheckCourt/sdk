import { describe, expect, it } from "vitest";
import { apiKeyAuth, cancelCharge, createCharge, createCheckCourtClient, CheckCourtApiError, getCharge, memberDirectory } from "../src/index.js";
import { json, mockFetch } from "./helpers.js";

function clientWith(fetch: ReturnType<typeof mockFetch>) {
  return createCheckCourtClient({ baseUrl: "https://checkcourt.test", auth: apiKeyAuth("cca_test"), fetch, retry: false });
}

const charge = {
  id: "chg_1",
  recipient: "usr_1",
  amountCents: 1500,
  title: "Startgeld",
  reference: "entry-1",
  status: "open",
  createdAt: "2026-10-27T10:00:00.000Z",
  paidAt: null,
  cancelledAt: null,
};

describe("charges", () => {
  it("creates a fee with POST /app/charges and returns it", async () => {
    const fetch = mockFetch(() => json(201, { charge }));
    const result = await createCharge(clientWith(fetch), { recipient: "usr_1", amountCents: 1500, title: "Startgeld", reference: "entry-1", idempotencyKey: "entry-1" });
    expect(result).toEqual(charge);
    const call = fetch.calls[0]!;
    expect(call.method).toBe("POST");
    expect(call.url).toBe("https://checkcourt.test/api/v1/app/charges");
    expect(JSON.parse(call.body)).toEqual({ recipient: "usr_1", amountCents: 1500, title: "Startgeld", reference: "entry-1", idempotencyKey: "entry-1" });
  });

  it("reads and cancels a fee by id", async () => {
    const fetch = mockFetch((req) => json(200, { charge: { ...charge, status: req.method === "DELETE" ? "cancelled" : "open" } }));
    expect((await getCharge(clientWith(fetch), "chg_1")).status).toBe("open");
    expect((await cancelCharge(clientWith(fetch), "chg_1")).status).toBe("cancelled");
    expect(fetch.calls.map((c) => [c.method, c.url])).toEqual([
      ["GET", "https://checkcourt.test/api/v1/app/charges/chg_1"],
      ["DELETE", "https://checkcourt.test/api/v1/app/charges/chg_1"],
    ]);
  });

  it("throws the API error for a paid fee", async () => {
    const fetch = mockFetch(() => json(422, { error: { code: "BUSINESS_RULE", message: "Bezahlt" } }));
    await expect(cancelCharge(clientWith(fetch), "chg_1")).rejects.toBeInstanceOf(CheckCourtApiError);
  });
});

describe("memberDirectory", () => {
  it("searches by name", async () => {
    const fetch = mockFetch(() => json(200, { members: [{ userId: "u1", memberId: "m1", name: "Anna Berg" }] }));
    const members = await memberDirectory(clientWith(fetch), { search: "Ann", limit: 5 });
    expect(members[0]?.name).toBe("Anna Berg");
    expect(fetch.calls[0]!.url).toBe("https://checkcourt.test/api/v1/members/directory?search=Ann&limit=5");
  });

  it("looks up user ids as a comma-separated list", async () => {
    const fetch = mockFetch(() => json(200, { members: [] }));
    await memberDirectory(clientWith(fetch), { ids: ["u1", "u2"] });
    expect(decodeURIComponent(fetch.calls[0]!.url)).toBe("https://checkcourt.test/api/v1/members/directory?ids=u1,u2");
  });
});
