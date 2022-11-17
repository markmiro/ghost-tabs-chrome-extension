// NOTE: need to add `.js` extension or otherwise Chrome won't find it
// Also, need to add any imports and their imports to the `manifest.json` file:
// `web_accessible_resources.resources`
// ---
import { selfClean } from "./helpers/self-clean-content-script.js";
import {
  blankIconDataUrl,
  getFaviconUrl,
  resetIcon,
  setFavicon,
} from "./helpers/util-dom.js";

selfClean(async () => {
  const favIconUrl = await getFaviconUrl();
  const redRectHref = await blankIconDataUrl();
  setFavicon(redRectHref);

  console.log("getFaviconUrl()", favIconUrl);
  console.log("redRectHref", redRectHref);

  return () => {
    resetIcon(favIconUrl);
  };
});
