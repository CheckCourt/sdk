export const MANIFEST_VERSION = 1;
export const INSTALL_TARGETS = ["tenant", "user"];
export const USER_LINKING_MODES = ["none", "optional", "required"];
export const EXTENSION_KINDS = ["declarative", "iframe"];
/** Where each point is shown and how it may render. */
export const EXTENSION_POINTS = {
    "app.settings": { targets: ["tenant"], kinds: ["declarative", "iframe"] },
    "booking.detail.panel": { targets: ["tenant", "user"], kinds: ["declarative", "iframe"] },
    "member.profile.section": { targets: ["tenant", "user"], kinds: ["declarative", "iframe"] },
    "dashboard.widget": { targets: ["tenant", "user"], kinds: ["declarative"] },
    "booking.action": { targets: ["tenant", "user"], kinds: ["declarative"] },
    "kiosk.tile": { targets: ["tenant"], kinds: ["declarative"] },
    "court.annotation": { targets: ["tenant"], kinds: ["declarative"] },
    "member.list.column": { targets: ["tenant"], kinds: ["declarative"] },
    "member.settings.section": { targets: ["user"], kinds: ["declarative", "iframe"] },
    "booking.hint": { targets: ["tenant"], kinds: ["declarative"] },
    "booking_plan.action": { targets: ["tenant"], kinds: ["declarative"] },
    "sidebar.action": { targets: ["tenant", "user"], kinds: ["declarative"] },
};
/** Scope the installation needs (in `tenantScopes` or `userScopes`) before the point hands it a subject id. */
export const EXTENSION_POINT_SCOPE = {
    "app.settings": null,
    "booking.detail.panel": "bookings:read",
    "booking.action": "bookings:read",
    "member.profile.section": "members:read",
    "dashboard.widget": null,
    "kiosk.tile": null,
    "court.annotation": "courts:read",
    "member.list.column": "members:read",
    "member.settings.section": null,
    "booking.hint": "bookings:read",
    "booking_plan.action": "courts:read",
    "sidebar.action": null,
};
/** Buttons CheckCourt draws from the manifest alone, before the app is ever called. */
export const STATIC_ACTION_POINTS = ["booking_plan.action", "sidebar.action"];
/** Longest `label` of a static action. */
export const STATIC_ACTION_LABEL_MAX = 24;
/** lucide icon names a static action may use as `icon`. */
export const APP_ACTION_ICONS = [
    "bell",
    "calendar",
    "calendar-check",
    "camera",
    "chart-column",
    "circle-help",
    "clipboard-list",
    "clock",
    "cloud-rain",
    "door-open",
    "file-text",
    "flag",
    "heart-pulse",
    "info",
    "key-round",
    "lightbulb",
    "link",
    "list-checks",
    "lock-open",
    "map-pin",
    "megaphone",
    "message-square",
    "receipt",
    "send",
    "sparkles",
    "star",
    "sun",
    "thermometer",
    "ticket",
    "triangle-alert",
    "trophy",
    "user-round",
    "users",
    "wallet",
    "wrench",
];
/** Every scope an app may request. Role, app, webhook, key, billing and AVV management are reserved for people. */
export const GRANTABLE_SCOPES = [
    "courts:read",
    "courts:read_confidential",
    "courts:write",
    "bookings:read",
    "bookings:read_confidential",
    "bookings:write",
    "bookings:cancel",
    "bookings:edit",
    "bookings:export",
    "members:read",
    "members:read_confidential",
    "members:invite",
    "members:write",
    "members:delete",
    "teams:read",
    "teams:write",
    "policies:read",
    "policies:read_confidential",
    "policies:write",
    "categories:read",
    "categories:write",
    "invites:read",
    "invites:write",
    "settings:read",
    "settings:read_confidential",
    "settings:write",
    "guest_fees:read",
    "guest_fees:write",
    "audit:read",
    "announcements:read",
    "announcements:write",
    "events:read",
    "events:write",
    "posts:read",
    "posts:write",
    "posts:moderate",
    "court_layout:read",
    "court_layout:write",
    "work_hours:read",
    "work_hours:write",
    "work_hours:manage",
    "compliance:read",
    "kiosk:manage",
    "trainer_blocks:write",
    "analytics:read",
    "embeds:manage",
    "webhooks:read",
    // App-only: no club role holds it; a member app gets it from the member's consent.
    "notifications:send",
];
/** Club objects apps can attach metadata to. */
export const SHARED_OBJECT_TYPES = ["booking", "court", "member"];
/** Read scope both the sharing and the reading app need in `tenantScopes` for an object type. */
export const SHARED_OBJECT_SCOPE = {
    booking: "bookings:read",
    court: "courts:read",
    member: "members:read",
};
/** Metadata keys and event names: `^[a-z][a-z0-9_]{0,39}$`. */
export const CONNECTION_NAME_PATTERN = /^[a-z][a-z0-9_]{0,39}$/;
/** Serialized size limit of a metadata value and of event data. */
export const MAX_SHARED_VALUE_BYTES = 4096;
/**
 * Identity function that gives editor completion and compile-time checks for a manifest.
 * CheckCourt validates the rest on upload (scope and event pairing, URL rules, lengths).
 */
export function defineManifest(manifest) {
    return manifest;
}
