// End-to-end checks against a real Chromium with the built extension loaded.
//
//   pnpm e2e                         build, then run headless
//   HEADED=1 pnpm e2e:run            watch it happen in a visible window
//   EXTENSION_DIR=/path pnpm e2e:run test some other build (e.g. another branch)
//
// The oracle is `tab.favIconUrl`: the exact image Chrome draws in the tab strip. Its pixels are
// decoded in the service worker, so the checks don't depend on screen capture or the OS theme.
import assert from "node:assert/strict";
import path from "node:path";
import { after, before, beforeEach, describe, it } from "node:test";
import { launch, sleep, startServer, waitFor } from "./harness.mjs";
import { createRecorder } from "./report.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const EXTENSION_DIR = path.resolve(
  process.env.EXTENSION_DIR ?? path.join(ROOT, "build")
);
const ARTIFACTS_DIR = path.resolve(
  process.env.E2E_ARTIFACTS_DIR ??
    path.join(
      ROOT,
      "e2e",
      "artifacts",
      new Date().toISOString().replace(/[:.]/g, "-")
    )
);

// Mirrors `defaultOptions` in src/js/background.ts.
const DEFAULT_OPTIONS = {
  enabled: true,
  showUnreadBadge: true,
  enableFading: true,
  fadeHalfLife: 60 * 60 * 1000,
  minFavIconOpacity: 0.1,
  fadeTimeToReset: 1000,
};

const FAVICON_PAGES = [
  "ico",
  "ico-and-png",
  "ico-and-svg",
  "ico16-and-png32",
  "ico16-and-svg",
  "ico-with-sizes16-and-png",
  "ico-with-sizes16-and-svg",
  "jpg-multiple",
  "png-multiple",
  "svg",
  "svg-with-dark",
  "none",
];

const hasBadge = (s) => s.isDataUrl && s.stats?.blueFraction > 0.03;
const isOriginal = (s) => !!s.favIconUrl && !s.isDataUrl;

let browser;
let server;
const recorder = createRecorder();

async function tabState(tabId) {
  return browser.sw((id) => __e2e.tabState(id), tabId);
}

async function openTab(page, { active = false, pinned = false } = {}) {
  const tabId = await browser.sw(
    async (url, active, pinned) =>
      (await chrome.tabs.create({ url, active, pinned })).id,
    `${server.origin}/${page}.html`,
    active,
    pinned
  );
  // The content script marks <html data-gtce-id> once it has started.
  await waitFor(async () => (await tabState(tabId)).page?.contentScriptId, {
    label: `content script in ${page}.html`,
  });
  return tabId;
}

const activate = (tabId) =>
  browser.sw((id) => chrome.tabs.update(id, { active: true }), tabId);
const sendToTab = (tabId, message) =>
  browser.sw((id, m) => chrome.tabs.sendMessage(id, m), tabId, message);
const setOptions = (patch) =>
  browser.sw(async (patch) => {
    const { options } = await chrome.storage.local.get("options");
    await chrome.storage.local.set({ options: { ...options, ...patch } });
  }, patch);

async function waitForIcon(
  tabId,
  predicate,
  { label, scenario, timeout = 8000 }
) {
  let last;
  try {
    return await waitFor(
      async () => {
        last = await tabState(tabId);
        return predicate(last) && last;
      },
      { label, timeout, interval: 150 }
    );
  } finally {
    if (last && scenario) recorder.add(scenario, label, last);
  }
}

/** Ask the content script to render the icon at `amount` opacity and wait until Chrome shows it. */
async function renderFade(tabId, amount, scenario) {
  const before = (await tabState(tabId)).favIconUrl;
  await sendToTab(tabId, { action: "DEBUG.FADE_AMOUNT", fadeAmount: amount });
  return waitForIcon(
    tabId,
    (s) => s.isDataUrl && s.stats && s.favIconUrl !== before,
    {
      label: `fade ${amount}`,
      scenario,
    }
  ).catch(async () => {
    // Same bytes as before (e.g. re-rendering the same amount) is fine too.
    const s = await tabState(tabId);
    assert.ok(
      s.isDataUrl && s.stats,
      `expected a rendered data: icon after fade ${amount}`
    );
    return s;
  });
}

before(async () => {
  server = await startServer(path.join(ROOT, "test-favicon-pages"));
  browser = await launch({
    extensionDir: EXTENSION_DIR,
    headed: !!process.env.HEADED,
  });
});

after(async () => {
  const dir = recorder.write(ARTIFACTS_DIR, {
    extensionDir: EXTENSION_DIR,
    frames: recorder.frames.length,
  });
  console.log(`filmstrip: ${path.join(dir, "filmstrip.html")}`);
  await browser?.close();
  await server?.close();
});

