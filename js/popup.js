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
    const match = badSites.find(url => tab.url.startsWith(url));
    if (tab && match) {
      document.getElementById('js-page-not-supported').innerHTML = `<b class="db pa3">⚠️ Page isn't supported: ${match}</b><hr />`;
    }
  });
}

{
  const $optionsForm = document.getElementById('js-options-form');
  const options = {};

  // Prevent submission when clicking random buttons
  $optionsForm.addEventListener('submit', e => e.preventDefault());
}