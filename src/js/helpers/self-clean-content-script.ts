// self-clean-content-script.ts
import { log } from "./console.js";
import { pool } from "./pool.js";
import { ping } from "./util.js";
import { domConflictCheck } from "./dom-conflict-check.js";

/** How often we check to see if extension uninstalled */
const PING_INTERVAL_MIN = 1 / 10;

/**
 * After extension is uninstalled, this script will ensure the `cb` return function is called.
 * Anything using the `pool` will clean itself so you don't need to clean those up yourself.
 * The idea is that the content script should not leave anything behind once it's done.
 * @param cb
 */
export async function selfClean(
  cb: (p: typeof pool) => Promise<(reason: CleanupReason) => void>
) {
  const cleanup = await cb(pool);
  // A newer content script has claimed the page. It isn't enough to just stop: whatever
  // this script does on the way out lands on top of what the new one has already drawn.
  const conflictCleanup = domConflictCheck(() => reset("SUPERSEDED"));

  let hasReset = false;
  function reset(reason: CleanupReason) {
    // The conflict observer and the ping can both decide it's time to go.
    if (hasReset) return;
    hasReset = true;
    log("----CLEAN UP!----", reason);
    cleanup(reason);
    conflictCleanup();
    pool.clearAll();
  }

  async function pingBackground() {
    // If this fails, it means the extension is uninstalled.
    const res = await ping();
    log("PING RESPONSE", res);
    if (!res.ok) {
      reset("EXTENSION_GONE");
    }
  }

  pool.setInterval(pingBackground, 1000 * 60 * PING_INTERVAL_MIN);
  pool.addDocListener("visibilitychange", pingBackground);
}
