import { getDefaultIconUrl } from './fade-icon.js';

chrome.tabs.query({ currentWindow: true }, async tabs => {
  const defaultIconUrl = await getDefaultIconUrl();
  let all = '';
  tabs.forEach(tab => {
    all += `
      <div>
        <img src="${tab.favIconUrl || defaultIconUrl}" width="16px" height="16px" />
        ${tab.favIconUrl}
      </div>`;
  })
  document.getElementById('js-tab-data').innerHTML = `<div class="flex flex-column">${all}</div>`;
});


document.getElementById('js-fade-all').addEventListener('click', async () => {
  // debugger;
  console.log("clicked");
  const tabs = await chrome.tabs.query({ currentWindow: true });
  console.log(tabs);
  tabs.forEach(async (tab) => {
    // https://developer.chrome.com/docs/extensions/reference/tabs/#method-sendMessage
    chrome.tabs.sendMessage(tab.id, {
      action: "FADE",
      forSeconds: 60
    });
  });
});

document.getElementById('js-unfade-all').addEventListener('click', async () => {
  // debugger;
  console.log("clicked undo fade");
  const tabs = await chrome.tabs.query({ currentWindow: true });
  console.log(tabs);
  tabs.forEach(async (tab) => {
    // https://developer.chrome.com/docs/extensions/reference/tabs/#method-sendMessage
    chrome.tabs.sendMessage(tab.id, {
      action: "UNFADE",
      forSeconds: 60
    });
  });
});

document.getElementById('js-random-fade').addEventListener('click', async () => {
  // debugger;
  console.log("clicked undo fade");
  const tabs = await chrome.tabs.query({ currentWindow: true });
  console.log(tabs);
  tabs.forEach(async (tab) => {
    // https://developer.chrome.com/docs/extensions/reference/tabs/#method-sendMessage
    chrome.tabs.sendMessage(tab.id, {
      action: Math.random() > 0.5 ? "FADE" : "UNFADE",
      forSeconds: 60
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
  // "https://vk.com",
  "https://weather.com",
  "https://duckduckgo.com",
  "https://microsoft.com",
  "https://quora.com",
  "https://ebay.com",
  "https://msn.com",
  "https://booking.com",
]

document.getElementById("js-open-test-sites").onclick = async () => {
  chrome.windows.create({
    focused: true,
    url: [
      // "https://example.com", // no icon
      // "https://github.com/site-map", // svg icon
      // "https://news.ycombinator.com", // requires fixing content-security-policty headers
      "http://localhost:3000/none",
      "http://localhost:3000/ico",
      // "http://localhost:3000/svg",
      "http://localhost:3000/png-multiple",
      "http://localhost:3000/jpg-multiple"
    ]
  });
};

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
