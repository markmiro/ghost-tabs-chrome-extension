TODO:

- Test with svg favicons
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
  - [x] Move inactive tabs left
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

- https://stackoverflow.com/a/45974139
- https://groups.google.com/a/chromium.org/g/chromium-extensions/c/qS1rVpQVl8o
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

Implementation notes:

- Content security policy on many websites means I can't change the icon, because they have a header in the HTML file returned that is like: `Content-Security-Policy: img-src 'self'`.
- In manifest.json
  - `"action": {},` is blank because otherwise `action.onClicked` doesn't work.
  - `"permissions": ["activeTab"],` allows sending messages from background tab to content script.
- `chrome.action.onClicked.addListener` doesn't work if there is a default popup.
- Rules added to a page via `updateSessionRules` aren't easily removed. You may need to restart the browser, or remove the extension.

Similar extensions:

- [Tab Hibernate](https://chrome.google.com/webstore/detail/tab-hibernate/ammlihljcndoijbkoobiobhjgoopiidn?hl=en-US)
- [The Great Suspender Original](https://chrome.google.com/webstore/detail/the-great-suspender-origi/ahmkjjgdligadogjedmnogbpbcpofeeo?hl=en-US)
- [Tiny Suspender](https://chrome.google.com/webstore/detail/tiny-suspender/bbomjaikkcabgmfaomdichgcodnaeecf?hl=en-US)
- [Auto Tab Discard](https://chrome.google.com/webstore/detail/auto-tab-discard/jhnleheckmknfcgijgkadoemagpecfol?hl=en-US)
- [Disable Content-Security-Policy](https://chrome.google.com/webstore/detail/disable-content-security/ieelmcmcagommplceebfedjlakkhpden)

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
