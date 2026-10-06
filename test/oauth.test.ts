import { describe, expect, it } from "vitest";
import {
  AppTemporarilyUnavailableError,
  OAuthError,
  TokenRevokedError,
  buildAuthorizeUrl,
  createPkcePair,
  exchangeCode,
  fetchInstallationToken,
  parseAuthorizeCallback,
  pkceChallenge,
  refreshTokens,
  revokeToken,
} from "../src/oauth.js";
import { json, mockFetch } from "./helpers.js";

const creds = { clientId: "cca_app_x", clientSecret: "ccas_s:e cret", baseUrl: "https://cc.test" };

describe("PKCE", () => {
  it("matches the RFC 7636 appendix B known answer", async () => {
    expect(await pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    );
  });

  it("creates a 43 character verifier and its S256 challenge", async () => {
    const pair = await createPkcePair();
    expect(pair.verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(pair.challenge).toBe(await pkceChallenge(pair.verifier));
    expect(pair.method).toBe("S256");
  });

  it("rejects verifiers the platform would reject", async () => {
    await expect(pkceChallenge("too-short")).rejects.toThrow();
  });
});

describe("buildAuthorizeUrl", () => {
  it("builds the authorize request with S256", () => {
    const url = new URL(
      buildAuthorizeUrl({
        baseUrl: "https://cc.test/api/v1",
        clientId: "cca_app_x",
        redirectUri: "https://app.example/callback?x=1",
        state: "st",
        codeChallenge: "ch",
        prompt: "consent",
      }),
    );
    expect(url.origin + url.pathname).toBe("https://cc.test/api/oauth/authorize");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: "code",
      client_id: "cca_app_x",
      redirect_uri: "https://app.example/callback?x=1",
      code_challenge: "ch",
      code_challenge_method: "S256",
      state: "st",
      prompt: "consent",
    });
  });

  it("defaults to app.checkcourt.de and omits unset options", () => {
    const url = new URL(buildAuthorizeUrl({ clientId: "c", redirectUri: "https://a/cb", state: "s", codeChallenge: "c" }));
    expect(url.origin).toBe("https://app.checkcourt.de");
    expect(url.searchParams.has("prompt")).toBe(false);
    expect(url.searchParams.has("tenant")).toBe(false);
  });
});

describe("parseAuthorizeCallback", () => {
  it("returns the code when state matches", () => {
    expect(parseAuthorizeCallback("https://a/cb?code=ccc_1&state=s", "s")).toEqual({ code: "ccc_1" });
  });
  it("rejects a foreign state before looking at the code", () => {
    expect(() => parseAuthorizeCallback("https://a/cb?code=ccc_1&state=x", "s")).toThrow(OAuthError);
  });
  it("surfaces access_denied", () => {
    try {
      parseAuthorizeCallback("https://a/cb?error=access_denied&error_description=nein&state=s", "s");
      expect.unreachable();
    } catch (err) {
      expect((err as OAuthError).error).toBe("access_denied");
    }
  });
});

describe("token endpoints", () => {
  const tokenBody = {
    access_token: "ccu_a",
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: "ccr_b",
    scope: "bookings:read teams:read",
    installations: [{ installation_id: "inst_1", tenant_id: "t1" }],
  };

  it("exchanges a code with Basic auth and a form body", async () => {
    const fetch = mockFetch(() => json(200, tokenBody));
    const before = Date.now();
    const tokens = await exchangeCode({ ...creds, fetch, code: "ccc_1", redirectUri: "https://a/cb", codeVerifier: "v" });
    const [call] = fetch.calls;
    expect(call!.url).toBe("https://cc.test/api/oauth/token");
    expect(call!.headers.get("content-type")).toBe("application/x-www-form-urlencoded");
    const basic = atob(call!.headers.get("authorization")!.slice(6));
    expect(basic).toBe("cca_app_x:ccas_s%3Ae%20cret");
    expect(Object.fromEntries(new URLSearchParams(call!.body))).toEqual({
      grant_type: "authorization_code",
      code: "ccc_1",
      redirect_uri: "https://a/cb",
      code_verifier: "v",
    });
    expect(tokens.scope).toEqual(["bookings:read", "teams:read"]);
    expect(tokens.installations).toEqual([{ installationId: "inst_1", tenantId: "t1" }]);
    expect(tokens.expiresAt).toBeGreaterThanOrEqual(before + 3600_000);
  });

  it("maps invalid_grant and temporarily_unavailable to their classes", async () => {
    const dead = mockFetch(() => json(400, { error: "invalid_grant", error_description: "tot" }));
    await expect(refreshTokens({ ...creds, fetch: dead, refreshToken: "ccr_x" })).rejects.toBeInstanceOf(
      TokenRevokedError,
    );
    const paused = mockFetch(() => json(400, { error: "temporarily_unavailable", error_description: "pausiert" }));
    await expect(refreshTokens({ ...creds, fetch: paused, refreshToken: "ccr_x" })).rejects.toBeInstanceOf(
      AppTemporarilyUnavailableError,
    );
  });

  it("revokes with a form body and accepts an empty 200", async () => {
    const fetch = mockFetch(() => new Response(null, { status: 200 }));
    await revokeToken({ ...creds, fetch, token: "ccr_x" });
    expect(fetch.calls[0]!.url).toBe("https://cc.test/api/oauth/revoke");
    expect(fetch.calls[0]!.body).toBe("token=ccr_x");
  });

  it("fetches installation tokens", async () => {
    const fetch = mockFetch(() =>
      json(200, { access_token: "cca_1", token_type: "Bearer", expires_in: 3600, installation_id: "inst_1", scopes: ["courts:read"] }),
    );
    const token = await fetchInstallationToken({ ...creds, fetch, installationId: "inst_1" });
    expect(fetch.calls[0]!.url).toBe("https://cc.test/api/oauth/installation-token");
    expect(token).toMatchObject({ accessToken: "cca_1", installationId: "inst_1", scopes: ["courts:read"] });
  });

  it("keeps invalid_client as a plain OAuthError with status", async () => {
    const fetch = mockFetch(() => json(401, { error: "invalid_client", error_description: "nein" }));
    const err = await fetchInstallationToken({ ...creds, fetch, installationId: "i" }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(OAuthError);
    expect(err).not.toBeInstanceOf(TokenRevokedError);
    expect((err as OAuthError).status).toBe(401);
    expect((err as OAuthError).error).toBe("invalid_client");
  });
});
