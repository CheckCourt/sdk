import { ExtensionVerificationError, WebhookSignatureError } from "./errors.js";
import { base64UrlDecode, decodeUtf8, toBytes, utf8 } from "./internal/encoding.js";
import { hmacSha256Verify } from "./internal/hmac.js";
import type { ExtensionPoint } from "./manifest.js";
import type { UiFormValues } from "./ui.js";
import { SIGNATURE_HEADER, verifySignature, type RawBody } from "./webhooks.js";

export * from "./ui.js";
export { ExtensionVerificationError, type ExtensionVerificationFailure } from "./errors.js";
export {
  EXTENSION_POINTS,
  STATIC_ACTION_POINTS,
  type ExtensionKind,
  type ExtensionPoint,
  type StaticActionPoint,
} from "./manifest.js";

export const CONTEXT_HEADER = "CheckCourt-Context";
export const CONTEXT_ISSUER = "checkcourt";
export const CONTEXT_TTL_SECONDS = 300;
export const CLOCK_LEEWAY_SECONDS = 30;
/** `action_id` a `booking.action` button sends when it is clicked. */
export const BOOKING_ACTION_INVOKE = "invoke";
const MAX_TOKEN_LENGTH = 8192;

/** "booking_plan": the plan of one day; its id is the date (YYYY-MM-DD). */
export type ExtensionSubjectType = "booking" | "member" | "installation" | "booking_plan";

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
export interface MemberListCapabilities {
  can_edit_members: boolean;
}
export interface BookingPlanCapabilities {
  can_edit_bookings: boolean;
}

export interface PointCapabilities {
  "app.settings": AppSettingsCapabilities;
  "booking.detail.panel": BookingCapabilities;
  "booking.action": BookingCapabilities;
  "member.profile.section": MemberCapabilities;
  "dashboard.widget": DashboardCapabilities;
  "kiosk.tile": Record<string, never>;
  "court.annotation": Record<string, never>;
  "member.list.column": MemberListCapabilities;
  "member.settings.section": Record<string, never>;
  "booking.hint": Record<string, never>;
  "booking_plan.action": BookingPlanCapabilities;
  "sidebar.action": Record<string, never>;
  "nav.page": Record<string, never>;
}

/**
 * Present at every point when the app's manifest declares `permissions`: each declared key with
 * whether the viewer holds it (through a club role; administrators hold all). Absent otherwise.
 * `false` at the kiosk, where nobody is signed in.
 */
export interface AppPermissionCapabilities {
  permissions?: Record<string, boolean>;
}

