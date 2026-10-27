import { unwrap, type CheckCourtClient } from "./client.js";
import type { components } from "./generated/schema.js";

export const CHARGE_TITLE_MAX = 80;
export const CHARGE_AMOUNT_MAX_CENTS = 50_000;

export interface CreateChargeInput {
  /** CheckCourt user id of the member (club apps with `members:read`). */
  recipient: string;
  /** Euro cents, 1 to 50,000. */
  amountCents: number;
  /** Shown to the member and the club, 1 to 80 characters, e.g. "Startgeld Clubmeisterschaften". */
  title: string;
  /** Your own id for the fee (up to 200 characters); comes back in `charge.*` events. */
  reference?: string;
  /** The same key returns the fee created first instead of a second one. */
  idempotencyKey?: string;
}

export type AppCharge = components["schemas"]["AppCharge"];

/**
 * `POST /api/v1/app/charges`: puts a fee on a member's fee account. The club settles it like any
 * other fee; you learn about it through `charge.paid` (list it under `events`). Needs
 * `charges:write` and `members:read`, club installations only.
 */
export async function createCharge(client: CheckCourtClient, input: CreateChargeInput): Promise<AppCharge> {
  return (await unwrap(client.POST("/app/charges", { body: input }))).charge;
}

/** `GET /api/v1/app/charges/{id}`: a fee your installation created. */
export async function getCharge(client: CheckCourtClient, id: string): Promise<AppCharge> {
  return (await unwrap(client.GET("/app/charges/{id}", { params: { path: { id } } }))).charge;
}

/** `DELETE /api/v1/app/charges/{id}`: cancels an open fee your installation created. A paid fee answers 422. */
export async function cancelCharge(client: CheckCourtClient, id: string): Promise<AppCharge> {
  return (await unwrap(client.DELETE("/app/charges/{id}", { params: { path: { id } } }))).charge;
}
