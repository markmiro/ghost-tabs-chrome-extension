chrome.runtime.onInstalled.addListener(async () => {
  let url = chrome.runtime.getURL("debug.html");
  let tab = await chrome.tabs.create({ url });
  console.log(`Created tab ${tab.id}`);
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
