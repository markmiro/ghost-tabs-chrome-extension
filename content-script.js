console.log("INSTALLED hello world content script!");

// TODO: move this to background script
function generateFaviconUri(url, options = { alpha: 1 }) {
  return new Promise((resolve, reject) => {
    let img = new Image();
    img.onload = () => {
      let canvas = window.document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      let context = canvas.getContext("2d");
      context.globalAlpha = options.alpha;
      context.drawImage(img, 0, 0);
      resolve(canvas.toDataURL());
    };
    img.onerror = () => {
      if (!url) return reject(new Error("unable to generate favicon"));
      // Try again with the default ico
      generateFaviconUri(null, resolve); // TODO: Generate once in the background and reuse
    };
    img.src = url || chrome.runtime.getURL("img/default.ico");
  });
}

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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("clicked! sent to content script");
  if (request.action === "UPDATE_FAVICON") {
    generateFaviconUri(request.dataUrl, { alpha: 0.5 }).then((dataUri) => {
      console.log(dataUri);
      setFavicon(dataUri);
    });
  }
});
