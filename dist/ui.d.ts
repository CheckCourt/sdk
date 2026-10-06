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
    maxAge: number;
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
/** Values a submitted form sends back, keyed by field name. Empty optional fields are omitted. */
export type UiFormValues = Record<string, string | number | boolean>;
type Opt<T> = {
    [K in keyof T]?: T[K];
};
/** Options shared by `ui.doc` and `ui.hidden`. */
export interface UiDocumentOptions {
    toast?: UiToast;
    /** Seconds CheckCourt may reuse this render; `0` disables caching. Capped at 300. */
    maxAge?: number;
}
/**
 * Builds `ui: "v1"` documents. Strings are plain text (no HTML, no Markdown); CheckCourt
 * renders them with its own design system.
 */
export declare const ui: {
    readonly doc: (blocks: UiBlock[], options?: UiDocumentOptions) => UiDocument;
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
