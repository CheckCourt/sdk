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

  it("types the viewer's app permissions at every point", async () => {
    const token = jwt(
      { alg: "HS256" },
      { ...claims, viewer: { user_id: "psn_1", capabilities: { is_booker: true, permissions: { manage_ladder: true } } } },
    );
    const result = await verifyExtensionContext(token, secret, { now });
    const permissions: Record<string, boolean> | undefined = result.viewer.capabilities.permissions;
    expect(permissions).toEqual({ manage_ladder: true });
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

describe("host surface requests", () => {
  const surfaceClaims = (point: string, subject: object | null, capabilities: object = {}) =>
    jwt({ alg: "HS256" }, { ...claims, point, subject, viewer: { user_id: "psn_1", capabilities } });

  async function verify(token: string, body: object) {
    const raw = JSON.stringify({ context: token, ...body });
    const headers = { "checkcourt-signature": await signWebhookPayload(secret, raw, now), "CheckCourt-Context": token };
    return verifyExtensionRequest({ secret, rawBody: raw, headers, now });
  }

  it("exposes date and courts of a court.annotation render", async () => {
    const token = surfaceClaims("court.annotation", null);
    const courts = [
      { id: 1, name: "Platz 1" },
      { id: 2, name: "Platz 2" },
    ];
    const r = await verify(token, { point: "court.annotation", subject: null, date: "2026-10-07", courts });
    expect(r).toMatchObject({ kind: "render", point: "court.annotation", date: "2026-10-07", courts });
    expect(await reason(verify(token, { point: "court.annotation", subject: null, date: "07.10.2026", courts }))).toBe(
      "invalid_body",
    );
    expect(await reason(verify(token, { point: "court.annotation", subject: null, date: "2026-10-07" }))).toBe(
      "invalid_body",
    );
  });

  it("exposes the members of a member.list.column render", async () => {
    const token = surfaceClaims("member.list.column", null, { can_edit_members: true });
    const members = [{ member_id: "tu_1", user_id: "u_1" }];
    const r = await verify(token, { point: "member.list.column", subject: null, members });
    expect(r).toMatchObject({ kind: "render", members });
    if (r.context.point === "member.list.column") expect(r.context.viewer.capabilities.can_edit_members).toBe(true);
    expect(await reason(verify(token, { point: "member.list.column", subject: null, members: [{ member_id: 1 }] }))).toBe(
      "invalid_body",
    );
  });

  it("exposes the draft of a booking.hint render", async () => {
    const token = surfaceClaims("booking.hint", null);
    const draft = { court_id: 3, date: "2026-10-07", start_time: "18:00", end_time: "19:00", type: "regular" };
    const r = await verify(token, { point: "booking.hint", subject: null, draft });
    expect(r).toMatchObject({ kind: "render", draft });
    expect(await reason(verify(token, { point: "booking.hint", subject: null, draft: { ...draft, start_time: 18 } }))).toBe(
      "invalid_body",
    );
  });

  it("verifies booking_plan.action renders and actions with the day, courts and subject", async () => {
    const subject = { type: "booking_plan", id: "2026-10-07" };
    const date = "2026-10-07";
    const courts = [
      { id: 1, name: "Platz 1" },
      { id: 2, name: "Platz 2" },
    ];
    const token = surfaceClaims("booking_plan.action", subject, { can_edit_bookings: false });
    const render = await verify(token, { point: "booking_plan.action", subject, date, courts });
    expect(render).toMatchObject({ kind: "render", point: "booking_plan.action", subject, date, courts });
    if (render.context.point === "booking_plan.action") expect(render.context.subject.id).toBe("2026-10-07");
    const action = await verify(token, { point: "booking_plan.action", subject, date, courts, action_id: "close", values: {} });
    expect(action).toMatchObject({ kind: "action", actionId: "close", subject, date, courts });
    expect(await reason(verify(token, { point: "booking_plan.action", subject, courts }))).toBe("invalid_body");
    expect(
      await reason(verify(token, { point: "booking_plan.action", subject: { ...subject, id: "2026-10-08" }, date, courts })),
    ).toBe("context_mismatch");
  });

  it("verifies nav.page renders and actions without a subject", async () => {
    const token = surfaceClaims("nav.page", null);
    const render = await verify(token, { point: "nav.page", subject: null });
    expect(render).toEqual({ kind: "render", context: expect.anything(), point: "nav.page", subject: null });
    const action = await verify(token, { point: "nav.page", subject: null, action_id: "save", values: { note: "x" } });
    expect(action).toMatchObject({ kind: "action", point: "nav.page", actionId: "save", values: { note: "x" } });
    expect(await reason(verify(token, { point: "nav.page", subject: { type: "booking", id: "b_1" } }))).toBe(
      "context_mismatch",
    );
  });

  it("adds no surface fields to other points", async () => {
    const token = surfaceClaims("sidebar.action", null);
    const r = await verify(token, { point: "sidebar.action", subject: null, date: "2026-10-07" });
    expect(r).toEqual({ kind: "render", context: expect.anything(), point: "sidebar.action", subject: null });
  });
});
