// NOTE: need to add `.js` extension or otherwise Chrome won't find it
// Also, need to add any imports and their imports to the `manifest.json` file:
// `web_accessible_resources.resources`
// ---
import { log } from "./helpers/console.js";
import { selfClean } from "./helpers/self-clean-content-script.js";
import {
  blankIconDataUrl,
  fadeIconViaWorker,
  getFaviconUrl,
  resetIcon,
  setFavicon,
  unreadIconViaWorker,
} from "./helpers/util-dom.js";

function withOptions(handler: (options: Options) => void) {
  let options: Options = {};

  chrome.storage.local.get("options").then((data) => {
    Object.assign(options, data.options);
    handler(options);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.options?.newValue) {
      Object.assign(options, changes.options.newValue);
      handler(options);
    }
  });
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
    this.opacity = 1;
    clearInterval(this.intervalId);
    fadeIconViaWorker(this.favIconUrl, this.opacity);
  }
}

selfClean(async function func(pool) {
  const favIconUrl = await getFaviconUrl();
  let unread = document.visibilityState === "hidden";
  // const redRectHref = await blankIconDataUrl();
  // log("redRectHref", redRectHref);
  // setFavicon(redRectHref);
  const debugFade = new DebugFade(favIconUrl);

  log("getFaviconUrl()", favIconUrl);
  let timeoutId = 0;

  withOptions((options) => {
    log("OPTIONS", options);
    if (options.showUnreadBadge && unread) {
      unreadIconViaWorker(favIconUrl);
    } else {
      resetIcon(favIconUrl);
    }

    pool.addDocListener("visibilitychange", () => {
      clearTimeout(timeoutId);
      if (document.visibilityState === "visible") {
        unread = false;
        timeoutId = setTimeout(() => {
          resetIcon(favIconUrl);
        }, options.fadeTimeToReset);
      }
    });
  });

  chrome.runtime.onMessage.addListener(
    async (request: MessageRequest, _sender, sendResponse) => {
      log("chrome.runtime.onMessage.addListener", request);
      switch (request.action) {
        case "MARK_READ":
          resetIcon(favIconUrl);
          break;
        case "MARK_UNREAD":
          unreadIconViaWorker(favIconUrl);
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
            DebugFade,
          };
          log(vars);
          sendResponse(vars);
          break;
        default:
          break;
      }
    }
  );

  return () => {
    resetIcon(favIconUrl);
    debugFade.stop();
  };
});
