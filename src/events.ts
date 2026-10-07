export interface BookingEventData {
  booking_id: string;
  court_id: number;
  date: string;
  start_time: string;
  end_time: string;
  type: string;
}

export interface MemberEventData {
  member_id: string;
  user_id: string;
}

/** `date`, `start_time` and `end_time` are null when the whole court is (un)locked. */
export interface CourtLockEventData {
  court_id: number;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
}

export interface AppLifecycleEventData {
  installation_id: string;
  app_id: string;
  version: number;
}

/** Payloads are thin on purpose: ids and non-personal facts. Fetch details through the API. */
export interface EventDataMap {
  "booking.created": BookingEventData;
  "booking.updated": BookingEventData;
  "booking.cancelled": BookingEventData;
  "booking.checked_in": BookingEventData;
  "member.joined": MemberEventData;
  "member.updated": MemberEventData & { changed_fields: string[] };
  "member.left": MemberEventData;
  "court.locked": CourtLockEventData;
  "court.unlocked": CourtLockEventData;
  "webhook.test": { webhook_endpoint_id: string };
  "app.installed": AppLifecycleEventData;
  "app.uninstalled": AppLifecycleEventData;
  "app.upgraded": AppLifecycleEventData;
  /** The club changed the app's settings; read them with `getInstallation`. */
  "app.settings_updated": AppLifecycleEventData;
}

export type EventType = keyof EventDataMap;

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
] as const satisfies readonly EventType[];

export type SubscribableEventType = (typeof SUBSCRIBABLE_EVENT_TYPES)[number];

/** Delivered to the app they concern without being listed in the manifest. */
export const APP_LIFECYCLE_EVENT_TYPES = [
  "app.installed",
  "app.uninstalled",
  "app.upgraded",
  "app.settings_updated",
] as const satisfies readonly EventType[];

export type AppLifecycleEventType = (typeof APP_LIFECYCLE_EVENT_TYPES)[number];

export const EVENT_TYPES = [
  ...SUBSCRIBABLE_EVENT_TYPES,
  "webhook.test",
  ...APP_LIFECYCLE_EVENT_TYPES,
] as const satisfies readonly EventType[];

export type EventObjectType = "booking" | "court" | "member" | "webhook_endpoint" | "app_installation";

export interface WebhookEventOf<T extends EventType> {
  /** `evt_…`, stable across retries and equal to the `CheckCourt-Event-Id` header: deduplicate on it. */
  id: string;
  type: T;
  created_at: string;
  tenant_id: string;
  /** Present on deliveries to an app installation. */
  installation_id?: string;
  object: { type: EventObjectType | (string & {}); id: string };
  data: EventDataMap[T];
}

/** `data` of `app.metadata_changed`: another app changed or removed a value your app reads. */
export interface AppMetadataChangedEventData {
  object_type: "booking" | "court" | "member";
  object_id: string;
  /** Slug of the app that wrote the value. */
  app: string;
  key: string;
  /** True when the value was removed. */
  deleted: boolean;
}

export const METADATA_CHANGED_EVENT_TYPE = "app.metadata_changed";

/** Type of an event one app publishes to others: `app.<publishing app slug>.<name>`. */
export type AppEventType = `app.${string}.${string}`;

interface ConnectionEventEnvelope<T extends string, D> {
  id: string;
  type: T;
  created_at: string;
  tenant_id: string;
  installation_id?: string;
  /** The `subject` the publisher gave, otherwise its own installation (`app_installation`). */
  object: { type: EventObjectType | (string & {}); id: string };
  data: D;
}

/** Sent to apps the club connected to the writer, for keys they declare under `reads.metadata`. Read the value with `getObjectMetadata`. */
export type AppMetadataChangedEvent = ConnectionEventEnvelope<
  typeof METADATA_CHANGED_EVENT_TYPE,
  AppMetadataChangedEventData
>;

/** An event of another app, delivered when you declare it under `subscribes` and the club approved the connection. */
export type AppEvent<D extends Record<string, unknown> = Record<string, unknown>> = ConnectionEventEnvelope<AppEventType, D>;

/** Events between apps; CheckCourt delivers them only along connections the club approved. */
export type ConnectionEvent = AppMetadataChangedEvent | AppEvent;

export type WebhookEvent = { [T in EventType]: WebhookEventOf<T> }[EventType] | ConnectionEvent;

export function appEventType(appSlug: string, name: string): AppEventType {
  return `app.${appSlug}.${name}`;
}

/**
 * Narrows to an event published by another app, optionally a specific one:
 * `if (isAppEvent<DoorOpened>(event, "door-co", "door_opened")) event.data.court_id`.
 */
export function isAppEvent<D extends Record<string, unknown> = Record<string, unknown>>(
  event: WebhookEvent,
  appSlug?: string,
  name?: string,
): event is AppEvent<D> {
  const match = /^app\.([a-z0-9](?:[a-z0-9-]*[a-z0-9])?)\.([a-z][a-z0-9_]*)$/.exec(event.type);
  if (!match) return false;
  return (appSlug === undefined || match[1] === appSlug) && (name === undefined || match[2] === name);
}

export function isMetadataChangedEvent(event: WebhookEvent): event is AppMetadataChangedEvent {
  return event.type === METADATA_CHANGED_EVENT_TYPE;
}
