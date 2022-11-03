import { DEBUG } from './util.js';
import { fadeHalfLife, fadeTimeToReset, minFavIconOpacity } from './fade-option-steps.js';

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
  const chromePages = [
    'https://chrome.google.com/webstore',
    'chrome://',
    'chrome-extension://',
  ]

  chrome.tabs.query({ currentWindow: true, active: true }, async (tabs) => {
    const tab = tabs?.[0];
    if (!tab) return;
    const match = chromePages.find(url => tab.url.startsWith(url));
    if (match) {
      document.getElementById('js-page-not-supported').innerHTML = `<b class="db pa3 bg-light-yellow black">⚠️ Chrome pages and the Chrome Web Store aren't supported.</b><hr />`;
      document.getElementById('js-options-form').setAttribute('disabled', '');
    } else if (tab.pinned) {
      document.getElementById('js-page-not-supported').innerHTML = `<b class="db pa3 bg-light-yellow black">⚠️ Pinned tabs aren't supported</b><hr />`;
      document.getElementById('js-options-form').setAttribute('disabled', '');
    }
  });
}

// ---

{

  const options = {};

  function updateFromOptions(options) {
    console.log('updateFromOptions', { options });
    if (options.enableFading) {
      document.getElementById('js-fading-options').classList.remove('dn');
    } else {
      document.getElementById('js-fading-options').classList.add('dn');
    }
    fadeHalfLife.updateValueTitle(options.fadeHalfLife);
    minFavIconOpacity.updateValueTitle(options.minFavIconOpacity);
    fadeTimeToReset.updateValueTitle(options.fadeTimeToReset);
  }

  const $optionsForm = document.getElementById('js-options-form');

  // Prevent submission when clicking random buttons
  $optionsForm.addEventListener('submit', e => e.preventDefault());

  chrome.storage.local.get('options', (data) => {
    Object.assign(options, data.options);
    console.log("chrome.storage.local.get('options')", { options });
    $optionsForm.showUnreadBadge.checked = options.showUnreadBadge;
    $optionsForm.enableFading.checked = options.enableFading;
    $optionsForm.fadeHalfLife.value = fadeHalfLife.valueToStep(options.fadeHalfLife);
    $optionsForm.minFavIconOpacity.value = minFavIconOpacity.valueToStep(options.minFavIconOpacity);
    $optionsForm.fadeTimeToReset.value = fadeTimeToReset.valueToStep(options.fadeTimeToReset);
    updateFromOptions(options);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.options?.newValue) {
      Object.assign(options, changes.options.newValue);
      updateFromOptions(options);
    }
  });

  $optionsForm.showUnreadBadge.addEventListener('change', (event) => {
    options.showUnreadBadge = event.target.checked;
    chrome.storage.local.set({ options });
    updateFromOptions(options);
  });

  $optionsForm.enableFading.addEventListener('change', (event) => {
    options.enableFading = event.target.checked;
    chrome.storage.local.set({ options });
    updateFromOptions(options);
  });

  $optionsForm.fadeHalfLife.addEventListener('input', e => {
    const step = parseInt(e.target.value);
    options.fadeHalfLife = fadeHalfLife.stepValue(step);
    chrome.storage.local.set({ options });
    updateFromOptions(options);
  });

  $optionsForm.minFavIconOpacity.addEventListener('input', e => {
    const step = parseInt(e.target.value);
    options.minFavIconOpacity = minFavIconOpacity.stepValue(step);
    chrome.storage.local.set({ options });
    updateFromOptions(options);
  });

  $optionsForm.fadeTimeToReset.addEventListener('input', e => {
    const step = parseInt(e.target.value);
    options.fadeTimeToReset = fadeTimeToReset.stepValue(step);
    chrome.storage.local.set({ options });
    updateFromOptions(options);
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