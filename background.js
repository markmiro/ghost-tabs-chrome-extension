// Extension event listeners are a little different from the patterns you may have seen in DOM or
// Node.js APIs. The below event listener registration can be broken in to 4 distinct parts:
//
// * chrome      - the global namespace for Chrome's extension APIs
// * runtime     – the namespace of the specific API we want to use
// * onInstalled - the event we want to subscribe to
// * addListener - what we want to do with this event
//
// See https://developer.chrome.com/docs/extensions/reference/events/ for additional details.
chrome.runtime.onInstalled.addListener(async () => {
  // While we could have used `let url = "hello.html"`, using runtime.getURL is a bit more robust as
  // it returns a full URL rather than just a path that Chrome needs to be resolved contextually at
  // runtime.
  let url = chrome.runtime.getURL("hello.html");

  // Open a new tab pointing at our page's URL using JavaScript's object initializer shorthand.
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Object_initializer#new_notations_in_ecmascript_2015
  //
  // Many of the extension platform's APIs are asynchronous and can either take a callback argument
  // or return a promise. Since we're inside an async function, we can await the resolution of the
  // promise returned by the tabs.create call. See the following link for more info on async/await.
  // https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Async_await
  // let tab = await chrome.tabs.create({ url });

  // Finally, let's log the ID of the newly created tab using a template literal.
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals
  //
  // To view this log message, open chrome://extensions, find "Hello, World!", and click the
  // "service worker" link in the card to open DevTools.
  // console.log(`Created tab ${tab.id}`);
});

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
  // console.log(url, fileBlob);
  const dataUrl = await blobToDataUrl(fileBlob);
  return dataUrl;
}

chrome.action.onClicked.addListener((tab) => {
  // https://developer.chrome.com/docs/extensions/reference/tabs/#method-sendMessage

  // Note: requires "activeTab" permission to work.
  // chrome.tabs.sendMessage(tab.id, { greeting: "hello how are you!" });
  // console.log("clicked!");

  urlToDataUrl(tab.favIconUrl).then((dataUrl) => {
    // https://developer.chrome.com/docs/extensions/reference/tabs/#method-sendMessage
    chrome.tabs.sendMessage(tab.id, { favicon: dataUrl });
  });

  // chrome.action.setBadgeBackgroundColor({ color: "red" });
  // chrome.scripting.executeScript({
  //   target: { tabId: tab.id },
  //   func: () => {
  //     console.log("clicked!");
  //     // https://stackoverflow.com/a/260876
  //     var link = document.querySelector("link[rel~='icon']");
  //     if (!link) {
  //       link = document.createElement("link");
  //       link.rel = "icon";
  //       document.getElementsByTagName("head")[0].appendChild(link);
  //     }
  //     link.href = "";
  //   },
  // });
});
