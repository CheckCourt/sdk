import { type CheckCourtClient } from "./client.js";
import type { components } from "./generated/schema.js";
export type SendNotificationResponse = components["schemas"]["SendNotificationResponse"];
export declare const NOTIFICATION_TITLE_MAX = 80;
export declare const NOTIFICATION_BODY_MAX = 500;
export interface SendNotificationInput {
    /**
     * Who gets it: the CheckCourt user id (club apps with `members:read`), the `psn_…` pseudonym
     * from an extension context, or the pairwise `usr_…` id from `getMe`. A member app may only
     * notify its own member. Anything else answers 404.
     */
    recipient: string;
    /** One line of plain text, 1 to 80 characters. */
    title: string;
    /** Plain text, 1 to 500 characters; line breaks are kept. */
    body: string;
    /** A path inside CheckCourt (`/booking?date=…`) or an https link on an origin your app registered. */
    url?: string;
    /** Your own label for the kind of message, e.g. `reminder`. */
    category?: string;
    /** The same key within 24 hours returns the first notification instead of sending again. */
    idempotencyKey?: string;
}
/**
 * `POST /api/v1/app/notifications`: CheckCourt delivers a message to one member, in CheckCourt and
 * by email if they allow it. Needs `notifications:send`. The answer never says whether the member
 * muted your app.
 */
export declare function sendNotification(client: CheckCourtClient, input: SendNotificationInput): Promise<SendNotificationResponse>;
