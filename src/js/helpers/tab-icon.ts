// Decides what a tab's favicon should look like. Kept free of DOM and `chrome.*` so it can be unit
// tested; `content-script-module.ts` does the painting and the timers.
import { freshness } from "./util.js";

export type TabIcon =
  | { kind: "ORIGINAL" }
  | { kind: "UNREAD" }
  | { kind: "FADED"; opacity: number };

export type TabState = {
  unread: boolean;
  /** How long the tab has been hidden without being reset. `undefined` while it's fresh. */
  hiddenMs?: number;
};

/** Below this an icon is invisible anyway, so there's no point repainting it any further. */
const INVISIBLE_OPACITY = 0.01;

/** Repaint 20 times per half-life, so every 150ms at the fastest (3 second) setting. */
export function fadeTickMs(options: Options) {
  return options.fadeHalfLife / 20;
}

export function tabIcon(options: Options, tab: TabState): TabIcon {
  if (!options.enabled) return { kind: "ORIGINAL" };
  if (options.showUnreadBadge && tab.unread) return { kind: "UNREAD" };
  if (!options.enableFading || tab.hiddenMs === undefined) {
    return { kind: "ORIGINAL" };
  }
  const opacity = Math.max(
    options.minFavIconOpacity,
    freshness(tab.hiddenMs, options.fadeHalfLife),
  );
  // Leave the page's own favicon alone until there's actually something to fade.
  if (opacity >= 1) return { kind: "ORIGINAL" };
  return { kind: "FADED", opacity };
}

/** Whether the icon will look different later, i.e. whether a repaint timer needs to keep running. */
export function isStillFading(options: Options, tab: TabState) {
  if (!options.enabled || !options.enableFading) return false;
  if (tab.hiddenMs === undefined) return false;
  if (options.showUnreadBadge && tab.unread) return false;
  const opacity = freshness(tab.hiddenMs, options.fadeHalfLife);
  return opacity > options.minFavIconOpacity && opacity > INVISIBLE_OPACITY;
}
