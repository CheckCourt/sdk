import { unwrap } from "./client.js";
export const NOTIFICATION_TITLE_MAX = 80;
export const NOTIFICATION_BODY_MAX = 500;
/**
 * `POST /api/v1/app/notifications`: CheckCourt delivers a message to one member, in CheckCourt and
 * by email if they allow it. Needs `notifications:send`. The answer never says whether the member
 * muted your app.
 */
export async function sendNotification(client, input) {
    const { idempotencyKey, ...rest } = input;
    return unwrap(client.POST("/app/notifications", {
        body: { ...rest, ...(idempotencyKey !== undefined ? { idempotency_key: idempotencyKey } : {}) },
    }));
}
