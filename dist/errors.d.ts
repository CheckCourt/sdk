export type CheckCourtErrorKind = "CheckCourtError" | "CheckCourtApiError" | "OAuthError" | "TokenRevokedError" | "AppTemporarilyUnavailableError" | "WebhookSignatureError" | "ExtensionVerificationError";
declare const KIND: unique symbol;
/**
 * Base class for every error the SDK throws on purpose. `instanceof` works across copies of the
 * SDK (it checks a brand, not the prototype); `isCheckCourtError(err, kind)` does the same as a function.
 */
export declare class CheckCourtError extends Error {
    static readonly [KIND]: CheckCourtErrorKind;
    static [Symbol.hasInstance](this: {
        [KIND]?: CheckCourtErrorKind;
    }, value: unknown): boolean;
    constructor(message: string, options?: {
        cause?: unknown;
    });
}
export type ApiErrorCode = "UNAUTHORIZED" | "VALIDATION" | "FORBIDDEN" | "NOT_FOUND" | "BUSINESS_RULE" | "RATE_LIMITED" | (string & {});
/** A non-2xx answer from `/api/v1`. Branch on `code`; `message` is German and may change. */
export declare class CheckCourtApiError extends CheckCourtError {
    static readonly [KIND]: CheckCourtErrorKind;
    readonly status: number;
    readonly code: ApiErrorCode;
    readonly response?: Response;
    constructor(status: number, code: ApiErrorCode, message: string, response?: Response);
    static fromBody(status: number, body: unknown, response?: Response): CheckCourtApiError;
}
/** An RFC 6749 error from `/api/oauth/*`, e.g. `invalid_client` or `slow_down`. */
export declare class OAuthError extends CheckCourtError {
    static readonly [KIND]: CheckCourtErrorKind;
    readonly status: number;
    readonly error: string;
    readonly description: string;
    constructor(status: number, error: string, description: string);
}
/**
 * `invalid_grant`: the refresh token or code is dead (expired, revoked, reused, chain older than
 * 180 days, member disconnected everywhere). Only a new authorization helps.
 */
export declare class TokenRevokedError extends OAuthError {
    static readonly [KIND]: CheckCourtErrorKind;
    constructor(status: number, error: string, description: string);
}
/**
 * `temporarily_unavailable` on refresh: the grant is still valid but nothing may run right now
 * (connection paused, app suspended, account banned). The refresh token was not consumed.
 */
export declare class AppTemporarilyUnavailableError extends OAuthError {
    static readonly [KIND]: CheckCourtErrorKind;
    constructor(status: number, error: string, description: string);
}
export declare function oauthErrorFrom(status: number, body: unknown): OAuthError;
export type WebhookSignatureFailure = "missing_header" | "malformed_header" | "timestamp_out_of_tolerance" | "signature_mismatch" | "invalid_payload";
export declare class WebhookSignatureError extends CheckCourtError {
    static readonly [KIND]: CheckCourtErrorKind;
    readonly reason: WebhookSignatureFailure;
    constructor(reason: WebhookSignatureFailure, message: string);
}
export type ExtensionVerificationFailure = "malformed_token" | "unsupported_algorithm" | "invalid_signature" | "invalid_claims" | "expired" | "not_yet_valid" | "request_signature" | "invalid_body" | "context_mismatch";
export declare class ExtensionVerificationError extends CheckCourtError {
    static readonly [KIND]: CheckCourtErrorKind;
    readonly reason: ExtensionVerificationFailure;
    constructor(reason: ExtensionVerificationFailure, message: string);
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
export declare function isCheckCourtError<K extends CheckCourtErrorKind = "CheckCourtError">(error: unknown, kind?: K): error is ErrorKinds[K];
export {};
