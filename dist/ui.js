export const UI_VERSION = "v1";
export const MAX_UI_BLOCKS = 50;
/** Top-level blocks sit at depth 1; a container's children one deeper. */
export const MAX_UI_DEPTH = 3;
export const BADGE_VARIANTS = ["default", "secondary", "outline", "destructive", "warning"];
export const BUTTON_VARIANTS = ["default", "secondary", "outline", "destructive"];
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
];
/** `lg` shows the value as a large display figure, `md` (default) as a regular stat. */
export const STAT_SIZES = ["md", "lg"];
export const COLUMNS_ALIGNMENTS = ["start", "center"];
/** `between` spreads a row's children across the full width, first at the left edge, last at the right. */
export const ROW_JUSTIFICATIONS = ["start", "between"];
/** A `columns` block holds 2 to 6 children. */
export const MIN_COLUMNS = 2;
export const MAX_COLUMNS = 6;
/** CheckCourt caps every render lifetime at this many seconds. */
export const UI_CACHE_MAX_AGE_LIMIT = 300;
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
export const BOOKING_HINT_BLOCKS = ["text", "badge", "key_value", "link"];
export const MAX_HINT_BLOCKS = 6;
/** Apps whose hints CheckCourt shows in the booking dialog, by app name. */
export const MAX_BOOKING_HINTS = 2;
/** Annotations or column values one document may carry. */
const MAX_SURFACE_ENTRIES = 200;
const field = {
    text(name, label, options = {}) {
        return { type: "text", name, label, ...options };
    },
    number(name, label, options = {}) {
        return { type: "number", name, label, ...options };
    },
    select(name, label, options, extra = {}) {
        return { type: "select", name, label, options, ...extra };
    },
    switch(name, label, options = {}) {
        return { type: "switch", name, label, ...options };
    },
    date(name, label, options = {}) {
        return compact({ type: "date", name, label, ...options });
    },
    time(name, label, options = {}) {
        return compact({ type: "time", name, label, ...options });
    },
};
function compact(value) {
    return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined));
}
function cacheOf(maxAge) {
    if (maxAge === undefined)
        return undefined;
    if (!Number.isInteger(maxAge) || maxAge < 0) {
        throw new RangeError(`maxAge must be a whole number of seconds >= 0, got ${maxAge}`);
    }
    return { max_age: maxAge };
}
function shortText(value, max, what) {
    if (typeof value !== "string")
        throw new TypeError(`${what} must be a string`);
    const text = value.trim();
    if (text.length < 1 || text.length > max) {
        throw new RangeError(`${what} must be 1 to ${max} characters, got ${text.length}`);
    }
    return text;
}
function variantOf(variant, what) {
    if (variant === undefined)
        return undefined;
    if (!BADGE_VARIANTS.includes(variant)) {
        throw new TypeError(`${what} must be one of ${BADGE_VARIANTS.join(", ")}`);
    }
    return variant;
}
function iconOf(icon) {
    if (icon === undefined)
        return undefined;
    if (!UI_ICONS.includes(icon)) {
        throw new TypeError(`Unknown icon ${String(icon)}; use one of UI_ICONS`);
    }
    return icon;
}
function entriesOf(list, what) {
    if (!Array.isArray(list))
        throw new TypeError(`${what} must be an array`);
    if (list.length > MAX_SURFACE_ENTRIES)
        throw new RangeError(`${what}: at most ${MAX_SURFACE_ENTRIES} entries`);
    return list;
}
/**
 * Builds `ui: "v1"` documents. Strings are plain text (no HTML, no Markdown); CheckCourt
 * renders them with its own design system.
 */
