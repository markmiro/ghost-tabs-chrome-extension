(async () => {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  console.log(tabs);
})();

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
