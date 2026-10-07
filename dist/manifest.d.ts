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
    readonly "court.annotation": {
        readonly targets: readonly ["tenant"];
        readonly kinds: readonly ["declarative"];
    };
    readonly "member.list.column": {
        readonly targets: readonly ["tenant"];
        readonly kinds: readonly ["declarative"];
    };
    readonly "member.settings.section": {
        readonly targets: readonly ["user"];
        readonly kinds: readonly ["declarative", "iframe"];
    };
    readonly "booking.hint": {
        readonly targets: readonly ["tenant"];
        readonly kinds: readonly ["declarative"];
    };
    readonly "booking_plan.action": {
        readonly targets: readonly ["tenant"];
        readonly kinds: readonly ["declarative"];
    };
    readonly "sidebar.action": {
        readonly targets: readonly ["tenant", "user"];
        readonly kinds: readonly ["declarative"];
    };
    readonly "nav.page": {
        readonly targets: readonly ["tenant", "user"];
        readonly kinds: readonly ["declarative", "iframe"];
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
    readonly "court.annotation": "courts:read";
    readonly "member.list.column": "members:read";
    readonly "member.settings.section": null;
    readonly "booking.hint": "bookings:read";
    readonly "booking_plan.action": "courts:read";
    readonly "sidebar.action": null;
    readonly "nav.page": null;
};
/** Buttons CheckCourt draws from the manifest alone, before the app is ever called. */
export declare const STATIC_ACTION_POINTS: readonly ["booking_plan.action", "sidebar.action"];
export type StaticActionPoint = (typeof STATIC_ACTION_POINTS)[number];
/** Longest `label` of a static action. */
export declare const STATIC_ACTION_LABEL_MAX = 24;
/** Bounds of an iframe extension's initial `height` in pixels. */
export declare const IFRAME_EXTENSION_HEIGHT_MIN = 120;
export declare const IFRAME_EXTENSION_HEIGHT_MAX = 2000;
/** Keys of app permissions: lowercase letters, digits and `_`, starting with a letter, at most 40 characters. */
export declare const APP_PERMISSION_KEY_PATTERN: RegExp;
/** Most permissions one manifest may declare. */
export declare const MAX_APP_PERMISSIONS = 10;
export declare const APP_PERMISSION_LABEL_MAX = 60;
export declare const APP_PERMISSION_DESCRIPTION_MAX = 200;
/**
 * A right the app offers the club's roles, e.g. who may manage its ladder. The club decides in
 * its role editor which roles hold it; only administrators hold it from the start. Viewers' flags
 * arrive as `viewer.capabilities.permissions` in the extension context.
 */
