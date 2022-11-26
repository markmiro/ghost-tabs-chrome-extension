import { emoji } from "./console.js";

const id = emoji;

const DATA_GTCE = {
  id: "data-gtce-id",
};

const $html = document.getElementsByTagName("html")[0];
$html.setAttribute(DATA_GTCE.id, id);

export function conflictCheck(cb: () => void) {
  const observer = new MutationObserver((mutationList) => {
    for (const mutation of mutationList) {
      if (mutation.type === "attributes") {
        const newId = (mutation.target as HTMLHtmlElement).getAttribute(
          DATA_GTCE.id
        );
        if (newId !== id) {
          cb();
        }
      }
    }
  });

  observer.observe($html, { attributes: true });

  return () => {
    observer.disconnect();
  };
}
