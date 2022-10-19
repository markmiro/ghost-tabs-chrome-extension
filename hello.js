(async () => {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  console.log(tabs);
})();

document.getElementById("reset-all-rules").onclick = async () => {
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
