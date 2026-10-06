import { TokenRevokedError } from "./errors.js";
import { fetchInstallationToken, refreshTokens, } from "./oauth.js";
/** A management (`ck_mgmt_…`) or personal (`ck_user_…`) API key. */
export function apiKeyAuth(apiKey) {
    return { getAccessToken: async () => apiKey };
}
/** Club installation: exchanges client credentials for `cca_` tokens, cached until shortly before expiry. */
export function installationAuth(options) {
    const margin = (options.refreshMarginSeconds ?? 60) * 1000;
    let cached = null;
    let inflight = null;
    const getToken = async (context = {}) => {
        if (cached && cached.expiresAt - margin > Date.now())
            return cached;
        inflight ??= fetchInstallationToken({
            clientId: options.clientId,
            clientSecret: options.clientSecret,
            installationId: options.installationId,
            baseUrl: options.baseUrl ?? context.baseUrl,
            fetch: options.fetch ?? context.fetch,
        })
            .then((token) => (cached = token))
            .finally(() => {
            inflight = null;
        });
        return inflight;
    };
    return {
        getToken,
        getAccessToken: async (context) => (await getToken(context)).accessToken,
        invalidate(token) {
            if (cached?.accessToken === token)
                cached = null;
            return true;
        },
    };
}
/**
 * Member connection (`ccu_` / `ccr_`). Refreshes shortly before expiry with rotation; concurrent
 * requests share a single refresh so the chain is never reused. `onTokens` runs after every
 * rotation and before the new token is used: persist there, the old refresh token is spent.
 *
 * Errors: `TokenRevokedError` (`invalid_grant`, also after the 180-day chain limit) is final for
 * this strategy. `AppTemporarilyUnavailableError` leaves the tokens untouched; try again later.
 * The lock is per process: refresh one member in one place at a time.
 */
export function userAuth(options) {
    const margin = (options.refreshMarginSeconds ?? 60) * 1000;
    let current = { ...options.tokens };
    let revoked = null;
    let inflight = null;
    const refresh = (context = {}) => {
        if (revoked)
            return Promise.reject(revoked);
        inflight ??= (async () => {
            try {
                const next = await refreshTokens({
                    clientId: options.clientId,
                    clientSecret: options.clientSecret,
                    refreshToken: current.refreshToken,
                    baseUrl: options.baseUrl ?? context.baseUrl,
                    fetch: options.fetch ?? context.fetch,
                });
                current = next;
                await options.onTokens(next);
                return next;
            }
            catch (err) {
                if (err instanceof TokenRevokedError)
                    revoked = err;
                throw err;
            }
        })().finally(() => {
            inflight = null;
        });
        return inflight;
    };
    return {
        getTokens: () => current,
        refresh,
        async getAccessToken(context) {
            if (revoked)
                throw revoked;
            if (current.expiresAt - margin > Date.now())
                return current.accessToken;
            return (await refresh(context)).accessToken;
        },
        invalidate(token) {
            if (revoked)
                return false;
            if (current.accessToken === token)
                current = { ...current, expiresAt: 0 };
            return true;
        },
    };
}
