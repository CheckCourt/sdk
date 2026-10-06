import { afterEach, describe, expect, it, vi } from "vitest";
import { apiKeyAuth, installationAuth, userAuth } from "../src/auth.js";
import { createCheckCourtClient, unwrap } from "../src/client.js";
import { AppTemporarilyUnavailableError, CheckCourtApiError, TokenRevokedError } from "../src/errors.js";
import { deferred, json, mockFetch } from "./helpers.js";

const creds = { clientId: "cca_app_x", clientSecret: "ccas_s", baseUrl: "https://cc.test" };

afterEach(() => {
  vi.useRealTimers();
});

function installationResponse(n: number, expiresIn = 3600) {
  return json(200, { access_token: `cca_${n}`, token_type: "Bearer", expires_in: expiresIn, installation_id: "inst_1", scopes: [] });
}

describe("installationAuth", () => {
  it("caches until 60 s before expiry", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-06T10:00:00Z"));
    let n = 0;
    const fetch = mockFetch(() => installationResponse(++n));
    const auth = installationAuth({ ...creds, fetch, installationId: "inst_1" });

    expect(await auth.getAccessToken()).toBe("cca_1");
    vi.setSystemTime(new Date("2026-10-06T10:58:59Z"));
    expect(await auth.getAccessToken()).toBe("cca_1");
    vi.setSystemTime(new Date("2026-10-06T10:59:01Z"));
    expect(await auth.getAccessToken()).toBe("cca_2");
    expect(fetch.calls).toHaveLength(2);
    expect(new URLSearchParams(fetch.calls[0]!.body).get("installation_id")).toBe("inst_1");
  });

  it("shares one request between concurrent callers", async () => {
    const gate = deferred<void>();
    const fetch = mockFetch(async () => {
      await gate.promise;
      return installationResponse(1);
    });
    const auth = installationAuth({ ...creds, fetch, installationId: "inst_1" });
    const all = Promise.all([auth.getAccessToken(), auth.getAccessToken(), auth.getAccessToken()]);
    gate.resolve();
    expect(await all).toEqual(["cca_1", "cca_1", "cca_1"]);
    expect(fetch.calls).toHaveLength(1);
  });

  it("does not cache failures", async () => {
    let n = 0;
    const fetch = mockFetch(() =>
      ++n === 1 ? json(429, { error: "slow_down", error_description: "x" }) : installationResponse(n),
    );
    const auth = installationAuth({ ...creds, fetch, installationId: "inst_1" });
    await expect(auth.getAccessToken()).rejects.toMatchObject({ error: "slow_down" });
    expect(await auth.getAccessToken()).toBe("cca_2");
  });
});

describe("userAuth", () => {
  const expired = { accessToken: "ccu_old", refreshToken: "ccr_old", expiresAt: 0 };

  function rotation(n: number) {
    return json(200, {
      access_token: `ccu_${n}`,
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: `ccr_${n}`,
      scope: "bookings:read",
      installations: [],
    });
  }

  it("uses a valid access token without refreshing", async () => {
    const fetch = mockFetch(() => rotation(1));
    const auth = userAuth({
      ...creds,
      fetch,
      tokens: { accessToken: "ccu_live", refreshToken: "ccr_live", expiresAt: Date.now() + 600_000 },
      onTokens: () => {},
    });
    expect(await auth.getAccessToken()).toBe("ccu_live");
    expect(fetch.calls).toHaveLength(0);
  });

  it("rotates once for concurrent callers and persists before use", async () => {
    const gate = deferred<void>();
    let n = 0;
    const fetch = mockFetch(async () => {
      await gate.promise;
      return rotation(++n);
    });
    const persisted: string[] = [];
    const auth = userAuth({
      ...creds,
      fetch,
      tokens: expired,
      onTokens: async (t) => {
        persisted.push(t.refreshToken);
      },
    });
    const all = Promise.all([auth.getAccessToken(), auth.getAccessToken(), auth.getAccessToken()]);
    gate.resolve();
    expect(await all).toEqual(["ccu_1", "ccu_1", "ccu_1"]);
    expect(fetch.calls).toHaveLength(1);
    expect(new URLSearchParams(fetch.calls[0]!.body).get("refresh_token")).toBe("ccr_old");
    expect(persisted).toEqual(["ccr_1"]);
    expect(auth.getTokens().refreshToken).toBe("ccr_1");

    await auth.refresh();
    expect(new URLSearchParams(fetch.calls[1]!.body).get("refresh_token")).toBe("ccr_1");
  });

  it("keeps the tokens on temporarily_unavailable and retries with the same refresh token", async () => {
    let n = 0;
    const fetch = mockFetch(() =>
      ++n === 1
        ? json(400, { error: "temporarily_unavailable", error_description: "pausiert" })
        : rotation(n),
    );
    const onTokens = vi.fn();
    const auth = userAuth({ ...creds, fetch, tokens: expired, onTokens });
    await expect(auth.getAccessToken()).rejects.toBeInstanceOf(AppTemporarilyUnavailableError);
    expect(onTokens).not.toHaveBeenCalled();
    expect(auth.getTokens().refreshToken).toBe("ccr_old");
    expect(await auth.getAccessToken()).toBe("ccu_2");
    expect(new URLSearchParams(fetch.calls[1]!.body).get("refresh_token")).toBe("ccr_old");
  });

  it("stops for good on invalid_grant (also the 180-day chain limit)", async () => {
    const fetch = mockFetch(() => json(400, { error: "invalid_grant", error_description: "ungültig" }));
    const auth = userAuth({ ...creds, fetch, tokens: expired, onTokens: () => {} });
    await expect(auth.getAccessToken()).rejects.toBeInstanceOf(TokenRevokedError);
    await expect(auth.getAccessToken()).rejects.toBeInstanceOf(TokenRevokedError);
    expect(fetch.calls).toHaveLength(1);
    expect(auth.invalidate!("ccu_old")).toBe(false);
  });
});

