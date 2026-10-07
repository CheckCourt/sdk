import { unwrap, type CheckCourtClient } from "./client.js";
import type { components } from "./generated/schema.js";
import type { SharedObjectType } from "./manifest.js";

export type ObjectMetadata = components["schemas"]["ObjectMetadata"];
export type ObjectMetadataEntry = components["schemas"]["ObjectMetadataEntry"];
export type ObjectMetadataWritten = components["schemas"]["ObjectMetadataWritten"];
export type PublishAppEventRequest = components["schemas"]["PublishAppEventRequest"];
export type PublishedAppEvent = components["schemas"]["PublishedAppEvent"];

function courtId(id: string | number): number {
  const n = typeof id === "number" ? id : Number(id);
  if (!Number.isSafeInteger(n)) throw new TypeError(`Court ids are integers, got ${String(id)}`);
  return n;
}

/**
 * `GET /api/v1/{bookings|courts|members}/{id}/metadata`: your app's own values on the object plus
 * those of other apps you declare under `reads.metadata` and the club connected to yours, grouped
 * by app slug. Club installation tokens (`cca_`) only.
 */
export async function getObjectMetadata(
  client: CheckCourtClient,
  objectType: SharedObjectType,
  id: string | number,
): Promise<ObjectMetadata> {
  switch (objectType) {
    case "booking":
      return unwrap(client.GET("/bookings/{id}/metadata", { params: { path: { id: String(id) } } }));
    case "court":
      return unwrap(client.GET("/courts/{id}/metadata", { params: { path: { id: courtId(id) } } }));
    case "member":
      return unwrap(client.GET("/members/{id}/metadata", { params: { path: { id: String(id) } } }));
  }
}

/**
 * `PUT …/{id}/metadata/{key}`: writes one of your keys declared under `shares.metadata`. Any JSON
 * value except `null`, at most 4096 bytes serialized. Connected readers get `app.metadata_changed`.
 */
export async function putObjectMetadata(
  client: CheckCourtClient,
  objectType: SharedObjectType,
  id: string | number,
  key: string,
  value: unknown,
): Promise<ObjectMetadataWritten> {
  const body = { value };
  switch (objectType) {
    case "booking":
      return unwrap(client.PUT("/bookings/{id}/metadata/{key}", { params: { path: { id: String(id), key } }, body }));
    case "court":
      return unwrap(client.PUT("/courts/{id}/metadata/{key}", { params: { path: { id: courtId(id), key } }, body }));
    case "member":
      return unwrap(client.PUT("/members/{id}/metadata/{key}", { params: { path: { id: String(id), key } }, body }));
  }
}

/** `DELETE …/{id}/metadata/{key}`: removes your own value; `deleted: false` when there was none. */
export async function deleteObjectMetadata(
  client: CheckCourtClient,
  objectType: SharedObjectType,
  id: string | number,
  key: string,
): Promise<{ deleted: boolean }> {
  switch (objectType) {
    case "booking":
      return unwrap(client.DELETE("/bookings/{id}/metadata/{key}", { params: { path: { id: String(id), key } } }));
    case "court":
      return unwrap(client.DELETE("/courts/{id}/metadata/{key}", { params: { path: { id: courtId(id), key } } }));
    case "member":
      return unwrap(client.DELETE("/members/{id}/metadata/{key}", { params: { path: { id: String(id), key } } }));
  }
}

/**
 * `POST /api/v1/app/events`: publishes an event declared under `emits`. Subscribed apps the club
 * connected to yours receive it as `app.<your slug>.<name>`. At most 60 per minute per installation.
 */
export async function publishAppEvent(
  client: CheckCourtClient,
  event: PublishAppEventRequest,
): Promise<PublishedAppEvent> {
  return unwrap(client.POST("/app/events", { body: event }));
}
