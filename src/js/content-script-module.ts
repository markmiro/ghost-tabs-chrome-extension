// NOTE: need to add `.js` extension or otherwise Chrome won't find it
// Also, need to add any imports and their imports to the `manifest.json` file:
// `web_accessible_resources.resources`
// ---
import { log } from "./helpers/console.js";
import { selfClean } from "./helpers/self-clean-content-script.js";
import {
  blankIconDataUrl,
  getFaviconUrl,
  resetIcon,
  setFavicon,
} from "./helpers/util-dom.js";

function withOptions(handler: (options: Options) => void) {
  let options: Options = {};

  chrome.storage.local.get("options").then((data) => {
    Object.assign(options, data.options);
    handler(options);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.options?.newValue) {
      Object.assign(options, changes.options.newValue);
      handler(options);
    }
  });
}

selfClean(async () => {
  const favIconUrl = await getFaviconUrl();
  const redRectHref = await blankIconDataUrl();
  setFavicon(redRectHref);

  withOptions((options) => {
    log("OPTIONS", options);
  });

  log("getFaviconUrl()", favIconUrl);
  log("redRectHref", redRectHref);

  return () => {
    resetIcon(favIconUrl);
  };
});
