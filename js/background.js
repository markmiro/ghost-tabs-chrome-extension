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

// Requires these permissions in the manifest:
// "host_permissions": ["http://*/*", "https://*/*"]
// https://stackoverflow.com/questions/10994324/chrome-extension-content-script-re-injection-after-upgrade-or-install
async function injectContentScript() {
  for (const cs of chrome.runtime.getManifest().content_scripts) {
    for (const tab of await chrome.tabs.query({ url: cs.matches })) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: cs.js,
      });
    }
  }
}

const defaultOptions = {
  showUnreadBadge: true,
  enableFading: true,
  fadeHalfLife: fadeHalfLife.stepValue(4),
  minFavIconOpacity: minFavIconOpacity.stepValue(2),
  fadeTimeToReset: fadeTimeToReset.stepValue(2),
}

chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get('options');
  console.log("chrome.storage.local.get('options')", data);
  if (!("options" in data)) {
    console.log('set options to default', defaultOptions);
    // Await here to to ensure we set the options before they're read.
    await chrome.storage.local.set({ options: defaultOptions });
  }
  chrome.tabs.create({
    active: true,
    url: chrome.runtime.getURL('on-installed.html')
  });

  injectContentScript();
});