// import "./background-headers.js";
import { injectContentScript, fadeIcon, unreadIcon } from './util.js';
import { fadeHalfLife, fadeTimeToReset, minFavIconOpacity } from './fade-option-steps.js';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request) return;

  if (request.action === "PING") {
    sendResponse((new Date()).toISOString());
    return;
  }

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

function openOnInstallPage() {
  chrome.tabs.create({
    active: true,
    url: chrome.runtime.getURL('on-installed.html')
  });
}

const defaultOptions = {
  enabled: true,
  showUnreadBadge: true,
  enableFading: true,
  fadeHalfLife: fadeHalfLife.stepValue(4),
  minFavIconOpacity: minFavIconOpacity.stepValue(2),
  fadeTimeToReset: fadeTimeToReset.stepValue(2),
  disabledOrigins: [],
}

chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get('options');
  console.log("chrome.storage.local.get('options')", data);
  if (!("options" in data)) {
    console.log('set options to default', defaultOptions);
    // Await here to to ensure we set the options before they're read.
    await chrome.storage.local.set({ options: defaultOptions });
  }

  // openOnInstallPage();

  injectContentScript();
});

chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.runtime.setUninstallURL('https://markmiro.github.io/ghost-tabs-chrome-extension/docs/after-uninstall');
  }
});

chrome.contextMenus.create({
  id: 'disable-origin',
  title: "Turn off for this website",
  contexts: ['all'],
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'disable-origin') {
    const newOrigin = (new URL(tab.url)).origin;
    console.log(newOrigin);
    const { options } = await chrome.storage.local.get('options');
    await chrome.storage.local.set({
      options: {
        ...options,
        disabledOrigins: [...options.disabledOrigins, newOrigin]
      }
    });
  }
});