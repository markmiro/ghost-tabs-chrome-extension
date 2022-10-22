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
  const { sleep, fixSvg } = await import(chrome.runtime.getURL("util.js"));
  let favIconUrl;

  // Loop until we get a url that doesn't start with `data:`
  let foundCorrectIcon = false;
  let tries = 0;
  while (!foundCorrectIcon && tries < 5) {
    console.log('try to find the correct icon...');
    const data = await chrome.runtime.sendMessage({ action: "GET_BASIC_DATA" });
    console.log('basic data');
    if (!(data.favIconUrl && data.favIconUrl.startsWith('data:'))) {
      favIconUrl = data.favIconUrl;
      break;
    }
    console.log('response for GET_BASIC_DATA', data);
    await sleep(200);
  }

  chrome.runtime.onMessage.addListener(async (request) => {
    console.log("clicked! sent to content script", favIconUrl);
    if (request.action === "FADE") {
      console.log('ACTION: FADE', favIconUrl);
      if (favIconUrl && favIconUrl.toLowerCase().endsWith('.svg')) {
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