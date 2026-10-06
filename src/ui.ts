export const UI_VERSION = "v1";
export const MAX_UI_BLOCKS = 50;
/** Top-level blocks sit at depth 1; a container's children one deeper. */
export const MAX_UI_DEPTH = 3;

export const BADGE_VARIANTS = ["default", "secondary", "outline", "destructive"] as const;
export const BUTTON_VARIANTS = ["default", "secondary", "outline", "destructive"] as const;
export type BadgeVariant = (typeof BADGE_VARIANTS)[number];
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

export type UiTextBlock = { type: "text"; text: string; tone?: "muted" };
export type UiHeadingBlock = { type: "heading"; text: string; level: 2 | 3 };
export type UiStatBlock = { type: "stat"; label: string; value: string; hint?: string };
export type UiBadgeBlock = { type: "badge"; label: string; variant?: BadgeVariant };
export type UiListItem = { title: string; description?: string };
export type UiListBlock = { type: "list"; items: UiListItem[] };
export type UiKeyValuePair = { label: string; value: string };
export type UiKeyValueBlock = { type: "key_value"; pairs: UiKeyValuePair[] };
export type UiLinkBlock = { type: "link"; label: string; url: string };
export type UiButtonBlock = { type: "button"; label: string; action_id: string; variant?: ButtonVariant };

export type UiTextField = {
  type: "text";
  name: string;
  label: string;
  placeholder?: string;
  default?: string;
  required?: boolean;
  max_length?: number;
};
export type UiNumberField = {
  type: "number";
  name: string;
  label: string;
  default?: number;
  min?: number;
  max?: number;
  required?: boolean;
};
export type UiSelectField = {
  type: "select";
  name: string;
  label: string;
  options: { value: string; label: string }[];
  default?: string;
  required?: boolean;
};
export type UiSwitchField = { type: "switch"; name: string; label: string; default?: boolean };
export type UiFormField = UiTextField | UiNumberField | UiSelectField | UiSwitchField;
export type UiFormBlock = { type: "form"; fields: UiFormField[]; submit_label: string; action_id: string };
export type UiDividerBlock = { type: "divider" };
export type UiStackBlock = { type: "stack"; children: UiBlock[] };
export type UiRowBlock = { type: "row"; children: UiBlock[] };

export type UiBlock =
  | UiTextBlock
  | UiHeadingBlock
  | UiStatBlock
  | UiBadgeBlock
  | UiListBlock
  | UiKeyValueBlock
  | UiLinkBlock
  | UiButtonBlock
  | UiFormBlock
  | UiDividerBlock
  | UiStackBlock
  | UiRowBlock;

export type UiToast = { kind: "success" | "error"; message: string };

/** CheckCourt caps every render lifetime at this many seconds. */
export const UI_CACHE_MAX_AGE_LIMIT = 300;

/**
 * How long CheckCourt may reuse a render, in whole seconds. `0` means never. Without it
 * CheckCourt follows the response's `Cache-Control` header, else keeps a render for 30 seconds.
 */
export type UiCache = { max_age: number };

/** The response of a declarative extension: `{ ui: "v1", blocks, toast?, cache? }`. */
export interface UiDocument {
  ui: typeof UI_VERSION;
  blocks: UiBlock[];
  toast?: UiToast;
  cache?: UiCache;
}

/** Tells CheckCourt to show no card for this subject and viewer; on an action, removes the panel. */
export interface UiHiddenDocument {
  ui: typeof UI_VERSION;
  hidden: true;
  toast?: UiToast;
  cache?: UiCache;
}

/** Anything a declarative extension may answer with. */
export type UiResponse = UiDocument | UiHiddenDocument;

/** Values a submitted form sends back, keyed by field name. Empty optional fields are omitted. */
export type UiFormValues = Record<string, string | number | boolean>;

type Opt<T> = { [K in keyof T]?: T[K] };

