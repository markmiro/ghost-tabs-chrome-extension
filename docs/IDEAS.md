How freshness could be calculated:

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
