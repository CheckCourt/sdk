import { defineManifest } from "../src/manifest.js";

/** Club app: door control with webhook events, settings and every club extension point. */
export const clubApp = defineManifest({
  installTargets: ["tenant"],
  tenantScopes: ["bookings:read", "courts:read", "members:read"],
  events: ["booking.created", "booking.cancelled", "court.locked"],
  extensions: [
    { point: "app.settings", kind: "iframe", url: "https://door.example.de/settings" },
    { point: "booking.detail.panel", kind: "declarative", url: "https://door.example.de/ext/booking" },
    { point: "booking.action", kind: "declarative", url: "https://door.example.de/ext/open", label: "Tür öffnen" },
    { point: "booking.action", kind: "declarative", url: "https://door.example.de/ext/code", label: "Code senden" },
    { point: "member.profile.section", kind: "declarative", url: "https://door.example.de/ext/member" },
    { point: "dashboard.widget", kind: "declarative", url: "https://door.example.de/ext/dashboard" },
    { point: "kiosk.tile", kind: "declarative", url: "https://door.example.de/ext/kiosk" },
    { point: "court.annotation", kind: "declarative", url: "https://door.example.de/ext/courts" },
    { point: "member.list.column", kind: "declarative", url: "https://door.example.de/ext/column", label: "Türcode" },
    { point: "booking.hint", kind: "declarative", url: "https://door.example.de/ext/hint" },
    {
      point: "booking_plan.action",
      kind: "declarative",
      url: "https://door.example.de/ext/plan",
      label: "Türen prüfen",
      icon: "door-open",
    },
    { point: "sidebar.action", kind: "declarative", url: "https://door.example.de/ext/status", label: "Türstatus" },
    { point: "nav.page", kind: "declarative", url: "https://door.example.de/ext/page", label: "Türprotokoll", icon: "key-round" },
  ],
  settingsSchema: {
    type: "object",
    properties: {
      openMinutesBefore: { type: "number", title: "Minuten vor Spielbeginn", minimum: 0, maximum: 60, default: 10 },
      doorModel: { type: "string", title: "Türmodell", enum: ["nuki", "ttlock"], default: "nuki" },
      notifyAdmin: { type: "boolean", title: "Vorstand benachrichtigen", default: false },
      note: { type: "string", title: "Hinweis", maxLength: 200 },
    },
    required: ["doorModel"],
    additionalProperties: false,
  },
  dataProcessing: {
    categories: ["Buchungsdaten", "Platzdaten"],
    purpose: "Öffnet die Platztür zur gebuchten Zeit",
    storageLocation: "EU",
    avvRequired: true,
  },
});

/** Member app: personal calendar sync. */
export const memberApp = defineManifest({
  installTargets: ["user"],
  userScopes: ["bookings:read", "teams:read"],
  events: ["booking.created", "booking.updated", "booking.cancelled"],
  extensions: [
    { point: "dashboard.widget", kind: "declarative", url: "https://kalender.example.de/ext/dashboard" },
    { point: "booking.detail.panel", kind: "iframe", url: "https://kalender.example.de/ext/booking" },
    { point: "member.settings.section", kind: "declarative", url: "https://kalender.example.de/ext/settings" },
    {
      point: "sidebar.action",
      kind: "declarative",
      url: "https://kalender.example.de/ext/sync",
      label: "Kalender abgleichen",
      icon: "calendar-check",
    },
  ],
  dataProcessing: {
    categories: ["Buchungsdaten"],
    purpose: "Überträgt eigene Buchungen in den Kalender",
    storageLocation: "EU",
    avvRequired: false,
  },
});

/** Club app that also links member accounts via OAuth. */
export const linkedApp = defineManifest({
  installTargets: ["tenant"],
  userLinking: "optional",
  tenantScopes: ["members:read"],
  userScopes: ["bookings:read"],
  events: ["member.joined", "member.left"],
  dataProcessing: {
    categories: ["Mitgliedsdaten"],
    purpose: "Verknüpft Mitglieder mit dem Trainingsplaner",
    storageLocation: "non-EU",
    avvRequired: true,
  },
});

export const exampleManifests = { clubApp, memberApp, linkedApp };