const field = {
  text(name: string, label: string, options: Opt<Omit<UiTextField, "type" | "name" | "label">> = {}): UiTextField {
    return { type: "text", name, label, ...options };
  },
  number(
    name: string,
    label: string,
    options: Opt<Omit<UiNumberField, "type" | "name" | "label">> = {},
  ): UiNumberField {
    return { type: "number", name, label, ...options };
  },
  select(
    name: string,
    label: string,
    options: UiSelectField["options"],
    extra: Opt<Pick<UiSelectField, "default" | "required">> = {},
  ): UiSelectField {
    return { type: "select", name, label, options, ...extra };
  },
  switch(name: string, label: string, options: Opt<Pick<UiSwitchField, "default">> = {}): UiSwitchField {
    return { type: "switch", name, label, ...options };
  },
};

function compact<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

/** Options shared by `ui.doc` and `ui.hidden`. */
export interface UiDocumentOptions {
  toast?: UiToast;
  /** Seconds CheckCourt may reuse this render, sent as `cache.max_age`; `0` disables caching. Capped at 300. */
  maxAge?: number;
}

function cacheOf(maxAge: number | undefined): UiCache | undefined {
  if (maxAge === undefined) return undefined;
  if (!Number.isInteger(maxAge) || maxAge < 0) {
    throw new RangeError(`maxAge must be a whole number of seconds >= 0, got ${maxAge}`);
  }
  return { max_age: maxAge };
}

/**
 * Builds `ui: "v1"` documents. Strings are plain text (no HTML, no Markdown); CheckCourt
 * renders them with its own design system.
 */
export const ui = {
  doc(blocks: UiBlock[], options: UiDocumentOptions = {}): UiDocument {
    return compact({ ui: UI_VERSION, blocks, toast: options.toast, cache: cacheOf(options.maxAge) });
  },
  /** Nothing relevant here: no card at all. Answering `204 No Content` does the same. */
  hidden(options: UiDocumentOptions = {}): UiHiddenDocument {
    return compact({ ui: UI_VERSION, hidden: true as const, toast: options.toast, cache: cacheOf(options.maxAge) });
  },
  text(text: string, options: { tone?: "muted" } = {}): UiTextBlock {
    return compact({ type: "text", text, tone: options.tone });
  },
  heading(text: string, level: 2 | 3 = 2): UiHeadingBlock {
    return { type: "heading", text, level };
  },
  stat(label: string, value: string, options: { hint?: string } = {}): UiStatBlock {
    return compact({ type: "stat", label, value, hint: options.hint });
  },
  badge(label: string, variant?: BadgeVariant): UiBadgeBlock {
    return compact({ type: "badge", label, variant });
  },
  list(items: UiListItem[]): UiListBlock {
    return { type: "list", items: items.map((item) => compact({ ...item })) };
  },
  /** Pairs keep their order; a plain object is turned into pairs in key order. */
  keyValue(pairs: UiKeyValuePair[] | Record<string, string>): UiKeyValueBlock {
    const list = Array.isArray(pairs) ? pairs : Object.entries(pairs).map(([label, value]) => ({ label, value }));
    return { type: "key_value", pairs: list };
  },
  /** https only; opens in a new tab. */
  link(label: string, url: string): UiLinkBlock {
    return { type: "link", label, url };
  },
  button(label: string, actionId: string, options: { variant?: ButtonVariant } = {}): UiButtonBlock {
    return compact({ type: "button", label, action_id: actionId, variant: options.variant });
  },
  form(options: { actionId: string; submitLabel: string; fields: UiFormField[] }): UiFormBlock {
    return {
      type: "form",
      fields: options.fields.map((f) => compact({ ...f })),
      submit_label: options.submitLabel,
      action_id: options.actionId,
    };
  },
  field,
  divider(): UiDividerBlock {
    return { type: "divider" };
  },
  stack(children: UiBlock[]): UiStackBlock {
    return { type: "stack", children };
  },
  /** Horizontal, wraps on narrow screens. */
  row(children: UiBlock[]): UiRowBlock {
    return { type: "row", children };
  },
} as const;

/** Toasts for `ui.doc(blocks, { toast })`, at most 200 characters. */
export const toast = {
  success(message: string): UiToast {
    return { kind: "success", message };
  },
  error(message: string): UiToast {
    return { kind: "error", message };
  },
} as const;
