import type { SubscribableEventType } from "./events.js";

export const MANIFEST_VERSION = 1;

export const INSTALL_TARGETS = ["tenant", "user"] as const;
export type InstallTarget = (typeof INSTALL_TARGETS)[number];

export const USER_LINKING_MODES = ["none", "optional", "required"] as const;
export type UserLinking = (typeof USER_LINKING_MODES)[number];

export const EXTENSION_KINDS = ["declarative", "iframe"] as const;
export type ExtensionKind = (typeof EXTENSION_KINDS)[number];

/** Where each point is shown and how it may render. */
export const EXTENSION_POINTS = {
  "app.settings": { targets: ["tenant"], kinds: ["declarative", "iframe"] },
  "booking.detail.panel": { targets: ["tenant", "user"], kinds: ["declarative", "iframe"] },
  "member.profile.section": { targets: ["tenant", "user"], kinds: ["declarative", "iframe"] },
  "dashboard.widget": { targets: ["tenant", "user"], kinds: ["declarative"] },
  "booking.action": { targets: ["tenant", "user"], kinds: ["declarative"] },
  "kiosk.tile": { targets: ["tenant"], kinds: ["declarative"] },
  "court.annotation": { targets: ["tenant"], kinds: ["declarative"] },
  "member.list.column": { targets: ["tenant"], kinds: ["declarative"] },
  "member.settings.section": { targets: ["user"], kinds: ["declarative", "iframe"] },
  "booking.hint": { targets: ["tenant"], kinds: ["declarative"] },
  "booking_plan.action": { targets: ["tenant"], kinds: ["declarative"] },
  "sidebar.action": { targets: ["tenant", "user"], kinds: ["declarative"] },
} as const;

export type ExtensionPoint = keyof typeof EXTENSION_POINTS;

/** Scope the installation needs (in `tenantScopes` or `userScopes`) before the point hands it a subject id. */
export const EXTENSION_POINT_SCOPE = {
  "app.settings": null,
  "booking.detail.panel": "bookings:read",
  "booking.action": "bookings:read",
  "member.profile.section": "members:read",
  "dashboard.widget": null,
  "kiosk.tile": null,
  "court.annotation": "courts:read",
  "member.list.column": "members:read",
  "member.settings.section": null,
  "booking.hint": "bookings:read",
  "booking_plan.action": "courts:read",
  "sidebar.action": null,
} as const satisfies Record<ExtensionPoint, GrantableScope | null>;

/** Buttons CheckCourt draws from the manifest alone, before the app is ever called. */
export const STATIC_ACTION_POINTS = ["booking_plan.action", "sidebar.action"] as const satisfies readonly ExtensionPoint[];
export type StaticActionPoint = (typeof STATIC_ACTION_POINTS)[number];
/** Longest `label` of a static action. */
export const STATIC_ACTION_LABEL_MAX = 24;

/** lucide icon names a static action may use as `icon`. */
export const APP_ACTION_ICONS = [
  "bell",
  "calendar",
  "calendar-check",
  "camera",
  "chart-column",
  "circle-help",
  "clipboard-list",
  "clock",
  "cloud-rain",
  "door-open",
  "file-text",
  "flag",
  "heart-pulse",
  "info",
  "key-round",
  "lightbulb",
  "link",
  "list-checks",
  "lock-open",
  "map-pin",
  "megaphone",
  "message-square",
  "receipt",
  "send",
  "sparkles",
  "star",
  "sun",
  "thermometer",
  "ticket",
  "triangle-alert",
  "trophy",
  "user-round",
  "users",
  "wallet",
  "wrench",
] as const;
export type AppActionIcon = (typeof APP_ACTION_ICONS)[number];

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
] as const;

export type GrantableScope = (typeof GRANTABLE_SCOPES)[number];

type ExtensionOf<P extends ExtensionPoint> = {
  point: P;
  kind: (typeof EXTENSION_POINTS)[P]["kinds"][number];
  /** https; http://localhost is accepted outside production. */
  url: string;
} & (P extends StaticActionPoint
  ? {
      /** Button text, 1 to 24 characters (`STATIC_ACTION_LABEL_MAX`). */
      label: string;
      icon?: AppActionIcon;
    }
  : P extends "booking.action"
    ? { /** Button text, 1 to 40 characters. */ label: string; icon?: never }
    : P extends "member.list.column"
      ? { /** Column header until the app's first answer arrives, ideally the same text as `column.title`. */ label?: string; icon?: never }
      : { label?: string; icon?: never });

/**
 * One entry of `extensions`; `kind`, `label` and `icon` are checked per point at compile time.
 * Every point may appear once, except `booking.action`.
 */
export type ManifestExtension = { [P in ExtensionPoint]: ExtensionOf<P> }[ExtensionPoint];

interface SettingsPropertyBase {
  /** 1 to 80 characters. */
  title: string;
  /** Up to 300 characters. */
  description?: string;
}

export type SettingsProperty =
  | (SettingsPropertyBase & {
      type: "string";
      /** Rendered as a select. Excludes `maxLength`. */
      enum?: readonly string[];
      default?: string;
      maxLength?: number;
    })
  | (SettingsPropertyBase & { type: "number"; default?: number; minimum?: number; maximum?: number })
  | (SettingsPropertyBase & { type: "boolean"; default?: boolean });

/** The JSON-Schema subset CheckCourt renders as the settings form (at most 30 properties). */
export interface SettingsSchema {
  type: "object";
  /** Keys match `^[a-zA-Z][a-zA-Z0-9_]{0,39}$`. */
  properties: Record<string, SettingsProperty>;
  required?: readonly string[];
  additionalProperties?: false;
}

export interface DataProcessing {
  /** At least one, e.g. "Buchungsdaten". */
  categories: readonly string[];
  /** Up to 500 characters. */
  purpose: string;
  storageLocation: "EU" | "non-EU";
  avvRequired: boolean;
}

export interface Manifest {
  manifestVersion?: typeof MANIFEST_VERSION;
  installTargets: readonly InstallTarget[];
  /** Lets a club installation link member accounts via OAuth. Only with `tenant`. */
  userLinking?: UserLinking;
  tenantScopes?: readonly GrantableScope[];
  userScopes?: readonly GrantableScope[];
  /** Lifecycle events (`app.*`) arrive without being listed. */
  events?: readonly SubscribableEventType[];
  /** At most 20. */
  extensions?: readonly ManifestExtension[];
  settingsSchema?: SettingsSchema;
  dataProcessing: DataProcessing;
}

/**
 * Identity function that gives editor completion and compile-time checks for a manifest.
 * CheckCourt validates the rest on upload (scope and event pairing, URL rules, lengths).
 */
export function defineManifest<const M extends Manifest>(manifest: M): M {
  return manifest;
}
