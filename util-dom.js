import { fadeIcon as fadeIconBase, isInWorker, isSvg } from './util.js';

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