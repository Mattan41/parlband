import { describe, expect, it } from "vitest";

import {
  detectPlatform,
  isIosDevice,
  isStandalone,
} from "../components/about/installApp";

const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36";
const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
/** iPadOS 13+ masquerades as desktop Safari on a Mac. */
const IPAD_DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";
const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

describe("detectPlatform", () => {
  it("classifies Android phones", () => {
    expect(detectPlatform(ANDROID_UA, 5)).toBe("android");
  });

  it("classifies iOS from the user agent", () => {
    expect(detectPlatform(IPHONE_UA, 5)).toBe("ios");
  });

  it("treats an iPadOS desktop user agent with touch points as iOS", () => {
    expect(detectPlatform(IPAD_DESKTOP_UA, 5)).toBe("ios");
  });

  it("does not mistake a touch-less Mac for an iPad", () => {
    expect(detectPlatform(IPAD_DESKTOP_UA, 0)).toBe("other");
  });

  it("falls back to other for desktop browsers", () => {
    expect(detectPlatform(DESKTOP_UA, 0)).toBe("other");
  });
});

describe("isIosDevice", () => {
  it("is true for an iPhone user agent", () => {
    expect(isIosDevice(IPHONE_UA, 5)).toBe(true);
  });

  it("is false for a plain desktop user agent", () => {
    expect(isIosDevice(DESKTOP_UA, 0)).toBe(false);
  });
});

describe("isStandalone", () => {
  it("is true when the display mode is standalone", () => {
    expect(
      isStandalone({ displayModeStandalone: true, navigatorStandalone: false })
    ).toBe(true);
  });

  it("is true for iOS Safari's navigator.standalone", () => {
    expect(
      isStandalone({ displayModeStandalone: false, navigatorStandalone: true })
    ).toBe(true);
  });

  it("is false in a normal browser tab", () => {
    expect(
      isStandalone({
        displayModeStandalone: false,
        navigatorStandalone: false,
      })
    ).toBe(false);
  });
});