beforeEach(async () => {
  // Each test starts from default options with a single fresh foreground tab.
  await browser.sw(async (opts) => {
    await chrome.storage.local.set({ options: opts });
    const stale = await chrome.tabs.query({
      url: ["http://*/*", "https://*/*"],
    });
    await chrome.tabs.create({ url: "about:blank", active: true });
    if (stale.length) await chrome.tabs.remove(stale.map((t) => t.id));
  }, DEFAULT_OPTIONS);
});

describe("install", () => {
  it("background answers PING from a content script context", async () => {
    const tabId = await openTab("png-multiple", { active: true });
    const [{ result }] = await browser.sw(
      (id) =>
        chrome.scripting.executeScript({
          target: { tabId: id },
          func: () => chrome.runtime.sendMessage({ action: "PING" }),
        }),
      tabId
    );
    assert.ok(
      !Number.isNaN(Date.parse(result)),
      `PING should return an ISO timestamp, got ${result}`
    );
  });
});

describe("unread badge and fading, per favicon type", () => {
  for (const page of FAVICON_PAGES) {
    it(page, async () => {
      const scenario = `favicon: ${page}`;
      await openTab("png-multiple", { active: true });

      // A tab opened in the background is unread: grayed icon with a blue dot.
      const tabId = await openTab(page, { active: false });
      const unread = await waitForIcon(tabId, hasBadge, {
        label: "opened in background",
        scenario,
      });
      assert.equal(unread.page.visibilityState, "hidden");

      // Looking at it clears the badge, but only after `fadeTimeToReset` (1s by default).
      await activate(tabId);
      await sleep(300);
      const stillUnread = await tabState(tabId);
      recorder.add(scenario, "activated +0.3s", stillUnread);
      assert.ok(
        hasBadge(stillUnread),
        "badge should survive until fadeTimeToReset elapses"
      );
      const read = await waitForIcon(tabId, (s) => !hasBadge(s), {
        label: "read",
        scenario,
      });
      assert.equal(read.page.visibilityState, "visible");
      if (page !== "none")
        assert.ok(isOriginal(read), "page's own favicon should be restored");

      // The fade pipeline (content script -> background canvas -> <link> swap) scales opacity and
      // drains colour. Baseline is the same pipeline at 100%, which also works for SVGs.
      const full = await renderFade(tabId, 1, scenario);
      const half = await renderFade(tabId, 0.5, scenario);
      const tenth = await renderFade(tabId, 0.1, scenario);
      const ratio = (s) => s.stats.alpha / full.stats.alpha;
      assert.ok(
        Math.abs(ratio(half) - 0.5) < 0.08,
        `50% fade gave alpha ratio ${ratio(half).toFixed(3)}`
      );
      assert.ok(
        Math.abs(ratio(tenth) - 0.1) < 0.05,
        `10% fade gave alpha ratio ${ratio(tenth).toFixed(3)}`
      );
      assert.ok(
        half.stats.saturation <= full.stats.saturation,
        "fading should not add colour"
      );
      assert.ok(
        tenth.stats.saturation <= half.stats.saturation,
        "fading should not add colour"
      );
    });
  }
});

describe("animated fade", () => {
  it("DEBUG.START visibly fades the tab icon step by step, DEBUG.STOP restores it", async () => {
    const scenario = "DEBUG.START / DEBUG.STOP";
    const tabId = await openTab("png-multiple", { active: true });
    const full = await renderFade(tabId, 1, scenario);

    await sendToTab(tabId, { action: "DEBUG.START" });
    const alphas = [];
    for (let i = 0; i < 12; i++) {
      await sleep(250);
      const s = await tabState(tabId);
      if (s.stats && alphas.at(-1) !== s.stats.alpha) {
        alphas.push(s.stats.alpha);
        recorder.add(scenario, `frame ${alphas.length}`, s);
      }
    }
    for (let i = 1; i < alphas.length; i++) {
      assert.ok(
        alphas[i] < alphas[i - 1],
        `alpha should only go down: ${alphas.map((a) => a.toFixed(3)).join(" → ")}`
      );
    }
    assert.ok(
      alphas.length >= 4,
      `expected at least 4 distinct fade steps, saw ${alphas.length}`
    );
    assert.ok(
      alphas.at(-1) < full.stats.alpha * 0.1,
      `icon should be nearly invisible, alpha ${alphas.at(-1)}`
    );

    await sendToTab(tabId, { action: "DEBUG.STOP" });
    const restored = await waitForIcon(
      tabId,
      (s) => s.stats && Math.abs(s.stats.alpha - full.stats.alpha) < 0.02,
      {
        label: "stopped",
        scenario,
      }
    );
    assert.ok(restored.stats.saturation > 0.3, "colour should be back");
  });
});

