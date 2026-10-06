export type CheckCourtErrorKind =
  | "CheckCourtError"
  | "CheckCourtApiError"
  | "OAuthError"
  | "TokenRevokedError"
  | "AppTemporarilyUnavailableError"
  | "WebhookSignatureError"
  | "ExtensionVerificationError";

// Symbol.for, not Symbol(): two copies of the SDK (route bundles, duplicate installs) must agree.
const CHECKCOURT_ERROR_BRAND = Symbol.for("checkcourt.sdk.error");

const kindBrand = (kind: CheckCourtErrorKind) => Symbol.for(`checkcourt.sdk.error.${kind}`);
const KIND = Symbol.for("checkcourt.sdk.error.kind");

function brand(error: Error, kind: CheckCourtErrorKind): void {
  // Hard-coded because minifiers rename classes, so constructor.name is unreliable.
  error.name = kind;
  Object.defineProperty(error, CHECKCOURT_ERROR_BRAND, { value: true, configurable: true });
  Object.defineProperty(error, kindBrand(kind), { value: true, configurable: true });
}

function hasBrand(value: unknown, kind: CheckCourtErrorKind): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Record<symbol, unknown>)[CHECKCOURT_ERROR_BRAND] === true &&
    (value as Record<symbol, unknown>)[kindBrand(kind)] === true
  );
}

/**
 * Base class for every error the SDK throws on purpose. `instanceof` works across copies of the
 * SDK (it checks a brand, not the prototype); `isCheckCourtError(err, kind)` does the same as a function.
 */
export class CheckCourtError extends Error {
  static readonly [KIND]: CheckCourtErrorKind = "CheckCourtError";

  static [Symbol.hasInstance](this: { [KIND]?: CheckCourtErrorKind }, value: unknown): boolean {
    if (Function.prototype[Symbol.hasInstance].call(this, value)) return true;
    // Only SDK classes declare their own kind; user subclasses fall back to the prototype check.
    if (!Object.prototype.hasOwnProperty.call(this, KIND)) return false;
    return hasBrand(value, this[KIND]!);
  }

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    brand(this, "CheckCourtError");
  }
}

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "VALIDATION"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "BUSINESS_RULE"
  | "RATE_LIMITED"
  | (string & {});

/** A non-2xx answer from `/api/v1`. Branch on `code`; `message` is German and may change. */
export class CheckCourtApiError extends CheckCourtError {
  static override readonly [KIND]: CheckCourtErrorKind = "CheckCourtApiError";
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly response?: Response;

  constructor(status: number, code: ApiErrorCode, message: string, response?: Response) {
    super(message);
    brand(this, "CheckCourtApiError");
    this.status = status;
    this.code = code;
    this.response = response;
  }

  static fromBody(status: number, body: unknown, response?: Response): CheckCourtApiError {
    const error = (body as { error?: { code?: unknown; message?: unknown } } | null)?.error;
    const code = typeof error?.code === "string" ? error.code : `HTTP_${status}`;
    const message = typeof error?.message === "string" ? error.message : `HTTP ${status}`;
    return new CheckCourtApiError(status, code, message, response);
  }
}

/** An RFC 6749 error from `/api/oauth/*`, e.g. `invalid_client` or `slow_down`. */
export class OAuthError extends CheckCourtError {
  static override readonly [KIND]: CheckCourtErrorKind = "OAuthError";
  readonly status: number;
  readonly error: string;
  readonly description: string;

  constructor(status: number, error: string, description: string) {
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
  static override readonly [KIND]: CheckCourtErrorKind = "TokenRevokedError";

  constructor(status: number, error: string, description: string) {
    super(status, error, description);
    brand(this, "TokenRevokedError");
  }
}

/**
 * `temporarily_unavailable` on refresh: the grant is still valid but nothing may run right now
 * (connection paused, app suspended, account banned). The refresh token was not consumed.
 */
export class AppTemporarilyUnavailableError extends OAuthError {
  static override readonly [KIND]: CheckCourtErrorKind = "AppTemporarilyUnavailableError";

  constructor(status: number, error: string, description: string) {
    super(status, error, description);
    brand(this, "AppTemporarilyUnavailableError");
  }
}

export function oauthErrorFrom(status: number, body: unknown): OAuthError {
  const b = (body ?? {}) as { error?: unknown; error_description?: unknown };
  const error = typeof b.error === "string" ? b.error : `http_${status}`;
  const description = typeof b.error_description === "string" ? b.error_description : `HTTP ${status}`;
  if (error === "invalid_grant") return new TokenRevokedError(status, error, description);
  if (error === "temporarily_unavailable") return new AppTemporarilyUnavailableError(status, error, description);
  return new OAuthError(status, error, description);
}

export type WebhookSignatureFailure =
  | "missing_header"
  | "malformed_header"
  | "timestamp_out_of_tolerance"
  | "signature_mismatch"
  | "invalid_payload";

export class WebhookSignatureError extends CheckCourtError {
  static override readonly [KIND]: CheckCourtErrorKind = "WebhookSignatureError";
  readonly reason: WebhookSignatureFailure;

  constructor(reason: WebhookSignatureFailure, message: string) {
    super(message);
    brand(this, "WebhookSignatureError");
    this.reason = reason;
  }
}

export type ExtensionVerificationFailure =
  | "malformed_token"
  | "unsupported_algorithm"
  | "invalid_signature"
  | "invalid_claims"
  | "expired"
  | "not_yet_valid"
  | "request_signature"
  | "invalid_body"
  | "context_mismatch";

export class ExtensionVerificationError extends CheckCourtError {
  static override readonly [KIND]: CheckCourtErrorKind = "ExtensionVerificationError";
  readonly reason: ExtensionVerificationFailure;

  constructor(reason: ExtensionVerificationFailure, message: string) {
    super(message);
    brand(this, "ExtensionVerificationError");
    this.reason = reason;
  }
}

interface ErrorKinds {
  CheckCourtError: CheckCourtError;
  CheckCourtApiError: CheckCourtApiError;
  OAuthError: OAuthError;
  TokenRevokedError: TokenRevokedError;
  AppTemporarilyUnavailableError: AppTemporarilyUnavailableError;
  WebhookSignatureError: WebhookSignatureError;
  ExtensionVerificationError: ExtensionVerificationError;
}

/** True for errors from any copy of the SDK; with `kind`, also for that class or a subclass of it. */
export function isCheckCourtError<K extends CheckCourtErrorKind = "CheckCourtError">(
  error: unknown,
  kind?: K,
): error is ErrorKinds[K] {
  return hasBrand(error, kind ?? "CheckCourtError");
}
