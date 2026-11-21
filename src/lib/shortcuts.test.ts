import { describe, expect, it } from "vitest";
import { shortcutIgnored, spacePressesButton, type KeyTarget } from "./shortcuts";

/** A fake element: its own role/tag, plus the roles/tags of its ancestors. */
const el = (self: string, ...ancestors: string[]): KeyTarget => {
  const has = (sel: string, list: string[]) =>
    sel.split(",").map((s) => s.trim()).some((s) => list.some((x) => s === x || s === `[role=${x}]`));
  return { matches: (sel) => has(sel, [self]), closest: (sel) => (has(sel, [self, ...ancestors]) ? {} : null) };
};

describe("keyboard shortcut guard", () => {
  it("leaves keys alone in fields and in widgets that use keys", () => {
    expect(shortcutIgnored(el("input"), "1", false)).toBe(true);
    expect(shortcutIgnored(el("combobox"), " ", false)).toBe(true); // key and mode pickers
    expect(shortcutIgnored(el("radio"), "ArrowRight", false)).toBe(true); // option groups
    expect(shortcutIgnored(el("slider"), "ArrowLeft", false)).toBe(true); // levels
    expect(shortcutIgnored(el("button", "dialog"), "Delete", false)).toBe(true); // song sheet
  });
  it("keeps Space as play/stop on a focused button, and cancels the button's own press", () => {
    expect(shortcutIgnored(el("button"), " ", false)).toBe(false);
    expect(spacePressesButton(el("button"), " ")).toBe(true);
    expect(spacePressesButton(el("span", "button"), " ")).toBe(true);
    expect(spacePressesButton(el("button"), "Enter")).toBe(false);
    expect(spacePressesButton(el("div"), " ")).toBe(false);
  });
  it("runs shortcuts from the page itself, unless a control already handled the key", () => {
    expect(shortcutIgnored(el("body"), " ", false)).toBe(false);
    expect(shortcutIgnored(el("div"), "ArrowLeft", false)).toBe(false);
    expect(shortcutIgnored(el("div"), "ArrowLeft", true)).toBe(true);
    expect(shortcutIgnored(null, "z", false)).toBe(false);
  });
});
