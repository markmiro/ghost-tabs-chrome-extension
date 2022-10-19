// https://github.com/markmiro/hashdrop/blob/03c5a087eeca49c41e0bf9583f9634451e712c10/frontend/src/util/dropUtils.ts
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function urlToBlob(url) {
  // https://trezy.com/blog/loading-images-with-web-workers
  const response = await fetch(url, { mode: "no-cors" });
  // Once the file has been fetched, we'll convert it to a `Blob`
  return await response.blob();
}

export async function fadeIcon(url, amount = 0.5) {
  let favIconUrl = url;
  if (!favIconUrl) {
    favIconUrl = chrome.runtime.getURL("img/default-icon.png");
  }

  const fileBlob = await urlToBlob(favIconUrl);
  const imageBitmap = await createImageBitmap(fileBlob);
  const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
  const context = canvas.getContext("2d");
  context.globalAlpha = amount;
  // context.filter = "grayscale(100%)";
  context.drawImage(imageBitmap, 0, 0);

  // context.fillStyle = "red";
  // context.fillRect(0, 0, 5, 5);

  const returnBlob = await canvas.convertToBlob();
  // https://stackoverflow.com/a/30881444
  return await blobToDataUrl(returnBlob);
}