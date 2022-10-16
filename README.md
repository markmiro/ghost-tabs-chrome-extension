TODO:

- Replace default.ico with the earth icon that Chrome uses
- Inject content script into each pagee
  - It runs a countdown timer every time page becomes inactive
  - It updates the favicon using the favicon from the background.js web worker
- Send the favicon to the content script
- Create a little badge that appears orange and turns red over time?
- Store image in a way that's easy to copy modify it, and then update the favicon

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
- [When do Chrome extensions cause CSP reports?](https://www.debugbear.com/blog/chrome-extension-csp-error-noise#:~:text=A%20Content%20Security%20Policy%20(CSP,or%20block%20inline%20script%20tags.)
- [The img-src Directive](https://content-security-policy.com/img-src/)
- [Content security policy (web.dev)](https://web.dev/csp)
- [
  Disable-Content-Security-Policy
  extension source](https://github.com/WithoutHair/Disable-Content-Security-Policy)

Considerations:

- Tab suspenders can set the tab icon because they control the page. But what if the page is not under my control?
- I shouldn't need to get access to each page, but maybe there's no other way around it?
- TabSuspender is the big one, but made by some guy in Russia? Also source isn't on github.
  - https://chrome.google.com/webstore/detail/tab-suspender/fiabciakcmgepblmdkmemdbbkilneeeh
- Chrome has an upcoming favicon API, but it seems buggy and not fully featured?

Implementation notes:

- Content security policy on many websites means I can't change the icon, because they have a header in the HTML file returned that is like: `Content-Security-Policy: img-src 'self'`.
- In manifest.json
  - `"action": {},` is blank because otherwise `action.onClicked` doesn't work.
  - `"permissions": ["activeTab"],` allows sending messages from background tab to content script.
- `chrome.action.onClicked.addListener` doesn't work if there is a default popup.
-

Similar extensions:

- [Tab Hibernate](https://chrome.google.com/webstore/detail/tab-hibernate/ammlihljcndoijbkoobiobhjgoopiidn?hl=en-US)
- [The Great Suspender Original](https://chrome.google.com/webstore/detail/the-great-suspender-origi/ahmkjjgdligadogjedmnogbpbcpofeeo?hl=en-US)
- [Tiny Suspender](https://chrome.google.com/webstore/detail/tiny-suspender/bbomjaikkcabgmfaomdichgcodnaeecf?hl=en-US)
- [Auto Tab Discard](https://chrome.google.com/webstore/detail/auto-tab-discard/jhnleheckmknfcgijgkadoemagpecfol?hl=en-US)
- [Disable Content-Security-Policy
  ](https://chrome.google.com/webstore/detail/disable-content-security/ieelmcmcagommplceebfedjlakkhpden)

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