export interface PointSubject {
  "app.settings": { type: "installation"; id: string };
  "booking.detail.panel": { type: "booking"; id: string };
  "booking.action": { type: "booking"; id: string };
  "member.profile.section": { type: "member"; id: string };
  "dashboard.widget": null;
  "kiosk.tile": null;
  "court.annotation": null;
  "member.list.column": null;
  "member.settings.section": null;
  "booking.hint": null;
  /** `id` is the plan's day, YYYY-MM-DD. */
  "booking_plan.action": { type: "booking_plan"; id: string };
  "sidebar.action": null;
  "nav.page": null;
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
    capabilities: PointCapabilities[P] & AppPermissionCapabilities;
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

/** A court of the plan a `court.annotation` or `booking_plan.action` request covers. */
export interface AnnotationCourt {
  id: number;
  name: string;
}

/** A member on the visible page of the member list. */
export interface ColumnMember {
  /** The club membership id, as `member_id` in `member.*` events; key your column values by it. */
  member_id: string;
  user_id: string;
}

export const BOOKING_DRAFT_TYPES = ["regular", "training", "mannschaft"] as const;
export type BookingDraftType = (typeof BOOKING_DRAFT_TYPES)[number];

/** The booking a member is about to confirm, sent with `booking.hint`. */
export interface BookingDraft {
  court_id: number;
  /** YYYY-MM-DD. */
  date: string;
  /** HH:MM. */
  start_time: string;
  /** HH:MM. */
  end_time: string;
  type: BookingDraftType;
}

/** Body of a declarative render request. */
export interface ExtensionRenderRequest {
  kind: "render";
  context: ExtensionContextClaims;
  point: ExtensionPoint;
  subject: ExtensionSubject | null;
  /** `court.annotation` and `booking_plan.action`: the plan's day, YYYY-MM-DD. */
  date?: string;
  /** `court.annotation` (one document for all) and `booking_plan.action`: every court of the plan. */
  courts?: AnnotationCourt[];
  /** `member.list.column`: the members on the visible page. */
  members?: ColumnMember[];
  /** `booking.hint`: the booking being drafted. */
  draft?: BookingDraft;
}

/** Body of a button click or form submission. `values` is `{}` for buttons. */
export interface ExtensionActionRequest {
  kind: "action";
  context: ExtensionContextClaims;
  point: ExtensionPoint;
  subject: ExtensionSubject | null;
  actionId: string;
  values: UiFormValues;
  /** `booking_plan.action`: the plan's day, YYYY-MM-DD. */
  date?: string;
  /** `booking_plan.action`: every court of the plan, so a form can offer a court select. */
  courts?: AnnotationCourt[];
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

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Parses the `date` and `courts` a court.annotation or booking_plan.action request carries. */
function planCourts(body: Record<string, unknown>): { date: string; courts: AnnotationCourt[] } {
  const { date, courts } = body;
  if (typeof date !== "string" || !DATE.test(date)) throw fail("invalid_body", "date is not YYYY-MM-DD");
  if (!Array.isArray(courts) || !courts.every((c) => isObject(c) && typeof c.id === "number" && typeof c.name === "string")) {
    throw fail("invalid_body", "courts is not a list of { id, name }");
  }
  return { date, courts: courts.map((c: AnnotationCourt) => ({ id: c.id, name: c.name })) };
}

function surfaceFields(point: ExtensionPoint, body: Record<string, unknown>): Partial<ExtensionRenderRequest> {
  switch (point) {
    case "court.annotation":
    case "booking_plan.action":
      return planCourts(body);
    case "member.list.column": {
      const { members } = body;
      if (
        !Array.isArray(members) ||
        !members.every((m) => isObject(m) && typeof m.member_id === "string" && typeof m.user_id === "string")
      ) {
        throw fail("invalid_body", "members is not a list of { member_id, user_id }");
      }
      return { members: members.map((m: ColumnMember) => ({ member_id: m.member_id, user_id: m.user_id })) };
    }
    case "booking.hint": {
      const d = body.draft;
      if (
        !isObject(d) ||
        typeof d.court_id !== "number" ||
        typeof d.date !== "string" ||
        !DATE.test(d.date) ||
        typeof d.start_time !== "string" ||
        !TIME.test(d.start_time) ||
        typeof d.end_time !== "string" ||
        !TIME.test(d.end_time) ||
        typeof d.type !== "string"
      ) {
        throw fail("invalid_body", "draft is not a booking draft");
      }
      return {
        draft: {
          court_id: d.court_id,
          date: d.date,
          start_time: d.start_time,
          end_time: d.end_time,
          type: d.type as BookingDraftType,
        },
      };
    }
    default:
      return {};
  }
}

/**
 * Verifies a declarative extension POST: the `CheckCourt-Signature` over the raw body (it binds
 * `action_id` and `values` to the token), the context token, and that body, header token and
 * claims agree. Renders at `court.annotation`, `member.list.column` and `booking.hint` also
 * carry `date` and `courts`, `members` or `draft`; `booking_plan.action` renders and actions
 * carry the plan's `date` and `courts`. Throws `ExtensionVerificationError`.
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

  if (body.action_id === undefined) return { kind: "render", context, point: context.point, subject, ...surfaceFields(context.point, body) };
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
    ...(context.point === "booking_plan.action" ? planCourts(body) : {}),
  };
}
