/** iPhone, iPad and iPod, including iPads that report themselves as a Mac. */
export function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

interface AudioSession { type: string }

/**
 * Asks iOS to treat the page's sound as media playback, which newer versions honour even
 * with the silent switch on. Older versions ignore it, so the app still shows a hint.
 */
export function preferPlaybackAudio() {
  const session = (navigator as Navigator & { audioSession?: AudioSession }).audioSession;
  if (session) {
    try {
      session.type = "playback";
    } catch {
      // Not supported here; the silent-switch hint covers it.
    }
  }
}

/**
 * Runs `unlock` on taps, clicks and key presses until it reports success. Browsers only allow
 * audio after a gesture, and older iOS versions only accept some kinds (a touch that ends).
 */
export function unlockOnGesture(unlock: () => Promise<boolean>) {
  const events = ["pointerdown", "touchend", "click", "keydown"] as const;
  const stop = () => events.forEach((e) => window.removeEventListener(e, run, true));
  function run() {
    void unlock().then((ok) => ok && stop());
  }
  events.forEach((e) => window.addEventListener(e, run, { capture: true, passive: true }));
  return stop;
}
