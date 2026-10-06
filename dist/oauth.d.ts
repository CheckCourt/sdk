export { AppTemporarilyUnavailableError, OAuthError, TokenRevokedError, } from "./errors.js";
export declare const AUTHORIZE_PATH = "/api/oauth/authorize";
export declare const TOKEN_PATH = "/api/oauth/token";
export declare const REVOKE_PATH = "/api/oauth/revoke";
export declare const INSTALLATION_TOKEN_PATH = "/api/oauth/installation-token";
export type FetchLike = (input: Request) => Promise<Response>;
export interface ClientCredentials {
    /** `cca_app_…` */
    clientId: string;
    /** `ccas_…`, only ever on your server. */
    clientSecret: string;
    /** Defaults to https://app.checkcourt.de. */
    baseUrl?: string;
    fetch?: FetchLike;
}
export interface PkcePair {
    /** Keep it in the member's session until the callback. */
    verifier: string;
    challenge: string;
    method: "S256";
}
/** 32 random bytes as verifier (43 characters) and its S256 challenge. */
export declare function createPkcePair(): Promise<PkcePair>;
export declare function pkceChallenge(verifier: string): Promise<string>;
/** A random `state` value for the authorize redirect. */
export declare function createState(): string;
export interface AuthorizeUrlOptions {
    baseUrl?: string;
    clientId: string;
    /** Exactly one of the redirect URIs registered in the developer portal. */
    redirectUri: string;
    /** Comes back unchanged, at most 500 characters. */
    state: string;
    codeChallenge: string;
    /** `consent` shows the consent screen even when the member already agreed. */
    prompt?: "consent";
    /** Club id to preselect in the consent screen. */
    tenant?: string;
}
export declare function buildAuthorizeUrl(options: AuthorizeUrlOptions): string;
/**
 * Reads `code` from the redirect back to your app after checking `state`.
 * Throws `OAuthError` (e.g. `access_denied`) when CheckCourt sent an error instead.
 */
export declare function parseAuthorizeCallback(callbackUrl: string | URL, expectedState: string): {
    code: string;
};
export interface UserTokenSet {
    /** `ccu_…`, valid for one hour. */
    accessToken: string;
    /** `ccr_…`, works exactly once; always store the newest. */
    refreshToken: string;
    /** Epoch milliseconds. */
    expiresAt: number;
    scope: string[];
    /** Every running connection of the member with your app, i.e. the clubs this token works in. */
    installations: {
        installationId: string;
        tenantId: string;
    }[];
}
export interface InstallationToken {
    /** `cca_…`, valid for one hour, only for this installation. */
    accessToken: string;
    /** Epoch milliseconds. */
    expiresAt: number;
    installationId: string;
    scopes: string[];
}
/** POSTs a form to an OAuth endpoint and returns the parsed JSON, or throws the mapped `OAuthError`. */
export declare function postOAuthForm(credentials: ClientCredentials, path: string, form: Record<string, string>): Promise<{
    body: unknown;
    response: Response;
}>;
/** Swaps the one-time code (valid 60 s) for member tokens. */
export declare function exchangeCode(options: ClientCredentials & {
    code: string;
    redirectUri: string;
    codeVerifier: string;
}): Promise<UserTokenSet>;
/**
 * One refresh with rotation. Throws `TokenRevokedError` (`invalid_grant`) or
 * `AppTemporarilyUnavailableError` (token not consumed, retry later with the same one).
 * Never run two refreshes with the same token in parallel: reuse revokes the whole chain.
 */
export declare function refreshTokens(options: ClientCredentials & {
    refreshToken: string;
}): Promise<UserTokenSet>;
/** RFC 7009. A refresh token takes its whole chain along; the member stays connected. */
export declare function revokeToken(options: ClientCredentials & {
    token: string;
}): Promise<void>;
/** Client credentials for one club installation. There is no refresh token: fetch a new one. */
export declare function fetchInstallationToken(options: ClientCredentials & {
    installationId: string;
}): Promise<InstallationToken>;
