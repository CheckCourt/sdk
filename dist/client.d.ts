import { type Client } from "openapi-fetch";
import type { AuthStrategy } from "./auth.js";
import type { FetchLike } from "./oauth.js";
import type { paths } from "./generated/schema.js";
export declare const TENANT_HEADER = "X-Tenant-Id";
export interface RetryOptions {
    /** Retries after a 429. Default 2. */
    maxRetries?: number;
    /** Wait without `Retry-After`: this doubled per attempt. Default 1000. */
    baseDelayMs?: number;
    /** Longer waits are not attempted; the 429 is returned instead. Default 60000. */
    maxDelayMs?: number;
}
export interface CheckCourtClientOptions {
    /** Defaults to https://app.checkcourt.de; a trailing `/api/v1` is accepted. */
    baseUrl?: string;
    auth: AuthStrategy;
    /** Sent as `X-Tenant-Id` unless a request sets its own. Needed for member tokens with several clubs and personal keys. */
    tenantId?: string;
    fetch?: FetchLike;
    /** `false` disables retries on 429. */
    retry?: RetryOptions | false;
    headers?: Record<string, string>;
}
export type CheckCourtClient = Client<paths>;
export declare function retryAfterMs(value: string | null, now?: number): number | null;
/**
 * Typed `/api/v1` client (openapi-fetch). Calls return `{ data, error, response }`; wrap them in
 * `unwrap()` to get `data` or a thrown `CheckCourtApiError`. A 401 triggers one retry with a fresh
 * token; 429 is retried with backoff, honouring `Retry-After`.
 */
export declare function createCheckCourtClient(options: CheckCourtClientOptions): CheckCourtClient;
/** Returns `data` of an openapi-fetch call or throws `CheckCourtApiError` with status, code and message. */
export declare function unwrap<T>(call: Promise<{
    data?: T;
    error?: unknown;
    response: Response;
}>): Promise<T>;