export interface AppPermission {
    /** Matches `APP_PERMISSION_KEY_PATTERN`, unique within the manifest. */
    key: string;
    /** Shown in the role editor, German, 1 to 60 characters, e.g. "Rangliste verwalten". */
    label: string;
    /** Up to 200 characters. */
    description?: string;
}
/** lucide icon names a static action or `nav.page` may use as `icon`. */
export declare const APP_ACTION_ICONS: readonly ["bell", "calendar", "calendar-check", "camera", "chart-column", "circle-help", "clipboard-list", "clock", "cloud-rain", "door-open", "file-text", "flag", "heart-pulse", "info", "key-round", "lightbulb", "link", "list-checks", "lock-open", "map-pin", "megaphone", "message-square", "receipt", "send", "sparkles", "star", "sun", "thermometer", "ticket", "triangle-alert", "trophy", "user-round", "users", "wallet", "wrench"];
export type AppActionIcon = (typeof APP_ACTION_ICONS)[number];
/** Every scope an app may request. Role, app, webhook, key, billing and AVV management are reserved for people. */
export declare const GRANTABLE_SCOPES: readonly ["courts:read", "courts:read_confidential", "courts:write", "bookings:read", "bookings:read_confidential", "bookings:write", "bookings:cancel", "bookings:edit", "bookings:export", "members:read", "members:read_confidential", "members:invite", "members:write", "members:delete", "teams:read", "teams:write", "policies:read", "policies:read_confidential", "policies:write", "categories:read", "categories:write", "invites:read", "invites:write", "settings:read", "settings:read_confidential", "settings:write", "guest_fees:read", "guest_fees:write", "audit:read", "announcements:read", "announcements:write", "events:read", "events:write", "posts:read", "posts:write", "posts:moderate", "court_layout:read", "court_layout:write", "work_hours:read", "work_hours:write", "work_hours:manage", "compliance:read", "kiosk:manage", "trainer_blocks:write", "analytics:read", "embeds:manage", "webhooks:read", "notifications:send"];
export type GrantableScope = (typeof GRANTABLE_SCOPES)[number];
type KindOf<K extends ExtensionKind> = K extends "iframe" ? {
    kind: K;
    /**
     * Initial frame height in whole pixels, `IFRAME_EXTENSION_HEIGHT_MIN` to `IFRAME_EXTENSION_HEIGHT_MAX`.
     * Without it the frame starts at 240 pixels, a `nav.page` fills the page. Resize messages override it.
     */
    height?: number;
} : {
    kind: K;
    height?: never;
};
type ExtensionOf<P extends ExtensionPoint> = {
    point: P;
    /** https; http://localhost is accepted outside production. */
    url: string;
} & KindOf<(typeof EXTENSION_POINTS)[P]["kinds"][number]> & (P extends StaticActionPoint ? {
    /** Button text, 1 to 24 characters (`STATIC_ACTION_LABEL_MAX`). */
    label: string;
    icon?: AppActionIcon;
} : P extends "nav.page" ? {
    /** Navigation entry and page title, 1 to 24 characters (`STATIC_ACTION_LABEL_MAX`). */
    label: string;
    icon: AppActionIcon;
    /**
     * Key of one of the manifest's `permissions`: only holders see the entry and may open
     * the page; CheckCourt enforces it for the page and its actions.
     */
    requires?: string;
} : P extends "booking.action" ? {
    label: string;
    icon?: never;
} : P extends "member.list.column" ? {
    label?: string;
    icon?: never;
} : {
    label?: string;
    icon?: never;
});
/**
 * One entry of `extensions`; `kind`, `label`, `icon` and `height` are checked per point at compile time.
 * Every point may appear once, except `booking.action`; an app has at most one `nav.page`.
 */
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
/** Club objects apps can attach metadata to. */
export declare const SHARED_OBJECT_TYPES: readonly ["booking", "court", "member"];
export type SharedObjectType = (typeof SHARED_OBJECT_TYPES)[number];
/** Read scope both the sharing and the reading app need in `tenantScopes` for an object type. */
export declare const SHARED_OBJECT_SCOPE: {
    readonly booking: "bookings:read";
    readonly court: "courts:read";
    readonly member: "members:read";
};
/** Metadata keys and event names: `^[a-z][a-z0-9_]{0,39}$`. */
export declare const CONNECTION_NAME_PATTERN: RegExp;
/** Serialized size limit of a metadata value and of event data. */
export declare const MAX_SHARED_VALUE_BYTES = 4096;
/** A metadata key the app writes on club objects and lets other apps read once the club approves. */
export interface SharedMetadata {
    key: string;
    object: SharedObjectType;
    /** Shown to the club when it approves a connection, 1 to 200 characters, e.g. "Videolink". */
    description: string;
    /** 1 to 10 categories, shown in the approval dialog, e.g. ["Videoaufzeichnung"]. */
    data_categories: readonly string[];
}
/** Metadata of another app this app wants to read: that app's slug, the key and the object type. */
export interface ReadMetadata {
    app: string;
    key: string;
    object: SharedObjectType;
}
export type AppEventProperty = {
    type: "string";
    description?: string;
    /** Excludes `maxLength`. */
    enum?: readonly string[];
    maxLength?: number;
} | {
    type: "number" | "integer";
    description?: string;
    minimum?: number;
    maximum?: number;
} | {
    type: "boolean";
    description?: string;
};
/** JSON-Schema subset for event data: flat objects of strings, numbers, integers and booleans (at most 30 properties). */
export interface AppEventSchema {
    type: "object";
    /** Keys match `^[a-zA-Z][a-zA-Z0-9_]{0,39}$`. */
    properties: Record<string, AppEventProperty>;
    required?: readonly string[];
    /** `false` rejects unknown keys. */
    additionalProperties?: boolean;
}
/** An event the app publishes with `publishAppEvent`; subscribers receive it as `app.<your slug>.<name>`. */
export interface EmittedEvent {
    name: string;
    /** 1 to 200 characters, shown in the approval dialog. */
    description: string;
    data_categories: readonly string[];
    /** Published data is validated against it. */
    schema?: AppEventSchema;
}
/** An event of another app this app wants to receive. */
export interface SubscribedEvent {
    app: string;
    event: string;
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
    /** Rights the app offers the club's roles (at most 10). Club installations only. */
    permissions?: readonly AppPermission[];
    dataProcessing: DataProcessing;
    /** Metadata other apps may read (at most 20). Club installations only. */
    shares?: {
        metadata: readonly SharedMetadata[];
    };
    /** Metadata of other apps this app reads (at most 50). Club installations only. */
    reads?: {
        metadata: readonly ReadMetadata[];
    };
    /** Events this app publishes to connected apps (at most 20). Club installations only. */
    emits?: readonly EmittedEvent[];
    /** Events of other apps this app receives (at most 50). Club installations only. */
    subscribes?: readonly SubscribedEvent[];
}
/**
 * Identity function that gives editor completion and compile-time checks for a manifest.
 * CheckCourt validates the rest on upload (scope and event pairing, URL rules, lengths).
 */
export declare function defineManifest<const M extends Manifest>(manifest: M): M;
export {};
