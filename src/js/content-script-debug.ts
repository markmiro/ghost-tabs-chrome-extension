console.log("CONTENT SCRIPT INSTALLED!");
let extensionInvalidated = false;

(async () => {
  const { fadeIconViaWorker, getFaviconUrl, resetIcon } = await import(
    chrome.runtime.getURL("js/helpers/util-dom.js")
  );

  const favIconUrl = await getFaviconUrl();

  fadeIconViaWorker(favIconUrl, 0.5);

  async function handleVisibilityChange() {
    try {
      const timestamp = await chrome.runtime.sendMessage({ action: "PING" });
      console.log(
        "PING timestamp:",
        timestamp,
        "page " + document.visibilityState
      );
    } catch (err) {
      if (!(err instanceof Error)) throw new Error("Error has no message");
      if (err.message.includes("Extension context invalidated")) {
        extensionInvalidated = true;
        resetIcon(favIconUrl);
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
      }
      console.log("ERROR from PING:", err.message, err);
    }
  }

  document.addEventListener("visibilitychange", handleVisibilityChange);
})();
