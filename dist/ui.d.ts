export declare const UI_VERSION = "v1";
export declare const MAX_UI_BLOCKS = 50;
/** Top-level blocks sit at depth 1; a container's children one deeper. */
export declare const MAX_UI_DEPTH = 3;
export declare const BADGE_VARIANTS: readonly ["default", "secondary", "outline", "destructive"];
export declare const BUTTON_VARIANTS: readonly ["default", "secondary", "outline", "destructive"];
export type BadgeVariant = (typeof BADGE_VARIANTS)[number];
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];
export type UiTextBlock = {
    type: "text";
    text: string;
    tone?: "muted";
};
export type UiHeadingBlock = {
    type: "heading";
    text: string;
    level: 2 | 3;
};
export type UiStatBlock = {
    type: "stat";
    label: string;
    value: string;
    hint?: string;
};
export type UiBadgeBlock = {
    type: "badge";
    label: string;
    variant?: BadgeVariant;
};
export type UiListItem = {
    title: string;
    description?: string;
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
export type UiFormField = UiTextField | UiNumberField | UiSelectField | UiSwitchField;
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
};
export type UiBlock = UiTextBlock | UiHeadingBlock | UiStatBlock | UiBadgeBlock | UiListBlock | UiKeyValueBlock | UiLinkBlock | UiButtonBlock | UiFormBlock | UiDividerBlock | UiStackBlock | UiRowBlock;
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
    }) => UiTextBlock;
    readonly heading: (text: string, level?: 2 | 3) => UiHeadingBlock;
    readonly stat: (label: string, value: string, options?: {
        hint?: string;
    }) => UiStatBlock;
    readonly badge: (label: string, variant?: BadgeVariant) => UiBadgeBlock;
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
    };
    readonly divider: () => UiDividerBlock;
    readonly stack: (children: UiBlock[]) => UiStackBlock;
    /** Horizontal, wraps on narrow screens. */
    readonly row: (children: UiBlock[]) => UiRowBlock;
};
/** Toasts for `ui.doc(blocks, { toast })`, at most 200 characters. */
export declare const toast: {
    readonly success: (message: string) => UiToast;
    readonly error: (message: string) => UiToast;
};
export {};
