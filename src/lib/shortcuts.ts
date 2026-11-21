/** The parts of a DOM element the shortcut guard looks at (so it can be tested without a DOM). */
export interface KeyTarget {
  matches(selector: string): boolean;
  closest(selector: string): unknown;
}

/** Text fields, and widgets that use the keyboard themselves (pickers, option groups, sliders, menus, sheets). */
const OWN_KEYS = "input, select, textarea, [contenteditable], [role=combobox], [role=radio], [role=slider], [role=menuitem], [role=menuitemcheckbox], [role=menuitemradio]";
const OWN_KEYS_INSIDE = "[role=dialog], [role=menu], [role=listbox]";

/**
 * True when the app's keyboard shortcuts should leave a key press alone: a control already
 * handled it, or it was typed into a field or a widget that uses keys.
 */
export function shortcutIgnored(target: KeyTarget | null, _key: string, defaultPrevented: boolean) {
  if (defaultPrevented || !target) return defaultPrevented;
  return target.matches(OWN_KEYS) || !!target.closest(OWN_KEYS_INSIDE);
}

/**
 * Space is play/stop everywhere else, so when a plain button has focus (say, the chord you just
 * tapped) its own Space press must be cancelled, or it would fire too. Browsers press a button
 * on Space's key-up, so that's the event to cancel.
 */
export const spacePressesButton = (target: KeyTarget | null, key: string) =>
  key === " " && !!target?.closest("button, [role=button]");
