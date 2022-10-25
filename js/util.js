export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function isInWorker() {
  return typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;
}

// https://github.com/markmiro/hashdrop/blob/03c5a087eeca49c41e0bf9583f9634451e712c10/frontend/src/util/dropUtils.ts
export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function urlToBlob(url) {
  // https://trezy.com/blog/loading-images-with-web-workers
  const response = await fetch(url, { mode: "no-cors" });
  // Once the file has been fetched, we'll convert it to a `Blob`
  const blob = await response.blob();
  if (blob.size === 0) throw new Error('Empty blob.');
  return blob;
}

export async function isSvg(url) {
  return url && url.toLowerCase().endsWith('.svg');
  // NOTE: calling `urlToBlob` from a content script fails.
  // let fileBlob = await urlToBlob(url);
  // return await fileBlob.type.includes("svg"); // image/svg+xml
}

function isDarkMode() {
  // TODO:support dark mode if this module is imported in a background service worker
  console.log('Need to somehow get darkmode support here');
  if (isInWorker()) {
    return false;
  }
  // https://stackoverflow.com/a/57795495
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export async function getDefaultIconUrl() {
  const defaultLightIcon = await chrome.runtime.getURL("img/generated/earth-white.png");
  const defaultDarkIcon = await chrome.runtime.getURL("img/generated/earth-black.png");
  const defaultIconUrl = isDarkMode() ? defaultLightIcon : defaultDarkIcon;
  return defaultIconUrl;
}

export async function fadeIcon(url, amount = 0.5) {
  if (isInWorker() && await isSvg(url)) {
    // https://bugs.chromium.org/p/chromium/issues/detail?id=606317
    throw new Error(fileBlob.type + ' is not supported.');
  }

  let favIconUrl = await getDefaultIconUrl();
  if (url) favIconUrl = url;

  let fileBlob = await urlToBlob(favIconUrl);
  const imageBitmap = await createImageBitmap(fileBlob);

  const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
  const ctx = canvas.getContext("2d");
  const adjustedAmount = amount * .8 + .25;
  ctx.globalAlpha = adjustedAmount;
  ctx.filter = `grayscale(${(1 - adjustedAmount) * 100}%)`;
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

export async function unreadIcon(url) {
  if (isInWorker() && await isSvg(url)) {
    // https://bugs.chromium.org/p/chromium/issues/detail?id=606317
    throw new Error(fileBlob.type + ' is not supported.');
  }

  let favIconUrl = await getDefaultIconUrl();
  if (url) favIconUrl = url;

  let fileBlob = await urlToBlob(favIconUrl);
  const imageBitmap = await createImageBitmap(fileBlob);

  const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
  const ctx = canvas.getContext("2d");
  ctx.globalAlpha = 0.3;
  ctx.filter = "grayscale(60%)";
  ctx.drawImage(imageBitmap, 0, 0);

  ctx.globalAlpha = 1;
  ctx.filter = "grayscale(0%)";
  ctx.fillStyle = "#3478F6";
  ctx.strokeStyle = "#ffffff88";
  ctx.beginPath();
  const scale = imageBitmap.width / 32;
  ctx.lineWidth = 2 * scale;
  const radius = 6;
  ctx.arc(.5 + radius * scale, .5 + radius * scale, radius * scale, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();

  // https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas#instance_methods
  // Would love to do `canvas.toDataURL()`, but the `OffscreenCanvas` for use in web workers doesn't have that feature.
  const returnBlob = await canvas.convertToBlob();
  // https://stackoverflow.com/a/30881444
  const returnDataUrl = await blobToDataUrl(returnBlob);

  return returnDataUrl;
}