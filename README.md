TODO:

- Split up code based on criteria
  - background
  - content-script
  - popup? (not sure if this code should be included with content-scripts as part of a "dom" group)
  - shared
- Inject content scripts programatically
  https://developer.chrome.com/docs/extensions/mv3/content_scripts/#functionality
  - This could make it easier to:
    - Update the extension
    - Avoid injecting content scripts into pinned tabs.
- favIconUrl is empty string when loading (https://developer.chrome.com/docs/extensions/reference/tabs/#property-Tab-favIconUrl)
- handle discarded tabs? Some tabs might be `autoDiscardable`. (https://developer.chrome.com/docs/extensions/reference/tabs/#property-Tab-discarded)
- Don't load content script on pinned tabs
- Outlook and Microsoft use this kind of pattern for favicons `.ico?v=4`
- Add cache of favicons for faster loading
- Show CSP error in popup.js by sending CSP error to tab, and then displaying it back later.

  - Maybe show a message asking if user wants to enable working on more tabs, but using more permissions

- [ ] Put all this in the content script
  - Request default
  - Fading and unfading
  - Detecting if the page is active
  - Storing history of whether the page is active
  - Potentially iterate through all icon links to find the favicon that actually gets used
    - But what if the svg is being used? How do I fade it?
    - May need to deal with data url favicons getting less priority and not updating
- [ ] Use spaced repetition curve for fading
- Add buttons:
  - [ ] Move inactive tabs left
  - [ ] Move inactive tabs right
- [ ] Measure time for fading out multiple tab icons (to determine if I need the idle permission).
- [ ] Keep track of original favicons
- [ ] on idle, go through all the tabs and modify the fade amount of the favicon
- [ ] overnight, expire all tabs (show red?)
- [ ] "use strict";
- [ ] Create a little badge that appears orange and turns red over time?
- [ ] Store image in a way that's easy to copy modify it, and then update the favicon

How freshness is calculated:

- when browser idle, freshness is not expiring
- overnight, all tabs expire
- scrolling on a tab and staying on it for 1+ min means it's fresh
- just opening a tab while tabbing through doesn't change freshness
- Maybe freshness naturally goes down. The basic idea is: is this tab still on your mind? Would you be upset if it went away? How upset would you be? But freshness can be boosted (sorted from smallest boost to biggest boost):
  - opened
  - opened for 1+ min
  - opened + scrolled
  - opened + clicked
  - opened + dragged
  - opened + copied text / pasted
- Track which tabs I close, and what their freshness stats are. This will make it easier to weight the different events on how they affect staleness (both in terms of weight, and decay function — is it linear decay or exponential?)
  - when opened
  - scroll events
  - open periods
  - click events
  - drag events (selecting text)
- Maybe try to predict likelihood of tab being closed (especially once it's opened?) and then use these probabilities

Features?

- Make icon red over time?
- Badge with hours inactive?
- Click icon to mark all the tabs / unmark them with freshness information
- Move stale tabs to one side
- Show staleness when opening popup
  - Show screenshots of all stale tabs so you can easily decide which to keep and which to delete
  - Close stale tabs in mass
    - Click to reset freshness
  - Click to reset freshness of all open tabs
- Fade out in stages: grayscale => opacity 50% => opacity 0% => orange => red
- Fade out marker stages: time badge => icon faded + time badge => badge blue => badge orange => badge red => icon and badge red

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

Keywords:

- Expiration
- Expire
- Sour
- Spoiled
- Fresh
- Freshness
- Inactive
- Stale
- Stale markers
- Hibernate
- Suspend
- Fade out
- Favicon
- Sleep
- Doze
- Rest
- Snooze
- Catnap
- Slumber
- Nap
- Ghost
- Discard
- Bin
