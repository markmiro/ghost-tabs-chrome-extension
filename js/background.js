// import "./background-headers.js";
import { fadeIcon, unreadIcon } from './util.js';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request) return;
  if (request.action === 'GET_FAVICONURL') {
    sendResponse(sender.tab.favIconUrl);
  } else if (request.action === 'FADE_ICON') {
    console.log('Got `FADE_ICON` into background.js');
    fadeIcon(request.favIconUrl, request.opacity).then(newIconUrl => {
      console.log('Got `newIconUrl` into background.js', newIconUrl);
      console.log('Response sent:', newIconUrl);
      sendResponse(newIconUrl);
    });
    // https://stackoverflow.com/q/44056271
    return true; // Return true to indicate async response;
  } else if (request.action === 'UNREAD_ICON') {
    unreadIcon(request.favIconUrl).then(sendResponse);
    return true;
  }
});

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  console.log('activated', tabId);
  chrome.tabs.sendMessage(tabId, { action: "ACTIVATED" });
});