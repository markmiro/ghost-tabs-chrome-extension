type PoolItem =
  | {
      type: "TIMEOUT";
      id?: number;
    }
  | {
      type: "INTERVAL";
      id?: number;
    }
  | {
      type: "DOC_LISTENER";
      listenerType: string;
      listener: EventListener;
    };

export const pool = {
  items: [] as PoolItem[],
  setTimeout: (handler: () => void, timeout?: number) => {
    const id = setTimeout(() => {
      pool.clearTimer(id);
      handler();
    }, timeout);
    pool.items.push({ type: "TIMEOUT", id });
    return id;
  },
  setInterval: (handler: () => void, timeout?: number) => {
    const id = setInterval(handler, timeout);
    pool.items.push({ type: "INTERVAL", id });
    return id;
  },
  /** Cancel a timeout or interval from this pool. Ignores ids that are already gone (or 0). */
  clearTimer: (id: number) => {
    // Timeouts and intervals share one id space, so either clear works for both.
    clearInterval(id);
    pool.items = pool.items.filter(
      (item) => item.type === "DOC_LISTENER" || item.id !== id
    );
  },
  addDocListener: <K extends keyof DocumentEventMap>(
    listenerType: K,
    listener: (ev: DocumentEventMap[K]) => any
  ) => {
    document.addEventListener(listenerType, listener);
    pool.items.push({
      type: "DOC_LISTENER",
      listenerType,
      listener: listener as EventListener,
    });
  },
  clearAll: () => {
    for (const item of pool.items) {
      switch (item.type) {
        case "TIMEOUT":
          clearInterval(item.id);
          break;
        case "INTERVAL":
          clearInterval(item.id);
          break;
        case "DOC_LISTENER":
          document.removeEventListener(item.listenerType, item.listener);
          break;
      }
      pool.items = [];
    }
  },
};
