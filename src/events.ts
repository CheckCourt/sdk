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

export type WebhookEvent = { [T in EventType]: WebhookEventOf<T> }[EventType];
