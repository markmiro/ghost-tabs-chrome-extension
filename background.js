// import "./background-headers.js";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_ACTIVE") {
    sendResponse(active);
  }
});
