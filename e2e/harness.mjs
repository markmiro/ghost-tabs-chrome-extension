// Drives a real Chromium with the unpacked extension loaded.
//
// Playwright's page automation forces every page to report `document.visibilityState === "visible"`,
// which hides exactly the behavior this extension depends on (background tabs). So we only use
// `playwright-core` to locate the Chromium binary, launch it ourselves, and talk raw CDP to the
// extension's service worker. Pages are never attached to, so tab visibility stays real.
// Everything else goes through extension APIs (`chrome.tabs`, `chrome.scripting`), like a user would.
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright-core";

const MIME = {
  ".html": "text/html",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
};

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function waitFor(
  fn,
  { timeout = 10_000, interval = 100, label = "condition" } = {},
) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeout) {
    try {
      last = await fn();
      if (last) return last;
    } catch (err) {
      last = err;
    }
    await sleep(interval);
  }
  throw new Error(
    `Timed out after ${timeout}ms waiting for ${label}. Last value: ${String(last)}`,
  );
}

/** Static server for `test-favicon-pages` (replaces the `serve` global the README asks for). */
export async function startServer(root) {
  const server = http.createServer((req, res) => {
    const filePath = path.join(
      root,
      decodeURIComponent(new URL(req.url, "http://x").pathname),
    );
    if (
      !filePath.startsWith(root) ||
      !fs.existsSync(filePath) ||
      fs.statSync(filePath).isDirectory()
    ) {
      res.writeHead(404);
      return res.end();
    }
    res.writeHead(200, {
      "content-type":
        MIME[path.extname(filePath)] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    fs.createReadStream(filePath).pipe(res);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((r) => server.close(r)),
  };
}

class Cdp {
  #ws;
  #nextId = 1;
  #pending = new Map();

  static async connect(url) {
    const cdp = new Cdp();
    cdp.#ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      cdp.#ws.onopen = resolve;
      cdp.#ws.onerror = reject;
    });
    cdp.#ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      const handlers = cdp.#pending.get(data.id);
      if (!handlers) return;
      cdp.#pending.delete(data.id);
      if (data.error)
        handlers.reject(
          new Error(`${data.error.message} (${data.error.code})`),
        );
      else handlers.resolve(data.result);
    };
    return cdp;
  }

  send(method, params = {}, sessionId) {
    const id = this.#nextId++;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.#ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }

  close() {
    this.#ws.close();
  }
}

/**
 * @param {{ extensionDir: string, headed?: boolean }} opts
 */
export async function launch({ extensionDir, headed = false }) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ghost-tabs-e2e-"));
  const proc = spawn(
    chromium.executablePath(),
    [
      `--user-data-dir=${userDataDir}`,
      "--remote-debugging-port=0",
      "--no-first-run",
      "--no-default-browser-check",
      // Without this, Chromium asks the macOS login keychain for "Chromium Safe Storage" and pops a
      // password prompt on every launch. Playwright passes it too; we launch Chromium ourselves.
      "--use-mock-keychain",
      "--password-store=basic",
      "--disable-background-networking",
      "--disable-component-update",
      // Keep background tabs' timers running at normal speed so fade timing is predictable.
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
      `--disable-extensions-except=${extensionDir}`,
      `--load-extension=${extensionDir}`,
      ...(headed ? ["--window-size=1100,700"] : ["--headless"]),
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  // Don't leave a browser behind if the test process dies or gets killed mid-run.
  const killBrowser = () => proc.exitCode === null && proc.kill("SIGKILL");
  process.once("exit", killBrowser);
  for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"])
    process.once(sig, () => process.exit(130));
  let stderr = "";
  proc.stderr.on("data", (d) => (stderr = (stderr + d).slice(-4000)));

  const portFile = path.join(userDataDir, "DevToolsActivePort");
  const port = await waitFor(
    () =>
      fs.existsSync(portFile) &&
      fs.readFileSync(portFile, "utf8").split("\n")[0],
    {
      label: `Chromium to start (stderr: ${stderr})`,
    },
  );
  const { webSocketDebuggerUrl } = await (
    await fetch(`http://127.0.0.1:${port}/json/version`)
  ).json();
  const cdp = await Cdp.connect(webSocketDebuggerUrl);

  const swTarget = await waitFor(
    async () => {
      const { targetInfos } = await cdp.send("Target.getTargets");
      return targetInfos.find(
        (t) =>
          t.type === "service_worker" && t.url.endsWith("/js/background.js"),
      );
    },
    { label: "extension service worker" },
  );
  const extensionId = new URL(swTarget.url).host;
  const { sessionId } = await cdp.send("Target.attachToTarget", {
    targetId: swTarget.targetId,
    flatten: true,
  });

  /** Run `fn(...args)` inside the extension service worker and return its (JSON) result. */
  async function sw(fn, ...args) {
    const { result, exceptionDetails } = await cdp.send(
      "Runtime.evaluate",
      {
        expression: `(globalThis.__e2e ??= (${WORKER_HELPERS})(), (${fn})(...${JSON.stringify(args)}))`,
        awaitPromise: true,
        returnByValue: true,
      },
      sessionId,
    );
    if (exceptionDetails) {
      throw new Error(
        exceptionDetails.exception?.description ?? exceptionDetails.text,
      );
    }
    return result.value;
  }

  // The worker target shows up before `chrome.*` is bound and before `onInstalled` writes defaults.
  await waitFor(
    () =>
      sw(
        async () =>
          !!globalThis.chrome?.storage &&
          "options" in (await chrome.storage.local.get("options")),
      ),
    {
      label: "extension to install default options",
    },
  );

  /**
   * Run `fn(...args)` in an extension page (e.g. `popup.html`). Only use this for the extension's own
   * pages: attaching CDP to a web page would make it report itself as visible.
   */
  async function extensionPage(pagePath, fn, ...args) {
    const url = `chrome-extension://${extensionId}/${pagePath}`;
    const target = await waitFor(
      async () =>
        (await cdp.send("Target.getTargets")).targetInfos.find(
          (t) => t.type === "page" && t.url.startsWith(url),
        ),
      { label: `extension page ${pagePath}` },
    );
    const { sessionId: pageSession } = await cdp.send("Target.attachToTarget", {
      targetId: target.targetId,
      flatten: true,
    });
    try {
      const { result, exceptionDetails } = await cdp.send(
        "Runtime.evaluate",
        {
          expression: `(${fn})(...${JSON.stringify(args)})`,
          awaitPromise: true,
          returnByValue: true,
        },
        pageSession,
      );
      if (exceptionDetails)
        throw new Error(
          exceptionDetails.exception?.description ?? exceptionDetails.text,
        );
      return result.value;
    } finally {
      await cdp
        .send("Target.detachFromTarget", { sessionId: pageSession })
        .catch(() => {});
    }
  }

  async function close() {
    cdp.close();
    proc.kill("SIGTERM");
    await Promise.race([new Promise((r) => proc.once("exit", r)), sleep(5000)]);
    killBrowser();
    process.off("exit", killBrowser);
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }

  return { sw, extensionPage, extensionId, close, pid: proc.pid };
}

/**
 * Installed in the service worker as `globalThis.__e2e`. Serialized with `toString()`, so it can't
 * close over anything from this module.
 */
const WORKER_HELPERS = function () {
  /** Pixel stats for a favicon URL as Chrome shows it in the tab strip. */
  async function iconStats(url) {
    if (!url) return null;
    const blob = await (await fetch(url)).blob();
    const bmp = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bmp.width, bmp.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bmp, 0, 0);
    const { data } = ctx.getImageData(0, 0, bmp.width, bmp.height);
    let alpha = 0;
    let sat = 0;
    let blue = 0;
    const n = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
      alpha += a;
      sat += (Math.max(r, g, b) - Math.min(r, g, b)) * (a / 255);
      // The unread badge is #3478F6.
      if (
        a > 200 &&
        Math.abs(r - 0x34) < 40 &&
        Math.abs(g - 0x78) < 40 &&
        Math.abs(b - 0xf6) < 40
      )
        blue++;
    }
    return {
      width: bmp.width,
      height: bmp.height,
      alpha: alpha / n / 255,
      saturation: sat / n / 255,
      blueFraction: blue / n,
    };
  }

  /** What Chrome reports for a tab, plus what the page itself looks like. */
  async function tabState(tabId) {
    const tab = await chrome.tabs.get(tabId);
    let page = null;
    try {
      const [res] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => ({
          visibilityState: document.visibilityState,
          contentScriptId:
            document.documentElement.getAttribute("data-gtce-id"),
          hasInjectedIcon: !!document.getElementById("gtce-icon"),
        }),
      });
      page = res.result;
    } catch (err) {
      page = { error: String(err) };
    }
    return {
      id: tab.id,
      url: tab.url,
      active: tab.active,
      pinned: tab.pinned,
      status: tab.status,
      favIconUrl: tab.favIconUrl ?? "",
      isDataUrl: (tab.favIconUrl ?? "").startsWith("data:"),
      stats: await iconStats(tab.favIconUrl).catch(() => null),
      page,
    };
  }

  return { iconStats, tabState };
};
