// self-clean-content-script.ts
import { log } from "./console.js";
import { pool } from "./pool.js";
import { ping } from "./util.js";

/** How often we check to see if extension uninstalled */
const PING_INTERVAL_MIN = 1 / 10;

/**
 * After extension is uninstalled, this script will ensure the `cb` return function is called.
 * Anything using the `pool` will clean itself so you don't need to clean those up yourself.
 * The idea is that the content script should not leave anything behind once it's done.
 * @param cb
 */
export async function selfClean(cb: (p: typeof pool) => Promise<() => void>) {
  const cleanup = await cb(pool);

  function reset() {
    cleanup();
    pool.clearAll();
  }

  async function pingBackground() {
    // If this fails, it means the extension is uninstalled.
    const res = await ping();
    log("PING RESPONSE", res);
    if (!res.ok) {
      reset();
    }
  }

  pool.setInterval(pingBackground, 1000 * 60 * PING_INTERVAL_MIN);
  pool.addDocListener("visibilitychange", pingBackground);
}
