export const UI_VERSION = "v1";
export const MAX_UI_BLOCKS = 50;
/** Top-level blocks sit at depth 1; a container's children one deeper. */
export const MAX_UI_DEPTH = 3;

export const BADGE_VARIANTS = ["default", "secondary", "outline", "destructive", "warning"] as const;
export const BUTTON_VARIANTS = ["default", "secondary", "outline", "destructive"] as const;
export type BadgeVariant = (typeof BADGE_VARIANTS)[number];
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

/** Icons a block may show, by lucide name; CheckCourt draws them in the text color at text size. */
export const UI_ICONS = [
  "sun",
  "moon",
  "cloud",
  "cloud-sun",
  "cloud-moon",
  "cloud-sun-rain",
  "cloud-rain",
  "cloud-drizzle",
  "cloud-lightning",
  "cloud-snow",
  "cloud-fog",
  "snowflake",
  "wind",
  "droplet",
  "droplets",
  "umbrella",
  "thermometer",
  "sunrise",
  "sunset",
  "check",
  "x",
  "info",
  "alert-triangle",
  "triangle-alert",
  "alert-circle",
  "circle-alert",
  "clock",
  "calendar",
  "map-pin",
  "trophy",
  "users",
  "user",
  "lock",
  "unlock",
  "lock-open",
  "lightbulb",
  "zap",
  "euro",
  "star",
  "heart",
  "bell",
  "flag",
  "activity",
  "timer",
  "ticket",
  "door-open",
] as const;

export type UiIcon = (typeof UI_ICONS)[number];

/** `lg` shows the value as a large display figure, `md` (default) as a regular stat. */
export const STAT_SIZES = ["md", "lg"] as const;
export type StatSize = (typeof STAT_SIZES)[number];
export const COLUMNS_ALIGNMENTS = ["start", "center"] as const;
export type ColumnsAlignment = (typeof COLUMNS_ALIGNMENTS)[number];
/** `between` spreads a row's children across the full width, first at the left edge, last at the right. */
export const ROW_JUSTIFICATIONS = ["start", "between"] as const;
export type RowJustify = (typeof ROW_JUSTIFICATIONS)[number];
/** A `columns` block holds 2 to 6 children. */
export const MIN_COLUMNS = 2;
export const MAX_COLUMNS = 6;

