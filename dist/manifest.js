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
};
/** Scope the installation needs (in `tenantScopes` or `userScopes`) before the point hands it a subject id. */
export const EXTENSION_POINT_SCOPE = {
    "app.settings": null,
    "booking.detail.panel": "bookings:read",
    "booking.action": "bookings:read",
    "member.profile.section": "members:read",
    "dashboard.widget": null,
    "kiosk.tile": null,
};
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
];
/**
 * Identity function that gives editor completion and compile-time checks for a manifest.
 * CheckCourt validates the rest on upload (scope and event pairing, URL rules, lengths).
 */
export function defineManifest(manifest) {
    return manifest;
}
