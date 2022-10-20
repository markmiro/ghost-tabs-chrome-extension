
// Consider storing ImageBitmap instances or Canvas.
// If user visits a page for long enough, it will make the page less faded, so we need the original
// so we can unfade it
let originalFavicons = {};

let active = {
  byTabId: {
    [null]: {
      // These pairs get processed to determine if the tab is old or not
      startStopPairs: [
        [0, 10],
        [45, 46],
      ],
      // scrollEvents: [],
      // clickEvents: [],
      // dragEvents: [],
      // clipboardEvents: [],
    },
  },
  lastActive: {
    tabId: null,
    activatedOnTs: null,
  },
};

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  if (!active.byTabId[active.lastActive.tabId]) {
    active.byTabId[active.lastActive.tabId] = { startStopPairs: [] }
  } else {
    active.byTabId[active.lastActive.tabId].startStopPairs.push([active.lastActive.activatedOnTs, Date.now()])
  }

  active.lastActive = {
    tabId,
    activatedOnTs: Date.now(),
  };

  console.log(active);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_ACTIVE") {
    sendResponse(active);
  }
});
