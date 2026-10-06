import type { SubscribableEventType } from "./events.js";
export declare const MANIFEST_VERSION = 1;
export declare const INSTALL_TARGETS: readonly ["tenant", "user"];
export type InstallTarget = (typeof INSTALL_TARGETS)[number];
export declare const USER_LINKING_MODES: readonly ["none", "optional", "required"];
export type UserLinking = (typeof USER_LINKING_MODES)[number];
export declare const EXTENSION_KINDS: readonly ["declarative", "iframe"];
export type ExtensionKind = (typeof EXTENSION_KINDS)[number];
/** Where each point is shown and how it may render. */
export declare const EXTENSION_POINTS: {
    readonly "app.settings": {
        readonly targets: readonly ["tenant"];
        readonly kinds: readonly ["declarative", "iframe"];
    };
    readonly "booking.detail.panel": {
        readonly targets: readonly ["tenant", "user"];
        readonly kinds: readonly ["declarative", "iframe"];
    };
    readonly "member.profile.section": {
        readonly targets: readonly ["tenant", "user"];
        readonly kinds: readonly ["declarative", "iframe"];
    };
    readonly "dashboard.widget": {
        readonly targets: readonly ["tenant", "user"];
        readonly kinds: readonly ["declarative"];
    };
    readonly "booking.action": {
        readonly targets: readonly ["tenant", "user"];
        readonly kinds: readonly ["declarative"];
    };
    readonly "kiosk.tile": {
        readonly targets: readonly ["tenant"];
        readonly kinds: readonly ["declarative"];
    };
};
export type ExtensionPoint = keyof typeof EXTENSION_POINTS;
/** Scope the installation needs (in `tenantScopes` or `userScopes`) before the point hands it a subject id. */
export declare const EXTENSION_POINT_SCOPE: {
    readonly "app.settings": null;
    readonly "booking.detail.panel": "bookings:read";
    readonly "booking.action": "bookings:read";
    readonly "member.profile.section": "members:read";
    readonly "dashboard.widget": null;
    readonly "kiosk.tile": null;
};
/** Every scope an app may request. Role, app, webhook, key, billing and AVV management are reserved for people. */
export declare const GRANTABLE_SCOPES: readonly ["courts:read", "courts:read_confidential", "courts:write", "bookings:read", "bookings:read_confidential", "bookings:write", "bookings:cancel", "bookings:edit", "bookings:export", "members:read", "members:read_confidential", "members:invite", "members:write", "members:delete", "teams:read", "teams:write", "policies:read", "policies:read_confidential", "policies:write", "categories:read", "categories:write", "invites:read", "invites:write", "settings:read", "settings:read_confidential", "settings:write", "guest_fees:read", "guest_fees:write", "audit:read", "announcements:read", "announcements:write", "events:read", "events:write", "posts:read", "posts:write", "posts:moderate", "court_layout:read", "court_layout:write", "work_hours:read", "work_hours:write", "work_hours:manage", "compliance:read", "kiosk:manage", "trainer_blocks:write", "analytics:read", "embeds:manage", "webhooks:read"];
export type GrantableScope = (typeof GRANTABLE_SCOPES)[number];
type ExtensionOf<P extends ExtensionPoint> = {
    point: P;
    kind: (typeof EXTENSION_POINTS)[P]["kinds"][number];
    /** https; http://localhost is accepted outside production. */
    url: string;
} & (P extends "booking.action" ? {
    label: string;
} : {
    label?: string;
});
/** One entry of `extensions`; `kind` and `label` are checked per point at compile time. */
export type ManifestExtension = {
    [P in ExtensionPoint]: ExtensionOf<P>;
}[ExtensionPoint];
interface SettingsPropertyBase {
    /** 1 to 80 characters. */
    title: string;
    /** Up to 300 characters. */
    description?: string;
}
export type SettingsProperty = (SettingsPropertyBase & {
    type: "string";
    /** Rendered as a select. Excludes `maxLength`. */
    enum?: readonly string[];
    default?: string;
    maxLength?: number;
}) | (SettingsPropertyBase & {
    type: "number";
    default?: number;
    minimum?: number;
    maximum?: number;
}) | (SettingsPropertyBase & {
    type: "boolean";
    default?: boolean;
});
/** The JSON-Schema subset CheckCourt renders as the settings form (at most 30 properties). */
export interface SettingsSchema {
    type: "object";
    /** Keys match `^[a-zA-Z][a-zA-Z0-9_]{0,39}$`. */
    properties: Record<string, SettingsProperty>;
    required?: readonly string[];
    additionalProperties?: false;
}
export interface DataProcessing {
    /** At least one, e.g. "Buchungsdaten". */
    categories: readonly string[];
    /** Up to 500 characters. */
    purpose: string;
    storageLocation: "EU" | "non-EU";
    avvRequired: boolean;
}
export interface Manifest {
    manifestVersion?: typeof MANIFEST_VERSION;
    installTargets: readonly InstallTarget[];
    /** Lets a club installation link member accounts via OAuth. Only with `tenant`. */
    userLinking?: UserLinking;
    tenantScopes?: readonly GrantableScope[];
    userScopes?: readonly GrantableScope[];
    /** Lifecycle events (`app.*`) arrive without being listed. */
    events?: readonly SubscribableEventType[];
    /** At most 20. */
    extensions?: readonly ManifestExtension[];
    settingsSchema?: SettingsSchema;
    dataProcessing: DataProcessing;
}
/**
 * Identity function that gives editor completion and compile-time checks for a manifest.
 * CheckCourt validates the rest on upload (scope and event pairing, URL rules, lengths).
 */
export declare function defineManifest<const M extends Manifest>(manifest: M): M;
export {};
