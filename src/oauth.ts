import { CheckCourtError, OAuthError, oauthErrorFrom } from "./errors.js";
import { base64UrlEncode, randomBytes, utf8 } from "./internal/encoding.js";
import { sha256 } from "./internal/hmac.js";
import { normalizeBaseUrl } from "./internal/base-url.js";

export {
  AppTemporarilyUnavailableError,
  OAuthError,
  TokenRevokedError,
} from "./errors.js";

export const AUTHORIZE_PATH = "/api/oauth/authorize";
export const TOKEN_PATH = "/api/oauth/token";
export const REVOKE_PATH = "/api/oauth/revoke";
export const INSTALLATION_TOKEN_PATH = "/api/oauth/installation-token";

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
export async function createPkcePair(): Promise<PkcePair> {
  const verifier = base64UrlEncode(randomBytes(32));
  return { verifier, challenge: await pkceChallenge(verifier), method: "S256" };
}

export async function pkceChallenge(verifier: string): Promise<string> {
  if (!/^[A-Za-z0-9\-._~]{43,128}$/.test(verifier)) {
    throw new CheckCourtError("code_verifier must be 43 to 128 characters from A-Z a-z 0-9 - . _ ~");
  }
  return base64UrlEncode(await sha256(utf8(verifier)));
}

/** A random `state` value for the authorize redirect. */
export function createState(): string {
  return base64UrlEncode(randomBytes(16));
}

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

export function buildAuthorizeUrl(options: AuthorizeUrlOptions): string {
  const url = new URL(AUTHORIZE_PATH, normalizeBaseUrl(options.baseUrl) + "/");
  const params: Record<string, string | undefined> = {
    response_type: "code",
    client_id: options.clientId,
    redirect_uri: options.redirectUri,
    code_challenge: options.codeChallenge,
    code_challenge_method: "S256",
    state: options.state,
    prompt: options.prompt,
    tenant: options.tenant,
  };
  for (const [key, value] of Object.entries(params)) if (value !== undefined) url.searchParams.set(key, value);
  return url.toString();
}

/**
 * Reads `code` from the redirect back to your app after checking `state`.
 * Throws `OAuthError` (e.g. `access_denied`) when CheckCourt sent an error instead.
 */
export function parseAuthorizeCallback(callbackUrl: string | URL, expectedState: string): { code: string } {
  const params = new URL(callbackUrl).searchParams;
  if (params.get("state") !== expectedState) {
    throw new OAuthError(400, "state_mismatch", "state does not match the value sent to authorize");
  }
  const error = params.get("error");
  if (error) throw new OAuthError(400, error, params.get("error_description") ?? error);
  const code = params.get("code");
  if (!code) throw new OAuthError(400, "invalid_request", "Callback has neither code nor error");
  return { code };
}

export interface UserTokenSet {
  /** `ccu_…`, valid for one hour. */
  accessToken: string;
  /** `ccr_…`, works exactly once; always store the newest. */
  refreshToken: string;
  /** Epoch milliseconds. */
  expiresAt: number;
  scope: string[];
  /** Every running connection of the member with your app, i.e. the clubs this token works in. */
  installations: { installationId: string; tenantId: string }[];
}

export interface InstallationToken {
  /** `cca_…`, valid for one hour, only for this installation. */
  accessToken: string;
  /** Epoch milliseconds. */
  expiresAt: number;
  installationId: string;
  scopes: string[];
}

function basicAuth(clientId: string, clientSecret: string): string {
  const raw = `${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`;
  return `Basic ${btoa(String.fromCharCode(...utf8(raw)))}`;
}

/** POSTs a form to an OAuth endpoint and returns the parsed JSON, or throws the mapped `OAuthError`. */
export async function postOAuthForm(
  credentials: ClientCredentials,
  path: string,
  form: Record<string, string>,
): Promise<{ body: unknown; response: Response }> {
  const doFetch: FetchLike = credentials.fetch ?? ((req) => fetch(req));
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
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }
  if (!response.ok) throw oauthErrorFrom(response.status, body);
  return { body, response };
}

interface RawUserTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
  installations?: { installation_id: string; tenant_id: string }[];
}

function toUserTokenSet(raw: RawUserTokens, now: number): UserTokenSet {
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
export async function exchangeCode(
  options: ClientCredentials & { code: string; redirectUri: string; codeVerifier: string },
): Promise<UserTokenSet> {
  const { body } = await postOAuthForm(options, TOKEN_PATH, {
    grant_type: "authorization_code",
    code: options.code,
    redirect_uri: options.redirectUri,
    code_verifier: options.codeVerifier,
  });
  return toUserTokenSet(body as RawUserTokens, Date.now());
}

/**
 * One refresh with rotation. Throws `TokenRevokedError` (`invalid_grant`) or
 * `AppTemporarilyUnavailableError` (token not consumed, retry later with the same one).
 * Never run two refreshes with the same token in parallel: reuse revokes the whole chain.
 */
export async function refreshTokens(options: ClientCredentials & { refreshToken: string }): Promise<UserTokenSet> {
  const { body } = await postOAuthForm(options, TOKEN_PATH, {
    grant_type: "refresh_token",
    refresh_token: options.refreshToken,
  });
  return toUserTokenSet(body as RawUserTokens, Date.now());
}

/** RFC 7009. A refresh token takes its whole chain along; the member stays connected. */
export async function revokeToken(options: ClientCredentials & { token: string }): Promise<void> {
  await postOAuthForm(options, REVOKE_PATH, { token: options.token });
}

/** Client credentials for one club installation. There is no refresh token: fetch a new one. */
export async function fetchInstallationToken(
  options: ClientCredentials & { installationId: string },
): Promise<InstallationToken> {
  const { body } = await postOAuthForm(options, INSTALLATION_TOKEN_PATH, {
    installation_id: options.installationId,
  });
  const raw = body as { access_token: string; expires_in: number; installation_id: string; scopes?: string[] };
  return {
    accessToken: raw.access_token,
    expiresAt: Date.now() + raw.expires_in * 1000,
    installationId: raw.installation_id,
    scopes: raw.scopes ?? [],
  };
}
