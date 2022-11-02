import { fadeIcon as fadeIconBase, unreadIcon as unreadIconBase, isInWorker, isSvg, isFavIconUntouched, sleep } from './util.js';

if (isInWorker()) throw new Error("`util-dom.js` is not available in web workers.");

// https://levelup.gitconnected.com/draw-an-svg-to-canvas-and-download-it-as-image-in-javascript-f7f7713cf81f
// Can't fix the SVG in background script because Image element isn't available in web workers.
export function fixSvg(favIconUrl) {
  const width = 32;
  const height = 32;
  return new Promise((resolve) => {
    let image = new Image();
    // Add cross origin because sites like GitHub throw a `Tainted canvases may not be exported` error
    // https://stackoverflow.com/a/22716873
    image.crossOrigin = "anonymous"
    image.onload = () => {
      let canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      let context = canvas.getContext('2d');
      // draw image in canvas starting left-0 , top - 0  
      context.drawImage(image, 0, 0, width, height);
      const dataUrl = canvas.toDataURL();
      resolve(dataUrl);
    };
    image.src = favIconUrl;
  })
}

export async function fadeIcon(url, amount) {
  if (await isSvg(url)) {
    return fadeIconBase(await fixSvg(url), amount);
  }
  return fadeIconBase(url, amount);
}

export async function unreadIcon(url, amount) {
  if (await isSvg(url)) {
    return unreadIconBase(await fixSvg(url), amount);
  }
  return unreadIconBase(url, amount);
}

export function getFaviconLinks() {
  return document.querySelectorAll("link[rel~='icon']");
}

export async function getFaviconUrl() {
  // Strategy:
  // • If there is no link icon, don't try to get root favicon.ico
  //   • If no root favicon.ico, get tht 
  // • If there are link icons, keep querying until Chrome tells us which icon is actually chosen.

  const links = getFaviconLinks();
  if (!links || links.length === 0) {
    let response = await fetch('/favicon.ico');
    if (response.ok) {
      return response.url;
    } else {
      return undefined;
    }
  }

  // Loop until we get a url that doesn't start with `data:`
  for (let tries = 0; tries <= 3; tries++) {
    console.log('try to find the correct icon...');
    const urlCandidate = await chrome.runtime.sendMessage({ action: "GET_FAVICONURL" });
    if (urlCandidate && isFavIconUntouched(urlCandidate)) {
      return urlCandidate;
    }
    console.log('response for GET_FAVICONURL', urlCandidate);
    // Wait because we don't want to try again right away
    await sleep(tries * 100);
  }

  return undefined;
}

// https://stackoverflow.com/a/260876
export function setFavicon(href) {
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
  const allFavicons = getFaviconLinks();
  allFavicons.forEach((favicon) => favicon.remove());

  // Create a new link element
  let link = document.createElement("link");
  link.rel = "icon";
  document.getElementsByTagName("head")[0].appendChild(link);

  link.type = "image/png";
  // https://stackoverflow.com/a/61901020
  // https://developer.mozilla.org/en-US/docs/Web/API/SecurityPolicyViolationEvent
  document.addEventListener("securitypolicyviolation", (e) => {
    console.log('CSP ERROR FROM CONTENT SCRIPT:: event: ', e);
    // Checking all this to decrease the chance that it was triggered by something else
    // Possibly add `&& sourceFile === "chrome-extension"`
    if (e.blockedURI === 'data' && e.violatedDirective === 'img-src') {
      IS_DATA_URL_BLOCKED = true;
      // TODO: send this data up to the popup so user can see why this tab doesn't get faded.
    }
  }, { once: true });
  link.href = href;

  // TODO: Consider removing dynamically added links too
  // https://github.com/Elliot67/env-specific-favicon/blob/main/src/contentScripts/index.ts#L53
}