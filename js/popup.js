import { DEBUG } from './util.js';

if (DEBUG) {
  document.getElementById('js-debug-link').classList.remove('dn');
} else {
  document.addEventListener('keypress', e => {
    if (e.key === 'k') {
      window.location.assign(chrome.runtime.getURL('popup-debug.html'));
    }
  })
}

{
  const badSites = [
    'https://chrome.google.com/webstore',
    'chrome://extensions'
  ]

  chrome.tabs.query({ currentWindow: true, active: true }, async (tabs) => {
    const tab = tabs?.[0];
    if (!tab) return;
    const match = badSites.find(url => tab.url.startsWith(url));
    if (match) {
      document.getElementById('js-page-not-supported').innerHTML = `<b class="db pa3">⚠️ Page isn't supported: ${match}</b><hr />`;
    } else if (tab.pinned) {
      document.getElementById('js-page-not-supported').innerHTML = `<b class="db pa3">⚠️ Page isn't supported because it's pinned</b><hr />`;
    }
  });
}

{
  const $optionsForm = document.getElementById('js-options-form');
  const options = {};

  // Prevent submission when clicking random buttons
  $optionsForm.addEventListener('submit', e => e.preventDefault());

  chrome.storage.local.get('options', (data) => {
    Object.assign(options, data.options);
    $optionsForm.showUnreadBadge.checked = Boolean(options.showUnreadBadge);
  });

  $optionsForm.showUnreadBadge.addEventListener('change', (event) => {
    options.showUnreadBadge = event.target.checked;
    chrome.storage.local.set({ options });
  });
}

document.getElementById('js-unread-current-tab').addEventListener('click', async () => {
  const tab = (await chrome.tabs.query({ currentWindow: true, active: true }))[0];
  chrome.tabs.sendMessage(tab.id, {
    action: "MARK_UNREAD",
  });
});

document.getElementById('js-reset-icons').addEventListener('click', async () => {
  const tabs = await chrome.tabs.query({});
  tabs.forEach(tab =>
    chrome.tabs.sendMessage(tab.id, { action: "STOP" })
  );
});