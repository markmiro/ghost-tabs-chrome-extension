export const DEBUG = false;

// Requires these permissions in the manifest:
// "host_permissions": ["http://*/*", "https://*/*"]
// https://stackoverflow.com/questions/10994324/chrome-extension-content-script-re-injection-after-upgrade-or-install
export async function injectContentScript() {
  for (const cs of chrome.runtime.getManifest().content_scripts) {
    for (const tab of await chrome.tabs.query({ url: cs.matches })) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: cs.js,
      });
    }
  }
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// In theory, data urls can be used for favicons, but in practice, I haven't seen it.
// If this starts to be more common, I'll have to resort to a much more complicated solution
// that involves tracking data urls that have been used.
export function isFavIconUntouched(favIconUrl: string) {
  return !favIconUrl.startsWith("data:");
}

export function freshness(timeMs: number, halfLifeMs: number) {
  // https://en.wikipedia.org/wiki/Exponential_decay#Half-life
  // N(t) = N0 * 2 ^ (-t / halfT)
  return Math.pow(2, -timeMs / halfLifeMs);
}

declare var WorkerGlobalScope: any;
export function isInWorker() {
  return (
    typeof WorkerGlobalScope !== "undefined" &&
    self instanceof WorkerGlobalScope
  );
}

// https://github.com/markmiro/hashdrop/blob/03c5a087eeca49c41e0bf9583f9634451e712c10/frontend/src/util/dropUtils.ts
export function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function urlToBlob(url: string) {
  if (!url) throw new Error("Expected a url.");
  // https://trezy.com/blog/loading-images-with-web-workers
  const response = await fetch(url);
  // Once the file has been fetched, we'll convert it to a `Blob`
  const blob = await response.blob();
  if (blob.size === 0) throw new Error("Empty blob.");
  return blob;
}

export function getUrlExtension(url: string) {
  // Note: outlook.live.com and microsoft.com do something like this: `.ico?v=4`
  const regex = /(\.[a-z]{1,5})(\?\w+=\w+)?$/i;
  const matched = url?.match(regex);
  if (!matched) return;
  // Get the right regex capture group
  const [_wholeMatch, extension, _queryString] = matched;
  return extension.toLowerCase();
}

export function hasProperIconExtension(url: string) {
  // In most situations, we can just do some REGEX to determine the icon type from the file
  const iconExtensions = [".ico", ".png", ".jpg", ".jpeg", ".svg"];
  const urlExtensionMatch = getUrlExtension(url);
  return iconExtensions.includes(urlExtensionMatch);
}

async function isSvg(url: string) {
  if (!url) return false;
  // NOTE: calling `urlToBlob` from a content script fails.
  let fileBlob = await urlToBlob(url);
  return await fileBlob.type.includes("svg"); // image/svg+xml
}

