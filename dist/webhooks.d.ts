import type { WebhookEvent } from "./events.js";
export type { AppLifecycleEventData, BookingEventData, CourtLockEventData, EventDataMap, EventObjectType, EventType, MemberEventData, SubscribableEventType, AppLifecycleEventType, WebhookEvent, WebhookEventOf, } from "./events.js";
export { APP_LIFECYCLE_EVENT_TYPES, EVENT_TYPES, SUBSCRIBABLE_EVENT_TYPES } from "./events.js";
export { WebhookSignatureError, type WebhookSignatureFailure } from "./errors.js";
export declare const SIGNATURE_HEADER = "CheckCourt-Signature";
export declare const EVENT_ID_HEADER = "CheckCourt-Event-Id";
export declare const EVENT_TYPE_HEADER = "CheckCourt-Event-Type";
export declare const INSTALLATION_ID_HEADER = "CheckCourt-Installation-Id";
export declare const DEFAULT_TOLERANCE_SECONDS = 300;
export type RawBody = string | Uint8Array | ArrayBuffer;
export interface VerifySignatureOptions {
    /** The whole `whsec_…` string, prefix included. */
    secret: string;
    /** The body exactly as received, before any JSON parsing. */
    rawBody: RawBody;
    /** Value of the `CheckCourt-Signature` header. */
    signatureHeader: string | null | undefined;
    toleranceSeconds?: number;
    /** Override the clock: a `Date` or unix seconds. */
    now?: Date | number;
}
/** Checks `t=<unix>,v1=<hex>` over the raw body, as CheckCourt sends it for webhooks and extension requests. */
export declare function verifySignature(options: VerifySignatureOptions): Promise<void>;
/**
 * Verifies a webhook delivery and returns the parsed event. Throws `WebhookSignatureError`.
 * Answer 2xx quickly and deduplicate on `event.id`: retries carry the same id.
 */
export declare function verifyWebhook<E extends WebhookEvent = WebhookEvent>(options: VerifySignatureOptions): Promise<E>;
/** Builds a valid `CheckCourt-Signature` value, for tests of your own receiver. */
export declare function signWebhookPayload(secret: string, rawBody: RawBody, timestamp?: number): Promise<string>;
/** Narrows an event by type, e.g. `if (isEventType(event, "booking.created")) event.data.booking_id`. */
export declare function isEventType<T extends WebhookEvent["type"]>(event: WebhookEvent, type: T): event is Extract<WebhookEvent, {
    type: T;
}>;
