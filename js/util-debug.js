const warningPage = chrome.runtime.getURL("debug-pages-warning.html");

// Pages that test various icon stuff
export const TEST_PAGES = [
  warningPage,
  "http://localhost:3000/none",
  "http://localhost:3000/ico",
  "http://localhost:3000/svg",
  "http://localhost:3000/png-multiple",
  "http://localhost:3000/jpg-multiple",
];

// Sites that 
export const TEST_SITES = [
  warningPage,
  "https://example.com", // no icon
  "https://github.com/site-map", // svg icon
];

// Sites that have CSP issues with updating the icon.
// Require fixing content-security-policy headers.
export const CSP_SITES = [
  warningPage,
  "https://news.ycombinator.com",
];

// https://en.wikipedia.org/wiki/List_of_most_visited_websites
export const POPULAR_SITES = [
  warningPage,
  "https://google.com",
  "https://youtube.com",
  "https://facebook.com",
  "https://twitter.com",
  "https://instagram.com",
  "https://wikipedia.org",
  "https://yahoo.com",
  "https://whatsapp.com",
  "https://amazon.com",
  "https://live.com",
  "https://netflix.com",
  "https://reddit.com",
  // "https://linkedin.com",
  // "https://vk.com",
  "https://weather.com",
  "https://duckduckgo.com",
  "https://microsoft.com",
  "https://quora.com",
  "https://ebay.com",
  "https://msn.com",
  "https://booking.com",
];