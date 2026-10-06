import type { ExtensionPoint } from "./manifest.js";
import type { UiFormValues } from "./ui.js";
import { type RawBody } from "./webhooks.js";
export * from "./ui.js";
export { ExtensionVerificationError, type ExtensionVerificationFailure } from "./errors.js";
export { EXTENSION_POINTS, type ExtensionKind, type ExtensionPoint } from "./manifest.js";
export declare const CONTEXT_HEADER = "CheckCourt-Context";
export declare const CONTEXT_ISSUER = "checkcourt";
export declare const CONTEXT_TTL_SECONDS = 300;
export declare const CLOCK_LEEWAY_SECONDS = 30;
/** `action_id` a `booking.action` button sends when it is clicked. */
export declare const BOOKING_ACTION_INVOKE = "invoke";
export type ExtensionSubjectType = "booking" | "member" | "installation";
export interface ExtensionSubject {
    type: ExtensionSubjectType;
    id: string;
}
export interface BookingCapabilities {
    is_booker: boolean;
    can_edit_bookings: boolean;
    can_cancel_foreign_bookings: boolean;
    can_see_booking_details: boolean;
}
export interface MemberCapabilities {
    is_self: boolean;
    can_see_member_details: boolean;
    can_edit_members: boolean;
}
export interface DashboardCapabilities {
    can_book: boolean;
    can_manage_club: boolean;
}
export interface AppSettingsCapabilities {
    can_manage_app: boolean;
}
export interface PointCapabilities {
    "app.settings": AppSettingsCapabilities;
    "booking.detail.panel": BookingCapabilities;
    "booking.action": BookingCapabilities;
    "member.profile.section": MemberCapabilities;
    "dashboard.widget": DashboardCapabilities;
    "kiosk.tile": Record<string, never>;
}
export interface PointSubject {
    "app.settings": {
        type: "installation";
        id: string;
    };
    "booking.detail.panel": {
        type: "booking";
        id: string;
    };
    "booking.action": {
        type: "booking";
        id: string;
    };
    "member.profile.section": {
        type: "member";
        id: string;
    };
    "dashboard.widget": null;
    "kiosk.tile": null;
}
interface ContextClaimsOf<P extends ExtensionPoint> {
    iss: typeof CONTEXT_ISSUER;
    installation_id: string;
    /** "user": a member's own connection; `viewer.user_id` is then always that member. */
    installation_kind: "tenant" | "user";
    app_id: string;
    tenant_id: string;
    point: P;
    subject: PointSubject[P];
    viewer: {
        /** null on the kiosk; a stable `psn_…` pseudonym unless the installation holds `members:read`. */
        user_id: string | null;
        capabilities: PointCapabilities[P];
    };
    iat: number;
    exp: number;
    nonce: string;
}
/** Claims of a verified context token, narrowed by `point`. */
export type ExtensionContextClaims = {
    [P in ExtensionPoint]: ContextClaimsOf<P>;
}[ExtensionPoint];
/**
 * Verifies the context token (HS256 JWT keyed with the whole `whsec_…` secret): signature,
 * `iss`, `iat` and `exp` with 30 s clock leeway, exactly as CheckCourt does. Throws
 * `ExtensionVerificationError`. Then compare `installation_id` and `tenant_id` with what you
 * stored from `app.installed`.
 */
export declare function verifyExtensionContext(token: string, secret: string, options?: {
    now?: Date | number;
}): Promise<ExtensionContextClaims>;
/** Body of a declarative render request. */
export interface ExtensionRenderRequest {
    kind: "render";
    context: ExtensionContextClaims;
    point: ExtensionPoint;
    subject: ExtensionSubject | null;
}
/** Body of a button click or form submission. `values` is `{}` for buttons. */
export interface ExtensionActionRequest {
    kind: "action";
    context: ExtensionContextClaims;
    point: ExtensionPoint;
    subject: ExtensionSubject | null;
    actionId: string;
    values: UiFormValues;
}
export type ExtensionRequest = ExtensionRenderRequest | ExtensionActionRequest;
type HeaderSource = Headers | Record<string, string | string[] | undefined>;
/**
 * Verifies a declarative extension POST: the `CheckCourt-Signature` over the raw body (it binds
 * `action_id` and `values` to the token), the context token, and that body, header token and
 * claims agree. Throws `ExtensionVerificationError`.
 */
export declare function verifyExtensionRequest(options: {
    secret: string;
    rawBody: RawBody;
    headers: HeaderSource;
    toleranceSeconds?: number;
    now?: Date | number;
}): Promise<ExtensionRequest>;
