import type { ExtensionPoint } from "./manifest.js";
import type { UiFormValues } from "./ui.js";
import { type RawBody } from "./webhooks.js";
export * from "./ui.js";
export { ExtensionVerificationError, type ExtensionVerificationFailure } from "./errors.js";
export { EXTENSION_POINTS, STATIC_ACTION_POINTS, type ExtensionKind, type ExtensionPoint, type StaticActionPoint, } from "./manifest.js";
export declare const CONTEXT_HEADER = "CheckCourt-Context";
export declare const CONTEXT_ISSUER = "checkcourt";
export declare const CONTEXT_TTL_SECONDS = 300;
export declare const CLOCK_LEEWAY_SECONDS = 30;
/** `action_id` a `booking.action` button sends when it is clicked. */
export declare const BOOKING_ACTION_INVOKE = "invoke";
/** "booking_plan": the plan of one day; its id is the date (YYYY-MM-DD). */
export type ExtensionSubjectType = "booking" | "member" | "installation" | "booking_plan";
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
export interface MemberListCapabilities {
    can_edit_members: boolean;
}
export interface BookingPlanCapabilities {
    can_edit_bookings: boolean;
}
export interface PointCapabilities {
    "app.settings": AppSettingsCapabilities;
    "booking.detail.panel": BookingCapabilities;
    "booking.action": BookingCapabilities;
    "member.profile.section": MemberCapabilities;
    "dashboard.widget": DashboardCapabilities;
    "kiosk.tile": Record<string, never>;
    "court.annotation": Record<string, never>;
    "member.list.column": MemberListCapabilities;
    "member.settings.section": Record<string, never>;
    "booking.hint": Record<string, never>;
    "booking_plan.action": BookingPlanCapabilities;
    "sidebar.action": Record<string, never>;
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
    "court.annotation": null;
    "member.list.column": null;
    "member.settings.section": null;
    "booking.hint": null;
    /** `id` is the plan's day, YYYY-MM-DD. */
    "booking_plan.action": {
        type: "booking_plan";
        id: string;
    };
    "sidebar.action": null;
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
/** A court of the plan a `court.annotation` or `booking_plan.action` request covers. */
export interface AnnotationCourt {
    id: number;
    name: string;
}
/** A member on the visible page of the member list. */
export interface ColumnMember {
    /** The club membership id, as `member_id` in `member.*` events; key your column values by it. */
    member_id: string;
    user_id: string;
}
export declare const BOOKING_DRAFT_TYPES: readonly ["regular", "training", "mannschaft"];
export type BookingDraftType = (typeof BOOKING_DRAFT_TYPES)[number];
/** The booking a member is about to confirm, sent with `booking.hint`. */
export interface BookingDraft {
    court_id: number;
    /** YYYY-MM-DD. */
    date: string;
    /** HH:MM. */
    start_time: string;
    /** HH:MM. */
    end_time: string;
    type: BookingDraftType;
}
/** Body of a declarative render request. */
export interface ExtensionRenderRequest {
    kind: "render";
    context: ExtensionContextClaims;
    point: ExtensionPoint;
    subject: ExtensionSubject | null;
    /** `court.annotation` and `booking_plan.action`: the plan's day, YYYY-MM-DD. */
    date?: string;
    /** `court.annotation` (one document for all) and `booking_plan.action`: every court of the plan. */
    courts?: AnnotationCourt[];
    /** `member.list.column`: the members on the visible page. */
    members?: ColumnMember[];
    /** `booking.hint`: the booking being drafted. */
    draft?: BookingDraft;
}
/** Body of a button click or form submission. `values` is `{}` for buttons. */
export interface ExtensionActionRequest {
    kind: "action";
    context: ExtensionContextClaims;
    point: ExtensionPoint;
    subject: ExtensionSubject | null;
    actionId: string;
    values: UiFormValues;
    /** `booking_plan.action`: the plan's day, YYYY-MM-DD. */
    date?: string;
    /** `booking_plan.action`: every court of the plan, so a form can offer a court select. */
    courts?: AnnotationCourt[];
}
export type ExtensionRequest = ExtensionRenderRequest | ExtensionActionRequest;
type HeaderSource = Headers | Record<string, string | string[] | undefined>;
/**
 * Verifies a declarative extension POST: the `CheckCourt-Signature` over the raw body (it binds
 * `action_id` and `values` to the token), the context token, and that body, header token and
 * claims agree. Renders at `court.annotation`, `member.list.column` and `booking.hint` also
 * carry `date` and `courts`, `members` or `draft`; `booking_plan.action` renders and actions
 * carry the plan's `date` and `courts`. Throws `ExtensionVerificationError`.
 */
export declare function verifyExtensionRequest(options: {
    secret: string;
    rawBody: RawBody;
    headers: HeaderSource;
    toleranceSeconds?: number;
    now?: Date | number;
}): Promise<ExtensionRequest>;
