TODO:

- Fix bug with fade options showing if popup opened when fading is disabled
- Make extension leave no trace
  - On visibility hidden, or any background function call, we want to check if we can communicate with background script. If not, we clean up the content script.
- Disable fading for specified tabs
- Pause tab fading?
- Don't reset preferences on each install
- Does it work with SPAs?
- Create a JSON or JS file for all the constants and strings

---

- Create page context menu with options

  - fade current tab checkbox
  - toggle unread state

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
