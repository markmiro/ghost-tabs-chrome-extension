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
