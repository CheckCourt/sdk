import createClient, {} from "openapi-fetch";
import { CheckCourtApiError } from "./errors.js";
import { normalizeBaseUrl } from "./internal/base-url.js";
export const TENANT_HEADER = "X-Tenant-Id";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export function retryAfterMs(value, now = Date.now()) {
    if (!value)
        return null;
    if (/^\d+$/.test(value.trim()))
        return Number(value.trim()) * 1000;
    const date = Date.parse(value);
    return Number.isNaN(date) ? null : Math.max(0, date - now);
}
// Never awaited: under Next.js' patched fetch the body is a tee branch whose cancel() never settles.
function discard(response) {
    try {
        response.body?.cancel().catch(() => { });
    }
    catch {
        // Already consumed or locked: nothing to free.
    }
}
/**
 * Typed `/api/v1` client (openapi-fetch). Calls return `{ data, error, response }`; wrap them in
 * `unwrap()` to get `data` or a thrown `CheckCourtApiError`. A 401 triggers one retry with a fresh
 * token; 429 is retried with backoff, honouring `Retry-After`.
 */
export function createCheckCourtClient(options) {
    const baseUrl = normalizeBaseUrl(options.baseUrl);
    const doFetch = options.fetch ?? ((request) => fetch(request));
    const retry = options.retry === false ? null : options.retry ?? {};
    const maxRetries = retry?.maxRetries ?? 2;
    const baseDelay = retry?.baseDelayMs ?? 1000;
    const maxDelay = retry?.maxDelayMs ?? 60_000;
    const context = { baseUrl, fetch: doFetch };
    const authedFetch = async (request) => {
        let retries = 0;
        let reauthenticated = false;
        for (;;) {
            const attempt = request.clone();
            const token = await options.auth.getAccessToken(context);
            attempt.headers.set("Authorization", `Bearer ${token}`);
            if (options.tenantId && !attempt.headers.has(TENANT_HEADER))
                attempt.headers.set(TENANT_HEADER, options.tenantId);
            const response = await doFetch(attempt);
            if (response.status === 401 && !reauthenticated && options.auth.invalidate?.(token)) {
                reauthenticated = true;
                discard(response);
                continue;
            }
            if (response.status === 429 && retry && retries < maxRetries) {
                const delay = retryAfterMs(response.headers.get("Retry-After")) ?? baseDelay * 2 ** retries;
                if (delay <= maxDelay) {
                    retries += 1;
                    discard(response);
                    await sleep(delay);
                    continue;
                }
            }
            return response;
        }
    };
    return createClient({ baseUrl: `${baseUrl}/api/v1`, fetch: authedFetch, headers: options.headers });
}
/** Returns `data` of an openapi-fetch call or throws `CheckCourtApiError` with status, code and message. */
export async function unwrap(call) {
    const { data, error, response } = await call;
    if (error !== undefined || !response.ok)
        throw CheckCourtApiError.fromBody(response.status, error, response);
    return data;
}