describe("createCheckCourtClient", () => {
  it("sends the bearer token, X-Tenant-Id and hits /api/v1", async () => {
    const fetch = mockFetch(() => json(200, { tenants: [] }));
    const client = createCheckCourtClient({ baseUrl: "https://cc.test", auth: apiKeyAuth("ck_user_1"), tenantId: "t1", fetch });
    const data = await unwrap(client.GET("/me/tenants"));
    expect(data).toEqual({ tenants: [] });
    expect(fetch.calls[0]!.url).toBe("https://cc.test/api/v1/me/tenants");
    expect(fetch.calls[0]!.headers.get("authorization")).toBe("Bearer ck_user_1");
    expect(fetch.calls[0]!.headers.get("x-tenant-id")).toBe("t1");
  });

  it("lets a request override X-Tenant-Id", async () => {
    const fetch = mockFetch(() => json(200, { tenants: [] }));
    const client = createCheckCourtClient({ baseUrl: "https://cc.test/api/v1", auth: apiKeyAuth("k"), tenantId: "t1", fetch });
    await client.GET("/me/tenants", { headers: { "X-Tenant-Id": "t2" } });
    expect(fetch.calls[0]!.url).toBe("https://cc.test/api/v1/me/tenants");
    expect(fetch.calls[0]!.headers.get("x-tenant-id")).toBe("t2");
  });

  it("throws CheckCourtApiError from unwrap", async () => {
    const fetch = mockFetch(() => json(403, { error: { code: "FORBIDDEN", message: "Fehlende Berechtigung" } }));
    const client = createCheckCourtClient({ baseUrl: "https://cc.test", auth: apiKeyAuth("k"), fetch });
    const err = await unwrap(client.GET("/me/tenants")).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(CheckCourtApiError);
    expect(err).toMatchObject({ status: 403, code: "FORBIDDEN", message: "Fehlende Berechtigung" });
  });

  it("refetches the installation token once after a 401", async () => {
    let tokens = 0;
    const fetch = mockFetch((req) => {
      if (req.url.endsWith("/installation-token")) return installationResponse(++tokens);
      return req.headers.get("authorization") === "Bearer cca_1"
        ? json(401, { error: { code: "UNAUTHORIZED", message: "x" } })
        : json(200, { tenants: [] });
    });
    const client = createCheckCourtClient({
      baseUrl: "https://cc.test",
      auth: installationAuth({ clientId: "c", clientSecret: "s", installationId: "inst_1" }),
      fetch,
    });
    const { response } = await client.GET("/me/tenants");
    expect(response.status).toBe(200);
    expect(tokens).toBe(2);
  });

  it("does not wait for body.cancel() before retrying (Next.js tees fetch bodies)", async () => {
    // One branch of a tee: cancel() waits for the other branch, which nobody reads.
    const teed = (status: number) => {
      const [branch] = new Response(JSON.stringify({ error: { code: "X", message: "x" } })).body!.tee();
      return new Response(branch, { status });
    };
    let n = 0;
    const fetch = mockFetch(() => {
      n += 1;
      if (n === 1) return teed(401);
      if (n === 2) return teed(429);
      return json(200, { tenants: [] });
    });
    const client = createCheckCourtClient({
      baseUrl: "https://cc.test",
      auth: { getAccessToken: async () => "k", invalidate: () => true },
      fetch,
      retry: { baseDelayMs: 1 },
    });
    const outcome = await Promise.race([
      client.GET("/me/tenants").then(({ response }) => response.status),
      new Promise((resolve) => setTimeout(() => resolve("hung"), 500)),
    ]);
    expect(outcome).toBe(200);
    expect(fetch.calls).toHaveLength(3);
  });

  it("retries a 429 after Retry-After, then gives up after maxRetries", async () => {
    vi.useFakeTimers();
    const fetch = mockFetch(() => json(429, { error: { code: "RATE_LIMITED", message: "x" } }, { "Retry-After": "2" }));
    const client = createCheckCourtClient({ baseUrl: "https://cc.test", auth: apiKeyAuth("k"), fetch, retry: { maxRetries: 2 } });
    const pending = client.GET("/me/tenants");
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetch.calls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetch.calls).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(2000);
    const { response } = await pending;
    expect(response.status).toBe(429);
    expect(fetch.calls).toHaveLength(3);
  });

  it("does not wait longer than maxDelayMs", async () => {
    const fetch = mockFetch(() => json(429, {}, { "Retry-After": "120" }));
    const client = createCheckCourtClient({ baseUrl: "https://cc.test", auth: apiKeyAuth("k"), fetch });
    const { response } = await client.GET("/me/tenants");
    expect(response.status).toBe(429);
    expect(fetch.calls).toHaveLength(1);
  });

  it("backs off exponentially without Retry-After and resends the body", async () => {
    vi.useFakeTimers();
    let n = 0;
    const fetch = mockFetch(() => (++n < 3 ? json(429, {}) : json(201, { ok: true })));
    const client = createCheckCourtClient({ baseUrl: "https://cc.test", auth: apiKeyAuth("k"), fetch, retry: { baseDelayMs: 100 } });
    const pending = client.POST("/me/bookings", {
      body: { courtId: 1, date: "2026-10-07", startTime: "10:00", endTime: "11:00" } as never,
    });
    await vi.advanceTimersByTimeAsync(300);
    const { response } = await pending;
    expect(response.status).toBe(201);
    expect(fetch.calls.map((c) => c.body)).toEqual([fetch.calls[0]!.body, fetch.calls[0]!.body, fetch.calls[0]!.body]);
    expect(fetch.calls[0]!.body).toContain("courtId");
  });
});

