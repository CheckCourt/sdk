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
  /** Renders a multi-line text box instead of a single-line input. The value stays a string. */
  multiline?: boolean;
  /** Visible rows of the text box when `multiline` is set; 1 to 12. */
  rows?: number;
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

/** Longest badge label of a `court.annotation`. */
export const ANNOTATION_LABEL_MAX = 24;
/** Badges CheckCourt shows per court across all apps, by app name; the rest is not shown. */
export const MAX_ANNOTATIONS_PER_COURT = 2;
/** Longest `column.title` of a `member.list.column`. */
export const COLUMN_TITLE_MAX = 20;
/** Longest cell text of a `member.list.column`. */
export const COLUMN_TEXT_MAX = 24;
/** App columns CheckCourt shows on the member list, by app name. */
export const MAX_APP_COLUMNS = 2;
/** App entries CheckCourt shows in the sidebar, by app name. */
export const MAX_SIDEBAR_ACTIONS = 2;
/** CheckCourt waits this long for a `booking.hint` answer, then shows nothing. */
export const BOOKING_HINT_TIMEOUT_MS = 1000;
/** Block types a `booking.hint` document may contain, top level only. */
export const BOOKING_HINT_BLOCKS = ["text", "badge", "key_value", "link"] as const;
export const MAX_HINT_BLOCKS = 6;
/** Apps whose hints CheckCourt shows in the booking dialog, by app name. */
export const MAX_BOOKING_HINTS = 2;
/** Annotations or column values one document may carry. */
const MAX_SURFACE_ENTRIES = 200;

/** One badge in a court header of the booking plan. */
export interface CourtAnnotation {
  court_id: number;
  /** 1 to 24 characters. */
  label: string;
  variant?: BadgeVariant;
}

/** The answer to `court.annotation`: at most one annotation per court. */
export interface AnnotationsDocument {
  ui: typeof UI_VERSION;
  annotations: CourtAnnotation[];
  cache?: UiCache;
}

/** One cell of an app column on the member list; a badge when `variant` is set, plain text otherwise. */
export interface ColumnValue {
  member_id: string;
  /** 1 to 24 characters. */
  text: string;
  variant?: BadgeVariant;
}

/** The answer to `member.list.column`: at most one value per member. */
export interface ColumnDocument {
  ui: typeof UI_VERSION;
  column: { title: string; values: ColumnValue[] };
  cache?: UiCache;
}

export type UiHintBlock = UiTextBlock | UiBadgeBlock | UiKeyValueBlock | UiLinkBlock;

/** The answer to `booking.hint`: display-only blocks; toasts are ignored. */
export interface UiHintDocument extends UiDocument {
  blocks: UiHintBlock[];
  toast?: never;
}

/** Options of `ui.annotations`, `ui.column` and `ui.hint`. */
export interface UiSurfaceOptions {
  /** Seconds CheckCourt may reuse this render, sent as `cache.max_age`; `0` disables caching. Capped at 300. */
  maxAge?: number;
}

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

function shortText(value: unknown, max: number, what: string): string {
  if (typeof value !== "string") throw new TypeError(`${what} must be a string`);
  const text = value.trim();
  if (text.length < 1 || text.length > max) {
    throw new RangeError(`${what} must be 1 to ${max} characters, got ${text.length}`);
  }
  return text;
}

function variantOf(variant: unknown, what: string): BadgeVariant | undefined {
  if (variant === undefined) return undefined;
  if (!(BADGE_VARIANTS as readonly unknown[]).includes(variant)) {
    throw new TypeError(`${what} must be one of ${BADGE_VARIANTS.join(", ")}`);
  }
  return variant as BadgeVariant;
}

function entriesOf<T>(list: unknown, what: string): T[] {
  if (!Array.isArray(list)) throw new TypeError(`${what} must be an array`);
  if (list.length > MAX_SURFACE_ENTRIES) throw new RangeError(`${what}: at most ${MAX_SURFACE_ENTRIES} entries`);
  return list as T[];
}

/**
 * Builds `ui: "v1"` documents. Strings are plain text (no HTML, no Markdown); CheckCourt
 * renders them with its own design system.
 */
export const ui = {
  doc(blocks: UiBlock[], options: UiDocumentOptions = {}): UiDocument {
    return compact({ ui: UI_VERSION, blocks, toast: options.toast, cache: cacheOf(options.maxAge) });
  },
  /**
   * The answer to `court.annotation`: badges for some of the requested courts, at most one per
   * court. Throws on a label outside 1 to 24 characters or a court listed twice.
   */
  annotations(annotations: CourtAnnotation[], options: UiSurfaceOptions = {}): AnnotationsDocument {
    const seen = new Set<number>();
    const list = entriesOf<CourtAnnotation>(annotations, "annotations").map((a, i) => {
      if (!Number.isInteger(a.court_id) || a.court_id <= 0) {
        throw new TypeError(`annotations[${i}].court_id must be a positive integer`);
      }
      if (seen.has(a.court_id)) throw new RangeError(`annotations: court ${a.court_id} appears twice`);
      seen.add(a.court_id);
      return compact({
        court_id: a.court_id,
        label: shortText(a.label, ANNOTATION_LABEL_MAX, `annotations[${i}].label`),
        variant: variantOf(a.variant, `annotations[${i}].variant`),
      });
    });
    return compact({ ui: UI_VERSION, annotations: list, cache: cacheOf(options.maxAge) });
  },
  /**
   * The answer to `member.list.column`: a title and one value per member you have something for.
   * Throws on a title over 20 or a text over 24 characters, or a member listed twice.
   */
  column(column: { title: string; values: ColumnValue[] }, options: UiSurfaceOptions = {}): ColumnDocument {
    const seen = new Set<string>();
    const values = entriesOf<ColumnValue>(column.values, "column.values").map((v, i) => {
      if (typeof v.member_id !== "string" || v.member_id.length < 1 || v.member_id.length > 100) {
        throw new TypeError(`column.values[${i}].member_id must be a member id`);
      }
      if (seen.has(v.member_id)) throw new RangeError(`column.values: member ${v.member_id} appears twice`);
      seen.add(v.member_id);
      return compact({
        member_id: v.member_id,
        text: shortText(v.text, COLUMN_TEXT_MAX, `column.values[${i}].text`),
        variant: variantOf(v.variant, `column.values[${i}].variant`),
      });
    });
    return compact({
      ui: UI_VERSION,
      column: { title: shortText(column.title, COLUMN_TITLE_MAX, "column.title"), values },
      cache: cacheOf(options.maxAge),
    });
  },
  /**
   * The answer to `booking.hint`: at most 6 text, badge, key_value or link blocks. Throws on any
   * other block, which CheckCourt would reject together with the whole hint.
   */
  hint(blocks: UiHintBlock[], options: UiSurfaceOptions = {}): UiHintDocument {
    if (!Array.isArray(blocks)) throw new TypeError("blocks must be an array");
    if (blocks.length > MAX_HINT_BLOCKS) throw new RangeError(`booking.hint: at most ${MAX_HINT_BLOCKS} blocks`);
    for (const [i, block] of blocks.entries()) {
      if (!(BOOKING_HINT_BLOCKS as readonly string[]).includes((block as UiBlock).type)) {
        throw new TypeError(`blocks[${i}]: ${(block as UiBlock).type} is not allowed in booking.hint`);
      }
    }
    return compact({ ui: UI_VERSION, blocks, cache: cacheOf(options.maxAge) });
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
