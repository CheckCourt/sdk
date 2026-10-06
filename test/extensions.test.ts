import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  ExtensionVerificationError,
  verifyExtensionContext,
  verifyExtensionRequest,
} from "../src/extensions.js";
import { signWebhookPayload } from "../src/webhooks.js";

const secret = "whsec_ext";
const now = 1_790_000_000;

function jwt(header: object, claims: object, key = secret) {
  const enc = (v: object) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const input = `${enc(header)}.${enc(claims)}`;
  return `${input}.${createHmac("sha256", key).update(input).digest("base64url")}`;
}

const claims = {
  iss: "checkcourt",
  installation_id: "inst_1",
  installation_kind: "tenant",
  app_id: "app_1",
  tenant_id: "t1",
  point: "booking.detail.panel",
  subject: { type: "booking", id: "b1" },
  viewer: { user_id: "psn_1", capabilities: { is_booker: true } },
  iat: now,
  exp: now + 300,
  nonce: "n",
};

async function reason(promise: Promise<unknown>) {
  const err = await promise.catch((e: unknown) => e);
  expect(err).toBeInstanceOf(ExtensionVerificationError);
  return (err as ExtensionVerificationError).reason;
}

describe("verifyExtensionContext", () => {
  it("returns typed claims", async () => {
    const result = await verifyExtensionContext(jwt({ alg: "HS256", typ: "JWT" }, claims), secret, { now });
    expect(result.point).toBe("booking.detail.panel");
    if (result.point === "booking.detail.panel") expect(result.subject.id).toBe("b1");
  });

  it("applies 30 s leeway on both ends", async () => {
    const token = jwt({ alg: "HS256" }, claims);
    await expect(verifyExtensionContext(token, secret, { now: now + 330 })).resolves.toBeTruthy();
    expect(await reason(verifyExtensionContext(token, secret, { now: now + 331 }))).toBe("expired");
    await expect(verifyExtensionContext(token, secret, { now: now - 30 })).resolves.toBeTruthy();
    expect(await reason(verifyExtensionContext(token, secret, { now: now - 31 }))).toBe("not_yet_valid");
  });

  it("rejects none, other algorithms, wrong keys and wrong issuers", async () => {
    const unsigned = jwt({ alg: "none" }, claims).split(".").slice(0, 2).join(".") + ".AA";
    expect(await reason(verifyExtensionContext(unsigned, secret, { now }))).toBe("unsupported_algorithm");
    expect(await reason(verifyExtensionContext(jwt({ alg: "HS512" }, claims), secret, { now }))).toBe(
      "unsupported_algorithm",
    );
    expect(await reason(verifyExtensionContext(jwt({ alg: "HS256" }, claims, "whsec_x"), secret, { now }))).toBe(
      "invalid_signature",
    );
    expect(
      await reason(verifyExtensionContext(jwt({ alg: "HS256" }, { ...claims, iss: "other" }), secret, { now })),
    ).toBe("invalid_claims");
    expect(await reason(verifyExtensionContext("a.b", secret, { now }))).toBe("malformed_token");
  });
});

describe("verifyExtensionRequest", () => {
  const token = jwt({ alg: "HS256" }, claims);

  async function request(body: object, headers: Record<string, string> = {}) {
    const raw = JSON.stringify(body);
    return {
      raw,
      headers: { "checkcourt-signature": await signWebhookPayload(secret, raw, now), "CheckCourt-Context": token, ...headers },
    };
  }

  it("parses render and action requests", async () => {
    const render = await request({ context: token, point: claims.point, subject: claims.subject });
    const r = await verifyExtensionRequest({ secret, rawBody: render.raw, headers: render.headers, now });
    expect(r.kind).toBe("render");

    const action = await request({
      context: token,
      point: claims.point,
      subject: claims.subject,
      action_id: "door.open",
      values: { minutes: 10 },
    });
    const a = await verifyExtensionRequest({ secret, rawBody: action.raw, headers: new Headers(action.headers), now });
    expect(a).toMatchObject({ kind: "action", actionId: "door.open", values: { minutes: 10 } });
  });

  it("rejects a body whose subject differs from the token", async () => {
    const req = await request({ context: token, point: claims.point, subject: { type: "booking", id: "b2" } });
    expect(await reason(verifyExtensionRequest({ secret, rawBody: req.raw, headers: req.headers, now }))).toBe(
      "context_mismatch",
    );
  });

  it("rejects a tampered body", async () => {
    const req = await request({ context: token, point: claims.point, subject: claims.subject, action_id: "a", values: {} });
    const tampered = req.raw.replace('"a"', '"b"');
    expect(await reason(verifyExtensionRequest({ secret, rawBody: tampered, headers: req.headers, now }))).toBe(
      "request_signature",
    );
  });
});
