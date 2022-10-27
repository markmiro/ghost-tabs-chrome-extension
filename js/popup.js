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

let clicks = 0;
document.getElementById('js-counter').addEventListener('click', e => {
  clicks++;
  document.getElementById('js-counter').innerText = 'Clicks: ' + clicks;
});

document.getElementById("js-reload-all").onclick = async () => {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  tabs.forEach((tab) => {
    chrome.tabs.reload(tab.id, { bypassCache: false });
  });
};