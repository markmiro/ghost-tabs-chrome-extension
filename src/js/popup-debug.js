import {
  getDefaultIconUrl,
  injectContentScript,
  sleep,
} from "./helpers/util.js";
import { fadeIcon } from "./helpers/util-dom.js";
import {
  CSP_SITES,
  POPULAR_SITES,
  DEMO_SITES,
  TEST_PAGES,
} from "./helpers/util-debug.js";

document.getElementById("js-start").addEventListener("click", async () => {
  const tabs = await chrome.tabs.query({ pinned: false, windowType: "normal" });
  tabs.forEach(async (tab) => {
    chrome.tabs.sendMessage(tab.id, { action: "DEBUG.START" });
  });
});

document.getElementById("js-stop").addEventListener("click", async () => {
  const tabs = await chrome.tabs.query({ pinned: false, windowType: "normal" });
  tabs.forEach(async (tab) => {
    chrome.tabs.sendMessage(tab.id, { action: "DEBUG.STOP" });
  });
});

document.getElementById("js-print-icons").onclick = async () => {
  const tabs = await chrome.tabs.query({
    currentWindow: true,
    pinned: false,
    windowType: "normal",
  });
  const defaultIconUrl = await getDefaultIconUrl();
  const fadedIconUrls = tabs.map((tab) => fadeIcon(tab.favIconUrl, 0.5));

  let i = 0;
  let all = "";
  for await (const fadedUrl of fadedIconUrls) {
    console.log("url", tabs[i].favIconUrl, fadedUrl);
    const favIconUrl = tabs[i].favIconUrl;
    const indexOfDot = favIconUrl?.lastIndexOf(".");
    all += `
        <div>
          <img src="${
            favIconUrl || defaultIconUrl
          }" width="16px" height="16px" />
          <img src="${fadedUrl}" width="16px" height="16px" />
          ${
            favIconUrl &&
            (favIconUrl.startsWith("data:")
              ? '<span class="o-20">data...</div>'
              : favIconUrl.slice(indexOfDot))
          }
        </div>
      `;
    i++;
  }

  document.getElementById(
    "js-tab-data"
  ).innerHTML = `<div class="flex flex-column">${all}</div>`;
};

document
  .getElementById("js-print-vars-all")
  .addEventListener("click", async () => {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const allTabVars = tabs.map((tab) =>
      chrome.tabs.sendMessage(tab.id, { action: "DEBUG.PRINT_VARS" })
    );

    let all = "";
    let i = 0;
    try {
      for await (const tabVars of allTabVars) {
        all += `<pre>${JSON.stringify(
          { title: tabs[i].title, ...tabVars },
          null,
          "  "
        )}</pre>`;
        i++;
      }
      document.getElementById("js-tab-data").innerHTML = `<div>${all}</div>`;
    } catch (err) {
      if (err) {
        console.error(err);
        alert(err);
      }
    }
  });

document
  .getElementById("js-print-vars-current-tab")
  .addEventListener("click", async () => {
    const tab = (
      await chrome.tabs.query({ currentWindow: true, active: true })
    )[0];
    chrome.tabs.sendMessage(tab.id, {
      action: "DEBUG.PRINT_VARS",
    });
  });

document
  .getElementById("js-print-options")
  .addEventListener("click", async () => {
    const data = await chrome.storage.local.get("options");
    document.getElementById("js-tab-data").innerHTML = `<pre>${JSON.stringify(
      data,
      null,
      "  "
    )}</pre>`;
  });

document
  .getElementById("js-unread-current-tab")
  .addEventListener("click", async () => {
    const tab = (
      await chrome.tabs.query({ currentWindow: true, active: true })
    )[0];
    chrome.tabs.sendMessage(tab.id, {
      action: "MARK_UNREAD",
    });
  });

document
  .getElementById("js-fade-current-tab")
  .addEventListener("click", async () => {
    const tab = (
      await chrome.tabs.query({ currentWindow: true, active: true })
    )[0];
    chrome.tabs.sendMessage(tab.id, {
      action: "DEBUG.FADE",
    });
  });

document
  .getElementById("js-unfade-current-tab")
  .addEventListener("click", async () => {
    const tab = (
      await chrome.tabs.query({ currentWindow: true, active: true })
    )[0];
    chrome.tabs.sendMessage(tab.id, {
      action: "DEBUG.UNFADE",
    });
  });

document.getElementById("js-fade-all").addEventListener("click", async () => {
  // debugger;
  const tabs = await chrome.tabs.query({ currentWindow: true, pinned: false });
  console.log(tabs);
  tabs.forEach(async (tab) => {
    // https://developer.chrome.com/docs/extensions/reference/tabs/#method-sendMessage
    chrome.tabs.sendMessage(tab.id, { action: "DEBUG.FADE" });
  });
});

document
  .getElementById("js-play-fade-all")
  .addEventListener("click", async () => {
    const tabs = await chrome.tabs.query({
      currentWindow: true,
      pinned: false,
    });
    tabs.forEach(async (tab) => {
      chrome.tabs.sendMessage(tab.id, { action: "DEBUG.PLAY_FADE" });
    });
  });

document.getElementById("js-unfade-all").addEventListener("click", async () => {
  // debugger;
  console.log("clicked undo fade");
  const tabs = await chrome.tabs.query({ currentWindow: true, pinned: false });
  console.log(tabs);
  tabs.forEach(async (tab) => {
    // https://developer.chrome.com/docs/extensions/reference/tabs/#method-sendMessage
    chrome.tabs.sendMessage(tab.id, { action: "DEBUG.UNFADE" });
  });
});

document
  .getElementById("js-random-fade")
  .addEventListener("click", async () => {
    // debugger;
    console.log("clicked undo fade");
    const tabs = await chrome.tabs.query({
      currentWindow: true,
      pinned: false,
    });
    console.log(tabs);
    tabs.forEach(async (tab) => {
      // https://developer.chrome.com/docs/extensions/reference/tabs/#method-sendMessage
      chrome.tabs.sendMessage(tab.id, {
        action: Math.random() > 0.5 ? "DEBUG.FADE" : "DEBUG.UNFADE",
      });
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
};

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

document.getElementById("js-open-demo-sites").onclick = async () => {
  await chrome.windows.create({
    ...commonCreateData,
    url: DEMO_SITES.map((site) => site.url),
  });
  alert(
    "1) Iterate through all tabs\n2)Click 'Reload all'\n3)Click 'DEMO init'"
  );
};

document.getElementById("js-open-demo-sites-init").onclick = async () => {
  alert("init");
  const tabs = await chrome.tabs.query({
    currentWindow: true,
    pinned: false,
    windowType: "normal",
  });
  DEMO_SITES.map(async ({ url, unread, fadeAmount }, i) => {
    // alert(`${url}\n\n${tabs[i].url}`);
    if (unread) {
      chrome.tabs.sendMessage(tabs[i].id, {
        action: "MARK_UNREAD",
      });
    } else {
      await chrome.tabs.sendMessage(tabs[i].id, {
        action: "MARK_READ",
      });
      chrome.tabs.sendMessage(tabs[i].id, {
        action: "DEBUG.FADE_AMOUNT",
        fadeAmount,
      });
    }
  });
};

document.getElementById("js-inject-script-all").onclick = () => {
  alert("inject");
  injectContentScript();
};
