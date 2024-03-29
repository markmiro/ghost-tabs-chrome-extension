# TODO

## Bugs

- When window is re-opened, tab icon is just the globe for lots of the tabs.
- Make sure `selfClean` doesn't create a race condition
  - After reloading extension, old content script will try to reset favicon back to normal
  - Maybe inject an inject ts into the dom
    - and `selfClean` will check if timestamp of the script matches the timestamp in the dom
      - if no match, then it avoids manipulating the dom
      - maybe do this at a lower level (dom-utils)?

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
