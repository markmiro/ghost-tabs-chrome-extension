import { fadeIcon } from './fade-icon.js';

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
})