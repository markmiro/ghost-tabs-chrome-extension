// To use this script, make sure to update the manifest.json file with:
// {
//   ...
//   "permissions": [..., "webRequest", "declarativeNetRequest"],
//   "host_permissions": ["http://*/*", "https://*/*"],
// }

console.log("loaded background-headers.js");

// https://github.com/WithoutHair/Disable-Content-Security-Policy/blob/79206a656c1bedf249adc80aa3d5b32b182e76ae/background.js
async function allowCSPDataImage(tabId, url, existingValue) {
  console.log(url, "disables CSP, current value:", existingValue.split(/;\s*/));

  // TODO: don't iterate each time
  const rules = await chrome.declarativeNetRequest.getSessionRules();
  const foundRule = rules.find((rule) => rule.id === tabId);
  console.log(url, "found rule CSP:", foundRule);
  if (foundRule) return;

  // TODO: make a cheaper check for `img-src` than just parsing the whole CPS header
  let csp = {};
  existingValue.split(/;\s*/).forEach((item) => {
    const [key, ...values] = item.split(/\s+/);
    csp[key] = values;
  });

  if (csp["img-src"].includes("data:")) return;

  const newValue = [...csp["img-src"], "data:"].join(" ");
  console.log(url, "new value", newValue);

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

// https://github.com/PhilGrayson/chrome-csp-disable/blob/79371297b6a1f88d1142450dfbd5e85f7e7d9307/background.js
// https://developer.chrome.com/docs/extensions/mv3/mv3-migration-checklist/#api-blocking
// If you enable this function, add "webRequest" to manifest.json permissions.
// Even then, it doesn't seem to work
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    console.log("headers recieved", details);
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
  { urls: ["*://*/*"], types: ["main_frame"] },
  ["responseHeaders"]
);

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
