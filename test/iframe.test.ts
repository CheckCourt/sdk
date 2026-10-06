import { describe, expect, it, vi } from "vitest";
import { connectExtensionFrame, isNavigablePath } from "../src/iframe.js";

function fakeWindow(search: string) {
  const posted: unknown[] = [];
  const listeners: ((e: MessageEvent) => void)[] = [];
  const events = new Map<string, () => void>();
  const parent = { postMessage: (m: unknown, origin: string) => posted.push({ m, origin }) };
  const style: Record<string, string> = {};
  const classes = new Set<string>();
  const documentElement = {
    scrollHeight: 321.4,
    style: Object.assign(style, { setProperty: (k: string, v: string) => (style[k] = v) }),
    classList: { toggle: (c: string, on: boolean) => (on ? classes.add(c) : classes.delete(c)) },
  };
  const win = {
    location: { search },
    parent,
    document: { documentElement },
    addEventListener: (type: string, l: (e: MessageEvent) => void) =>
      type === "message" ? listeners.push(l) : events.set(type, l as () => void),
    removeEventListener: vi.fn(),
    // Like an off-screen cross-origin frame: animation frames never fire.
    requestAnimationFrame: vi.fn(),
    cancelAnimationFrame: vi.fn(),
    setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
    clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
  };
  return { win: win as unknown as Window, posted, listeners, style, classes, parent, documentElement, events };
}

describe("connectExtensionFrame", () => {
  it("echoes the channel in every message", () => {
    const f = fakeWindow("?context=tok&channel=ch1");
    const frame = connectExtensionFrame({ window: f.win, autoResize: false });
    expect(frame.context).toBe("tok");
    frame.resize();
    frame.toast("success", " Gespeichert ");
    frame.navigate("/booking?date=2026-10-07");
    expect(f.posted).toEqual([
      { m: { type: "checkcourt:resize", channel: "ch1", height: 322 }, origin: "*" },
      { m: { type: "checkcourt:toast", channel: "ch1", kind: "success", message: "Gespeichert" }, origin: "*" },
      { m: { type: "checkcourt:navigate", channel: "ch1", path: "/booking?date=2026-10-07" }, origin: "*" },
    ]);
    expect(() => frame.navigate("/support")).toThrow(RangeError);
    expect(() => frame.toast("error", "")).toThrow(RangeError);
  });

  it("applies themes only from the parent with the right channel", () => {
    const f = fakeWindow("?channel=ch1");
    const frame = connectExtensionFrame({ window: f.win, autoResize: false });
    const seen = vi.fn();
    frame.onTheme(seen);
    const theme = { type: "checkcourt:theme", channel: "ch1", mode: "dark", tokens: { "--primary": "red" } };
    f.listeners[0]!({ source: {}, data: theme } as MessageEvent);
    f.listeners[0]!({ source: f.parent, data: { ...theme, channel: "other" } } as unknown as MessageEvent);
    expect(seen).not.toHaveBeenCalled();
    f.listeners[0]!({ source: f.parent, data: theme } as unknown as MessageEvent);
    expect(seen).toHaveBeenCalledWith({ mode: "dark", tokens: { "--primary": "red" } });
    expect(f.style["--primary"]).toBe("red");
    expect(f.classes.has("dark")).toBe(true);
  });

  it("auto-resizes without animation frames: at once, after a tick, on load and on every observed change", async () => {
    let observed: (() => void) | null = null;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          observed = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    try {
      const f = fakeWindow("?channel=ch1");
      const heights = () => f.posted.map((p) => (p as { m: { height: number } }).m.height);
      const frame = connectExtensionFrame({ window: f.win });
      expect(heights()).toEqual([322]);

      f.documentElement.scrollHeight = 400;
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(heights()).toEqual([322, 400]);

      f.documentElement.scrollHeight = 500;
      f.events.get("load")!();
      expect(heights()).toEqual([322, 400, 500]);

      f.documentElement.scrollHeight = 650;
      observed!();
      expect(heights()).toEqual([322, 400, 500, 650]);

      frame.disconnect();
      f.documentElement.scrollHeight = 700;
      observed!();
      expect(heights()).toEqual([322, 400, 500, 650]);
      expect(f.win.requestAnimationFrame).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("refuses to run without a channel", () => {
    expect(() => connectExtensionFrame({ window: fakeWindow("?context=x").win })).toThrow();
  });

  it("validates paths like the platform", () => {
    expect(isNavigablePath("/admin/members")).toBe(true);
    expect(isNavigablePath("//evil.com")).toBe(false);
    expect(isNavigablePath("/\\evil.com")).toBe(false);
    expect(isNavigablePath("/api/v1")).toBe(false);
  });
});