export type UiTextBlock = { type: "text"; text: string; tone?: "muted"; icon?: UiIcon };
export type UiHeadingBlock = { type: "heading"; text: string; level: 2 | 3; icon?: UiIcon };
/** With `icon`, the icon sits before the value. */
export type UiStatBlock = { type: "stat"; label: string; value: string; hint?: string; icon?: UiIcon; size?: StatSize };
export type UiBadgeBlock = { type: "badge"; label: string; variant?: BadgeVariant; icon?: UiIcon };
export type UiListItem = { title: string; description?: string; icon?: UiIcon };
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
export type UiDateField = {
  type: "date";
  name: string;
  label: string;
  /** YYYY-MM-DD. */
  default?: string;
  /** YYYY-MM-DD. */
  min?: string;
  /** YYYY-MM-DD. */
  max?: string;
  required?: boolean;
};
export type UiTimeField = {
  type: "time";
  name: string;
  label: string;
  /** HH:MM, 24-hour. */
  default?: string;
  /** HH:MM, 24-hour. */
  min?: string;
  /** HH:MM, 24-hour. */
  max?: string;
  required?: boolean;
  /** Granularity of the time picker in minutes. */
  step?: number;
};
export type UiFormField = UiTextField | UiNumberField | UiSelectField | UiSwitchField | UiDateField | UiTimeField;
export type UiFormBlock = { type: "form"; fields: UiFormField[]; submit_label: string; action_id: string };
export type UiDividerBlock = { type: "divider" };
export type UiStackBlock = { type: "stack"; children: UiBlock[] };
export type UiRowBlock = { type: "row"; children: UiBlock[]; justify?: RowJustify };
/** 2 to 6 children side by side in equal widths; on narrow cards 4 wrap to 2 per row, 5 and 6 to 3. */
export type UiColumnsBlock = { type: "columns"; children: UiBlock[]; dividers?: boolean; align?: ColumnsAlignment };

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
  | UiRowBlock
  | UiColumnsBlock;

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
  date(name: string, label: string, options: Opt<Omit<UiDateField, "type" | "name" | "label">> = {}): UiDateField {
    return compact({ type: "date", name, label, ...options });
  },
  time(name: string, label: string, options: Opt<Omit<UiTimeField, "type" | "name" | "label">> = {}): UiTimeField {
    return compact({ type: "time", name, label, ...options });
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

function iconOf(icon: unknown): UiIcon | undefined {
  if (icon === undefined) return undefined;
  if (!(UI_ICONS as readonly unknown[]).includes(icon)) {
    throw new TypeError(`Unknown icon ${String(icon)}; use one of UI_ICONS`);
  }
  return icon as UiIcon;
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
  text(text: string, options: { tone?: "muted"; icon?: UiIcon } = {}): UiTextBlock {
    return compact({ type: "text", text, tone: options.tone, icon: iconOf(options.icon) });
  },
  /** `ui.heading(text, 3)` or `ui.heading(text, { level: 3, icon: "trophy" })`; level defaults to 2. */
  heading(text: string, levelOrOptions: 2 | 3 | { level?: 2 | 3; icon?: UiIcon } = 2): UiHeadingBlock {
    const options = typeof levelOrOptions === "object" ? levelOrOptions : { level: levelOrOptions };
    return compact({ type: "heading", text, level: options.level ?? 2, icon: iconOf(options.icon) });
  },
  stat(label: string, value: string, options: { hint?: string; icon?: UiIcon; size?: StatSize } = {}): UiStatBlock {
    if (options.size !== undefined && !(STAT_SIZES as readonly unknown[]).includes(options.size)) {
      throw new TypeError(`stat size must be one of ${STAT_SIZES.join(", ")}`);
    }
    return compact({ type: "stat", label, value, hint: options.hint, icon: iconOf(options.icon), size: options.size });
  },
  /** `ui.badge(label, "warning")` or `ui.badge(label, { variant: "warning", icon: "droplets" })`. */
  badge(label: string, variantOrOptions?: BadgeVariant | { variant?: BadgeVariant; icon?: UiIcon }): UiBadgeBlock {
    const options = typeof variantOrOptions === "object" ? variantOrOptions : { variant: variantOrOptions };
    return compact({
      type: "badge",
      label,
      variant: variantOf(options.variant, "badge variant"),
      icon: iconOf(options.icon),
    });
  },
  list(items: UiListItem[]): UiListBlock {
    return { type: "list", items: items.map((item) => compact({ ...item, icon: iconOf(item.icon) })) };
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
  /** Horizontal, wraps on narrow screens; `justify: "between"` pushes the last child to the right edge. */
  row(children: UiBlock[], options: { justify?: RowJustify } = {}): UiRowBlock {
    if (options.justify !== undefined && !(ROW_JUSTIFICATIONS as readonly unknown[]).includes(options.justify)) {
      throw new TypeError(`row justify must be one of ${ROW_JUSTIFICATIONS.join(", ")}`);
    }
    return compact({ type: "row", children, justify: options.justify });
  },
  /** 2 to 6 equal-width columns, optionally with vertical dividers; throws on any other count. */
  columns(children: UiBlock[], options: { dividers?: boolean; align?: ColumnsAlignment } = {}): UiColumnsBlock {
    if (!Array.isArray(children) || children.length < MIN_COLUMNS || children.length > MAX_COLUMNS) {
      throw new RangeError(`columns takes ${MIN_COLUMNS} to ${MAX_COLUMNS} children`);
    }
    if (options.align !== undefined && !(COLUMNS_ALIGNMENTS as readonly unknown[]).includes(options.align)) {
      throw new TypeError(`columns align must be one of ${COLUMNS_ALIGNMENTS.join(", ")}`);
    }
    return compact({ type: "columns", children, dividers: options.dividers, align: options.align });
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
