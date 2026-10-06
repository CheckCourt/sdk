/** Events a manifest may list under `events`. */
export const SUBSCRIBABLE_EVENT_TYPES = [
    "booking.created",
    "booking.updated",
    "booking.cancelled",
    "booking.checked_in",
    "member.joined",
    "member.updated",
    "member.left",
    "court.locked",
    "court.unlocked",
];
/** Delivered to the app they concern without being listed in the manifest. */
export const APP_LIFECYCLE_EVENT_TYPES = [
    "app.installed",
    "app.uninstalled",
    "app.upgraded",
    "app.settings_updated",
];
export const EVENT_TYPES = [
    ...SUBSCRIBABLE_EVENT_TYPES,
    "webhook.test",
    ...APP_LIFECYCLE_EVENT_TYPES,
];
