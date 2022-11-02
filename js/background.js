// import "./background-headers.js";
import { fadeIcon, unreadIcon } from './util.js';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request) return;

  // Ideally, pinned tabs shouldn't even get a content script. If so, these tabs wouldn't be sending messages to the background
  // page. In the meantime, we ignore messages from pinned tabs.
  if (sender?.tab?.pinned) return;

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

chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.create({
    active: true,
    url: chrome.runtime.getURL('on-installed.html')
  });
});