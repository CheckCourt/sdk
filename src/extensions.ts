import { ExtensionVerificationError, WebhookSignatureError } from "./errors.js";
import { base64UrlDecode, decodeUtf8, toBytes, utf8 } from "./internal/encoding.js";
import { hmacSha256Verify } from "./internal/hmac.js";
import type { ExtensionPoint } from "./manifest.js";
import type { UiFormValues } from "./ui.js";
import { SIGNATURE_HEADER, verifySignature, type RawBody } from "./webhooks.js";

export * from "./ui.js";
export { ExtensionVerificationError, type ExtensionVerificationFailure } from "./errors.js";
export { EXTENSION_POINTS, type ExtensionKind, type ExtensionPoint } from "./manifest.js";

export const CONTEXT_HEADER = "CheckCourt-Context";
export const CONTEXT_ISSUER = "checkcourt";
export const CONTEXT_TTL_SECONDS = 300;
export const CLOCK_LEEWAY_SECONDS = 30;
/** `action_id` a `booking.action` button sends when it is clicked. */
export const BOOKING_ACTION_INVOKE = "invoke";
const MAX_TOKEN_LENGTH = 8192;

export type ExtensionSubjectType = "booking" | "member" | "installation";

export interface ExtensionSubject {
  type: ExtensionSubjectType;
  id: string;
}

export interface BookingCapabilities {
  is_booker: boolean;
  can_edit_bookings: boolean;
  can_cancel_foreign_bookings: boolean;
  can_see_booking_details: boolean;
}
export interface MemberCapabilities {
  is_self: boolean;
  can_see_member_details: boolean;
  can_edit_members: boolean;
}
export interface DashboardCapabilities {
  can_book: boolean;
  can_manage_club: boolean;
}
export interface AppSettingsCapabilities {
  can_manage_app: boolean;
}

export interface PointCapabilities {
  "app.settings": AppSettingsCapabilities;
  "booking.detail.panel": BookingCapabilities;
  "booking.action": BookingCapabilities;
  "member.profile.section": MemberCapabilities;
  "dashboard.widget": DashboardCapabilities;
  "kiosk.tile": Record<string, never>;
}

export interface PointSubject {
  "app.settings": { type: "installation"; id: string };
  "booking.detail.panel": { type: "booking"; id: string };
  "booking.action": { type: "booking"; id: string };
  "member.profile.section": { type: "member"; id: string };
  "dashboard.widget": null;
  "kiosk.tile": null;
}

interface ContextClaimsOf<P extends ExtensionPoint> {
  iss: typeof CONTEXT_ISSUER;
  installation_id: string;
  /** "user": a member's own connection; `viewer.user_id` is then always that member. */
  installation_kind: "tenant" | "user";
  app_id: string;
  tenant_id: string;
  point: P;
  subject: PointSubject[P];
  viewer: {
    /** null on the kiosk; a stable `psn_…` pseudonym unless the installation holds `members:read`. */
    user_id: string | null;
    capabilities: PointCapabilities[P];
  };
  iat: number;
  exp: number;
  nonce: string;
}

/** Claims of a verified context token, narrowed by `point`. */
export type ExtensionContextClaims = { [P in ExtensionPoint]: ContextClaimsOf<P> }[ExtensionPoint];

function unixSeconds(now: Date | number | undefined): number {
  if (now === undefined) return Math.floor(Date.now() / 1000);
  return now instanceof Date ? Math.floor(now.getTime() / 1000) : Math.floor(now);
}

function decodeJson(part: string): unknown {
  const bytes = base64UrlDecode(part);
  if (!bytes) return null;
  try {
    return JSON.parse(decodeUtf8(bytes));
  } catch {
    return null;
  }
}

const fail = (reason: ConstructorParameters<typeof ExtensionVerificationError>[0], message: string) =>
  new ExtensionVerificationError(reason, message);

/**
 * Verifies the context token (HS256 JWT keyed with the whole `whsec_…` secret): signature,
 * `iss`, `iat` and `exp` with 30 s clock leeway, exactly as CheckCourt does. Throws
 * `ExtensionVerificationError`. Then compare `installation_id` and `tenant_id` with what you
 * stored from `app.installed`.
 */
