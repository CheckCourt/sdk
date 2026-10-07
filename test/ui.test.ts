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
  MAX_COLUMNS,
  MIN_COLUMNS,
  ROW_JUSTIFICATIONS,
  UI_ICONS,
  toast,
  ui,
  type BadgeVariant,
  type ColumnsAlignment,
  type RowJustify,
  type StatSize,
  type UiHintBlock,
  type UiIcon,
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

  it("builds a multiline text field with rows", () => {
    expect(ui.field.text("report", "Platzproblem melden", { multiline: true, rows: 4, max_length: 500 })).toEqual({
      type: "text",
      name: "report",
      label: "Platzproblem melden",
      multiline: true,
      rows: 4,
      max_length: 500,
    });
    expect(ui.field.text("note", "Notiz")).toEqual({ type: "text", name: "note", label: "Notiz" });
  });

  it("builds date and time fields with bounds, and omits unset options", () => {
    expect(ui.field.date("day", "Tag", { default: "2026-10-07", min: "2026-01-01", max: "2026-12-31", required: true })).toEqual({
      type: "date",
      name: "day",
      label: "Tag",
      default: "2026-10-07",
      min: "2026-01-01",
      max: "2026-12-31",
      required: true,
    });
    expect(ui.field.date("day", "Tag")).toEqual({ type: "date", name: "day", label: "Tag" });
    expect(ui.field.time("from", "Von", { min: "07:00", max: "22:00", step: 30, required: true })).toEqual({
      type: "time",
      name: "from",
      label: "Von",
      min: "07:00",
      max: "22:00",
      step: 30,
      required: true,
    });
    expect(ui.field.time("to", "Bis")).toEqual({ type: "time", name: "to", label: "Bis" });
  });

  it("adds icons to text, heading, stat, badge and list items, and keeps the old call forms", () => {
    expect(ui.text("Sonnig", { icon: "sun" })).toEqual({ type: "text", text: "Sonnig", icon: "sun" });
    expect(ui.heading("Turnier", { level: 3, icon: "trophy" })).toEqual({
      type: "heading",
      text: "Turnier",
      level: 3,
      icon: "trophy",
    });
    expect(ui.heading("Turnier", { icon: "trophy" }).level).toBe(2);
    expect(ui.heading("Details", 3)).toEqual({ type: "heading", text: "Details", level: 3 });
    expect(ui.stat("Jetzt", "24°", { icon: "sun", size: "lg" })).toEqual({
      type: "stat",
      label: "Jetzt",
      value: "24°",
      icon: "sun",
      size: "lg",
    });
    expect(ui.badge("Regen möglich", { variant: "warning", icon: "droplets" })).toEqual({
      type: "badge",
      label: "Regen möglich",
      variant: "warning",
      icon: "droplets",
    });
    expect(ui.badge("Neu", "warning")).toEqual({ type: "badge", label: "Neu", variant: "warning" });
    expect(ui.badge("Neu")).toEqual({ type: "badge", label: "Neu" });
    expect(ui.list([{ title: "Platz 1", icon: "map-pin" }, { title: "Platz 2" }])).toEqual({
      type: "list",
      items: [{ title: "Platz 1", icon: "map-pin" }, { title: "Platz 2" }],
    });
  });

  it("rejects icons, sizes and variants outside the allowlists", () => {
    expect(UI_ICONS).toContain("cloud-sun");
    expect(() => ui.text("x", { icon: "rocket" as UiIcon })).toThrow(TypeError);
    expect(() => ui.list([{ title: "x", icon: "rocket" as UiIcon }])).toThrow(TypeError);
    expect(() => ui.stat("x", "1", { size: "xl" as StatSize })).toThrow(TypeError);
    expect(() => ui.badge("x", "danger" as BadgeVariant)).toThrow(TypeError);
  });

  it("builds columns with 2 to 6 children and rejects other counts", () => {
    const day = (label: string) => ui.stat(label, "20°", { icon: "cloud" });
    expect(ui.columns([day("Heute"), day("Do")], { dividers: true, align: "center" })).toEqual({
      type: "columns",
      children: [day("Heute"), day("Do")],
      dividers: true,
      align: "center",
    });
    expect(JSON.stringify(ui.columns([ui.text("a"), ui.text("b")]))).toBe(
      '{"type":"columns","children":[{"type":"text","text":"a"},{"type":"text","text":"b"}]}',
    );
    expect(MIN_COLUMNS).toBe(2);
    expect(MAX_COLUMNS).toBe(6);
    expect(() => ui.columns([ui.text("a")])).toThrow(RangeError);
    expect(() => ui.columns(Array.from({ length: 7 }, () => ui.text("a")))).toThrow(RangeError);
    expect(() => ui.columns([ui.text("a"), ui.text("b")], { align: "end" as ColumnsAlignment })).toThrow(TypeError);
  });

  it("builds rows with an optional justify and rejects unknown values", () => {
    expect(JSON.stringify(ui.row([ui.text("a")]))).toBe('{"type":"row","children":[{"type":"text","text":"a"}]}');
    expect(ui.row([ui.text("a"), ui.badge("b")], { justify: "between" })).toEqual({
      type: "row",
      children: [ui.text("a"), ui.badge("b")],
      justify: "between",
    });
    expect(ROW_JUSTIFICATIONS).toEqual(["start", "between"]);
    expect(() => ui.row([ui.text("a")], { justify: "end" as RowJustify })).toThrow(TypeError);
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
