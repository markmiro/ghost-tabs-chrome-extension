/**
 * How this works
 * There are two kinds of favicon links
 * 1. The kind are the ones the page comes with
 * 2. The the icon we add
 * In the first kind, there's also a primary icon and the rest of them that haven't been chosen for whatever reason
 */

import { emoji, log } from "./console.js";
import {
  isSvg,
  fadeIcon as fadeIconBase,
  unreadIcon as unreadIconBase,
  isInWorker,
  isFavIconUntouched,
  sleep,
  blobToDataUrl,
} from "./util.js";


/** Guarantee a 404 response */
const FAIL_LOAD_FAVICON_URL =
  document.location.origin + "/gtce_ghost-tabs-chrome-extension_should-404.ico";

if (isInWorker())
  throw new Error("`util-dom.js` is not available in web workers.");

// https://levelup.gitconnected.com/draw-an-svg-to-canvas-and-download-it-as-image-in-javascript-f7f7713cf81f
// Can't fix the SVG in background script because Image element isn't available in web workers.
function fixSvg(favIconUrl: string) {
  const width = 32;
  const height = 32;
  return new Promise<string>((resolve) => {
    let image = new Image();
    // Add cross origin because sites like GitHub throw a `Tainted canvases may not be exported` error
    // https://stackoverflow.com/a/22716873
    image.crossOrigin = "anonymous";
    image.onload = () => {
      let canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      let context = canvas.getContext("2d");
      // draw image in canvas starting left-0 , top - 0
      context.drawImage(image, 0, 0, width, height);
      const dataUrl = canvas.toDataURL();
      resolve(dataUrl);
    };
    image.src = favIconUrl;
  });
}

export async function fadeIcon(url: string, amount: number) {
  if (await isSvg(url)) {
    return fadeIconBase(await fixSvg(url), amount);
  }
  return fadeIconBase(url, amount);
}

export async function unreadIcon(url: string) {
  if (await isSvg(url)) {
    return unreadIconBase(await fixSvg(url));
  }
  return unreadIconBase(url);
}

export function getFaviconLinks() {
  // Add `:not(#gtce-icon)` because `getFaviconUrl()` will otherwise try to fetch a link url when the dom is dirty (modified by the extension)
  return document.querySelectorAll("link[rel~='icon']:not(#gtce-icon)");
}

// Used for when we know which favicon URL is primary, but we got that `favIconUrl` from the `chrome.tabs` API
function setPrimary(favIconUrl: string) {
  const baseUrl = document.location.origin;
  const favIconUrlObj = new URL(favIconUrl, baseUrl);
  const links = getFaviconLinks();
  for (const $el of links) {
    let linkHref;
    if ($el.hasAttribute("data-gtce-href")) {
      linkHref = $el.getAttribute("data-gtce-href");
    } else if ($el.hasAttribute("href")) {
      linkHref = $el.getAttribute("href");
    }
    const linkUrlObj = new URL(linkHref, baseUrl);
    // We have to convert to `URL` objects because the original href strings won't match if one
    // of them is a relative path and the other is absolute.
    if (favIconUrlObj.href === linkUrlObj.href) {
      $el.setAttribute("data-gtce-primary", "true");
      break;
    }
  }
}

export async function getFaviconUrl(): Promise<string> {
  const primaryLink = document.querySelector(`link[data-gtce-primary]`);
  if (primaryLink) {
    return primaryLink.getAttribute("data-gtce-href") || "";
  }

  // Strategy:
  // • If there is no link icon, don't try to get root favicon.ico
  //   • If no root favicon.ico, get that
  // • If there are link icons, keep querying until Chrome tells us which icon is actually chosen.

  const links = getFaviconLinks();
  if (!links || links.length === 0) {
    let response = await fetch("/favicon.ico");
    if (response.ok) {
      return response.url;
    } else {
      return "";
    }
  }

  // Loop until we get a url that doesn't start with `data:`
  for (let tries = 0; tries <= 10; tries++) {
    log("try to find the correct icon...");
    const urlCandidate: string = await chrome.runtime.sendMessage({
      action: "GET_FAVICONURL",
    });
    log("response for GET_FAVICONURL", urlCandidate);
    if (urlCandidate && isFavIconUntouched(urlCandidate)) {
      setPrimary(urlCandidate);
      return urlCandidate;
    }
    // Wait because we don't want to try again right away
    await sleep(tries * 200);
  }

  return "";
}

