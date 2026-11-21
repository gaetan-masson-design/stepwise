import { afterEach, describe, expect, it, vi } from "vitest";
import { isIOS } from "./device";

const as = (userAgent: string, maxTouchPoints = 0) => vi.stubGlobal("navigator", { userAgent, maxTouchPoints });

describe("isIOS", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("spots iPhones and iPads, including iPads that say they're a Mac", () => {
    as("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15");
    expect(isIOS()).toBe(true);
    as("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15", 5);
    expect(isIOS()).toBe(true);
  });

  it("leaves desktops and other phones alone", () => {
    as("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15", 0);
    expect(isIOS()).toBe(false);
    as("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36", 5);
    expect(isIOS()).toBe(false);
  });
});
