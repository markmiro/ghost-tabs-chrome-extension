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

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.favIconUrl) {
    if (tab.favIconUrl.startsWith('data:')) {
      console.log(tabId, 'data:...');
    } else {
      console.log(tabId, tab.favIconUrl);
    }
  }
});

// Note: URL may not be available
// https://developer.chrome.com/docs/extensions/reference/tabs/#event-onCreated
chrome.tabs.onCreated.addListener((tab) => {
  console.log('TAB CREATED', tab.id, { favIconUrl: tab.favIconUrl });
})