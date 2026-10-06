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
} as const satisfies Record<ExtensionPoint, GrantableScope | null>;

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
} & (P extends "booking.action"
  ? { /** Button text, 1 to 40 characters. */ label: string }
  : { label?: string });

/** One entry of `extensions`; `kind` and `label` are checked per point at compile time. */
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
