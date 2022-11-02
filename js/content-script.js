console.log("INSTALLED ghost tabs content script!");

let IS_DATA_URL_BLOCKED = false;
let favIconUrl;
let tabFreshness = 1;
let intervalId;
let unread = document.visibilityState === "hidden";
const MINUTES = 5;
let VARS = {
  visibilityState: undefined,
  hidden: undefined,
};

(async () => {
  const { isSvg } = await import(chrome.runtime.getURL("js/util.js"));
  const { fixSvg, setFavicon, getFaviconUrl } = await import(chrome.runtime.getURL("js/util-dom.js"));

  // Visibility state
  VARS.visibilityState = document.visibilityState;
  VARS.hidden = document.hidden;
  document.addEventListener("visibilitychange", () => {
    VARS.visibilityState = document.visibilityState;
    VARS.hidden = document.hidden;
  }, false);

  async function resetIcon() {
    setFavicon(favIconUrl);
  }

  async function fadeIconViaWorker(favIconUrl, opacity) {
    if (await isSvg(favIconUrl)) {
      favIconUrl = await fixSvg(favIconUrl);
    }
    const newIconUrl = await chrome.runtime.sendMessage({ action: "FADE_ICON", favIconUrl, opacity });
    setFavicon(newIconUrl);
  }

  async function unreadIconViaWorker(favIconUrl, opacity) {
    if (await isSvg(favIconUrl)) {
      favIconUrl = await fixSvg(favIconUrl);
    }
    const newIconUrl = await chrome.runtime.sendMessage({ action: "UNREAD_ICON", favIconUrl, opacity });
    setFavicon(newIconUrl);
  }

  async function handleVisibilityChange() {
    console.log("handleVisibilityChange() => document.visibilityState: ", document.visibilityState);
    if (document.visibilityState === 'visible') {
      unread = false;
      resetIcon();
      // Doesn't trigger if tab is loaded in the background, so we're not using it.
    }
  }

  function cleanup() {
    clearInterval(intervalId);
    document.removeEventListener("visibilitychange", handleVisibilityChange, false);
  }

  async function stop() {
    cleanup();
    tabFreshness = 1;
  }

  favIconUrl = await getFaviconUrl();

  async function update(options) {
    if (options.showUnreadBadge) {
      if (unread) {
        unreadIconViaWorker(favIconUrl);
      }
      document.addEventListener("visibilitychange", handleVisibilityChange, false);
    } else {
      resetIcon();
    }

    return cleanup;
  }

  {
    const options = {};
    chrome.storage.local.get('options')
      .then(data => {
        Object.assign(options, data.options);
        return update(options);
      })
      .then((cleanup) => {
        chrome.storage.onChanged.addListener((changes, area) => {
          cleanup();
          if (area === 'local' && changes.options?.newValue) {
            Object.assign(options, changes.options.newValue);
            update(options);
          }
        });
      });
  }

  chrome.runtime.onMessage.addListener(async (request, _sender, sendResponse) => {
    if (request.action === "FADE") {
      console.log('ACTION: FADE', favIconUrl);
      tabFreshness *= 0.5;
      fadeIconViaWorker(favIconUrl, tabFreshness);
    } else if (request.action === 'UNFADE') {
      console.log('ACTION: UNFADE', favIconUrl);
      tabFreshness = 1;
      resetIcon();
    } else if (request.action === "PLAY_FADE") {
      clearInterval(intervalId);
      intervalId = setInterval(() => {
        tabFreshness *= 0.95;
        fadeIconViaWorker(favIconUrl, tabFreshness);
      }, 200);
    } else if (request.action === 'START') {
      clearInterval(intervalId);
      // https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
      document.addEventListener("visibilitychange", handleVisibilityChange, false);
    } else if (request.action === 'STOP') {
      stop();
      resetIcon();
    } else if (request.action === 'MARK_UNREAD') {
      unread = true;
      unreadIconViaWorker(favIconUrl);
      document.addEventListener("visibilitychange", handleVisibilityChange, false);
    } else if (request.action === 'PRINT_VARS') {
      const vars = {
        IS_DATA_URL_BLOCKED,
        tabFreshness,
        favIconUrl,
        intervalId,
        ...VARS
      };
      console.log(vars);
      sendResponse(vars);
    }
  });
})();