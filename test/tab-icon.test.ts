import { describe, expect, it } from "vitest";
import {
  fadeTickMs,
  isStillFading,
  tabIcon,
} from "../src/js/helpers/tab-icon.js";

const HALF_LIFE = 60_000;

const options: Options = {
  enabled: true,
  showUnreadBadge: true,
  enableFading: true,
  fadeHalfLife: HALF_LIFE,
  minFavIconOpacity: 0.1,
  fadeTimeToReset: 1000,
};

describe("tabIcon", () => {
  it("leaves a tab that was never hidden alone", () => {
    expect(tabIcon(options, { unread: false })).toEqual({ kind: "ORIGINAL" });
  });

  it("keeps the original icon at the moment the tab is hidden", () => {
    expect(tabIcon(options, { unread: false, hiddenMs: 0 })).toEqual({
      kind: "ORIGINAL",
    });
  });

  it("fades a hidden tab by its freshness", () => {
    expect(tabIcon(options, { unread: false, hiddenMs: HALF_LIFE })).toEqual({
      kind: "FADED",
      opacity: 0.5,
    });
  });

  it("stops at minFavIconOpacity", () => {
    expect(
      tabIcon(options, { unread: false, hiddenMs: HALF_LIFE * 10 }),
    ).toEqual({ kind: "FADED", opacity: 0.1 });
  });

  it("shows the unread badge instead of fading", () => {
    expect(tabIcon(options, { unread: true, hiddenMs: HALF_LIFE })).toEqual({
      kind: "UNREAD",
    });
  });

  it("fades unread tabs when the badge is off", () => {
    expect(
      tabIcon(
        { ...options, showUnreadBadge: false },
        { unread: true, hiddenMs: HALF_LIFE },
      ),
    ).toEqual({ kind: "FADED", opacity: 0.5 });
  });

  it("only shows the badge when fading is off", () => {
    const noFading = { ...options, enableFading: false };
    expect(tabIcon(noFading, { unread: true, hiddenMs: HALF_LIFE })).toEqual({
      kind: "UNREAD",
    });
    expect(tabIcon(noFading, { unread: false, hiddenMs: HALF_LIFE })).toEqual({
      kind: "ORIGINAL",
    });
  });

  it("does nothing with both badge and fading off", () => {
    expect(
      tabIcon(
        { ...options, showUnreadBadge: false, enableFading: false },
        { unread: true, hiddenMs: HALF_LIFE },
      ),
    ).toEqual({ kind: "ORIGINAL" });
  });

  it("restores every icon when the extension is turned off", () => {
    const off = { ...options, enabled: false };
    expect(tabIcon(off, { unread: true, hiddenMs: HALF_LIFE })).toEqual({
      kind: "ORIGINAL",
    });
    expect(tabIcon(off, { unread: false, hiddenMs: HALF_LIFE })).toEqual({
      kind: "ORIGINAL",
    });
  });

  it("treats options that haven't loaded yet as off", () => {
    expect(tabIcon({}, { unread: true, hiddenMs: HALF_LIFE })).toEqual({
      kind: "ORIGINAL",
    });
  });
});

describe("isStillFading", () => {
  it("keeps going while the icon is above the minimum", () => {
    expect(isStillFading(options, { unread: false, hiddenMs: 0 })).toBe(true);
    expect(isStillFading(options, { unread: false, hiddenMs: HALF_LIFE })).toBe(
      true,
    );
  });

  it("stops once the minimum is reached", () => {
    expect(
      isStillFading(options, { unread: false, hiddenMs: HALF_LIFE * 4 }),
    ).toBe(false);
  });

  it("stops once the icon is invisible, even with no minimum", () => {
    const noMin = { ...options, minFavIconOpacity: 0 };
    expect(
      isStillFading(noMin, { unread: false, hiddenMs: HALF_LIFE * 6 }),
    ).toBe(true);
    expect(
      isStillFading(noMin, { unread: false, hiddenMs: HALF_LIFE * 7 }),
    ).toBe(false);
  });

  it("doesn't run for visible, unread, unfaded or disabled tabs", () => {
    expect(isStillFading(options, { unread: false })).toBe(false);
    expect(isStillFading(options, { unread: true, hiddenMs: 0 })).toBe(false);
    expect(
      isStillFading(
        { ...options, enableFading: false },
        { unread: false, hiddenMs: 0 },
      ),
    ).toBe(false);
    expect(
      isStillFading(
        { ...options, enabled: false },
        { unread: false, hiddenMs: 0 },
      ),
    ).toBe(false);
  });

  it("keeps fading unread tabs when the badge is off", () => {
    expect(
      isStillFading(
        { ...options, showUnreadBadge: false },
        { unread: true, hiddenMs: 0 },
      ),
    ).toBe(true);
  });
});

describe("fadeTickMs", () => {
  it("repaints every 150ms at the 3 second half-life", () => {
    expect(fadeTickMs({ ...options, fadeHalfLife: 3000 })).toBe(150);
  });
});
