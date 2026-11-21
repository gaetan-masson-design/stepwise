export type ThemeChoice = "system" | "light" | "dark";

const KEY = "stepwise:theme";

export function loadTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

const systemDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

/** Sets data-theme on <html> (index.html does the same before first paint) and remembers the choice. */
export function applyTheme(choice: ThemeChoice) {
  try {
    if (choice === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    // Storage blocked; the theme still applies for this visit.
  }
  const dark = choice === "dark" || (choice === "system" && systemDark());
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", getComputedStyle(document.documentElement).getPropertyValue("--background").trim() || "");
}

/** Follows the system setting while the choice is "system". */
export function watchSystemTheme(get: () => ThemeChoice) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => get() === "system" && applyTheme("system");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
