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
export const METADATA_CHANGED_EVENT_TYPE = "app.metadata_changed";
export function appEventType(appSlug, name) {
    return `app.${appSlug}.${name}`;
}
/**
 * Narrows to an event published by another app, optionally a specific one:
 * `if (isAppEvent<DoorOpened>(event, "door-co", "door_opened")) event.data.court_id`.
 */
export function isAppEvent(event, appSlug, name) {
    const match = /^app\.([a-z0-9](?:[a-z0-9-]*[a-z0-9])?)\.([a-z][a-z0-9_]*)$/.exec(event.type);
    if (!match)
        return false;
    return (appSlug === undefined || match[1] === appSlug) && (name === undefined || match[2] === name);
}
export function isMetadataChangedEvent(event) {
    return event.type === METADATA_CHANGED_EVENT_TYPE;
}