function isDarkMode() {
  // TODO:support dark mode if this module is imported in a background service worker
  // console.log('Need to somehow get darkmode support here');
  if (isInWorker()) {
    return false;
  }
  // https://stackoverflow.com/a/57795495
  return (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export async function getDefaultIconUrl() {
  const defaultLightIcon = await chrome.runtime.getURL(
    "img/generated/earth-white.png"
  );
  const defaultDarkIcon = await chrome.runtime.getURL(
    "img/generated/earth-black.png"
  );
  const defaultIconUrl = isDarkMode() ? defaultLightIcon : defaultDarkIcon;
  return defaultIconUrl;
}

// Takes icon loading from ~50ms to ~20ms, and sometimes makes it 6x faster (ebay.com icon)
const bitmapCache: Record<string, ImageBitmap> = {};

export async function fadeIcon(url: string, amount = 0.5) {
  if (amount > 1 || amount < 0)
    console.error("Only accepts numbers between 0 and 1.");

  if (isInWorker() && (await isSvg(url))) {
    // https://bugs.chromium.org/p/chromium/issues/detail?id=606317
    throw new Error("SVG is not supported.");
  }

  // TODO: move this to content-script since it can then listen to dark mode on the tab and update accordingly.
  // I haven't found a way to detect dark mode in the background.
  let favIconUrl = await getDefaultIconUrl();
  if (url) favIconUrl = url;

  let imageBitmap;
  if (bitmapCache[url]) {
    imageBitmap = bitmapCache[url];
  } else {
    let fileBlob = await urlToBlob(favIconUrl);
    imageBitmap = await createImageBitmap(fileBlob);
    bitmapCache[url] = imageBitmap;
  }
  const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
  const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
  ctx.globalAlpha = amount;
  ctx.filter = `grayscale(${(1 - amount) * 100}%)`;
  ctx.drawImage(imageBitmap, 0, 0);

  // Freshness badge
  // ctx.globalAlpha = 1;
  // ctx.filter = `grayscale(0%)`;
  // ctx.fillStyle = `hsl(${120 - 120 * (1 - amount)}, 100%, 50%)`;
  // ctx.strokeStyle = "#ffffff88";
  // // ctx.setStrokeColor("white", 0.5);
  // // ctx.fillRect(0, 0, 5, 5);
  // ctx.beginPath();
  // const scale = imageBitmap.width / 32;
  // ctx.lineWidth = 2 * scale;
  // const radius = 6;
  // ctx.arc(.5 + radius * scale, .5 + radius * scale, radius * scale, 0, 2 * Math.PI);
  // ctx.fill();
  // ctx.stroke();

  // Progress bar
  // ctx.globalAlpha = 1;
  // ctx.filter = `grayscale(0%)`;
  // ctx.fillStyle = "red"
  // const scale = imageBitmap.width / 32;
  // ctx.fillRect(0, 0, 4 * scale, scale * 32 * (1 - amount));
  // ctx.strokeStyle = "white";
  // ctx.lineWidth = 1 * scale;
  // ctx.strokeRect(0, 0, 4 * scale, scale * 32 * (1 - amount));

  // https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas#instance_methods
  // Would love to do `canvas.toDataURL()`, but the `OffscreenCanvas` for use in web workers doesn't have that feature.
  const returnBlob = await canvas.convertToBlob();
  // https://stackoverflow.com/a/30881444
  const returnDataUrl = await blobToDataUrl(returnBlob);

  return returnDataUrl;
}

export async function unreadIcon(url: string) {
  if (isInWorker() && (await isSvg(url))) {
    // https://bugs.chromium.org/p/chromium/issues/detail?id=606317
    throw new Error("SVG is not supported.");
  }

  let favIconUrl = await getDefaultIconUrl();
  if (url) favIconUrl = url;

  let fileBlob = await urlToBlob(favIconUrl);
  const imageBitmap = await createImageBitmap(fileBlob);

  const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
  const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
  ctx.globalAlpha = 0.6;
  ctx.filter = "grayscale(100%)";
  ctx.drawImage(imageBitmap, 0, 0);

  ctx.globalAlpha = 1;
  ctx.filter = "grayscale(0%)";
  ctx.fillStyle = "#3478F6";
  ctx.strokeStyle = "#ffffff88";
  ctx.beginPath();
  const scale = imageBitmap.width / 32;
  ctx.lineWidth = 2 * scale;
  const radius = 6;
  ctx.arc(
    0.5 + radius * scale,
    0.5 + radius * scale,
    radius * scale,
    0,
    2 * Math.PI
  );
  ctx.fill();
  ctx.stroke();

  // https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas#instance_methods
  // Would love to do `canvas.toDataURL()`, but the `OffscreenCanvas` for use in web workers doesn't have that feature.
  const returnBlob = await canvas.convertToBlob();
  // https://stackoverflow.com/a/30881444
  const returnDataUrl = await blobToDataUrl(returnBlob);

  return returnDataUrl;
}
