const badSites = [
  'https://chrome.google.com/webstore',
  'chrome://extensions'
]

chrome.tabs.query({ currentWindow: true, active: true }, async (tabs) => {
  const tab = tabs?.[0];
  const match = badSites.find(url => tab.url.startsWith(url));
  if (tab && match) {
    document.body.innerHTML = `<b class="bg-washed-yellow black">⚠️ Page isn't supported: ${match}</b>` + document.body.innerHTML;
  }
});