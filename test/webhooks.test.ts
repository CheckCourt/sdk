import { describe, expect, it } from "vitest";
import { WebhookSignatureError, signWebhookPayload, verifyWebhook, isEventType } from "../src/webhooks.js";

const secret = "whsec_test";
const body = JSON.stringify({
  id: "evt_1",
  type: "booking.created",
  created_at: "2026-10-06T10:00:00.000Z",
  tenant_id: "t1",
  object: { type: "booking", id: "b1" },
  data: { booking_id: "b1", court_id: 1, date: "2026-10-07", start_time: "10:00", end_time: "11:00", type: "regular" },
});
const t = 1_790_000_000;

async function reason(promise: Promise<unknown>) {
  const err = await promise.catch((e: unknown) => e);
  expect(err).toBeInstanceOf(WebhookSignatureError);
  return (err as WebhookSignatureError).reason;
}

describe("verifyWebhook", () => {
  it("accepts its own signature over string and byte bodies", async () => {
    const header = await signWebhookPayload(secret, body, t);
    const event = await verifyWebhook({ secret, rawBody: body, signatureHeader: header, now: t });
    expect(event.id).toBe("evt_1");
    if (isEventType(event, "booking.created")) expect(event.data.court_id).toBe(1);
    const bytes = new TextEncoder().encode(body);
    await expect(verifyWebhook({ secret, rawBody: bytes, signatureHeader: header, now: new Date(t * 1000) })).resolves.toBeTruthy();
  });

  it("accepts any matching v1 among several", async () => {
    const good = await signWebhookPayload(secret, body, t);
    const header = `t=${t},v1=${"0".repeat(64)},${good.split(",")[1]}`;
    await expect(verifyWebhook({ secret, rawBody: body, signatureHeader: header, now: t })).resolves.toBeTruthy();
  });

  it("names the reason for each failure", async () => {
    const header = await signWebhookPayload(secret, body, t);
    expect(await reason(verifyWebhook({ secret, rawBody: body, signatureHeader: null, now: t }))).toBe("missing_header");
    expect(await reason(verifyWebhook({ secret, rawBody: body, signatureHeader: "v1=abc", now: t }))).toBe("malformed_header");
    expect(await reason(verifyWebhook({ secret, rawBody: body, signatureHeader: header, now: t + 301 }))).toBe(
      "timestamp_out_of_tolerance",
    );
    expect(await reason(verifyWebhook({ secret, rawBody: body + " ", signatureHeader: header, now: t }))).toBe(
      "signature_mismatch",
    );
    expect(await reason(verifyWebhook({ secret: "whsec_other", rawBody: body, signatureHeader: header, now: t }))).toBe(
      "signature_mismatch",
    );
    const notJson = "nope";
    const signed = await signWebhookPayload(secret, notJson, t);
    expect(await reason(verifyWebhook({ secret, rawBody: notJson, signatureHeader: signed, now: t }))).toBe("invalid_payload");
  });

  it("honours a custom tolerance", async () => {
    const header = await signWebhookPayload(secret, body, t);
    await expect(
      verifyWebhook({ secret, rawBody: body, signatureHeader: header, now: t + 500, toleranceSeconds: 600 }),
    ).resolves.toBeTruthy();
  });
});