export const ui = {
    doc(blocks, options = {}) {
        return compact({ ui: UI_VERSION, blocks, toast: options.toast, cache: cacheOf(options.maxAge) });
    },
    /**
     * The answer to `court.annotation`: badges for some of the requested courts, at most one per
     * court. Throws on a label outside 1 to 24 characters or a court listed twice.
     */
    annotations(annotations, options = {}) {
        const seen = new Set();
        const list = entriesOf(annotations, "annotations").map((a, i) => {
            if (!Number.isInteger(a.court_id) || a.court_id <= 0) {
                throw new TypeError(`annotations[${i}].court_id must be a positive integer`);
            }
            if (seen.has(a.court_id))
                throw new RangeError(`annotations: court ${a.court_id} appears twice`);
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
    column(column, options = {}) {
        const seen = new Set();
        const values = entriesOf(column.values, "column.values").map((v, i) => {
            if (typeof v.member_id !== "string" || v.member_id.length < 1 || v.member_id.length > 100) {
                throw new TypeError(`column.values[${i}].member_id must be a member id`);
            }
            if (seen.has(v.member_id))
                throw new RangeError(`column.values: member ${v.member_id} appears twice`);
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
    hint(blocks, options = {}) {
        if (!Array.isArray(blocks))
            throw new TypeError("blocks must be an array");
        if (blocks.length > MAX_HINT_BLOCKS)
            throw new RangeError(`booking.hint: at most ${MAX_HINT_BLOCKS} blocks`);
        for (const [i, block] of blocks.entries()) {
            if (!BOOKING_HINT_BLOCKS.includes(block.type)) {
                throw new TypeError(`blocks[${i}]: ${block.type} is not allowed in booking.hint`);
            }
        }
        return compact({ ui: UI_VERSION, blocks, cache: cacheOf(options.maxAge) });
    },
    /** Nothing relevant here: no card at all. Answering `204 No Content` does the same. */
    hidden(options = {}) {
        return compact({ ui: UI_VERSION, hidden: true, toast: options.toast, cache: cacheOf(options.maxAge) });
    },
    text(text, options = {}) {
        return compact({ type: "text", text, tone: options.tone, icon: iconOf(options.icon) });
    },
    /** `ui.heading(text, 3)` or `ui.heading(text, { level: 3, icon: "trophy" })`; level defaults to 2. */
    heading(text, levelOrOptions = 2) {
        const options = typeof levelOrOptions === "object" ? levelOrOptions : { level: levelOrOptions };
        return compact({ type: "heading", text, level: options.level ?? 2, icon: iconOf(options.icon) });
    },
    stat(label, value, options = {}) {
        if (options.size !== undefined && !STAT_SIZES.includes(options.size)) {
            throw new TypeError(`stat size must be one of ${STAT_SIZES.join(", ")}`);
        }
        return compact({ type: "stat", label, value, hint: options.hint, icon: iconOf(options.icon), size: options.size });
    },
    /** `ui.badge(label, "warning")` or `ui.badge(label, { variant: "warning", icon: "droplets" })`. */
    badge(label, variantOrOptions) {
        const options = typeof variantOrOptions === "object" ? variantOrOptions : { variant: variantOrOptions };
        return compact({
            type: "badge",
            label,
            variant: variantOf(options.variant, "badge variant"),
            icon: iconOf(options.icon),
        });
    },
    list(items) {
        return { type: "list", items: items.map((item) => compact({ ...item, icon: iconOf(item.icon) })) };
    },
    /** Pairs keep their order; a plain object is turned into pairs in key order. */
    keyValue(pairs) {
        const list = Array.isArray(pairs) ? pairs : Object.entries(pairs).map(([label, value]) => ({ label, value }));
        return { type: "key_value", pairs: list };
    },
    /** https only; opens in a new tab. */
    link(label, url) {
        return { type: "link", label, url };
    },
    button(label, actionId, options = {}) {
        return compact({ type: "button", label, action_id: actionId, variant: options.variant });
    },
    form(options) {
        return {
            type: "form",
            fields: options.fields.map((f) => compact({ ...f })),
            submit_label: options.submitLabel,
            action_id: options.actionId,
        };
    },
    field,
    divider() {
        return { type: "divider" };
    },
    stack(children) {
        return { type: "stack", children };
    },
    /** Horizontal, wraps on narrow screens; `justify: "between"` pushes the last child to the right edge. */
    row(children, options = {}) {
        if (options.justify !== undefined && !ROW_JUSTIFICATIONS.includes(options.justify)) {
            throw new TypeError(`row justify must be one of ${ROW_JUSTIFICATIONS.join(", ")}`);
        }
        return compact({ type: "row", children, justify: options.justify });
    },
    /** 2 to 6 equal-width columns, optionally with vertical dividers; throws on any other count. */
    columns(children, options = {}) {
        if (!Array.isArray(children) || children.length < MIN_COLUMNS || children.length > MAX_COLUMNS) {
            throw new RangeError(`columns takes ${MIN_COLUMNS} to ${MAX_COLUMNS} children`);
        }
        if (options.align !== undefined && !COLUMNS_ALIGNMENTS.includes(options.align)) {
            throw new TypeError(`columns align must be one of ${COLUMNS_ALIGNMENTS.join(", ")}`);
        }
        return compact({ type: "columns", children, dividers: options.dividers, align: options.align });
    },
};
/** Toasts for `ui.doc(blocks, { toast })`, at most 200 characters. */
export const toast = {
    success(message) {
        return { kind: "success", message };
    },
    error(message) {
        return { kind: "error", message };
    },
};
