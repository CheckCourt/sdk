export declare const UI_VERSION = "v1";
export declare const MAX_UI_BLOCKS = 50;
/** Top-level blocks sit at depth 1; a container's children one deeper. */
export declare const MAX_UI_DEPTH = 3;
export declare const BADGE_VARIANTS: readonly ["default", "secondary", "outline", "destructive", "warning"];
export declare const BUTTON_VARIANTS: readonly ["default", "secondary", "outline", "destructive"];
export type BadgeVariant = (typeof BADGE_VARIANTS)[number];
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];
/** Icons a block may show, by lucide name; CheckCourt draws them in the text color at text size. */
export declare const UI_ICONS: readonly ["sun", "moon", "cloud", "cloud-sun", "cloud-moon", "cloud-sun-rain", "cloud-rain", "cloud-drizzle", "cloud-lightning", "cloud-snow", "cloud-fog", "snowflake", "wind", "droplet", "droplets", "umbrella", "thermometer", "sunrise", "sunset", "check", "x", "info", "alert-triangle", "triangle-alert", "alert-circle", "circle-alert", "clock", "calendar", "map-pin", "trophy", "users", "user", "lock", "unlock", "lock-open", "lightbulb", "zap", "euro", "star", "heart", "bell", "flag", "activity", "timer", "ticket", "door-open"];
export type UiIcon = (typeof UI_ICONS)[number];
/** `lg` shows the value as a large display figure, `md` (default) as a regular stat. */
export declare const STAT_SIZES: readonly ["md", "lg"];
export type StatSize = (typeof STAT_SIZES)[number];
export declare const COLUMNS_ALIGNMENTS: readonly ["start", "center"];
export type ColumnsAlignment = (typeof COLUMNS_ALIGNMENTS)[number];
/** `between` spreads a row's children across the full width, first at the left edge, last at the right. */
export declare const ROW_JUSTIFICATIONS: readonly ["start", "between"];
export type RowJustify = (typeof ROW_JUSTIFICATIONS)[number];
/** A `columns` block holds 2 to 6 children. */
export declare const MIN_COLUMNS = 2;
export declare const MAX_COLUMNS = 6;
export type UiTextBlock = {
    type: "text";
    text: string;
    tone?: "muted";
    icon?: UiIcon;
};
export type UiHeadingBlock = {
    type: "heading";
    text: string;
    level: 2 | 3;
    icon?: UiIcon;
};
/** With `icon`, the icon sits before the value. */
export type UiStatBlock = {
    type: "stat";
    label: string;
    value: string;
    hint?: string;
    icon?: UiIcon;
    size?: StatSize;
};
export type UiBadgeBlock = {
    type: "badge";
    label: string;
    variant?: BadgeVariant;
    icon?: UiIcon;
};
export type UiListItem = {
    title: string;
    description?: string;
    icon?: UiIcon;
};
export type UiListBlock = {
    type: "list";
    items: UiListItem[];
};
export type UiKeyValuePair = {
    label: string;
    value: string;
};
export type UiKeyValueBlock = {
    type: "key_value";
    pairs: UiKeyValuePair[];
};
export type UiLinkBlock = {
    type: "link";
    label: string;
    url: string;
};
export type UiButtonBlock = {
    type: "button";
    label: string;
    action_id: string;
    variant?: ButtonVariant;
};
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
    options: {
        value: string;
        label: string;
    }[];
    default?: string;
    required?: boolean;
};
export type UiSwitchField = {
    type: "switch";
    name: string;
    label: string;
    default?: boolean;
};
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
export type UiFormBlock = {
    type: "form";
    fields: UiFormField[];
    submit_label: string;
    action_id: string;
};
export type UiDividerBlock = {
    type: "divider";
};
export type UiStackBlock = {
    type: "stack";
    children: UiBlock[];
};
export type UiRowBlock = {
    type: "row";
    children: UiBlock[];
    justify?: RowJustify;
};
/** 2 to 6 children side by side in equal widths; on narrow cards 4 wrap to 2 per row, 5 and 6 to 3. */
export type UiColumnsBlock = {
    type: "columns";
    children: UiBlock[];
    dividers?: boolean;
    align?: ColumnsAlignment;
};
export type UiBlock = UiTextBlock | UiHeadingBlock | UiStatBlock | UiBadgeBlock | UiListBlock | UiKeyValueBlock | UiLinkBlock | UiButtonBlock | UiFormBlock | UiDividerBlock | UiStackBlock | UiRowBlock | UiColumnsBlock;
export type UiToast = {
    kind: "success" | "error";
    message: string;
};
/** CheckCourt caps every render lifetime at this many seconds. */
export declare const UI_CACHE_MAX_AGE_LIMIT = 300;
/**
 * How long CheckCourt may reuse a render, in whole seconds. `0` means never. Without it
 * CheckCourt follows the response's `Cache-Control` header, else keeps a render for 30 seconds.
 */
