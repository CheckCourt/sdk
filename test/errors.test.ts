import { describe, expect, it, vi } from "vitest";
import * as sdk from "../src/errors.js";

/** A second evaluation of the module, like a separate route bundle or a duplicate install. */
async function otherCopy(): Promise<typeof sdk> {
  vi.resetModules();
  return import("../src/errors.js");
}

describe("SDK errors across module copies", () => {
  it("is a different class object, yet instanceof and isCheckCourtError still match", async () => {
    const copy = await otherCopy();
    expect(copy.TokenRevokedError).not.toBe(sdk.TokenRevokedError);

    const foreign = copy.oauthErrorFrom(400, { error: "invalid_grant", error_description: "x" });
    expect(foreign instanceof sdk.TokenRevokedError).toBe(true);
    expect(foreign instanceof sdk.OAuthError).toBe(true);
    expect(foreign instanceof sdk.CheckCourtError).toBe(true);
    expect(foreign instanceof sdk.AppTemporarilyUnavailableError).toBe(false);
    expect(foreign instanceof sdk.CheckCourtApiError).toBe(false);
    expect(sdk.isCheckCourtError(foreign)).toBe(true);
    expect(sdk.isCheckCourtError(foreign, "TokenRevokedError")).toBe(true);
    expect(sdk.isCheckCourtError(foreign, "OAuthError")).toBe(true);
    expect(sdk.isCheckCourtError(foreign, "WebhookSignatureError")).toBe(false);

    const api = new copy.CheckCourtApiError(403, "FORBIDDEN", "x");
    expect(api instanceof sdk.CheckCourtApiError).toBe(true);
    expect(api instanceof sdk.OAuthError).toBe(false);
  });

  it("has hard-coded names that survive minification", () => {
    expect(new sdk.WebhookSignatureError("signature_mismatch", "x").name).toBe("WebhookSignatureError");
    expect(new sdk.ExtensionVerificationError("expired", "x").name).toBe("ExtensionVerificationError");
    expect(sdk.oauthErrorFrom(503, { error: "temporarily_unavailable" }).name).toBe("AppTemporarilyUnavailableError");
    expect(new sdk.CheckCourtApiError(429, "RATE_LIMITED", "x").name).toBe("CheckCourtApiError");
  });

  it("does not match plain errors or look-alikes", () => {
    const lookAlike = Object.assign(new Error("x"), { name: "TokenRevokedError", error: "invalid_grant" });
    expect(lookAlike instanceof sdk.TokenRevokedError).toBe(false);
    expect(sdk.isCheckCourtError(lookAlike)).toBe(false);
    expect(sdk.isCheckCourtError(null)).toBe(false);
    expect(sdk.isCheckCourtError("TokenRevokedError")).toBe(false);
  });

  it("keeps instanceof working for user subclasses", () => {
    class MyError extends sdk.CheckCourtError {}
    const mine = new MyError("x");
    expect(mine instanceof MyError).toBe(true);
    expect(mine instanceof sdk.CheckCourtError).toBe(true);
    expect(new sdk.CheckCourtError("x") instanceof MyError).toBe(false);
  });
});
