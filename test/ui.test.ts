import { describe, expect, it } from "vitest";
import {
  ANNOTATION_LABEL_MAX,
  BOOKING_HINT_BLOCKS,
  BOOKING_HINT_TIMEOUT_MS,
  COLUMN_TEXT_MAX,
  COLUMN_TITLE_MAX,
  MAX_ANNOTATIONS_PER_COURT,
  MAX_APP_COLUMNS,
  MAX_BOOKING_HINTS,
  MAX_HINT_BLOCKS,
  MAX_SIDEBAR_ACTIONS,
  toast,
  ui,
  type UiHintBlock,
} from "../src/ui.js";

describe("ui builder", () => {
  it("omits unset optional keys, which the strict schema would reject as undefined", () => {
    const doc = ui.doc([ui.text("Hallo"), ui.badge("Neu"), ui.button("Los", "go"), ui.stat("A", "1")]);
    expect(JSON.stringify(doc)).toBe(
      '{"ui":"v1","blocks":[{"type":"text","text":"Hallo"},{"type":"badge","label":"Neu"},{"type":"button","label":"Los","action_id":"go"},{"type":"stat","label":"A","value":"1"}]}',
    );
  });

  it("builds key_value from an object and forms with snake_case keys", () => {
    expect(ui.keyValue({ Platz: "3" })).toEqual({ type: "key_value", pairs: [{ label: "Platz", value: "3" }] });
    expect(
      ui.form({ actionId: "save", submitLabel: "Speichern", fields: [ui.field.text("note", "Notiz", { max_length: 10 })] })
        .submit_label,
    ).toBe("Speichern");
    expect(ui.doc([], { toast: toast.success("Gespeichert") }).toast).toEqual({ kind: "success", message: "Gespeichert" });
  });

  it("builds a hidden document, with an optional toast", () => {
    expect(JSON.stringify(ui.hidden())).toBe('{"ui":"v1","hidden":true}');
    expect(ui.hidden({ toast: toast.success("Erledigt") })).toEqual({
      ui: "v1",
      hidden: true,
      toast: { kind: "success", message: "Erledigt" },
    });
  });

  it("emits cache.max_age from maxAge on visible and hidden documents", () => {
    expect(ui.doc([], { maxAge: 120 })).toEqual({ ui: "v1", blocks: [], cache: { max_age: 120 } });
    expect(JSON.stringify(ui.hidden({ maxAge: 0 }))).toBe('{"ui":"v1","hidden":true,"cache":{"max_age":0}}');
    expect(ui.doc([], { toast: toast.success("Ok"), maxAge: 60 })).toEqual({
      ui: "v1",
      blocks: [],
      toast: { kind: "success", message: "Ok" },
      cache: { max_age: 60 },
    });
    expect("cache" in ui.doc([])).toBe(false);
  });

  it("rejects a maxAge that is not a whole number of seconds", () => {
    for (const maxAge of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => ui.doc([], { maxAge })).toThrow(RangeError);
      expect(() => ui.hidden({ maxAge })).toThrow(RangeError);
    }
  });
});