export async function verifyExtensionContext(
  token: string,
  secret: string,
  options: { now?: Date | number } = {},
): Promise<ExtensionContextClaims> {
  if (typeof token !== "string" || token.length > MAX_TOKEN_LENGTH) throw fail("malformed_token", "Token is not a string or too long");
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((p) => !/^[A-Za-z0-9_-]+$/.test(p))) {
    throw fail("malformed_token", "Token is not a compact JWT");
  }
  const [headerPart, payloadPart, signaturePart] = parts as [string, string, string];

  const header = decodeJson(headerPart) as { alg?: unknown } | null;
  if (!header || header.alg !== "HS256") throw fail("unsupported_algorithm", "Only HS256 is accepted");

  const signature = base64UrlDecode(signaturePart);
  if (!signature || !(await hmacSha256Verify(secret, utf8(`${headerPart}.${payloadPart}`), signature))) {
    throw fail("invalid_signature", "Token signature does not match");
  }

  const claims = decodeJson(payloadPart) as ExtensionContextClaims | null;
  if (!claims || typeof claims !== "object") throw fail("invalid_claims", "Token payload is not an object");
  if (claims.iss !== CONTEXT_ISSUER) throw fail("invalid_claims", "Token issuer is not checkcourt");
  if (typeof claims.iat !== "number" || typeof claims.exp !== "number") {
    throw fail("invalid_claims", "Token has no iat or exp");
  }
  const now = unixSeconds(options.now);
  if (claims.iat > now + CLOCK_LEEWAY_SECONDS) throw fail("not_yet_valid", "Token was issued in the future");
  if (claims.exp < now - CLOCK_LEEWAY_SECONDS) throw fail("expired", "Token has expired");
  return claims;
}

/** Body of a declarative render request. */
export interface ExtensionRenderRequest {
  kind: "render";
  context: ExtensionContextClaims;
  point: ExtensionPoint;
  subject: ExtensionSubject | null;
}

/** Body of a button click or form submission. `values` is `{}` for buttons. */
export interface ExtensionActionRequest {
  kind: "action";
  context: ExtensionContextClaims;
  point: ExtensionPoint;
  subject: ExtensionSubject | null;
  actionId: string;
  values: UiFormValues;
}

export type ExtensionRequest = ExtensionRenderRequest | ExtensionActionRequest;

type HeaderSource = Headers | Record<string, string | string[] | undefined>;

function header(headers: HeaderSource, name: string): string | undefined {
  if (typeof (headers as Headers).get === "function") return (headers as Headers).get(name) ?? undefined;
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers as Record<string, string | string[] | undefined>)) {
    if (key.toLowerCase() === lower) return Array.isArray(value) ? value[0] : value;
  }
  return undefined;
}

function sameSubject(a: ExtensionSubject | null, b: ExtensionSubject | null): boolean {
  if (a === null || b === null) return a === b;
  return a.type === b.type && a.id === b.id;
}

/**
 * Verifies a declarative extension POST: the `CheckCourt-Signature` over the raw body (it binds
 * `action_id` and `values` to the token), the context token, and that body, header token and
 * claims agree. Throws `ExtensionVerificationError`.
 */
export async function verifyExtensionRequest(options: {
  secret: string;
  rawBody: RawBody;
  headers: HeaderSource;
  toleranceSeconds?: number;
  now?: Date | number;
}): Promise<ExtensionRequest> {
  try {
    await verifySignature({
      secret: options.secret,
      rawBody: options.rawBody,
      signatureHeader: header(options.headers, SIGNATURE_HEADER),
      toleranceSeconds: options.toleranceSeconds,
      now: options.now,
    });
  } catch (err) {
    if (err instanceof WebhookSignatureError) throw fail("request_signature", err.message);
    throw err;
  }

  let body: Record<string, unknown>;
  try {
    const raw = options.rawBody;
    body = JSON.parse(typeof raw === "string" ? raw : decodeUtf8(toBytes(raw))) as Record<string, unknown>;
  } catch {
    throw fail("invalid_body", "Body is not valid JSON");
  }
  if (!body || typeof body !== "object" || typeof body.context !== "string") {
    throw fail("invalid_body", "Body has no context");
  }
  const headerToken = header(options.headers, CONTEXT_HEADER);
  if (headerToken !== undefined && headerToken !== body.context) {
    throw fail("context_mismatch", `${CONTEXT_HEADER} differs from the body's context`);
  }

  const context = await verifyExtensionContext(body.context, options.secret, { now: options.now });
  const subject = (body.subject ?? null) as ExtensionSubject | null;
  if (body.point !== context.point || !sameSubject(subject, context.subject)) {
    throw fail("context_mismatch", "point or subject differ from the context token");
  }

  if (body.action_id === undefined) return { kind: "render", context, point: context.point, subject };
  if (typeof body.action_id !== "string") throw fail("invalid_body", "action_id is not a string");
  const values = body.values ?? {};
  if (typeof values !== "object" || Array.isArray(values)) throw fail("invalid_body", "values is not an object");
  return {
    kind: "action",
    context,
    point: context.point,
    subject,
    actionId: body.action_id,
    values: values as UiFormValues,
  };
}
