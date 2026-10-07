import { ExtensionVerificationError, WebhookSignatureError } from "./errors.js";
import { base64UrlDecode, decodeUtf8, toBytes, utf8 } from "./internal/encoding.js";
import { hmacSha256Verify } from "./internal/hmac.js";
import { SIGNATURE_HEADER, verifySignature } from "./webhooks.js";
export * from "./ui.js";
export { ExtensionVerificationError } from "./errors.js";
export { EXTENSION_POINTS, STATIC_ACTION_POINTS, } from "./manifest.js";
export const CONTEXT_HEADER = "CheckCourt-Context";
export const CONTEXT_ISSUER = "checkcourt";
export const CONTEXT_TTL_SECONDS = 300;
export const CLOCK_LEEWAY_SECONDS = 30;
/** `action_id` a `booking.action` button sends when it is clicked. */
export const BOOKING_ACTION_INVOKE = "invoke";
const MAX_TOKEN_LENGTH = 8192;
function unixSeconds(now) {
    if (now === undefined)
        return Math.floor(Date.now() / 1000);
    return now instanceof Date ? Math.floor(now.getTime() / 1000) : Math.floor(now);
}
function decodeJson(part) {
    const bytes = base64UrlDecode(part);
    if (!bytes)
        return null;
    try {
        return JSON.parse(decodeUtf8(bytes));
    }
    catch {
        return null;
    }
}
const fail = (reason, message) => new ExtensionVerificationError(reason, message);
/**
 * Verifies the context token (HS256 JWT keyed with the whole `whsec_…` secret): signature,
 * `iss`, `iat` and `exp` with 30 s clock leeway, exactly as CheckCourt does. Throws
 * `ExtensionVerificationError`. Then compare `installation_id` and `tenant_id` with what you
 * stored from `app.installed`.
 */
export async function verifyExtensionContext(token, secret, options = {}) {
    if (typeof token !== "string" || token.length > MAX_TOKEN_LENGTH)
        throw fail("malformed_token", "Token is not a string or too long");
    const parts = token.split(".");
    if (parts.length !== 3 || parts.some((p) => !/^[A-Za-z0-9_-]+$/.test(p))) {
        throw fail("malformed_token", "Token is not a compact JWT");
    }
    const [headerPart, payloadPart, signaturePart] = parts;
    const header = decodeJson(headerPart);
    if (!header || header.alg !== "HS256")
        throw fail("unsupported_algorithm", "Only HS256 is accepted");
    const signature = base64UrlDecode(signaturePart);
    if (!signature || !(await hmacSha256Verify(secret, utf8(`${headerPart}.${payloadPart}`), signature))) {
        throw fail("invalid_signature", "Token signature does not match");
    }
    const claims = decodeJson(payloadPart);
    if (!claims || typeof claims !== "object")
        throw fail("invalid_claims", "Token payload is not an object");
    if (claims.iss !== CONTEXT_ISSUER)
        throw fail("invalid_claims", "Token issuer is not checkcourt");
    if (typeof claims.iat !== "number" || typeof claims.exp !== "number") {
        throw fail("invalid_claims", "Token has no iat or exp");
    }
    const now = unixSeconds(options.now);
    if (claims.iat > now + CLOCK_LEEWAY_SECONDS)
        throw fail("not_yet_valid", "Token was issued in the future");
    if (claims.exp < now - CLOCK_LEEWAY_SECONDS)
        throw fail("expired", "Token has expired");
    return claims;
}
export const BOOKING_DRAFT_TYPES = ["regular", "training", "mannschaft"];
function header(headers, name) {
    if (typeof headers.get === "function")
        return headers.get(name) ?? undefined;
    const lower = name.toLowerCase();
    for (const [key, value] of Object.entries(headers)) {
        if (key.toLowerCase() === lower)
            return Array.isArray(value) ? value[0] : value;
    }
    return undefined;
}
function sameSubject(a, b) {
    if (a === null || b === null)
        return a === b;
    return a.type === b.type && a.id === b.id;
}
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;
const isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
/** Parses the `date` and `courts` a court.annotation or booking_plan.action request carries. */
function planCourts(body) {
    const { date, courts } = body;
    if (typeof date !== "string" || !DATE.test(date))
        throw fail("invalid_body", "date is not YYYY-MM-DD");
    if (!Array.isArray(courts) || !courts.every((c) => isObject(c) && typeof c.id === "number" && typeof c.name === "string")) {
        throw fail("invalid_body", "courts is not a list of { id, name }");
    }
    return { date, courts: courts.map((c) => ({ id: c.id, name: c.name })) };
}
function surfaceFields(point, body) {
    switch (point) {
        case "court.annotation":
        case "booking_plan.action":
            return planCourts(body);
        case "member.list.column": {
            const { members } = body;
            if (!Array.isArray(members) ||
                !members.every((m) => isObject(m) && typeof m.member_id === "string" && typeof m.user_id === "string")) {
                throw fail("invalid_body", "members is not a list of { member_id, user_id }");
            }
            return { members: members.map((m) => ({ member_id: m.member_id, user_id: m.user_id })) };
        }
        case "booking.hint": {
            const d = body.draft;
            if (!isObject(d) ||
                typeof d.court_id !== "number" ||
                typeof d.date !== "string" ||
                !DATE.test(d.date) ||
                typeof d.start_time !== "string" ||
                !TIME.test(d.start_time) ||
                typeof d.end_time !== "string" ||
                !TIME.test(d.end_time) ||
                typeof d.type !== "string") {
                throw fail("invalid_body", "draft is not a booking draft");
            }
            return {
                draft: {
                    court_id: d.court_id,
                    date: d.date,
                    start_time: d.start_time,
                    end_time: d.end_time,
                    type: d.type,
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
export async function verifyExtensionRequest(options) {
    try {
        await verifySignature({
            secret: options.secret,
            rawBody: options.rawBody,
            signatureHeader: header(options.headers, SIGNATURE_HEADER),
            toleranceSeconds: options.toleranceSeconds,
            now: options.now,
        });
    }
    catch (err) {
        if (err instanceof WebhookSignatureError)
            throw fail("request_signature", err.message);
        throw err;
    }
    let body;
    try {
        const raw = options.rawBody;
        body = JSON.parse(typeof raw === "string" ? raw : decodeUtf8(toBytes(raw)));
    }
    catch {
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
    const subject = (body.subject ?? null);
    if (body.point !== context.point || !sameSubject(subject, context.subject)) {
        throw fail("context_mismatch", "point or subject differ from the context token");
    }
    if (body.action_id === undefined)
        return { kind: "render", context, point: context.point, subject, ...surfaceFields(context.point, body) };
    if (typeof body.action_id !== "string")
        throw fail("invalid_body", "action_id is not a string");
    const values = body.values ?? {};
    if (typeof values !== "object" || Array.isArray(values))
        throw fail("invalid_body", "values is not an object");
    return {
        kind: "action",
        context,
        point: context.point,
        subject,
        actionId: body.action_id,
        values: values,
        ...(context.point === "booking_plan.action" ? planCourts(body) : {}),
    };
}
