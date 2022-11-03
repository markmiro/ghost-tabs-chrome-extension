// import "./background-headers.js";
import { fadeIcon, unreadIcon } from './util.js';
import { fadeHalfLife, fadeTimeToReset, minFavIconOpacity } from './fade-option-steps.js';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request) return;

  // Ideally, pinned tabs shouldn't even get a content script. If so, these tabs wouldn't be sending messages to the background
  // page. In the meantime, we ignore messages from pinned tabs.
  if (sender?.tab?.pinned) return;

  if (request.action === 'GET_FAVICONURL') {
    sendResponse(sender.tab.favIconUrl);
  } else if (request.action === 'FADE_ICON') {
    // console.log('Got `FADE_ICON` into background.js');
    console.time('fadeIcon: ' + request.favIconUrl);
    fadeIcon(request.favIconUrl, request.opacity).then(newIconUrl => {
      // console.log('Got `newIconUrl` into background.js', newIconUrl);
      // console.log('Response sent:', newIconUrl);
      console.timeEnd('fadeIcon: ' + request.favIconUrl);
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
  const options = {
    showUnreadBadge: true,
    enableFading: true,
    fadeHalfLife: fadeHalfLife.stepValue(4),
    minFavIconOpacity: minFavIconOpacity.stepValue(2),
    fadeTimeToReset: fadeTimeToReset.stepValue(2),
  }
  chrome.storage.local.set({ options });
  chrome.tabs.create({
    active: true,
    url: chrome.runtime.getURL('on-installed.html')
  });
});