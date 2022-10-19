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
  let url = chrome.runtime.getURL("hello.html");
  let tab = await chrome.tabs.create({ url });
  console.log(`Created tab ${tab.id}`);
});

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  console.log("tab id: " + tabId);
  chrome.tabs.get(tabId, async (tab) => {
    // https://trezy.com/blog/loading-images-with-web-workers
    const response = await fetch(tab.favIconUrl, { mode: "no-cors" });
    // Once the file has been fetched, we'll convert it to a `Blob`
    const fileBlob = await response.blob();
    console.log(tab.favIconUrl, fileBlob);

    // const imageBitmap = createImageBitmap(fileBlob);
    // const canvas = new OffscreenCanvas(16, 16);
    // const context = canvas.getContext("2d");
    // context.globalAlpha = 0.5;
    // context.drawImage(imageBitmap);
    // context.filter = "grayscale(100%)";

    // Send icon to content script
    // chrome.tabs.sendMessage(tab.id, { greeting: "hello!" });

    // chrome.scripting.executeScript({
    //   target: { tabId: tabId },
    //   func: () => {},
    // });
  });
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

async function urlToDataUrl(url) {
  // https://trezy.com/blog/loading-images-with-web-workers
  const response = await fetch(url, { mode: "no-cors" });
  // Once the file has been fetched, we'll convert it to a `Blob`
  const fileBlob = await response.blob();
  const dataUrl = await blobToDataUrl(fileBlob);
  return dataUrl;
}

chrome.action.onClicked.addListener((tab) => {
  urlToDataUrl(tab.favIconUrl).then((dataUrl) => {
    // https://developer.chrome.com/docs/extensions/reference/tabs/#method-sendMessage
    // chrome.tabs.sendMessage(tab.id, { greeting: "hello how are you!" });
    chrome.tabs.sendMessage(tab.id, { favicon: dataUrl });
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
