// import "./background-headers.js";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.action === 'GET_BASIC_DATA') {
    sendResponse({
      tabId: sender.tab.id,
      favIconUrl: sender.tab.favIconUrl
      // tab: sender.tab,
    });
  }
});