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
  setTimeout: (handler: TimerHandler, timeout?: number) => {
    const id = setTimeout(handler, timeout);
    pool.items.push({ type: "TIMEOUT", id });
  },
  setInterval: (handler: TimerHandler, timeout?: number) => {
    const id = setInterval(handler, timeout);
    pool.items.push({ type: "INTERVAL", id });
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