export const existingFavicons = {
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
  clear() {
    if (document.getElementById("gtce-icon")) {
      document.head.removeChild(document.getElementById("gtce-icon"));
    }
    const allFavIcons = getFaviconLinks();
    for (const favicon of allFavIcons) {
      if (
        !favicon.getAttribute("data-gtce-href") &&
        favicon.id !== "gtce-icon"
      ) {
        favicon.setAttribute("data-gtce-href", favicon.getAttribute("href"));
        favicon.setAttribute("href", "");
      }
    }
  },
  unclear() {
    const allFavIcons = document.querySelectorAll("link[data-gtce-href]");
    for (const favicon of allFavIcons) {
      favicon.setAttribute("href", favicon.getAttribute("data-gtce-href"));
      favicon.removeAttribute("data-gtce-href");
      favicon.removeAttribute("data-gtce-primary");
    }
    if (document.getElementById("gtce-icon")) {
      document.head.removeChild(document.getElementById("gtce-icon"));
    }
  },
};

export async function blankIconDataUrl() {
  const SIDE = 32;
  const canvas = new OffscreenCanvas(SIDE, SIDE);
  const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
  ctx.fillStyle = "#00ff00";
  ctx.fillRect(0, 0, SIDE, SIDE);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "29px sans-serif";
  ctx.fillText(emoji, 16, 16);
  const returnBlob = await canvas.convertToBlob();
  const returnDataUrl = await blobToDataUrl(returnBlob);
  return returnDataUrl;
}

// https://stackoverflow.com/a/260876
export function setFavicon(href: string) {
  log("setFavicon", href);
  existingFavicons.clear();

  // Force a globe icon
  if (!href) href = FAIL_LOAD_FAVICON_URL;

  const el = document.getElementById("gtce-icon") as HTMLLinkElement;
  if (el) {
    if (el.tagName !== "LINK") {
      throw new TypeError("Expected element to be a <link>");
    }
    el.href = href;
  } else {
    // Create a new link element
    let link = document.createElement("link");
    link.rel = "icon";
    link.id = "gtce-icon";
    document.getElementsByTagName("head")[0].appendChild(link);
    link.type = "image/png";
    link.href = href;
  }

  // TODO: Consider removing dynamically added links too
  // https://github.com/Elliot67/env-specific-favicon/blob/main/src/contentScripts/index.ts#L53
}

export async function resetIcon(favIconUrl: string) {
  if (favIconUrl) {
    setFavicon(favIconUrl);
  } else {
    // Force globe icon
    setFavicon(FAIL_LOAD_FAVICON_URL);
  }
  // Reverting the DOM to the original state causes the favicon to go back to a modified state.
  // Approaches I've tried:
  // - Adding a version query string to the original DOM hrefs doesn't help (https://stackoverflow.com/a/7116701).
  // - Trigger update via changing the data url, and then reverting all DOM changes doesn't work either
  // - Doing a `setTimeout` to revert the DOM changes causes the modified favicon to reappear after DOM changes are reverted.
  //   I assumed that the setTimeout would fix batching issues, but that doesn't appear to be the case.
  //   `setTimeout(existingFavicons.unclear, 1000);`
  // The only way to revert the favicon back to "normal" in a consisten way is to update to a data URL that corresponds to the original favicon url
}

export async function fadeIconViaWorker(favIconUrl: string, opacity: number) {
  if (await isSvg(favIconUrl)) {
    favIconUrl = await fixSvg(favIconUrl);
  }

  try {
    const newIconUrl = await chrome.runtime.sendMessage({
      action: "FADE_ICON",
      favIconUrl,
      opacity,
    });
    setFavicon(newIconUrl);
  } catch (err) {
    log(err);
  }
}

export async function unreadIconViaWorker(favIconUrl: string) {
  if (await isSvg(favIconUrl)) {
    favIconUrl = await fixSvg(favIconUrl);
  }
  const newIconUrl = await chrome.runtime.sendMessage({
    action: "UNREAD_ICON",
    favIconUrl,
  });
  setFavicon(newIconUrl);
}
