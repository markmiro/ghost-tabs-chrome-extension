console.log("INSTALLED ghost tabs content script!");

const options = {};
let IS_DATA_URL_BLOCKED = false;
let favIconUrl;
let tabFreshness = 1;
let timeoutId;
let intervalId;
let timeHiddenTs = undefined;
const MINUTES = 5;

// Visibility state
let VARS = {
  visibilityState: undefined,
  hidden: undefined,
};
VARS.visibilityState = document.visibilityState;
VARS.hidden = document.hidden;
document.addEventListener("visibilitychange", () => {
  VARS.visibilityState = document.visibilityState;
  VARS.hidden = document.hidden;
}, false);

let unread = document.visibilityState === "hidden";

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

  function stop() {
    tabFreshness = 1;
    timeHiddenTs = undefined;
  }

  async function updateFromOptions() {
    const opacity = Math.max(options.minFavIconOpacity, tabFreshness);

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
        resetIcon();
      }
    }

    if (!options.showUnreadBadge && options.enableFading) {
      fadeIconViaWorker(favIconUrl, opacity);
    }

    if (!options.showUnreadBadge && !options.enableFading) {
      resetIcon();
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

    document.addEventListener("visibilitychange", () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);

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
    if (request.action === "FADE") {
      console.log('ACTION: FADE', favIconUrl);
      tabFreshness *= 0.5;
      fadeIconViaWorker(favIconUrl, tabFreshness);
    } else if (request.action === 'UNFADE') {
      console.log('ACTION: UNFADE', favIconUrl);
      tabFreshness = 1;
      timeHiddenTs = undefined;
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
    } else if (request.action === 'STOP') {
      stop();
      resetIcon();
    } else if (request.action === 'MARK_UNREAD') {
      unread = true;
      unreadIconViaWorker(favIconUrl);
    } else if (request.action === 'PRINT_VARS') {
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
        VARS
      };
      console.log(vars);
      sendResponse(vars);
    }
  });
})();