export declare const CONTEXT_PARAM = "context";
export declare const CHANNEL_PARAM = "channel";
export declare const IFRAME_MIN_HEIGHT = 80;
export declare const IFRAME_MAX_HEIGHT = 2000;
export declare const MAX_TOAST_LENGTH = 200;
/** Top-level areas `navigate()` may target; anything else is dropped by CheckCourt. */
export declare const NAVIGABLE_SECTIONS: readonly ["dashboard", "booking", "my-bookings", "club", "team", "trainer", "fees", "arbeitsstunden", "settings", "admin"];
/** CSS variables CheckCourt sends with every theme message. */
export declare const THEME_TOKEN_NAMES: readonly ["--background", "--foreground", "--card", "--card-foreground", "--muted", "--muted-foreground", "--primary", "--primary-foreground", "--secondary", "--secondary-foreground", "--accent", "--accent-foreground", "--destructive", "--warning", "--warning-foreground", "--warning-muted", "--border", "--input", "--ring", "--radius"];
export type ThemeTokenName = (typeof THEME_TOKEN_NAMES)[number];
export type FrameMessage = {
    type: "checkcourt:resize";
    channel: string;
    height: number;
} | {
    type: "checkcourt:toast";
    channel: string;
    kind: "success" | "error";
    message: string;
} | {
    type: "checkcourt:navigate";
    channel: string;
    path: string;
};
export interface ThemeMessage {
    type: "checkcourt:theme";
    channel: string;
    mode: "light" | "dark";
    tokens: Partial<Record<ThemeTokenName, string>>;
}
export interface Theme {
    mode: "light" | "dark";
    tokens: Partial<Record<ThemeTokenName, string>>;
}
export declare function resizeMessage(channel: string, height: number): FrameMessage;
export declare function toastMessage(channel: string, kind: "success" | "error", message: string): FrameMessage;
export declare function navigateMessage(channel: string, path: string): FrameMessage;
/** Mirrors CheckCourt's check: same-site path into one of the club areas, query and hash allowed. */
export declare function isNavigablePath(path: string): boolean;
export declare function isThemeMessage(data: unknown, channel: string): data is ThemeMessage;
/** Sets the tokens as CSS variables on `<html>`, toggles the `dark` class and `color-scheme`. */
export declare function applyTheme(theme: Theme, root?: HTMLElement): void;
export interface ConnectOptions {
    /** Keep the frame as tall as the document via ResizeObserver. Default true. */
    autoResize?: boolean;
    /** Apply every theme CheckCourt sends with `applyTheme`. Default true. */
    applyTheme?: boolean;
    /** For tests; defaults to `window`. */
    window?: Window;
}
export interface ExtensionFrame {
    /** The context token from the URL. Send it to your backend and verify it there, never trust it in the browser. */
    readonly context: string | null;
    readonly channel: string;
    /** The latest theme, once CheckCourt has sent one. */
    readonly theme: Theme | null;
    resize(height?: number): void;
    toast(kind: "success" | "error", message: string): void;
    navigate(path: string): void;
    /** Called for the current theme (if known) and every change. Returns an unsubscribe function. */
    onTheme(callback: (theme: Theme) => void): () => void;
    disconnect(): void;
}
/**
 * Connects an iframe extension to CheckCourt: reads `context` and `channel` from the URL and
 * sends messages with the channel nonce. Throws when the page was not opened by CheckCourt.
 */
export declare function connectExtensionFrame(options?: ConnectOptions): ExtensionFrame;
