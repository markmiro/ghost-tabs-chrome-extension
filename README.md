# Ghost Tabs Chrome Extension

URLS:

- https://github.com/markmiro/ghost-tabs-chrome-extension/actions/workflows/pages/pages-build-deployment

Resources:

- [Publish Chrome extension via: Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [Chrome Extension listing images, icons, etc](https://developer.chrome.com/docs/webstore/images)
- [Changing a websites favicon with a Chrome extension?](https://stackoverflow.com/a/45974139)
- [The difference between Tab.faviconUrl and favicon API
  ](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/qS1rVpQVl8o)
- [host permissions](https://developer.chrome.com/docs/extensions/mv3/declare_permissions/#host-permissions)
- [content script security](https://developer.chrome.com/docs/extensions/mv3/messaging/#content-scripts-are-less-trustworthy)
- [match patterns](https://developer.chrome.com/docs/extensions/mv3/match_patterns/)
- [Security](https://developer.chrome.com/docs/extensions/mv3/content_scripts/#security)
- [Adding TypeScript](https://developer.chrome.com/docs/extensions/mv3/getstarted/development-basics/#types)
- [When do Chrome extensions cause CSP reports](https://www.debugbear.com/blog/chrome-extension-csp-error-noise)
- [The img-src Directive](https://content-security-policy.com/img-src/)
- [Content security policy (web.dev)](https://web.dev/csp)
- [Disable-Content-Security-Policy extension source](https://github.com/WithoutHair/Disable-Content-Security-Policy)
- [Publishing as a non-trader on the Chrome Web Store](https://stackoverflow.com/questions/72488292/chrome-webstore-developer-dashboard-am-i-a-trader-or-non-trader)
- [Publishing to the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish/#step5)
- [Determine if in development, or in production](https://stackoverflow.com/questions/36339862/how-to-know-chrome-extension-is-in-development-or-production-environment)
- [Why not `chrome://favicon/...` — stackoverflow.com](https://stackoverflow.com/questions/10665321/reliably-getting-favicons-in-chrome-extensions-chrome-favicon)
- [Process SVG favicons](https://levelup.gitconnected.com/draw-an-svg-to-canvas-and-download-it-as-image-in-javascript-f7f7713cf81f)
- [`chrome.windows.create()` creates inactive tabs that report that they're visible](https://bugs.chromium.org/p/chromium/issues/detail?id=1379232)
- [SVG favicons in action (+ how to make them auto-update in dark mode)](https://css-tricks.com/svg-favicons-in-action/)
- [Remove content script after install](https://stackoverflow.com/questions/18477910/chrome-extension-how-to-remove-content-script-after-injection)

Security Resources (content security policy — CSP, cross origin request — CORS):

- [Manifest - Sandbox](https://developer.chrome.com/docs/extensions/mv3/manifest/sandbox/)
- [Overview of Manifest V3: Remotely hosted code](https://developer.chrome.com/docs/extensions/mv3/intro/mv3-overview/#remotely-hosted-code)
- [Migrating to V3 — CSP](https://developer.chrome.com/docs/extensions/mv3/mv3-migration/#content-security-policy)
- [Content script fetchs](https://www.chromium.org/Home/chromium-security/extension-content-script-fetches/)
- [eval (but also innerHTML)](https://developer.chrome.com/docs/extensions/mv3/sandboxingEval/)

Considerations:

- Tab suspenders can set the tab icon because they control the page. But what if the page is not under my control?
- I shouldn't need to get access to each page, but maybe there's no other way around it?
- TabSuspender is the big one, but made by some guy in Russia? Also source isn't on github.
  - https://chrome.google.com/webstore/detail/tab-suspender/fiabciakcmgepblmdkmemdbbkilneeeh
- Chrome has an upcoming favicon API, but it seems buggy and not fully featured?
- I can have multiple `content-security-policy` HTTP headers, but subsequent ones can only become [more restrictive](https://chrisguitarguy.com/2019/07/05/working-with-multiple-content-security-policy-headers/)
- Loading content script on "document_start" is tempting, but I'll have to test it a bit more. In one test, it didn't reliably update the favicons to the unread state.
- [favIconUrl is an empty string when loading](https://developer.chrome.com/docs/extensions/reference/tabs/#property-Tab-favIconUrl)
- Content scripts can access the DOM, but [not page variables](https://stackoverflow.com/a/20513730). This means I can't save the tab state in the `window` object, and have that picked up again when the extension is updated. I'd have to insert a script tag into the DOM if I wanted to do this.
  - Saving tab state in the content script might still be fine. The alternative is to create some means of keeping some global state in sync with the tabs themselves on each page navigation. This sounds better, but there's more overhead, and more room for things to not work reliably.

Implementation notes:

- Content security policy on many websites means I can't change the icon, because they have a header in the HTML file returned that is like: `Content-Security-Policy: img-src 'self'`.
- In manifest.json
  - `"action": {},` is blank because otherwise `action.onClicked` doesn't work.
  - `"permissions": ["activeTab"],` allows sending messages from background tab to content script.
- `chrome.action.onClicked.addListener` doesn't work if there is a default popup.
- Rules added to a page via `updateSessionRules` aren't easily removed. You may need to restart the browser, or remove the extension.

---

Notes on updating favicons:

If you update the favicon of a tab, close the tab, and then re-open it, Chrome will initially use the updated icon,
which can be observed via `chrome.tabs.onUpdated.addListener`, and the listener is called again with the actual page favicon. Getting the favicon from the second update as the "correct" icon isn't ideal.

Going from a `favIconUrl` to a blob sometimes fails when it's done within a content script. I think this might be a
CSP or CORS issue, but the actual problem is that the blob returns empty.

A few possible solutions to getting the "original" favicon url consistently:

- If data URL, wait for a non-data URL
  - PRO: I'll be able to always load the latest favicon when web pages update
  - CON: If web page sets the favicon using a data URL. This is unlikely, so it might be fine to take this approach.
  - CON: Requires `tabs` permission
- Store original favicon url on first load in local storage (via content script)
  - CON: How do I update the favicon if it gets updated? Actually, I can maybe just use sessions storage
  - CON: What if the data URL gets loaded? I might be able to keep calling `GET_BASIC_DATA` until I get a non-data URL.

Pinned tabs: should not be modified. It doesn't make sense that a pinned tab might go stale, or be "unread". Although, it's possible for a pinned tab to have some state worth displaying in the future (EX: resource usage).

---

Similar extensions:

- [Tab Hibernate](https://chrome.google.com/webstore/detail/tab-hibernate/ammlihljcndoijbkoobiobhjgoopiidn?hl=en-US)
- [The Great Suspender Original](https://chrome.google.com/webstore/detail/the-great-suspender-origi/ahmkjjgdligadogjedmnogbpbcpofeeo?hl=en-US)
- [Tiny Suspender](https://chrome.google.com/webstore/detail/tiny-suspender/bbomjaikkcabgmfaomdichgcodnaeecf?hl=en-US)
- [Auto Tab Discard](https://chrome.google.com/webstore/detail/auto-tab-discard/jhnleheckmknfcgijgkadoemagpecfol?hl=en-US)
- [Disable Content-Security-Policy](https://chrome.google.com/webstore/detail/disable-content-security/ieelmcmcagommplceebfedjlakkhpden)
- [Env Specific Favicon](https://github.com/Elliot67/env-specific-favicon)
