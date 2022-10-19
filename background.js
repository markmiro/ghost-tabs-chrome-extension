// https://developer.chrome.com/docs/extensions/reference/action/#icon
chrome.runtime.onInstalled.addListener(async () => {
  const canvas = new OffscreenCanvas(16, 16);
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, 16, 16);
  context.fillStyle = "#00FF00"; // Green
  context.fillRect(0, 0, 16, 16);
  const imageData = context.getImageData(0, 0, 16, 16);
  chrome.action.setIcon({ imageData: imageData }, () => {
    /* ... */
  });
});

chrome.runtime.onInstalled.addListener(async () => {
  let url = chrome.runtime.getURL("debug.html");
  let tab = await chrome.tabs.create({ url });
  console.log(`Created tab ${tab.id}`);
});

// https://github.com/markmiro/hashdrop/blob/03c5a087eeca49c41e0bf9583f9634451e712c10/frontend/src/util/dropUtils.ts
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function urlToBlob(url) {
  // https://trezy.com/blog/loading-images-with-web-workers
  const response = await fetch(url, { mode: "no-cors" });
  // Once the file has been fetched, we'll convert it to a `Blob`
  return await response.blob();
}

async function fadeIcon(url, amount = 0.5) {
  let favIconUrl = url;
  if (!favIconUrl) {
    favIconUrl = chrome.runtime.getURL("img/default-icon.png");
  }

  const fileBlob = await urlToBlob(favIconUrl);
  const imageBitmap = await createImageBitmap(fileBlob);
  const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
  const context = canvas.getContext("2d");
  context.globalAlpha = amount;
  // context.filter = "grayscale(100%)";
  context.drawImage(imageBitmap, 0, 0);

  // context.fillStyle = "red";
  // context.fillRect(0, 0, 5, 5);

  const returnBlob = await canvas.convertToBlob();
  // https://stackoverflow.com/a/30881444
  return await blobToDataUrl(returnBlob);
}

chrome.action.onClicked.addListener(async () => {
  // debugger;
  console.log("clicked");
  const tabs = await chrome.tabs.query({ currentWindow: true });
  console.log(tabs);
  tabs.forEach(async (tab) => {
    // https://developer.chrome.com/docs/extensions/reference/tabs/#method-sendMessage
    // chrome.tabs.sendMessage(tab.id, { greeting: "hello how are you!" });
    const dataUrl = await fadeIcon(tab.favIconUrl);
    chrome.tabs.sendMessage(tab.id, {
      action: "UPDATE_FAVICON",
      dataUrl,
      // favIconUrl: tab.favIconUrl,
    });
  });
});

// https://github.com/PhilGrayson/chrome-csp-disable/blob/79371297b6a1f88d1142450dfbd5e85f7e7d9307/background.js
// https://developer.chrome.com/docs/extensions/mv3/mv3-migration-checklist/#api-blocking
// If you enable this function, add "webRequest" to manifest.json permissions.
// Even then, it doesn't seem to work
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    for (let i = 0; i < details.responseHeaders.length; i++) {
      if (
        details.responseHeaders[i].name.toLowerCase() ===
        "content-security-policy"
      ) {
        // details.responseHeaders[i].value = "";
        allowCSPDataImage(
          details.tabId,
          details.url,
          details.responseHeaders[i].value
        );
      }
    }
  },
  { urls: ["*://*/*"], types: ["main_frame", "sub_frame"] },
  ["responseHeaders"]
);

// https://github.com/WithoutHair/Disable-Content-Security-Policy/blob/79206a656c1bedf249adc80aa3d5b32b182e76ae/background.js
async function allowCSPDataImage(tabId, url, existingValue) {
  console.log("disables CSP, current value:", existingValue.split(/;\s*/));

  // TODO: don't iterate each time
  const rules = await chrome.declarativeNetRequest.getSessionRules();
  const foundRule = rules.find((rule) => rule.id === tabId);
  console.log("found rule CSP:", foundRule);
  if (foundRule) return;

  // TODO: make a cheaper check for `img-src` than just parsing the whole CPS header
  let csp = {};
  existingValue.split(/;\s*/).forEach((item) => {
    const [key, ...values] = item.split(/\s+/);
    csp[key] = values;
  });

  if (csp["img-src"].includes("data:")) return;

  const newValue = [...csp["img-src"], "data:"].join(" ");
  console.log("new value", newValue);

  const rule = {
    id: tabId,
    action: {
      type: "modifyHeaders",
      responseHeaders: [
        {
          header: "content-security-policy",
          operation: "set",
          value: `img-src ${newValue}`,
        },
      ],
    },
    condition: { urlFilter: url, resourceTypes: ["main_frame"] },
  };

  await chrome.declarativeNetRequest.updateSessionRules({ addRules: [rule] });
}

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [tabId] });
});

chrome.tabs.onReplaced.addListener((removedTabId, addedTabId) => {
  chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [removedTabId],
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) {
    chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [tabId] });
  }
});
