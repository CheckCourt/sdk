export const CONTEXT_PARAM = "context";
export const CHANNEL_PARAM = "channel";
export const IFRAME_MIN_HEIGHT = 80;
export const IFRAME_MAX_HEIGHT = 2000;
export const MAX_TOAST_LENGTH = 200;

/** Top-level areas `navigate()` may target; anything else is dropped by CheckCourt. */
export const NAVIGABLE_SECTIONS = [
  "dashboard",
  "booking",
  "my-bookings",
  "club",
  "team",
  "trainer",
  "fees",
  "arbeitsstunden",
  "settings",
  "admin",
] as const;

/** CSS variables CheckCourt sends with every theme message. */
export const THEME_TOKEN_NAMES = [
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--muted",
  "--muted-foreground",
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--accent",
  "--accent-foreground",
  "--destructive",
  "--warning",
  "--warning-foreground",
  "--warning-muted",
  "--border",
  "--input",
  "--ring",
  "--radius",
] as const;

export type ThemeTokenName = (typeof THEME_TOKEN_NAMES)[number];

export type FrameMessage =
  | { type: "checkcourt:resize"; channel: string; height: number }
  | { type: "checkcourt:toast"; channel: string; kind: "success" | "error"; message: string }
  | { type: "checkcourt:navigate"; channel: string; path: string };

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

export function resizeMessage(channel: string, height: number): FrameMessage {
  return { type: "checkcourt:resize", channel, height: Math.max(0, Math.ceil(height)) };
}

export function toastMessage(channel: string, kind: "success" | "error", message: string): FrameMessage {
  const trimmed = message.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_TOAST_LENGTH) {
    throw new RangeError(`Toast message must be 1 to ${MAX_TOAST_LENGTH} characters`);
  }
  return { type: "checkcourt:toast", channel, kind, message: trimmed };
}

export function navigateMessage(channel: string, path: string): FrameMessage {
  if (!isNavigablePath(path)) {
    throw new RangeError(`Path must start with /${NAVIGABLE_SECTIONS.join(", /")}: ${path}`);
  }
  return { type: "checkcourt:navigate", channel, path };
}

/** Mirrors CheckCourt's check: same-site path into one of the club areas, query and hash allowed. */
export function isNavigablePath(path: string): boolean {
  if (typeof path !== "string" || path.length > 500 || !path.startsWith("/") || path.startsWith("//")) return false;
  if (/[\\\u0000-\u001f\u007f]/.test(path)) return false;
  let url: URL;
  try {
    url = new URL(path, "https://checkcourt.invalid");
  } catch {
    return false;
  }
  if (url.origin !== "https://checkcourt.invalid") return false;
  const section = url.pathname.split("/")[1] ?? "";
  return (NAVIGABLE_SECTIONS as readonly string[]).includes(section);
}

export function isThemeMessage(data: unknown, channel: string): data is ThemeMessage {
  const msg = data as Partial<ThemeMessage> | null;
  return (
    !!msg &&
    typeof msg === "object" &&
    msg.type === "checkcourt:theme" &&
    msg.channel === channel &&
    (msg.mode === "light" || msg.mode === "dark") &&
    !!msg.tokens &&
    typeof msg.tokens === "object"
  );
}

/** Sets the tokens as CSS variables on `<html>`, toggles the `dark` class and `color-scheme`. */
export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  for (const name of THEME_TOKEN_NAMES) {
    const value = theme.tokens[name];
    if (typeof value === "string" && value) root.style.setProperty(name, value);
  }
  root.classList.toggle("dark", theme.mode === "dark");
  root.style.colorScheme = theme.mode;
}

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
export function connectExtensionFrame(options: ConnectOptions = {}): ExtensionFrame {
  const win = options.window ?? window;
  const params = new URLSearchParams(win.location.search);
  const channel = params.get(CHANNEL_PARAM);
  if (!channel) throw new Error(`Missing ?${CHANNEL_PARAM}= parameter: this page must be opened by CheckCourt`);
  const context = params.get(CONTEXT_PARAM);
  const doc = win.document;

  // The sandbox gives the frame an opaque origin, so no narrower target origin can match.
  const post = (message: FrameMessage) => win.parent.postMessage(message, "*");

  let theme: Theme | null = null;
  const listeners = new Set<(theme: Theme) => void>();
  const onMessage = (event: MessageEvent) => {
    if (event.source !== win.parent || !isThemeMessage(event.data, channel)) return;
    theme = { mode: event.data.mode, tokens: event.data.tokens };
    if (options.applyTheme !== false) applyTheme(theme, doc.documentElement);
    for (const listener of listeners) listener(theme);
  };
  win.addEventListener("message", onMessage);

  let lastHeight = -1;
  const measure = () => Math.ceil(doc.documentElement.scrollHeight);
  const resize = (height = measure()) => {
    const rounded = Math.ceil(height);
    if (rounded === lastHeight) return;
    lastHeight = rounded;
    post(resizeMessage(channel, rounded));
  };

  let observer: ResizeObserver | null = null;
  let timer: number | undefined;
  let connected = true;
  const autoResize = () => {
    if (connected) resize();
  };
  if (options.autoResize !== false) {
    // No requestAnimationFrame: browsers skip it in off-screen cross-origin frames, so the height would never arrive.
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(autoResize);
      observer.observe(doc.documentElement);
    }
    resize();
    queueMicrotask(autoResize);
    timer = win.setTimeout(autoResize, 0);
    win.addEventListener("load", autoResize);
  }

  return {
    context,
    channel,
    get theme() {
      return theme;
    },
    resize,
    toast: (kind, message) => post(toastMessage(channel, kind, message)),
    navigate: (path) => post(navigateMessage(channel, path)),
    onTheme(callback) {
      listeners.add(callback);
      if (theme) callback(theme);
      return () => listeners.delete(callback);
    },
    disconnect() {
      connected = false;
      win.removeEventListener("message", onMessage);
      win.removeEventListener("load", autoResize);
      observer?.disconnect();
      if (timer !== undefined) win.clearTimeout(timer);
      listeners.clear();
    },
  };
}
