import { CheckCourtError, OAuthError, oauthErrorFrom } from "./errors.js";
import { base64UrlEncode, randomBytes, utf8 } from "./internal/encoding.js";
import { sha256 } from "./internal/hmac.js";
import { normalizeBaseUrl } from "./internal/base-url.js";
export { AppTemporarilyUnavailableError, OAuthError, TokenRevokedError, } from "./errors.js";
export const AUTHORIZE_PATH = "/api/oauth/authorize";
export const TOKEN_PATH = "/api/oauth/token";
export const REVOKE_PATH = "/api/oauth/revoke";
export const INSTALLATION_TOKEN_PATH = "/api/oauth/installation-token";
/** 32 random bytes as verifier (43 characters) and its S256 challenge. */
export async function createPkcePair() {
    const verifier = base64UrlEncode(randomBytes(32));
    return { verifier, challenge: await pkceChallenge(verifier), method: "S256" };
}
export async function pkceChallenge(verifier) {
    if (!/^[A-Za-z0-9\-._~]{43,128}$/.test(verifier)) {
        throw new CheckCourtError("code_verifier must be 43 to 128 characters from A-Z a-z 0-9 - . _ ~");
    }
    return base64UrlEncode(await sha256(utf8(verifier)));
}
/** A random `state` value for the authorize redirect. */
export function createState() {
    return base64UrlEncode(randomBytes(16));
}
export function buildAuthorizeUrl(options) {
    const url = new URL(AUTHORIZE_PATH, normalizeBaseUrl(options.baseUrl) + "/");
    const params = {
        response_type: "code",
        client_id: options.clientId,
        redirect_uri: options.redirectUri,
        code_challenge: options.codeChallenge,
        code_challenge_method: "S256",
        state: options.state,
        prompt: options.prompt,
        tenant: options.tenant,
    };
    for (const [key, value] of Object.entries(params))
        if (value !== undefined)
            url.searchParams.set(key, value);
    return url.toString();
}
/**
 * Reads `code` from the redirect back to your app after checking `state`.
 * Throws `OAuthError` (e.g. `access_denied`) when CheckCourt sent an error instead.
 */
export function parseAuthorizeCallback(callbackUrl, expectedState) {
    const params = new URL(callbackUrl).searchParams;
    if (params.get("state") !== expectedState) {
        throw new OAuthError(400, "state_mismatch", "state does not match the value sent to authorize");
    }
    const error = params.get("error");
    if (error)
        throw new OAuthError(400, error, params.get("error_description") ?? error);
    const code = params.get("code");
    if (!code)
        throw new OAuthError(400, "invalid_request", "Callback has neither code nor error");
    return { code };
}
function basicAuth(clientId, clientSecret) {
    const raw = `${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`;
    return `Basic ${btoa(String.fromCharCode(...utf8(raw)))}`;
}
/** POSTs a form to an OAuth endpoint and returns the parsed JSON, or throws the mapped `OAuthError`. */
export async function postOAuthForm(credentials, path, form) {
    const doFetch = credentials.fetch ?? ((req) => fetch(req));
    const request = new Request(normalizeBaseUrl(credentials.baseUrl) + path, {
        method: "POST",
        headers: {
            Authorization: basicAuth(credentials.clientId, credentials.clientSecret),
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
        },
        body: new URLSearchParams(form).toString(),
    });
    const response = await doFetch(request);
    const text = await response.text();
    let body = null;
    if (text) {
        try {
            body = JSON.parse(text);
        }
        catch {
            body = null;
        }
    }
    if (!response.ok)
        throw oauthErrorFrom(response.status, body);
    return { body, response };
}
function toUserTokenSet(raw, now) {
    return {
        accessToken: raw.access_token,
        refreshToken: raw.refresh_token,
        expiresAt: now + raw.expires_in * 1000,
        scope: raw.scope ? raw.scope.split(" ").filter(Boolean) : [],
        installations: (raw.installations ?? []).map((i) => ({
            installationId: i.installation_id,
            tenantId: i.tenant_id,
        })),
    };
}
/** Swaps the one-time code (valid 60 s) for member tokens. */
export async function exchangeCode(options) {
    const { body } = await postOAuthForm(options, TOKEN_PATH, {
        grant_type: "authorization_code",
        code: options.code,
        redirect_uri: options.redirectUri,
        code_verifier: options.codeVerifier,
    });
    return toUserTokenSet(body, Date.now());
}
/**
 * One refresh with rotation. Throws `TokenRevokedError` (`invalid_grant`) or
 * `AppTemporarilyUnavailableError` (token not consumed, retry later with the same one).
 * Never run two refreshes with the same token in parallel: reuse revokes the whole chain.
 */
export async function refreshTokens(options) {
    const { body } = await postOAuthForm(options, TOKEN_PATH, {
        grant_type: "refresh_token",
        refresh_token: options.refreshToken,
    });
    return toUserTokenSet(body, Date.now());
}
/** RFC 7009. A refresh token takes its whole chain along; the member stays connected. */
export async function revokeToken(options) {
    await postOAuthForm(options, REVOKE_PATH, { token: options.token });
}
/** Client credentials for one club installation. There is no refresh token: fetch a new one. */
export async function fetchInstallationToken(options) {
    const { body } = await postOAuthForm(options, INSTALLATION_TOKEN_PATH, {
        installation_id: options.installationId,
    });
    const raw = body;
    return {
        accessToken: raw.access_token,
        expiresAt: Date.now() + raw.expires_in * 1000,
        installationId: raw.installation_id,
        scopes: raw.scopes ?? [],
    };
}
