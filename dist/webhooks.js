import { WebhookSignatureError } from "./errors.js";
import { decodeUtf8, hexDecode, hexEncode, toBytes, utf8 } from "./internal/encoding.js";
import { hmacSha256, hmacSha256Verify } from "./internal/hmac.js";
export { APP_LIFECYCLE_EVENT_TYPES, EVENT_TYPES, METADATA_CHANGED_EVENT_TYPE, SUBSCRIBABLE_EVENT_TYPES, appEventType, isAppEvent, isMetadataChangedEvent, } from "./events.js";
export { WebhookSignatureError } from "./errors.js";
export const SIGNATURE_HEADER = "CheckCourt-Signature";
export const EVENT_ID_HEADER = "CheckCourt-Event-Id";
export const EVENT_TYPE_HEADER = "CheckCourt-Event-Type";
export const INSTALLATION_ID_HEADER = "CheckCourt-Installation-Id";
export const DEFAULT_TOLERANCE_SECONDS = 300;
function unixSeconds(now) {
    if (now === undefined)
        return Math.floor(Date.now() / 1000);
    return now instanceof Date ? Math.floor(now.getTime() / 1000) : Math.floor(now);
}
function signedBytes(timestamp, body) {
    const prefix = utf8(`${timestamp}.`);
    const out = new Uint8Array(prefix.length + body.length);
    out.set(prefix);
    out.set(body, prefix.length);
    return out;
}
/** Checks `t=<unix>,v1=<hex>` over the raw body, as CheckCourt sends it for webhooks and extension requests. */
export async function verifySignature(options) {
    const { secret, signatureHeader } = options;
    if (!signatureHeader)
        throw new WebhookSignatureError("missing_header", `${SIGNATURE_HEADER} header missing`);
    let timestamp = null;
    const signatures = [];
    for (const part of signatureHeader.split(",")) {
        const [key, value] = part.trim().split("=", 2);
        if (key === "t" && value && /^\d+$/.test(value))
            timestamp = Number(value);
        if (key === "v1" && value) {
            const bytes = hexDecode(value);
            if (bytes && bytes.length === 32)
                signatures.push(bytes);
        }
    }
    if (timestamp === null || signatures.length === 0) {
        throw new WebhookSignatureError("malformed_header", `${SIGNATURE_HEADER} header has no t= or v1= part`);
    }
    const tolerance = options.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
    if (Math.abs(unixSeconds(options.now) - timestamp) > tolerance) {
        throw new WebhookSignatureError("timestamp_out_of_tolerance", "Signature timestamp is outside the tolerance");
    }
    const data = signedBytes(timestamp, toBytes(options.rawBody));
    for (const signature of signatures) {
        if (await hmacSha256Verify(secret, data, signature))
            return;
    }
    throw new WebhookSignatureError("signature_mismatch", "Signature does not match the body");
}
/**
 * Verifies a webhook delivery and returns the parsed event. Throws `WebhookSignatureError`.
 * Answer 2xx quickly and deduplicate on `event.id`: retries carry the same id.
 */
export async function verifyWebhook(options) {
    await verifySignature(options);
    let parsed;
    try {
        const raw = options.rawBody;
        parsed = JSON.parse(typeof raw === "string" ? raw : decodeUtf8(toBytes(raw)));
    }
    catch {
        throw new WebhookSignatureError("invalid_payload", "Body is not valid JSON");
    }
    const event = parsed;
    if (!event || typeof event !== "object" || typeof event.id !== "string" || typeof event.type !== "string") {
        throw new WebhookSignatureError("invalid_payload", "Body is not a CheckCourt event");
    }
    return parsed;
}
/** Builds a valid `CheckCourt-Signature` value, for tests of your own receiver. */
export async function signWebhookPayload(secret, rawBody, timestamp = Math.floor(Date.now() / 1000)) {
    const mac = await hmacSha256(secret, signedBytes(timestamp, toBytes(rawBody)));
    return `t=${timestamp},v1=${hexEncode(mac)}`;
}
/** Narrows an event by type, e.g. `if (isEventType(event, "booking.created")) event.data.booking_id`. */
export function isEventType(event, type) {
    return event.type === type;
}
