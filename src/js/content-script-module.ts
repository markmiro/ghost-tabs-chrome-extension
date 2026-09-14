// NOTE: need to add `.js` extension or otherwise Chrome won't find it
// Also, need to add any imports and their imports to the `manifest.json` file:
// `web_accessible_resources.resources`
// ---
import { log } from "./helpers/console.js";
import { selfClean } from "./helpers/self-clean-content-script.js";
import { fadeTickMs, isStillFading, tabIcon } from "./helpers/tab-icon.js";
import {
  fadedIconUrlViaWorker,
  fadeIconViaWorker,
  getFaviconUrl,
  releaseDom,
  resetIcon,
  setFavicon,
  unreadIconUrlViaWorker,
} from "./helpers/util-dom.js";

/** Calls `handler` with the stored options, then again on every change. Returns an unsubscribe. */
function withOptions(handler: (options: Options) => void) {
  let options: Options = {};

  chrome.storage.local.get("options").then((data) => {
    Object.assign(options, data.options);
    handler(options);
  });

  function onChanged(
    changes: Record<string, chrome.storage.StorageChange>,
    area: string
  ) {
    if (area === "local" && changes.options?.newValue) {
      Object.assign(options, changes.options.newValue);
      handler(options);
    }
  }
  chrome.storage.onChanged.addListener(onChanged);
  return () => chrome.storage.onChanged.removeListener(onChanged);
}

class DebugFade {
  static INTERVAL = 500;
  intervalId: number;
  opacity = 1;
  favIconUrl: string;
  constructor(favIconUrl: string) {
    this.favIconUrl = favIconUrl;
  }
  start() {
    this.intervalId = setInterval(() => {
      fadeIconViaWorker(this.favIconUrl, this.opacity);
      this.opacity /= 2;
    }, DebugFade.INTERVAL);
  }
  stop() {
    this.cancel();
    fadeIconViaWorker(this.favIconUrl, this.opacity);
  }
  /** Stop the timer without repainting, for when we no longer own the favicon. */
  cancel() {
    this.opacity = 1;
    clearInterval(this.intervalId);
  }
}

selfClean(async function func(pool) {
  const favIconUrl = await getFaviconUrl();
  let unread = document.visibilityState === "hidden";
  /** When the tab was hidden, which is when its freshness started to drop. Cleared once it's read. */
  let hiddenAt = document.visibilityState === "hidden" ? Date.now() : undefined;
  let options: Options = {};
  // const redRectHref = await blankIconDataUrl();
  // log("redRectHref", redRectHref);
  // setFavicon(redRectHref);
  const debugFade = new DebugFade(favIconUrl);

  log("getFaviconUrl()", favIconUrl);
  let resetTimeoutId = 0;
  let fadeIntervalId = 0;
  /** Bumped on every paint, so a slow render from the background can't land on top of a newer one. */
  let paintId = 0;

  function tabState() {
    return {
      unread,
      hiddenMs: hiddenAt === undefined ? undefined : Date.now() - hiddenAt,
    };
  }

  async function paint() {
    const id = ++paintId;
    const icon = tabIcon(options, tabState());
    if (icon.kind === "ORIGINAL") {
      resetIcon(favIconUrl);
      return;
    }
    let href: string;
    try {
      href =
        icon.kind === "UNREAD"
          ? await unreadIconUrlViaWorker(favIconUrl)
          : await fadedIconUrlViaWorker(favIconUrl, icon.opacity);
    } catch (err) {
      log(err);
      return;
    }
    if (id === paintId && href) setFavicon(href);
  }

  /** Repaint now, and keep repainting on a timer for as long as the icon is still fading. */
  function update() {
    pool.clearTimer(fadeIntervalId);
    paint();
    // A tab that's being looked at holds still until it's reset (see the visibility listener).
    if (document.visibilityState !== "hidden") return;
    if (!isStillFading(options, tabState())) return;
    fadeIntervalId = pool.setInterval(() => {
      paint();
      if (!isStillFading(options, tabState())) pool.clearTimer(fadeIntervalId);
    }, fadeTickMs(options));
  }

  /** Turn Off: stop all freshness tracking and put the page's own icon back. */
  function turnOff() {
    pool.clearTimer(resetTimeoutId);
    pool.clearTimer(fadeIntervalId);
    unread = false;
    hiddenAt = undefined;
    paint();
  }

  // Registered once and reads `options` when it fires. `withOptions` calls back on every option
  // change, so registering in there would add another listener each time.
  pool.addDocListener("visibilitychange", () => {
    pool.clearTimer(resetTimeoutId);
    if (!options.enabled) return;

    if (document.visibilityState === "visible") {
      // Hold the icon as it is while the tab is being looked at. A quick glance shouldn't count as
      // reading it, so it only goes back to full freshness after `fadeTimeToReset`.
      pool.clearTimer(fadeIntervalId);
      resetTimeoutId = pool.setTimeout(() => {
        unread = false;
        hiddenAt = undefined;
        update();
      }, options.fadeTimeToReset);
    } else {
      // Picks up where it left off if the tab was hidden again before the reset.
      hiddenAt ??= Date.now();
      update();
    }
  });

  const stopWatchingOptions = withOptions((newOptions) => {
    log("OPTIONS", newOptions);
    options = newOptions;
    if (!options.enabled) {
      turnOff();
      return;
    }
    // Turning back on starts a hidden tab's freshness over from now.
    if (document.visibilityState === "hidden") hiddenAt ??= Date.now();
    update();
  });

  async function onMessage(
    request: MessageRequest,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) {
    log("chrome.runtime.onMessage.addListener", request);
    switch (request.action) {
      case "MARK_READ":
        if (!options.enabled) break;
        unread = false;
        // Fresh again, but if it's in the background it starts to go stale from now.
        hiddenAt =
          document.visibilityState === "hidden" ? Date.now() : undefined;
        update();
        break;
      case "MARK_UNREAD":
        if (!options.enabled) break;
        unread = true;
        update();
        break;
      case "DEBUG.FADE_AMOUNT":
        fadeIconViaWorker(favIconUrl, request.fadeAmount);
        break;
      case "DEBUG.FADE":
        fadeIconViaWorker(favIconUrl, 0.5);
        break;
      case "DEBUG.UNFADE":
        resetIcon(favIconUrl);
        break;
      case "DEBUG.PLAY_FADE":
        alert("Click 'start' instead");
        break;
      case "DEBUG.START":
        debugFade.start();
        break;
      case "DEBUG.STOP":
        debugFade.stop();
        break;
      case "DEBUG.PRINT_VARS":
        const vars = {
          unread,
          favIconUrl,
          options,
          ...tabState(),
          icon: tabIcon(options, tabState()),
        };
        log(vars);
        sendResponse(vars);
        break;
      default:
        break;
    }
  }
  chrome.runtime.onMessage.addListener(onMessage);

  return (reason: CleanupReason) => {
    stopWatchingOptions();
    chrome.runtime.onMessage.removeListener(onMessage);
    // Drop any icon that's still being rendered.
    paintId++;
    // Stop without repainting: `stop()` would draw a copy of the icon on top of the reset.
    debugFade.cancel();
    pool.clearTimer(resetTimeoutId);
    pool.clearTimer(fadeIntervalId);

    if (reason === "SUPERSEDED") {
      // A newer content script has already drawn its own icon. Putting the original
      // favicon back now would undo it, and the new script has no way to tell that
      // happened. Drop the page instead, which also blocks anything still in flight.
      releaseDom();
      return;
    }

    resetIcon(favIconUrl);
  };
});
