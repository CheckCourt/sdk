import { describe, expect, it } from "vitest";
import { apiKeyAuth, createCheckCourtClient, CheckCourtApiError, sendNotification } from "../src/index.js";
import { json, mockFetch } from "./helpers.js";

function clientWith(fetch: ReturnType<typeof mockFetch>) {
  return createCheckCourtClient({
    baseUrl: "https://checkcourt.test",
    auth: apiKeyAuth("cca_test"),
    fetch,
    retry: false,
  });
}

describe("sendNotification", () => {
  it("posts to /app/notifications with snake_case idempotency_key", async () => {
    const fetch = mockFetch(() => json(200, { id: "ntf_1", accepted: true }));
    const result = await sendNotification(clientWith(fetch), {
      recipient: "psn_abc",
      title: "Platz frei",
      body: "Ab 18 Uhr.",
      url: "/booking",
      idempotencyKey: "res-1",
    });

    expect(result).toEqual({ id: "ntf_1", accepted: true });
    const call = fetch.calls[0]!;
    expect(call.method).toBe("POST");
    expect(call.url).toBe("https://checkcourt.test/api/v1/app/notifications");
    expect(call.headers.get("authorization")).toBe("Bearer cca_test");
    expect(JSON.parse(call.body)).toEqual({
      recipient: "psn_abc",
      title: "Platz frei",
      body: "Ab 18 Uhr.",
      url: "/booking",
      idempotency_key: "res-1",
    });
  });

  it("omits optional fields that were not given", async () => {
    const fetch = mockFetch(() => json(200, { id: "ntf_2", accepted: true }));
    await sendNotification(clientWith(fetch), { recipient: "usr_x", title: "t", body: "b" });
    expect(JSON.parse(fetch.calls[0]!.body)).toEqual({ recipient: "usr_x", title: "t", body: "b" });
  });

  it("throws CheckCourtApiError for an unknown recipient", async () => {
    const fetch = mockFetch(() =>
      json(404, { error: { code: "NOT_FOUND", message: "Empfänger nicht gefunden" } }),
    );
    const err = await sendNotification(clientWith(fetch), { recipient: "x", title: "t", body: "b" }).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(CheckCourtApiError);
    expect((err as CheckCourtApiError).status).toBe(404);
    expect((err as CheckCourtApiError).code).toBe("NOT_FOUND");
  });
});
