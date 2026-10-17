// @vitest-environment jsdom
// @vitest-environment-options {"url": "https://example.com/blog/post.html"}
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type UtilDom = typeof import("../src/js/helpers/util-dom.js");

/** A fresh copy of util-dom, so `releaseDom()` in one test doesn't leak into the next. */
async function loadUtilDom(): Promise<UtilDom> {
  vi.resetModules();
  return import("../src/js/helpers/util-dom.js");
}

function ourIconHref() {
  return document.querySelector<HTMLLinkElement>("#gtce-icon")?.href;
}

beforeEach(() => {
  document.head.innerHTML = "";
  // Chrome hasn't resolved a favicon for this tab, as with a tab restored in the background.
  vi.stubGlobal("chrome", {
    runtime: { sendMessage: vi.fn().mockResolvedValue("") },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("releaseDom", () => {
  it("setFavicon draws our icon while this script owns the page", async () => {
    const { setFavicon } = await loadUtilDom();
    setFavicon("data:image/png;base64,FADED");
    expect(ourIconHref()).toBe("data:image/png;base64,FADED");
  });

  it("stops a superseded script from drawing over the new one", async () => {
    const { releaseDom, setFavicon } = await loadUtilDom();
    // The new script's icon is already on the page.
    setFavicon("data:image/png;base64,NEW");
    releaseDom();
    // A fade the old script started before the takeover finishes now.
    setFavicon("data:image/png;base64,OLD");
    expect(ourIconHref()).toBe("data:image/png;base64,NEW");
  });

  it("stops a superseded script from resetting the icon", async () => {
    const { releaseDom, resetIcon, setFavicon } = await loadUtilDom();
    setFavicon("data:image/png;base64,NEW");
    releaseDom();
    await resetIcon("https://example.com/favicon.ico");
    expect(ourIconHref()).toBe("data:image/png;base64,NEW");
  });
});

describe("getFaviconUrl", () => {
  /** Run `getFaviconUrl` past all of its retries. */
  async function resolveWithoutChrome(utilDom: UtilDom) {
    vi.useFakeTimers();
    const url = utilDom.getFaviconUrl();
    await vi.runAllTimersAsync();
    return url;
  }

  it("falls back to the page's own icon link when Chrome doesn't name one", async () => {
    document.head.innerHTML = `<link rel="icon" href="img/icon.png">`;
    const url = await resolveWithoutChrome(await loadUtilDom());
    // Relative to the page's path, not just its origin.
    expect(url).toBe("https://example.com/blog/img/icon.png");
  });

  it("reads the stashed href once we've blanked the page's link", async () => {
    document.head.innerHTML = `<link rel="icon" href="" data-gtce-href="/favicon.png">`;
    const url = await resolveWithoutChrome(await loadUtilDom());
    expect(url).toBe("https://example.com/favicon.png");
  });

  it("uses Chrome's answer when it has one", async () => {
    document.head.innerHTML = `
      <link rel="icon" href="/small.png">
      <link rel="icon" href="/large.png">`;
    vi.stubGlobal("chrome", {
      runtime: {
        sendMessage: vi.fn().mockResolvedValue("https://example.com/large.png"),
      },
    });
    const url = await (await loadUtilDom()).getFaviconUrl();
    expect(url).toBe("https://example.com/large.png");
  });
});