describe("popup actions", () => {
  it("MARK_UNREAD badges the tab and MARK_READ restores it", async () => {
    const scenario = "mark unread / read";
    const tabId = await openTab("ico", { active: true });
    await sendToTab(tabId, { action: "MARK_UNREAD" });
    await waitForIcon(tabId, hasBadge, { label: "marked unread", scenario });
    await sendToTab(tabId, { action: "MARK_READ" });
    await waitForIcon(tabId, isOriginal, { label: "marked read", scenario });
  });

  it("popup reflects stored options and writes changes back", async () => {
    await browser.sw(
      (id) =>
        chrome.tabs.create({
          url: `chrome-extension://${id}/popup.html`,
          active: true,
        }),
      browser.extensionId
    );
    const shown = await browser.extensionPage("popup.html", async () => {
      // Wait for popup.ts to fill the form from storage.
      for (
        let i = 0;
        i < 50 && !document.getElementById("fadeHalfLifeTitle")?.innerText;
        i++
      ) {
        await new Promise((r) => setTimeout(r, 100));
      }
      const form = document.getElementById("js-options-form");
      return {
        halfLife: document.getElementById("fadeHalfLifeTitle").innerText,
        minOpacity: document.getElementById("minFavIconOpacityTitle").innerText,
        reset: document.getElementById("fadeTimeToResetTitle").innerText,
        showUnreadBadge: form.showUnreadBadge.checked,
        enableFading: form.enableFading.checked,
      };
    });
    assert.deepEqual(shown, {
      halfLife: "1 hour",
      minOpacity: "10%",
      reset: "1 second",
      showUnreadBadge: true,
      enableFading: true,
    });

    await browser.extensionPage("popup.html", () => {
      const form = document.getElementById("js-options-form");
      form.fadeHalfLife.value = "0";
      form.fadeHalfLife.dispatchEvent(new Event("input"));
      form.showUnreadBadge.click();
    });
    const { options } = await waitFor(
      async () => {
        const data = await browser.sw(() =>
          chrome.storage.local.get("options")
        );
        return data.options.fadeHalfLife === 3000 && data;
      },
      { label: "popup to save options" }
    );
    assert.equal(options.showUnreadBadge, false);
  });
});

describe("options", () => {
  it("pinned background tabs keep their original icon", async () => {
    const scenario = "pinned tab";
    await openTab("png-multiple", { active: true });
    const tabId = await openTab("ico", { active: false, pinned: true });
    await sleep(2500);
    const s = await tabState(tabId);
    recorder.add(scenario, "pinned, background 2.5s", s);
    assert.ok(
      isOriginal(s),
      `expected the page's own icon, got ${s.favIconUrl.slice(0, 60) || "(none)"}`
    );
  });

  it("showUnreadBadge=false leaves background tabs untouched", async () => {
    const scenario = "showUnreadBadge=false";
    await setOptions({ showUnreadBadge: false });
    await openTab("png-multiple", { active: true });
    const tabId = await openTab("ico", { active: false });
    await sleep(2000);
    const s = await tabState(tabId);
    recorder.add(scenario, "background 2s", s);
    assert.ok(!hasBadge(s), "no badge expected");
  });
});

// Behaviour the UI promises that the currently loaded content script (content-script-module.ts)
// doesn't implement. Marked `todo` so they're reported on every run without failing it; drop the
// `todo` once the feature lands.
describe("known gaps", () => {
  it(
    "a hidden tab fades over time following fadeHalfLife",
    {
      todo: "time-based fading lives in content-script.ts, which the manifest no longer loads",
    },
    async () => {
      const scenario = "time-based fade (3s half-life)";
      await setOptions({
        fadeHalfLife: 3000,
        minFavIconOpacity: 0,
        fadeTimeToReset: 0,
      });
      const tabId = await openTab("png-multiple", { active: true });
      const start = await tabState(tabId);
      recorder.add(scenario, "visible", start);
      await openTab("ico", { active: true }); // pushes the first tab into the background
      let last;
      for (let i = 1; i <= 4; i++) {
        await sleep(2000);
        last = await tabState(tabId);
        recorder.add(scenario, `hidden ${i * 2}s`, last);
      }
      // After 8s at a 3s half-life, freshness is ~16%. Allow lots of slack.
      assert.ok(
        last.isDataUrl && last.stats.alpha < start.stats.alpha * 0.5,
        `alpha ${last.stats?.alpha} after 8s hidden`
      );
    }
  );

  it(
    "Turn Off (enabled=false) resets every faded or unread icon",
    { todo: "content-script-module.ts ignores options.enabled" },
    async () => {
      const scenario = "turn off";
      await openTab("png-multiple", { active: true });
      const tabId = await openTab("ico", { active: false });
      await waitForIcon(tabId, hasBadge, { label: "unread", scenario });
      await setOptions({ enabled: false });
      await waitForIcon(tabId, isOriginal, {
        label: "after turn off",
        scenario,
        timeout: 4000,
      });
    }
  );
});
