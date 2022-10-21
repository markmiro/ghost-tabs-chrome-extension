import { fadeIcon, initIcons, isDarkMode } from './fade-icon.js';

chrome.tabs.query({ currentWindow: true }, async tabs => {
  let all = '';
  const icons = await initIcons();
  const defaultIconUrl = isDarkMode() ? icons.defaultLightIcon : icons.defaultDarkIcon;
  tabs.forEach(tab => {
    all += `<img src="${tab.favIconUrl || defaultIconUrl}" width="16px" height="16px" />`;
  })
  document.getElementById('js-tab-data').innerHTML = `<div class="flex" style="gap: .25em">${all}</div>`;
});


document.getElementById('js-fade-all').addEventListener('click', async () => {
  // debugger;
  console.log("clicked");
  const tabs = await chrome.tabs.query({ currentWindow: true });
  console.log(tabs);
  tabs.forEach(async (tab) => {
    // Using `host` rather than hostname to include urls like `localhost:3000` (with ":")
    const cacheKey = (new URL(tab.url)).host;
    const dataUrl = await fadeIcon(tab.favIconUrl, 0.5, cacheKey);
    // https://developer.chrome.com/docs/extensions/reference/tabs/#method-sendMessage
    chrome.tabs.sendMessage(tab.id, {
      action: "UPDATE_FAVICON",
      dataUrl,
      // favIconUrl: tab.favIconUrl,
    });
  });
});

document.getElementById('js-unfade-all').addEventListener('click', async () => {
  // debugger;
  console.log("clicked undo fade");
  const tabs = await chrome.tabs.query({ currentWindow: true });
  console.log(tabs);
  tabs.forEach(async (tab) => {
    const cacheKey = (new URL(tab.url)).host;
    const dataUrl = await fadeIcon(tab.favIconUrl, 1, cacheKey);
    // https://developer.chrome.com/docs/extensions/reference/tabs/#method-sendMessage
    chrome.tabs.sendMessage(tab.id, {
      action: "UPDATE_FAVICON",
      dataUrl,
      // favIconUrl: tab.favIconUrl,
    });
  });
});

document.getElementById('js-random-fade').addEventListener('click', async () => {
  // debugger;
  console.log("clicked undo fade");
  const tabs = await chrome.tabs.query({ currentWindow: true });
  console.log(tabs);
  tabs.forEach(async (tab) => {
    const fadeAmount = Math.random() > 0.5 ? 1 : .5;
    const cacheKey = (new URL(tab.url)).host;
    const dataUrl = await fadeIcon(tab.favIconUrl, fadeAmount, cacheKey);
    // https://developer.chrome.com/docs/extensions/reference/tabs/#method-sendMessage
    chrome.tabs.sendMessage(tab.id, {
      action: "UPDATE_FAVICON",
      dataUrl,
      // favIconUrl: tab.favIconUrl,
    });
  });
});

document.getElementById("js-reload-all").onclick = async () => {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  tabs.forEach((tab) => {
    chrome.tabs.reload(tab.id, { bypassCache: true });
  });
};

// https://en.wikipedia.org/wiki/List_of_most_visited_websites
const POPULAR_SITES = [
  "https://google.com",
  "https://youtube.com",
  "https://facebook.com",
  "https://twitter.com",
  "https://instagram.com",
  "https://wikipedia.org",
  "https://yahoo.com",
  "https://whatsapp.com",
  "https://amazon.com",
  "https://live.com",
  "https://netflix.com",
  "https://reddit.com",
  // "https://linkedin.com",
  "https://vk.com",
  "https://weather.com",
  "https://duckduckgo.com",
  "https://microsoft.com",
  "https://quora.com",
  "https://ebay.com",
  "https://msn.com",
  "https://booking.com",
]

document.getElementById("js-open-popular-sites-some").onclick = async () => {
  chrome.windows.create({
    focused: true,
    url: POPULAR_SITES.slice(0, 5),
  });
};

document.getElementById("js-open-popular-sites").onclick = async () => {
  chrome.windows.create({
    focused: true,
    url: POPULAR_SITES,
  });
};
