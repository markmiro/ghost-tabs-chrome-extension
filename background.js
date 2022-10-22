// import "./background-headers.js";
import { fadeIcon } from './util.js';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request) return;
  if (request.action === 'GET_BASIC_DATA') {
    sendResponse({
      tabId: sender.tab.id,
      favIconUrl: sender.tab.favIconUrl
      // tab: sender.tab,
    });
  } else if (request.action === 'FADE_ICON') {
    console.log('Got `FADE_ICON` into background.js');
    fadeIcon(request.favIconUrl, 0.5).then(newIconUrl => {
      console.log('Got `newIconUrl` into background.js', newIconUrl);
      console.log('Response sent:', newIconUrl);
      sendResponse(newIconUrl);
    });
    // https://stackoverflow.com/q/44056271
    return true; // Return true to indicate async response;
  }
});