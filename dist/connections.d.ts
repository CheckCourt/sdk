import { type CheckCourtClient } from "./client.js";
import type { components } from "./generated/schema.js";
import type { SharedObjectType } from "./manifest.js";
export type ObjectMetadata = components["schemas"]["ObjectMetadata"];
export type ObjectMetadataEntry = components["schemas"]["ObjectMetadataEntry"];
export type ObjectMetadataWritten = components["schemas"]["ObjectMetadataWritten"];
export type PublishAppEventRequest = components["schemas"]["PublishAppEventRequest"];
export type PublishedAppEvent = components["schemas"]["PublishedAppEvent"];
/**
 * `GET /api/v1/{bookings|courts|members}/{id}/metadata`: your app's own values on the object plus
 * those of other apps you declare under `reads.metadata` and the club connected to yours, grouped
 * by app slug. Club installation tokens (`cca_`) only.
 */
export declare function getObjectMetadata(client: CheckCourtClient, objectType: SharedObjectType, id: string | number): Promise<ObjectMetadata>;
/**
 * `PUT …/{id}/metadata/{key}`: writes one of your keys declared under `shares.metadata`. Any JSON
 * value except `null`, at most 4096 bytes serialized. Connected readers get `app.metadata_changed`.
 */
export declare function putObjectMetadata(client: CheckCourtClient, objectType: SharedObjectType, id: string | number, key: string, value: unknown): Promise<ObjectMetadataWritten>;
/** `DELETE …/{id}/metadata/{key}`: removes your own value; `deleted: false` when there was none. */
export declare function deleteObjectMetadata(client: CheckCourtClient, objectType: SharedObjectType, id: string | number, key: string): Promise<{
    deleted: boolean;
}>;
/**
 * `POST /api/v1/app/events`: publishes an event declared under `emits`. Subscribed apps the club
 * connected to yours receive it as `app.<your slug>.<name>`. At most 60 per minute per installation.
 */
export declare function publishAppEvent(client: CheckCourtClient, event: PublishAppEventRequest): Promise<PublishedAppEvent>;
