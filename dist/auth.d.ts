import { type FetchLike, type InstallationToken, type UserTokenSet } from "./oauth.js";
export interface AuthContext {
    baseUrl?: string;
    fetch?: FetchLike;
}
/**
 * How the client gets its bearer token. Share one strategy object between clients (for example
 * one per club via `tenantId`) to share its token cache and refresh lock.
 */
export interface AuthStrategy {
    getAccessToken(context?: AuthContext): Promise<string>;
    /** Called after a 401 with the token that failed; true if a retry with a fresh token can help. */
    invalidate?(token: string): boolean;
}
/** A management (`ck_mgmt_…`) or personal (`ck_user_…`) API key. */
export declare function apiKeyAuth(apiKey: string): AuthStrategy;
interface CredentialOptions {
    clientId: string;
    clientSecret: string;
    baseUrl?: string;
    fetch?: FetchLike;
    /** Renew this long before expiry. Default 60. */
    refreshMarginSeconds?: number;
}
export interface InstallationAuth extends AuthStrategy {
    /** The cached token, fetching one if needed. */
    getToken(context?: AuthContext): Promise<InstallationToken>;
}
/** Club installation: exchanges client credentials for `cca_` tokens, cached until shortly before expiry. */
export declare function installationAuth(options: CredentialOptions & {
    installationId: string;
}): InstallationAuth;
/** What you need to persist per member; a full `UserTokenSet` fits too. */
export type StoredUserTokens = Pick<UserTokenSet, "accessToken" | "refreshToken" | "expiresAt"> & Partial<Pick<UserTokenSet, "scope" | "installations">>;
export interface UserAuth extends AuthStrategy {
    /** The tokens currently in use (after any rotation). */
    getTokens(): StoredUserTokens;
    /** Forces a refresh now; concurrent calls share one request. */
    refresh(context?: AuthContext): Promise<StoredUserTokens>;
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
export declare function userAuth(options: CredentialOptions & {
    tokens: StoredUserTokens;
    onTokens: (tokens: UserTokenSet) => void | Promise<void>;
}): UserAuth;
export {};
