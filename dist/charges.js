import { unwrap } from "./client.js";
export const CHARGE_TITLE_MAX = 80;
export const CHARGE_AMOUNT_MAX_CENTS = 50_000;
/**
 * `POST /api/v1/app/charges`: puts a fee on a member's fee account. The club settles it like any
 * other fee; you learn about it through `charge.paid` (list it under `events`). Needs
 * `charges:write` and `members:read`, club installations only.
 */
export async function createCharge(client, input) {
    return (await unwrap(client.POST("/app/charges", { body: input }))).charge;
}
/** `GET /api/v1/app/charges/{id}`: a fee your installation created. */
export async function getCharge(client, id) {
    return (await unwrap(client.GET("/app/charges/{id}", { params: { path: { id } } }))).charge;
}
/** `DELETE /api/v1/app/charges/{id}`: cancels an open fee your installation created. A paid fee answers 422. */
export async function cancelCharge(client, id) {
    return (await unwrap(client.DELETE("/app/charges/{id}", { params: { path: { id } } }))).charge;
}
