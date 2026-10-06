import { describe, expect, it } from "vitest";
import { toast, ui } from "../src/ui.js";

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
});
