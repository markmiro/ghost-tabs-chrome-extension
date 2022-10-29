import { getDefaultIconUrl } from './util.js';
import { fadeIcon } from './util-dom.js';
import { CSP_SITES, POPULAR_SITES, TEST_PAGES } from './util-debug.js';

document.getElementById('js-start').addEventListener('click', async () => {
  const tabs = await chrome.tabs.query({});
  tabs.forEach(async (tab) => {
    chrome.tabs.sendMessage(tab.id, { action: "START" });
  });
});

document.getElementById('js-stop').addEventListener('click', async () => {
  const tabs = await chrome.tabs.query({});
  tabs.forEach(async (tab) => {
    chrome.tabs.sendMessage(tab.id, { action: "STOP" });
  });
});

chrome.tabs.query({ currentWindow: true }, async tabs => {
  const defaultIconUrl = await getDefaultIconUrl();
  const fadedIconUrls = tabs.map(tab => fadeIcon(tab.favIconUrl, 0.5));

  let i = 0;
  let all = '';
  for await (const fadedUrl of fadedIconUrls) {
    console.log('url', tabs[i].favIconUrl, fadedUrl);
    const favIconUrl = tabs[i].favIconUrl;
    const indexOfDot = favIconUrl?.lastIndexOf(".");
    all += `
      <div>
        <img src="${favIconUrl || defaultIconUrl}" width="16px" height="16px" />
        <img src="${fadedUrl}" width="16px" height="16px" />
        ${favIconUrl && (favIconUrl.startsWith('data:') ? '<span class="o-20">data...</div>' : favIconUrl.slice(indexOfDot))}
      </div>
    `;
    i++;
  }

  document.getElementById('js-tab-data').innerHTML = `<div class="flex flex-column">${all}</div>`;
});


document.getElementById('js-fade-current-tab').addEventListener('click', async () => {
  console.log("clicked");
  const tab = (await chrome.tabs.query({ currentWindow: true, active: true }))[0];
  chrome.tabs.sendMessage(tab.id, {
    action: "FADE",
  });
})

document.getElementById('js-fade-all').addEventListener('click', async () => {
  // debugger;
  console.log("clicked");
  const tabs = await chrome.tabs.query({ currentWindow: true });
  console.log(tabs);
  tabs.forEach(async (tab) => {
    // https://developer.chrome.com/docs/extensions/reference/tabs/#method-sendMessage
    chrome.tabs.sendMessage(tab.id, { action: "FADE" });
  });
});

document.getElementById('js-play-fade-all').addEventListener('click', async () => {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  tabs.forEach(async (tab) => {
    chrome.tabs.sendMessage(tab.id, { action: "PLAY_FADE" });
  });
});

document.getElementById('js-unfade-all').addEventListener('click', async () => {
  // debugger;
  console.log("clicked undo fade");
  const tabs = await chrome.tabs.query({ currentWindow: true });
  console.log(tabs);
  tabs.forEach(async (tab) => {
    // https://developer.chrome.com/docs/extensions/reference/tabs/#method-sendMessage
    chrome.tabs.sendMessage(tab.id, { action: "UNFADE" });
  });
});

document.getElementById('js-random-fade').addEventListener('click', async () => {
  // debugger;
  console.log("clicked undo fade");
  const tabs = await chrome.tabs.query({ currentWindow: true });
  console.log(tabs);
  tabs.forEach(async (tab) => {
    // https://developer.chrome.com/docs/extensions/reference/tabs/#method-sendMessage
    chrome.tabs.sendMessage(tab.id, { action: Math.random() > 0.5 ? "FADE" : "UNFADE" });
  });
});

document.getElementById("js-reload-all").onclick = async () => {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  tabs.forEach((tab) => {
    chrome.tabs.reload(tab.id, { bypassCache: true });
  });
};

document.getElementById("js-open-test-sites").onclick = async () => {
  chrome.windows.create({
    focused: true,
    url: TEST_PAGES,
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

document.getElementById("js-open-csp-sites").onclick = async () => {
  chrome.windows.create({
    focused: true,
    url: CSP_SITES,
  });
};
