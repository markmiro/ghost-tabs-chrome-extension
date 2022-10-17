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
  // Get the last link instead of the first because some websites like github.com have multiple, and we want to change the last one.
  let links = document.querySelectorAll("link[rel~='icon']");
  let link = links[links.length - 1];
  if (links.length === 0) {
    link = document.createElement("link");
    link.rel = "icon";
    document.getElementsByTagName("head")[0].appendChild(link);
  }
  link.href = href;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("clicked! sent to content script");
  if (request.favicon) {
    // alert(request.favicon);
    generateFaviconUri(request.favicon, { alpha: 0.5 }).then((dataUri) => {
      console.log(dataUri);
      setFavicon(dataUri);
    });
  }
});
