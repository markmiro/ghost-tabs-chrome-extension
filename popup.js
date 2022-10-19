import { fadeIcon } from './fade-icon.js';

async function getCurrentTab() {
  let queryOptions = { active: true, lastFocusedWindow: true };
  // `tab` will either be a `tabs.Tab` instance or `undefined`.
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

chrome.runtime.sendMessage({ action: "GET_ACTIVE" }, responseActive => {
  getCurrentTab().then(tab => {
    // TODO: possibility of script injection attack via innerHTML?
    document.getElementById('js-tab-data').innerHTML = `<i>Current tab url: ${JSON.stringify(tab.url)}</i>`;
  });
});

document.getElementById('js-fade-all').addEventListener('click', async () => {
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

document.getElementById("js-reset-all-rules").onclick = async () => {
  const rules = await chrome.declarativeNetRequest.getSessionRules();
  if (rules.length === 0) {
    alert("No rules to remove.");
    return;
  }
  const ruleIds = rules.map((rule) => rule.id);
  chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: ruleIds,
  });
  alert(`Removed ids: ${ruleIds.join(", ")}.`);
};

document.getElementById("js-reload-all").onclick = async () => {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  tabs.forEach((tab) => {
    chrome.tabs.reload(tab.id, { bypassCache: true });
  });
};

document.getElementById("js-open-popular-sites").onclick = async () => {
  chrome.windows.create({
    focused: true,
    // https://en.wikipedia.org/wiki/List_of_most_visited_websites
    url: [
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
      "https://linkedin.com",
      "https://vk.com",
      "https://weather.com",
      "https://duckduckgo.com",
      "https://microsoft.com",
      "https://quora.com",
      "https://ebay.com",
      "https://msn.com",
      "https://booking.com",
    ],
  });
};
