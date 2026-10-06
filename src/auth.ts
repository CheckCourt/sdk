import { TokenRevokedError } from "./errors.js";
import {
  fetchInstallationToken,
  refreshTokens,
  type FetchLike,
  type InstallationToken,
  type UserTokenSet,
} from "./oauth.js";

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
export function apiKeyAuth(apiKey: string): AuthStrategy {
  return { getAccessToken: async () => apiKey };
}

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
export function installationAuth(options: CredentialOptions & { installationId: string }): InstallationAuth {
  const margin = (options.refreshMarginSeconds ?? 60) * 1000;
  let cached: InstallationToken | null = null;
  let inflight: Promise<InstallationToken> | null = null;

  const getToken = async (context: AuthContext = {}): Promise<InstallationToken> => {
    if (cached && cached.expiresAt - margin > Date.now()) return cached;
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
      if (cached?.accessToken === token) cached = null;
      return true;
    },
  };
}

/** What you need to persist per member; a full `UserTokenSet` fits too. */
export type StoredUserTokens = Pick<UserTokenSet, "accessToken" | "refreshToken" | "expiresAt"> &
  Partial<Pick<UserTokenSet, "scope" | "installations">>;

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
export function userAuth(
  options: CredentialOptions & {
    tokens: StoredUserTokens;
    onTokens: (tokens: UserTokenSet) => void | Promise<void>;
  },
): UserAuth {
  const margin = (options.refreshMarginSeconds ?? 60) * 1000;
  let current: StoredUserTokens = { ...options.tokens };
  let revoked: TokenRevokedError | null = null;
  let inflight: Promise<StoredUserTokens> | null = null;

  const refresh = (context: AuthContext = {}): Promise<StoredUserTokens> => {
    if (revoked) return Promise.reject(revoked);
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
      } catch (err) {
        if (err instanceof TokenRevokedError) revoked = err;
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
      if (revoked) throw revoked;
      if (current.expiresAt - margin > Date.now()) return current.accessToken;
      return (await refresh(context)).accessToken;
    },
    invalidate(token) {
      if (revoked) return false;
      if (current.accessToken === token) current = { ...current, expiresAt: 0 };
      return true;
    },
  };
}