describe("getInstallation", () => {
  it("reads the own installation with the installation token", async () => {
    const { getInstallation } = await import("../src/installation.js");
    const fetch = mockFetch((req) =>
      req.url.endsWith("/installation-token")
        ? installationResponse(1)
        : json(200, { installation_id: "inst_1", settings: { doorModel: "nuki" } }),
    );
    const client = createCheckCourtClient({
      baseUrl: "https://cc.test",
      auth: installationAuth({ clientId: "c", clientSecret: "s", installationId: "inst_1" }),
      fetch,
    });
    const installation = await getInstallation(client);
    expect(installation.settings).toEqual({ doorModel: "nuki" });
    expect(fetch.calls[1]!.url).toBe("https://cc.test/api/v1/app/installation");
    expect(fetch.calls[1]!.headers.get("authorization")).toBe("Bearer cca_1");
  });
});

describe("getMe", () => {
  it("reads the member's pseudonymous id and clubs with the member token", async () => {
    const { getMe } = await import("../src/installation.js");
    const body = { user_id: "usr_abcdefghijklmnopqrstuvwxyz", tenants: [{ id: "t1", name: "TC Blau-Weiß" }] };
    const fetch = mockFetch(() => json(200, body));
    const client = createCheckCourtClient({ baseUrl: "https://cc.test", auth: apiKeyAuth("ccu_1"), fetch });
    expect(await getMe(client)).toEqual(body);
    expect(fetch.calls[0]!.url).toBe("https://cc.test/api/v1/me");
  });
});