export type UiCache = {
    max_age: number;
};
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
export declare const ANNOTATION_LABEL_MAX = 24;
/** Badges CheckCourt shows per court across all apps, by app name; the rest is not shown. */
export declare const MAX_ANNOTATIONS_PER_COURT = 2;
/** Longest `column.title` of a `member.list.column`. */
export declare const COLUMN_TITLE_MAX = 20;
/** Longest cell text of a `member.list.column`. */
export declare const COLUMN_TEXT_MAX = 24;
/** App columns CheckCourt shows on the member list, by app name. */
export declare const MAX_APP_COLUMNS = 2;
/** App entries CheckCourt shows in the sidebar, by app name. */
export declare const MAX_SIDEBAR_ACTIONS = 2;
/** CheckCourt waits this long for a `booking.hint` answer, then shows nothing. */
export declare const BOOKING_HINT_TIMEOUT_MS = 1000;
/** Block types a `booking.hint` document may contain, top level only. */
export declare const BOOKING_HINT_BLOCKS: readonly ["text", "badge", "key_value", "link"];
export declare const MAX_HINT_BLOCKS = 6;
/** Apps whose hints CheckCourt shows in the booking dialog, by app name. */
export declare const MAX_BOOKING_HINTS = 2;
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
    column: {
        title: string;
        values: ColumnValue[];
    };
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
type Opt<T> = {
    [K in keyof T]?: T[K];
};
/** Options shared by `ui.doc` and `ui.hidden`. */
export interface UiDocumentOptions {
    toast?: UiToast;
    /** Seconds CheckCourt may reuse this render, sent as `cache.max_age`; `0` disables caching. Capped at 300. */
    maxAge?: number;
}
/**
 * Builds `ui: "v1"` documents. Strings are plain text (no HTML, no Markdown); CheckCourt
 * renders them with its own design system.
 */
export declare const ui: {
    readonly doc: (blocks: UiBlock[], options?: UiDocumentOptions) => UiDocument;
    /**
     * The answer to `court.annotation`: badges for some of the requested courts, at most one per
     * court. Throws on a label outside 1 to 24 characters or a court listed twice.
     */
    readonly annotations: (annotations: CourtAnnotation[], options?: UiSurfaceOptions) => AnnotationsDocument;
    /**
     * The answer to `member.list.column`: a title and one value per member you have something for.
     * Throws on a title over 20 or a text over 24 characters, or a member listed twice.
     */
    readonly column: (column: {
        title: string;
        values: ColumnValue[];
    }, options?: UiSurfaceOptions) => ColumnDocument;
    /**
     * The answer to `booking.hint`: at most 6 text, badge, key_value or link blocks. Throws on any
     * other block, which CheckCourt would reject together with the whole hint.
     */
    readonly hint: (blocks: UiHintBlock[], options?: UiSurfaceOptions) => UiHintDocument;
    /** Nothing relevant here: no card at all. Answering `204 No Content` does the same. */
    readonly hidden: (options?: UiDocumentOptions) => UiHiddenDocument;
    readonly text: (text: string, options?: {
        tone?: "muted";
        icon?: UiIcon;
    }) => UiTextBlock;
    /** `ui.heading(text, 3)` or `ui.heading(text, { level: 3, icon: "trophy" })`; level defaults to 2. */
    readonly heading: (text: string, levelOrOptions?: 2 | 3 | {
        level?: 2 | 3;
        icon?: UiIcon;
    }) => UiHeadingBlock;
    readonly stat: (label: string, value: string, options?: {
        hint?: string;
        icon?: UiIcon;
        size?: StatSize;
    }) => UiStatBlock;
    /** `ui.badge(label, "warning")` or `ui.badge(label, { variant: "warning", icon: "droplets" })`. */
    readonly badge: (label: string, variantOrOptions?: BadgeVariant | {
        variant?: BadgeVariant;
        icon?: UiIcon;
    }) => UiBadgeBlock;
    readonly list: (items: UiListItem[]) => UiListBlock;
    /** Pairs keep their order; a plain object is turned into pairs in key order. */
    readonly keyValue: (pairs: UiKeyValuePair[] | Record<string, string>) => UiKeyValueBlock;
    /** https only; opens in a new tab. */
    readonly link: (label: string, url: string) => UiLinkBlock;
    readonly button: (label: string, actionId: string, options?: {
        variant?: ButtonVariant;
    }) => UiButtonBlock;
    readonly form: (options: {
        actionId: string;
        submitLabel: string;
        fields: UiFormField[];
    }) => UiFormBlock;
    readonly field: {
        text(name: string, label: string, options?: Opt<Omit<UiTextField, "type" | "name" | "label">>): UiTextField;
        number(name: string, label: string, options?: Opt<Omit<UiNumberField, "type" | "name" | "label">>): UiNumberField;
        select(name: string, label: string, options: UiSelectField["options"], extra?: Opt<Pick<UiSelectField, "default" | "required">>): UiSelectField;
        switch(name: string, label: string, options?: Opt<Pick<UiSwitchField, "default">>): UiSwitchField;
        date(name: string, label: string, options?: Opt<Omit<UiDateField, "type" | "name" | "label">>): UiDateField;
        time(name: string, label: string, options?: Opt<Omit<UiTimeField, "type" | "name" | "label">>): UiTimeField;
    };
    readonly divider: () => UiDividerBlock;
    readonly stack: (children: UiBlock[]) => UiStackBlock;
    /** Horizontal, wraps on narrow screens; `justify: "between"` pushes the last child to the right edge. */
    readonly row: (children: UiBlock[], options?: {
        justify?: RowJustify;
    }) => UiRowBlock;
    /** 2 to 6 equal-width columns, optionally with vertical dividers; throws on any other count. */
    readonly columns: (children: UiBlock[], options?: {
        dividers?: boolean;
        align?: ColumnsAlignment;
    }) => UiColumnsBlock;
};
/** Toasts for `ui.doc(blocks, { toast })`, at most 200 characters. */
export declare const toast: {
    readonly success: (message: string) => UiToast;
    readonly error: (message: string) => UiToast;
};
export {};
