console.log("INSTALLED ghost tabs content script!");

let options = {};
let favIconUrl;
let tabFreshness = 1;
let timeoutId;
let intervalId;
let timeHiddenTs = undefined;
let MINUTES = 5;

// Visibility state
let DEBUG_VARS = {
  visibilityState: undefined,
  hidden: undefined,
};
DEBUG_VARS.visibilityState = document.visibilityState;
DEBUG_VARS.hidden = document.hidden;
document.addEventListener("visibilitychange", () => {
  DEBUG_VARS.visibilityState = document.visibilityState;
  DEBUG_VARS.hidden = document.hidden;
}, false);

let unread = document.visibilityState === "hidden";

let IS_DATA_URL_BLOCKED = false;
// https://stackoverflow.com/a/61901020
// https://developer.mozilla.org/en-US/docs/Web/API/SecurityPolicyViolationEvent
document.addEventListener("securitypolicyviolation", (e) => {
  console.log('CSP ERROR FROM CONTENT SCRIPT:: event: ', e);
  // Checking all this to decrease the chance that it was triggered by something else
  if (e.sourceFile === "chrome-extension" && e.blockedURI === 'data' && e.violatedDirective === 'img-src') {
    IS_DATA_URL_BLOCKED = true;
    // TODO: send this data up to the popup so user can see why this tab doesn't get faded.
  }
});

(async () => {
  const { freshness } = await import(chrome.runtime.getURL("js/util.js"));
  const { resetIcon, fadeIconViaWorker, unreadIconViaWorker, getFaviconUrl } = await import(chrome.runtime.getURL("js/util-dom.js"));

  favIconUrl = await getFaviconUrl();

  function animateFade() {
    // Make the interval fraction cause the interval to trigger every 200ms when half life is 3 seconds.
    const intervalFraction = (1000 * 3) / 150;
    const intervalLengthMs = options.fadeHalfLife / intervalFraction;
    console.log('intervalLengthMs', intervalLengthMs);
    console.log('options.fadeHalfLife', options.fadeHalfLife);
    clearInterval(intervalId);
    intervalId = setInterval(updateFromOptions, intervalLengthMs);
  }

  function resetState() {
    tabFreshness = 1;
    timeHiddenTs = undefined;
  }

  function stop() {
    resetState();
    resetIcon(favIconUrl);
    clearInterval(intervalId);
    clearTimeout(timeoutId);
  }

  async function updateFromOptions() {
    const opacity = Math.max(options.minFavIconOpacity, tabFreshness);

    if (!options.enabled || IS_DATA_URL_BLOCKED) {
      stop();
      return;
    }

    if (tabFreshness < options.minFavIconOpacity) {
      // Stop doing interval after we've reached the bottom
      clearInterval(intervalId);
    }

    // Not checking `intervalId` because it might have been cleared when opacity hit the minimum.
    if (timeHiddenTs) {
      const timeHiddenMs = Date.now() - timeHiddenTs;
      tabFreshness = freshness(timeHiddenMs, options.fadeHalfLife);
      console.log({ timeHiddenMs, tabFreshness });
      // If we update the options to lower the minimum opacity, then we want to restart the fading if it's been stopped.
      // If options half life changes, we want to update the animateFade() interval right away.
      // Also, if any options changed, we want to restart the fade.
      // Doing an immediate update because we don't want to wait until the next interval tick.
      animateFade();
    }

    console.log('updateFromOptions()', { options, tabFreshness, favIconUrl });
    if (options.showUnreadBadge && options.enableFading) {
      if (unread) {
        unreadIconViaWorker(favIconUrl);
      } else {
        fadeIconViaWorker(favIconUrl, opacity);
      }
    }

    if (options.showUnreadBadge && !options.enableFading) {
      if (unread) {
        unreadIconViaWorker(favIconUrl);
      } else {
        resetIcon(favIconUrl);
      }
    }

    if (!options.showUnreadBadge && options.enableFading) {
      fadeIconViaWorker(favIconUrl, opacity);
    }

    if (!options.showUnreadBadge && !options.enableFading) {
      resetIcon(favIconUrl);
    }
  }

  {
    chrome.storage.local.get('options').then(data => {
      Object.assign(options, data.options);
      updateFromOptions();
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.options?.newValue) {
        Object.assign(options, changes.options.newValue);
        updateFromOptions();
      }
    });

    document.addEventListener("visibilitychange", async () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);

      let currErr = false;
      try {
        const timestamp = await chrome.runtime.sendMessage({ action: "PING" });
        if (!timestamp) {
          currErr = new Error("PING response is missing a timestamp.");
        }
      } catch (err) {
        currErr = err;
      }
      if (currErr || !options.enabled || IS_DATA_URL_BLOCKED) {
        stop();
        return;
      }

      if (document.visibilityState === 'visible') {
        // TODO: make another option for unread reset time
        timeoutId = setTimeout(() => {
          if (document.visibilityState === 'hidden') return;
          timeHiddenTs = undefined;
          tabFreshness = 1;
          unread = false;
          updateFromOptions();
        }, options.fadeTimeToReset);
      } else {
        if (unread) return;
        if (timeHiddenTs) return;
        // tabFreshness = 0.5;
        // updateFromOptions();
        timeHiddenTs = Date.now();
        animateFade();
      }
    }, false);
  }

  chrome.runtime.onMessage.addListener(async (request, _sender, sendResponse) => {
    if (request.action === 'MARK_UNREAD') {
      unread = true;
      unreadIconViaWorker(favIconUrl);
    } else if (request.action === 'MARK_READ') {
      unread = false;
      timeHiddenTs = Date.now();
    }

    // DEBUG
    else if (request.action === "DEBUG.FADE") {
      console.log('ACTION: FADE', favIconUrl);
      tabFreshness *= 0.5;
      fadeIconViaWorker(favIconUrl, tabFreshness);
    } else if (request.action === 'DEBUG.UNFADE') {
      console.log('ACTION: UNFADE', favIconUrl);
      resetIcon(favIconUrl);
    } else if (request.action === "DEBUG.PLAY_FADE") {
      clearInterval(intervalId);
      intervalId = setInterval(() => {
        tabFreshness *= 0.95;
        fadeIconViaWorker(favIconUrl, tabFreshness);
      }, 200);
    } else if (request.action === 'DEBUG.START') {
      updateFromOptions();
    } else if (request.action === 'DEBUG.STOP') {
      stop();
    } else if (request.action === 'DEBUG.PRINT_VARS') {
      const timeHiddenMs = timeHiddenTs ? Date.now() - timeHiddenTs : 0;
      const vars = {
        options,
        IS_DATA_URL_BLOCKED,
        tabFreshness,
        favIconUrl,
        intervalId,
        timeHiddenMs,
        timeHiddenSeconds: timeHiddenMs / 1000,
        timeHiddenMinutes: timeHiddenMs / 60 / 1000,
        DEBUG_VARS
      };
      console.log(vars);
      sendResponse(vars);
    }
  });
})();