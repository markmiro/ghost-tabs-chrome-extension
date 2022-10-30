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
  const { sleep, isSvg } = await import(chrome.runtime.getURL("js/util.js"));
  const { fixSvg, setFavicon, getFaviconLinks } = await import(chrome.runtime.getURL("js/util-dom.js"));

  // Visibility state
  VARS.visibilityState = document.visibilityState;
  VARS.hidden = document.hidden;
  document.addEventListener("visibilitychange", () => {
    VARS.visibilityState = document.visibilityState;
    VARS.hidden = document.hidden;
  }, false);

  // In theory, data urls can be used for favicons, but in practice, I haven't seen it.
  // If this starts to be more common, I'll have to resort to a much more complicated solution
  // that involves tracking data urls that have been used.
  function isFavIconUntouched(favIconUrl) {
    return !favIconUrl.startsWith('data:');
  }

  async function getFaviconUrl() {
    // Strategy:
    // • If there is no link icon, don't try to get root favicon.ico
    //   • If no root favicon.ico, get tht 
    // • If there are link icons, keep querying until Chrome tells us which icon is actually chosen.

    const links = getFaviconLinks();
    if (!links || links.length === 0) {
      let response = await fetch('/favicon.ico');
      if (response.ok) {
        return response.url;
      } else {
        return undefined;
      }
    }

    // Loop until we get a url that doesn't start with `data:`
    for (let tries = 0; tries <= 3; tries++) {
      console.log('try to find the correct icon...');
      const urlCandidate = await chrome.runtime.sendMessage({ action: "GET_FAVICONURL" });
      if (urlCandidate && isFavIconUntouched(urlCandidate)) {
        return urlCandidate;
      }
      console.log('response for GET_FAVICONURL', urlCandidate);
      // Wait because we don't want to try again right away
      await sleep(tries * 100);
    }

    return undefined;
  }

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

  // ---

  favIconUrl = await getFaviconUrl();

  if (unread) {
    unreadIconViaWorker(favIconUrl);
  }
  document.addEventListener("visibilitychange", handleVisibilityChange, false);

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
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange, false);
      tabFreshness = 1;
      resetIcon();
    } else if (request.action === 'MARK_UNREAD') {
      unread = true;
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange, false);
      unreadIconViaWorker(favIconUrl);
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