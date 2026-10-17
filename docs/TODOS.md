# TODO

## Bugs

None open.

Fixed:

- ~~When window is re-opened, tab icon is just the globe for lots of the tabs.~~
  Chrome only resolves favicons for tabs it renders, so `GET_FAVICONURL` came back
  empty for every restored background tab. `getFaviconUrl` now falls back to the
  page's own `<link rel=icon>` instead of returning "" and forcing the globe.
- ~~Make sure `selfClean` doesn't create a race condition.~~ The marker in the DOM
  already existed (`dom-conflict-check`), but the superseded script still ran its
  full cleanup and put the original favicon back over the new script's icon.
  Cleanup now takes a reason, and `releaseDom()` latches a flag in `util-dom` so
  in-flight work can't write to the page either — the lower-level guard this note
  was asking about.

---

## Features

- Disable fading for specified tabs

Polish:

- Add context menu to page with options
  - Turn off for <website-origin> (checkbox)
  - Turn off for current tab (checkbox)
  - Mark unread (checkbox)
- handle discarded tabs? Some tabs might be `autoDiscardable`. (https://developer.chrome.com/docs/extensions/reference/tabs/#property-Tab-discarded)
- Don't load content script on pinned tabs
- Add cache of favicons for faster loading

Features:

- Show CSP error in popup.js by sending CSP error to tab, and then displaying it back later.
  - Maybe show a message asking if user wants to enable working on more tabs, but using more permissions
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
- overnight, expire all tabs (show red?)

Refactor:

- Split up code based on criteria
  - background
  - content-script
  - popup? (not sure if this code should be included with content-scripts as part of a "dom" group)
  - shared
