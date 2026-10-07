import { describe, expect, it } from "vitest";
import { apiKeyAuth, createCheckCourtClient } from "../src/index.js";
import {
  deleteObjectMetadata,
  getObjectMetadata,
  publishAppEvent,
  putObjectMetadata,
} from "../src/connections.js";
import { appEventType, isAppEvent, isMetadataChangedEvent, type WebhookEvent } from "../src/events.js";
import { defineManifest } from "../src/manifest.js";
import { json, mockFetch } from "./helpers.js";

function client(fetch: ReturnType<typeof mockFetch>) {
  return createCheckCourtClient({ baseUrl: "https://cc.example", auth: apiKeyAuth("cca_test"), fetch });
}

describe("object metadata helpers", () => {
  it("call the metadata routes per object type", async () => {
    const fetch = mockFetch((req) =>
      req.method === "GET"
        ? json(200, { object: { type: "court", id: "3" }, metadata: {} })
        : req.method === "PUT"
          ? json(200, { object: { type: "booking", id: "b1" }, key: "video_url", value: "v", updated_at: "x" })
          : json(200, { deleted: true }),
    );
    const c = client(fetch);
    await getObjectMetadata(c, "court", "3");
    await putObjectMetadata(c, "booking", "b1", "video_url", "https://v.example/1");
    expect(await deleteObjectMetadata(c, "member", "u1", "level")).toEqual({ deleted: true });

    expect(fetch.calls.map((r) => `${r.method} ${new URL(r.url).pathname}`)).toEqual([
      "GET /api/v1/courts/3/metadata",
      "PUT /api/v1/bookings/b1/metadata/video_url",
      "DELETE /api/v1/members/u1/metadata/level",
    ]);
    expect(JSON.parse(fetch.calls[1]!.body)).toEqual({ value: "https://v.example/1" });
    await expect(getObjectMetadata(c, "court", "abc")).rejects.toThrow(TypeError);
  });

  it("publishes app events", async () => {
    const fetch = mockFetch(() => json(200, { id: "evt_1", type: "app.door-co.door_opened" }));
    const published = await publishAppEvent(client(fetch), { name: "door_opened", data: { court_id: 3 } });
    expect(published.type).toBe("app.door-co.door_opened");
    const [call] = fetch.calls;
    expect(call!.method).toBe("POST");
    expect(new URL(call!.url).pathname).toBe("/api/v1/app/events");
    expect(JSON.parse(call!.body)).toEqual({ name: "door_opened", data: { court_id: 3 } });
  });
});

describe("events between apps", () => {
  const base = { id: "evt_1", created_at: "x", tenant_id: "t1", object: { type: "app_installation", id: "inst_1" } };

  it("narrows app events and metadata changes", () => {
    const door = { ...base, type: appEventType("door-co", "door_opened"), data: { court_id: 3 } } as WebhookEvent;
    expect(isAppEvent(door)).toBe(true);
    expect(isAppEvent(door, "door-co", "door_opened")).toBe(true);
    expect(isAppEvent(door, "other")).toBe(false);
    expect(isAppEvent({ ...base, type: "app.installed", data: {} } as unknown as WebhookEvent)).toBe(false);

    const changed = {
      ...base,
      type: "app.metadata_changed",
      data: { object_type: "booking", object_id: "b1", app: "wingfield", key: "video_url", deleted: false },
    } as WebhookEvent;
    expect(isMetadataChangedEvent(changed)).toBe(true);
    expect(isAppEvent(changed)).toBe(false);
  });

  it("types the manifest fields", () => {
    const manifest = defineManifest({
      installTargets: ["tenant"],
      tenantScopes: ["bookings:read"],
      dataProcessing: { categories: ["Videolink"], purpose: "Videos", storageLocation: "EU", avvRequired: true },
      shares: { metadata: [{ key: "video_url", object: "booking", description: "Videolink", data_categories: ["Videolink"] }] },
      reads: { metadata: [{ app: "other", key: "score", object: "booking" }] },
      emits: [
        {
          name: "video_ready",
          description: "Video ist fertig",
          data_categories: ["Videolink"],
          schema: { type: "object", properties: { duration: { type: "integer", minimum: 0 } } },
        },
      ],
      subscribes: [{ app: "door-co", event: "door_opened" }],
    });
    expect(manifest.emits[0].name).toBe("video_ready");
  });
});
