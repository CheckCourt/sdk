import { describe, expect, it } from "vitest";
import { exampleManifests } from "../examples/manifests.js";
import {
  APP_ACTION_ICONS,
  EXTENSION_POINTS,
  EXTENSION_POINT_SCOPE,
  IFRAME_EXTENSION_HEIGHT_MAX,
  IFRAME_EXTENSION_HEIGHT_MIN,
  STATIC_ACTION_LABEL_MAX,
  STATIC_ACTION_POINTS,
  defineManifest,
  type Manifest,
  type ManifestExtension,
} from "../src/manifest.js";

const base = {
  installTargets: ["tenant"],
  dataProcessing: { categories: ["Platzdaten"], purpose: "Test", storageLocation: "EU", avvRequired: false },
} as const;

describe("manifest", () => {
  it("lists the host surface points with their targets, kinds and scopes", () => {
    expect(Object.keys(EXTENSION_POINTS)).toEqual([
      "app.settings",
      "booking.detail.panel",
      "member.profile.section",
      "dashboard.widget",
      "booking.action",
      "kiosk.tile",
      "court.annotation",
      "member.list.column",
      "member.settings.section",
      "booking.hint",
      "booking_plan.action",
      "sidebar.action",
      "nav.page",
    ]);
    expect(EXTENSION_POINTS["member.settings.section"]).toEqual({ targets: ["user"], kinds: ["declarative", "iframe"] });
    expect(EXTENSION_POINTS["sidebar.action"]).toEqual({ targets: ["tenant", "user"], kinds: ["declarative"] });
    expect(EXTENSION_POINTS["nav.page"]).toEqual({ targets: ["tenant", "user"], kinds: ["declarative", "iframe"] });
    expect(EXTENSION_POINT_SCOPE).toMatchObject({
      "court.annotation": "courts:read",
      "member.list.column": "members:read",
      "member.settings.section": null,
      "booking.hint": "bookings:read",
      "booking_plan.action": "courts:read",
      "sidebar.action": null,
      "nav.page": null,
    });
    expect(Object.keys(EXTENSION_POINT_SCOPE).sort()).toEqual(Object.keys(EXTENSION_POINTS).sort());
  });

  it("exports the static action points, label limit and icons", () => {
    expect(STATIC_ACTION_POINTS).toEqual(["booking_plan.action", "sidebar.action"]);
    expect(STATIC_ACTION_LABEL_MAX).toBe(24);
    expect(APP_ACTION_ICONS).toHaveLength(35);
    expect(new Set(APP_ACTION_ICONS).size).toBe(APP_ACTION_ICONS.length);
    expect(APP_ACTION_ICONS).toContain("door-open");
  });

  it("accepts static actions with a label and an icon from the list", () => {
    const m = defineManifest({
      ...base,
      tenantScopes: ["courts:read"],
      extensions: [
        { point: "booking_plan.action", kind: "declarative", url: "https://a.example.de/plan", label: "Wetter", icon: "sun" },
        { point: "sidebar.action", kind: "declarative", url: "https://a.example.de/side", label: "Status" },
      ],
    });
    expect(m.extensions).toHaveLength(2);
  });

  it("accepts nav.page with a label and an icon, declarative or iframe", () => {
    const m = defineManifest({
      ...base,
      installTargets: ["tenant", "user"],
      extensions: [{ point: "nav.page", kind: "iframe", url: "https://a.example.de/page", label: "Trainingsplan", icon: "calendar" }],
    });
    expect(m.extensions[0].point).toBe("nav.page");
  });

  it("accepts an initial height on iframe extensions only", () => {
    expect([IFRAME_EXTENSION_HEIGHT_MIN, IFRAME_EXTENSION_HEIGHT_MAX]).toEqual([120, 2000]);
    const m = defineManifest({
      ...base,
      tenantScopes: ["bookings:read"],
      extensions: [
        { point: "nav.page", kind: "iframe", url: "https://a.example.de/page", label: "Homepage", icon: "calendar", height: 900 },
        { point: "booking.detail.panel", kind: "iframe", url: "https://a.example.de/booking", height: 320 },
      ],
    });
    expect(m.extensions.map((e) => e.height)).toEqual([900, 320]);

    const rejected: ManifestExtension[] = [
      // @ts-expect-error height only on iframe extensions
      { point: "nav.page", kind: "declarative", url: "https://a.example.de/page", label: "Seite", icon: "calendar", height: 900 },
      // @ts-expect-error dashboard.widget is declarative only, so no height
      { point: "dashboard.widget", kind: "declarative", url: "https://a.example.de/w", height: 300 },
      // @ts-expect-error height is a number of pixels
      { point: "app.settings", kind: "iframe", url: "https://a.example.de/settings", height: "300px" },
    ];
    expect(rejected).toHaveLength(3);
  });

  it("rejects nav.page without label or icon at compile time", () => {
    const rejected: ManifestExtension[] = [
      // @ts-expect-error nav.page needs a label
      { point: "nav.page", kind: "declarative", url: "https://a.example.de/page", icon: "sun" },
      // @ts-expect-error nav.page needs an icon
      { point: "nav.page", kind: "declarative", url: "https://a.example.de/page", label: "Seite" },
      // @ts-expect-error not a known icon
      { point: "nav.page", kind: "declarative", url: "https://a.example.de/page", label: "Seite", icon: "rocket" },
    ];
    expect(rejected).toHaveLength(3);
  });

  it("rejects missing labels and misplaced or unknown icons at compile time", () => {
    const rejected: ManifestExtension[] = [
      // @ts-expect-error static actions need a label
      { point: "sidebar.action", kind: "declarative", url: "https://a.example.de/side" },
      // @ts-expect-error booking_plan.action needs a label
      { point: "booking_plan.action", kind: "declarative", url: "https://a.example.de/plan" },
      // @ts-expect-error icon only on static actions
      { point: "dashboard.widget", kind: "declarative", url: "https://a.example.de/w", icon: "sun" },
      // @ts-expect-error icon only on static actions
      { point: "booking.action", kind: "declarative", url: "https://a.example.de/a", label: "Los", icon: "sun" },
      // @ts-expect-error not a known icon
      { point: "sidebar.action", kind: "declarative", url: "https://a.example.de/side", label: "Status", icon: "rocket" },
      // @ts-expect-error sidebar.action is declarative only
      { point: "sidebar.action", kind: "iframe", url: "https://a.example.de/side", label: "Status" },
    ];
    expect(rejected).toHaveLength(6);
  });

  it("keeps the examples within the platform's label limit", () => {
    for (const manifest of Object.values(exampleManifests) as Manifest[]) {
      for (const ext of (manifest.extensions ?? []) as readonly ManifestExtension[]) {
        if ([...STATIC_ACTION_POINTS, "nav.page"].includes(ext.point)) {
          expect(ext.label?.length).toBeLessThanOrEqual(STATIC_ACTION_LABEL_MAX);
        }
      }
    }
  });
});
