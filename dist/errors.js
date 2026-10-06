// Symbol.for, not Symbol(): two copies of the SDK (route bundles, duplicate installs) must agree.
const CHECKCOURT_ERROR_BRAND = Symbol.for("checkcourt.sdk.error");
const kindBrand = (kind) => Symbol.for(`checkcourt.sdk.error.${kind}`);
const KIND = Symbol.for("checkcourt.sdk.error.kind");
function brand(error, kind) {
    // Hard-coded because minifiers rename classes, so constructor.name is unreliable.
    error.name = kind;
    Object.defineProperty(error, CHECKCOURT_ERROR_BRAND, { value: true, configurable: true });
    Object.defineProperty(error, kindBrand(kind), { value: true, configurable: true });
}
function hasBrand(value, kind) {
    return (typeof value === "object" &&
        value !== null &&
        value[CHECKCOURT_ERROR_BRAND] === true &&
        value[kindBrand(kind)] === true);
}
/**
 * Base class for every error the SDK throws on purpose. `instanceof` works across copies of the
 * SDK (it checks a brand, not the prototype); `isCheckCourtError(err, kind)` does the same as a function.
 */
export class CheckCourtError extends Error {
    static [KIND] = "CheckCourtError";
    static [Symbol.hasInstance](value) {
        if (Function.prototype[Symbol.hasInstance].call(this, value))
            return true;
        // Only SDK classes declare their own kind; user subclasses fall back to the prototype check.
        if (!Object.prototype.hasOwnProperty.call(this, KIND))
            return false;
        return hasBrand(value, this[KIND]);
    }
    constructor(message, options) {
        super(message, options);
        brand(this, "CheckCourtError");
    }
}
/** A non-2xx answer from `/api/v1`. Branch on `code`; `message` is German and may change. */
export class CheckCourtApiError extends CheckCourtError {
    static [KIND] = "CheckCourtApiError";
    status;
    code;
    response;
    constructor(status, code, message, response) {
        super(message);
        brand(this, "CheckCourtApiError");
        this.status = status;
        this.code = code;
        this.response = response;
    }
    static fromBody(status, body, response) {
        const error = body?.error;
        const code = typeof error?.code === "string" ? error.code : `HTTP_${status}`;
        const message = typeof error?.message === "string" ? error.message : `HTTP ${status}`;
        return new CheckCourtApiError(status, code, message, response);
    }
}
/** An RFC 6749 error from `/api/oauth/*`, e.g. `invalid_client` or `slow_down`. */
export class OAuthError extends CheckCourtError {
    static [KIND] = "OAuthError";
    status;
    error;
    description;
    constructor(status, error, description) {
        super(`${error}: ${description}`);
        brand(this, "OAuthError");
        this.status = status;
        this.error = error;
        this.description = description;
    }
}
/**
 * `invalid_grant`: the refresh token or code is dead (expired, revoked, reused, chain older than
 * 180 days, member disconnected everywhere). Only a new authorization helps.
 */
export class TokenRevokedError extends OAuthError {
    static [KIND] = "TokenRevokedError";
    constructor(status, error, description) {
        super(status, error, description);
        brand(this, "TokenRevokedError");
    }
}
/**
 * `temporarily_unavailable` on refresh: the grant is still valid but nothing may run right now
 * (connection paused, app suspended, account banned). The refresh token was not consumed.
 */
export class AppTemporarilyUnavailableError extends OAuthError {
    static [KIND] = "AppTemporarilyUnavailableError";
    constructor(status, error, description) {
        super(status, error, description);
        brand(this, "AppTemporarilyUnavailableError");
    }
}
export function oauthErrorFrom(status, body) {
    const b = (body ?? {});
    const error = typeof b.error === "string" ? b.error : `http_${status}`;
    const description = typeof b.error_description === "string" ? b.error_description : `HTTP ${status}`;
    if (error === "invalid_grant")
        return new TokenRevokedError(status, error, description);
    if (error === "temporarily_unavailable")
        return new AppTemporarilyUnavailableError(status, error, description);
    return new OAuthError(status, error, description);
}
export class WebhookSignatureError extends CheckCourtError {
    static [KIND] = "WebhookSignatureError";
    reason;
    constructor(reason, message) {
        super(message);
        brand(this, "WebhookSignatureError");
        this.reason = reason;
    }
}
export class ExtensionVerificationError extends CheckCourtError {
    static [KIND] = "ExtensionVerificationError";
    reason;
    constructor(reason, message) {
        super(message);
        brand(this, "ExtensionVerificationError");
        this.reason = reason;
    }
}
/** True for errors from any copy of the SDK; with `kind`, also for that class or a subclass of it. */
export function isCheckCourtError(error, kind) {
    return hasBrand(error, kind ?? "CheckCourtError");
}
