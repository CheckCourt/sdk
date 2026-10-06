export const UI_VERSION = "v1";
export const MAX_UI_BLOCKS = 50;
/** Top-level blocks sit at depth 1; a container's children one deeper. */
export const MAX_UI_DEPTH = 3;
export const BADGE_VARIANTS = ["default", "secondary", "outline", "destructive"];
export const BUTTON_VARIANTS = ["default", "secondary", "outline", "destructive"];
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
};
function compact(value) {
    return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined));
}
/**
 * Builds `ui: "v1"` documents. Strings are plain text (no HTML, no Markdown); CheckCourt
 * renders them with its own design system.
 */
export const ui = {
    doc(blocks, options = {}) {
        return compact({ ui: UI_VERSION, blocks, toast: options.toast });
    },
    /** Nothing relevant here: no card at all. Answering `204 No Content` does the same. */
    hidden(options = {}) {
        return compact({ ui: UI_VERSION, hidden: true, toast: options.toast });
    },
    text(text, options = {}) {
        return compact({ type: "text", text, tone: options.tone });
    },
    heading(text, level = 2) {
        return { type: "heading", text, level };
    },
    stat(label, value, options = {}) {
        return compact({ type: "stat", label, value, hint: options.hint });
    },
    badge(label, variant) {
        return compact({ type: "badge", label, variant });
    },
    list(items) {
        return { type: "list", items: items.map((item) => compact({ ...item })) };
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
    /** Horizontal, wraps on narrow screens. */
    row(children) {
        return { type: "row", children };
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
