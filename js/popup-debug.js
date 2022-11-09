import { getDefaultIconUrl, injectContentScript } from './util.js';
import { fadeIcon } from './util-dom.js';
import { CSP_SITES, POPULAR_SITES, TEST_PAGES } from './util-debug.js';

document.getElementById('js-start').addEventListener('click', async () => {
  const tabs = await chrome.tabs.query({ pinned: false, windowType: 'normal' });
  tabs.forEach(async (tab) => {
    chrome.tabs.sendMessage(tab.id, { action: "DEBUG.START" });
  });
});

document.getElementById('js-stop').addEventListener('click', async () => {
  const tabs = await chrome.tabs.query({ pinned: false, windowType: 'normal' });
  tabs.forEach(async (tab) => {
    chrome.tabs.sendMessage(tab.id, { action: "DEBUG.STOP" });
  });
});

chrome.tabs.query({ currentWindow: true, pinned: false, windowType: 'normal' }, async tabs => {
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

document.getElementById('js-print-vars-all').addEventListener('click', async () => {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const allTabVars = tabs.map(tab => chrome.tabs.sendMessage(tab.id, { action: "DEBUG.PRINT_VARS" }));

  let all = '';
  let i = 0;
  for await (const tabVars of allTabVars) {
    all += `<pre>${JSON.stringify({ title: tabs[i].title, ...tabVars }, null, '  ')}</pre>`;
    i++;
  }
  document.getElementById('js-tab-data').innerHTML = `<div>${all}</div>`;
});

document.getElementById('js-print-vars-current-tab').addEventListener('click', async () => {
  const tab = (await chrome.tabs.query({ currentWindow: true, active: true }))[0];
  chrome.tabs.sendMessage(tab.id, {
    action: "DEBUG.PRINT_VARS",
  });
});

document.getElementById('js-unread-current-tab').addEventListener('click', async () => {
  const tab = (await chrome.tabs.query({ currentWindow: true, active: true }))[0];
  chrome.tabs.sendMessage(tab.id, {
    action: "MARK_UNREAD",
  });
});

document.getElementById('js-fade-current-tab').addEventListener('click', async () => {
  const tab = (await chrome.tabs.query({ currentWindow: true, active: true }))[0];
  chrome.tabs.sendMessage(tab.id, {
    action: "DEBUG.FADE",
  });
});

document.getElementById('js-unfade-current-tab').addEventListener('click', async () => {
  const tab = (await chrome.tabs.query({ currentWindow: true, active: true }))[0];
  chrome.tabs.sendMessage(tab.id, {
    action: "DEBUG.UNFADE",
  });
})

document.getElementById('js-fade-all').addEventListener('click', async () => {
  // debugger;
  const tabs = await chrome.tabs.query({ currentWindow: true, pinned: false });
  console.log(tabs);
  tabs.forEach(async (tab) => {
    // https://developer.chrome.com/docs/extensions/reference/tabs/#method-sendMessage
    chrome.tabs.sendMessage(tab.id, { action: "DEBUG.FADE" });
  });
});

document.getElementById('js-play-fade-all').addEventListener('click', async () => {
  const tabs = await chrome.tabs.query({ currentWindow: true, pinned: false });
  tabs.forEach(async (tab) => {
    chrome.tabs.sendMessage(tab.id, { action: "DEBUG.PLAY_FADE" });
  });
});

document.getElementById('js-unfade-all').addEventListener('click', async () => {
  // debugger;
  console.log("clicked undo fade");
  const tabs = await chrome.tabs.query({ currentWindow: true, pinned: false });
  console.log(tabs);
  tabs.forEach(async (tab) => {
    // https://developer.chrome.com/docs/extensions/reference/tabs/#method-sendMessage
    chrome.tabs.sendMessage(tab.id, { action: "DEBUG.UNFADE" });
  });
});

document.getElementById('js-random-fade').addEventListener('click', async () => {
  // debugger;
  console.log("clicked undo fade");
  const tabs = await chrome.tabs.query({ currentWindow: true, pinned: false });
  console.log(tabs);
  tabs.forEach(async (tab) => {
    // https://developer.chrome.com/docs/extensions/reference/tabs/#method-sendMessage
    chrome.tabs.sendMessage(tab.id, { action: Math.random() > 0.5 ? "DEBUG.FADE" : "DEBUG.UNFADE" });
  });
});

document.getElementById("js-reload-all").onclick = async () => {
  const tabs = await chrome.tabs.query({ currentWindow: true, pinned: false });
  tabs.forEach((tab) => {
    chrome.tabs.reload(tab.id, { bypassCache: true });
  });
};

const commonCreateData = {
  focused: true,
  // Chrome Web Store Listing screenshot size
  // https://developer.chrome.com/docs/webstore/images/#:~:text=1280x800
  width: 1280,
  height: 800,
  top: 0,
  left: 0,
}

document.getElementById("js-open-test-sites").onclick = async () => {
  chrome.windows.create({
    ...commonCreateData,
    url: TEST_PAGES,
  });
};

document.getElementById("js-open-popular-sites-some").onclick = async () => {
  chrome.windows.create({
    ...commonCreateData,
    url: POPULAR_SITES.slice(0, 5),
  });
};

document.getElementById("js-open-popular-sites").onclick = async () => {
  chrome.windows.create({
    ...commonCreateData,
    url: POPULAR_SITES,
  });
};

document.getElementById("js-open-csp-sites").onclick = async () => {
  chrome.windows.create({
    ...commonCreateData,
    url: CSP_SITES,
  });
};

document.getElementById('js-inject-content-script').onclick = injectContentScript;