describe("host surface builders", () => {
  it("exports the platform limits", () => {
    expect({
      ANNOTATION_LABEL_MAX,
      MAX_ANNOTATIONS_PER_COURT,
      COLUMN_TITLE_MAX,
      COLUMN_TEXT_MAX,
      MAX_APP_COLUMNS,
      MAX_SIDEBAR_ACTIONS,
      BOOKING_HINT_TIMEOUT_MS,
      MAX_HINT_BLOCKS,
      MAX_BOOKING_HINTS,
    }).toEqual({
      ANNOTATION_LABEL_MAX: 24,
      MAX_ANNOTATIONS_PER_COURT: 2,
      COLUMN_TITLE_MAX: 20,
      COLUMN_TEXT_MAX: 24,
      MAX_APP_COLUMNS: 2,
      MAX_SIDEBAR_ACTIONS: 2,
      BOOKING_HINT_TIMEOUT_MS: 1000,
      MAX_HINT_BLOCKS: 6,
      MAX_BOOKING_HINTS: 2,
    });
    expect(BOOKING_HINT_BLOCKS).toEqual(["text", "badge", "key_value", "link"]);
  });

  it("builds an annotations document, omitting unset variants", () => {
    expect(
      JSON.stringify(
        ui.annotations([
          { court_id: 1, label: "Flutlicht an", variant: "secondary" },
          { court_id: 2, label: "Nass" },
        ]),
      ),
    ).toBe('{"ui":"v1","annotations":[{"court_id":1,"label":"Flutlicht an","variant":"secondary"},{"court_id":2,"label":"Nass"}]}');
    expect(ui.annotations([], { maxAge: 60 })).toEqual({ ui: "v1", annotations: [], cache: { max_age: 60 } });
  });

  it("rejects annotations the platform would refuse", () => {
    expect(() => ui.annotations([{ court_id: 1, label: "x".repeat(ANNOTATION_LABEL_MAX + 1) }])).toThrow(RangeError);
    expect(() => ui.annotations([{ court_id: 1, label: "   " }])).toThrow(RangeError);
    expect(() => ui.annotations([{ court_id: 1, label: "a" }, { court_id: 1, label: "b" }])).toThrow(RangeError);
    expect(() => ui.annotations([{ court_id: 1.5, label: "a" }])).toThrow(TypeError);
    expect(() => ui.annotations([{ court_id: 1, label: "a", variant: "green" as never }])).toThrow(TypeError);
    expect(() => ui.annotations(Array.from({ length: 201 }, (_, i) => ({ court_id: i + 1, label: "a" })))).toThrow(RangeError);
    expect(() => ui.annotations([], { maxAge: -1 })).toThrow(RangeError);
    expect(ui.annotations([{ court_id: 3, label: "x".repeat(ANNOTATION_LABEL_MAX) }]).annotations).toHaveLength(1);
  });

  it("builds a column document", () => {
    expect(
      ui.column({
        title: "Beitrag",
        values: [
          { member_id: "tu_1", text: "Offen", variant: "destructive" },
          { member_id: "tu_2", text: "Bezahlt" },
        ],
      }),
    ).toEqual({
      ui: "v1",
      column: {
        title: "Beitrag",
        values: [
          { member_id: "tu_1", text: "Offen", variant: "destructive" },
          { member_id: "tu_2", text: "Bezahlt" },
        ],
      },
    });
    expect(ui.column({ title: "Beitrag", values: [] }, { maxAge: 0 }).cache).toEqual({ max_age: 0 });
  });

  it("rejects columns the platform would refuse", () => {
    expect(() => ui.column({ title: "x".repeat(COLUMN_TITLE_MAX + 1), values: [] })).toThrow(RangeError);
    expect(() => ui.column({ title: "", values: [] })).toThrow(RangeError);
    expect(() =>
      ui.column({ title: "Beitrag", values: [{ member_id: "tu_1", text: "x".repeat(COLUMN_TEXT_MAX + 1) }] }),
    ).toThrow(RangeError);
    expect(() =>
      ui.column({
        title: "Beitrag",
        values: [
          { member_id: "tu_1", text: "a" },
          { member_id: "tu_1", text: "b" },
        ],
      }),
    ).toThrow(RangeError);
    expect(() => ui.column({ title: "Beitrag", values: [{ member_id: "", text: "a" }] })).toThrow(TypeError);
  });

  it("builds a hint document from display-only blocks", () => {
    const doc = ui.hint(
      [ui.text("Platz 3 ist nass"), ui.badge("Regen", "outline"), ui.keyValue({ Regen: "80 %" }), ui.link("Radar", "https://wetter.example.de")],
      { maxAge: 30 },
    );
    expect(doc.blocks.map((b) => b.type)).toEqual(["text", "badge", "key_value", "link"]);
    expect(doc.cache).toEqual({ max_age: 30 });
    expect("toast" in doc).toBe(false);
  });

  it("rejects hint documents the platform would refuse", () => {
    expect(() => ui.hint([ui.button("Los", "go") as unknown as UiHintBlock])).toThrow(TypeError);
    expect(() => ui.hint([ui.stack([ui.text("a")]) as unknown as UiHintBlock])).toThrow(TypeError);
    expect(() => ui.hint(Array.from({ length: MAX_HINT_BLOCKS + 1 }, () => ui.text("a")))).toThrow(RangeError);
    // @ts-expect-error headings are not display-only hint blocks
    expect(() => ui.hint([ui.heading("Hinweis")])).toThrow(TypeError);
  });
});
