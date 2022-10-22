console.log("INSTALLED ghost tabs content script!");

// https://stackoverflow.com/a/260876
function setFavicon(href) {
  // Remove existing favicons
  // ---
  // Chrome will choose the correct icon to display in the tab based on a set of criteria. I could
  // use the `tab.favIconUrl` value, but this will return an absolute URL, whereas the `href`
  // in the favicon `<link>` is usually a relative path.
  //
  // Chrome seems to choose the SVG url (for css-tricks.com website) in a way that seems to contradict
  // the info on this page: https://stackoverflow.com/a/28094560
  //
  // However, the bigger issue is that by updating that favicon, now we have to consider the possibility
  // that another favicon might now take precedence. For example, suppose two favicons: an ICO icon and
  // an SVG icon. After updating the ICO icon to a data URL, now the SVG icon might take precedence over
  // the data url. To fix this, I would need to remove the SVG icon from the HTML.
  //
  // Messing with the links should be find since it's all in the head, and most websites don't change
  // content up there dynamically.
  const allFavicons = document.querySelectorAll("link[rel~='icon']");
  allFavicons.forEach((favicon) => favicon.remove());

  // Create a new link element
  let link = document.createElement("link");
  link.rel = "icon";
  document.getElementsByTagName("head")[0].appendChild(link);

  link.type = "image/png";
  link.href = href;
}

(async () => {
  const { sleep, isSvg } = await import(chrome.runtime.getURL("util.js"));
  const { fixSvg } = await import(chrome.runtime.getURL("util-dom.js"));

  // In theory, data urls can be used for favicons, but in practice, I haven't seen it.
  // If this starts to be more common, I'll have to resort to a much more complicated solution
  // that involves tracking data urls that have been used.
  function isFavIconUntouched(favIconUrl) {
    return !(favIconUrl && favIconUrl.startsWith('data:'));
  }

  async function getFaviconUrl() {
    // Loop until we get a url that doesn't start with `data:`
    for (let tries = 0; tries <= 5; tries++) {
      console.log('try to find the correct icon...');
      const urlCandidate = await chrome.runtime.sendMessage({ action: "GET_FAVICONURL" });
      if (isFavIconUntouched(urlCandidate)) {
        return urlCandidate;
      }
      console.log('response for GET_FAVICONURL', urlCandidate);
      // Wait because we don't want to try again right away
      await sleep(400);
    }
  }

  // ---

  let favIconUrl = await getFaviconUrl();
  console.log("clicked! sent to content script", favIconUrl);

  chrome.runtime.onMessage.addListener(async (request) => {
    if (request.action === "FADE") {
      console.log('ACTION: FADE', favIconUrl);
      if (await isSvg(favIconUrl)) {
        favIconUrl = await fixSvg(favIconUrl);
      }
      const newIconUrl = await chrome.runtime.sendMessage({ action: "FADE_ICON", favIconUrl });
      setFavicon(newIconUrl);
    } else if (request.action === 'UNFADE') {
      console.log('ACTION: UNFADE', favIconUrl);
      setFavicon(favIconUrl);
    }
  });
})();