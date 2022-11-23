declare interface Options {
  enabled?: boolean;
  showUnreadBadge?: boolean;
  enableFading?: boolean;
  // TODO: get specific numbers for the type
  fadeHalfLife?: number;
  minFavIconOpacity?: number;
  fadeTimeToReset?: number;
}

declare type MessageRequest =
  | { action: "MARK_UNREAD" }
  | { action: "MARK_READ" }
  | { action: "DEBUG.FADE" }
  | { action: "DEBUG.UNFADE" }
  | { action: "DEBUG.PLAY_FADE" }
  | { action: "DEBUG.START" }
  | { action: "DEBUG.STOP" }
  | { action: "DEBUG.PRINT_VARS" };