declare interface Options {
  enabled?: boolean;
  showUnreadBadge?: boolean;
  enableFading?: boolean;
  // TODO: get specific numbers for the type
  fadeHalfLife?: number;
  minFavIconOpacity?: number;
  fadeTimeToReset?: number;
}

/** Why a content script is shutting down. */
declare type CleanupReason =
  /** The extension was uninstalled, disabled, or reloaded. Put the page back as we found it. */
  | "EXTENSION_GONE"
  /** A newer copy of this script took over the page. It owns the DOM now — hands off. */
  | "SUPERSEDED";

/** What the popup shows when a tab isn't behaving the way the options say it should. */
declare interface TabStatus {
  /** The page's CSP refused our `data:` favicon, so this tab can't be faded. */
  isDataUrlBlocked: boolean;
  favIconUrl: string;
}

declare type MessageRequest =
  | { action: "MARK_UNREAD" }
  | { action: "MARK_READ" }
  | { action: "GET_STATUS" }
  | { action: "DEBUG.FADE" }
  | { action: "DEBUG.FADE_AMOUNT"; fadeAmount: number }
  | { action: "DEBUG.UNFADE" }
  | { action: "DEBUG.PLAY_FADE" }
  | { action: "DEBUG.START" }
  | { action: "DEBUG.STOP" }
  | { action: "DEBUG.PRINT_VARS" };