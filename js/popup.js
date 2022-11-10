import {
  fadeHalfLife,
  fadeTimeToReset,
  minFavIconOpacity,
} from "./fade-option-steps.js";

document.addEventListener("keypress", (e) => {
  if (e.key === "k") {
    window.location.assign(chrome.runtime.getURL("popup-debug.html"));
  }
});

{
  const chromePages = [
    "https://chrome.google.com/webstore",
    "chrome://",
    "chrome-extension://",
  ];

  chrome.tabs.query({ currentWindow: true, active: true }, async (tabs) => {
    const tab = tabs?.[0];
    if (!tab) return;
    const match = chromePages.find((url) => tab.url.startsWith(url));
    if (match || tab.pinned) {
      document.getElementById("js-page-not-supported").innerHTML = `
        <div class="db pa3 bg-light-yellow black">
          <b>⚠️ This tab's favicons will not get faded and won't get an unread badge</b>.
          Chrome-related pages, the Chrome Web Store, and pinned tabs aren't supported.
        </div>
        <hr />
      `;
      const elements = [...document.getElementsByClassName("js-tab-control")];
      if (elements) {
        elements.forEach((el) => el.setAttribute("disabled", ""));
      }
    }
  });
}

// ---

{
  const options = {};

  function updateFromOptions(options) {
    console.log("updateFromOptions", { options });
    if (options.enableFading) {
      document.getElementById("js-fading-options").classList.remove("dn");
    } else {
      document.getElementById("js-fading-options").classList.add("dn");
    }
    fadeHalfLife.updateValueTitle(options.fadeHalfLife);
    minFavIconOpacity.updateValueTitle(options.minFavIconOpacity);
    fadeTimeToReset.updateValueTitle(options.fadeTimeToReset);
    if (options.enabled) {
      document.getElementById("js-options-form").removeAttribute("disabled");
      document.getElementById("js-enable-extension").classList.add("dn");
    } else {
      document.getElementById("js-options-form").setAttribute("disabled", true);
      document.getElementById("js-enable-extension").classList.remove("dn");
    }
  }

  const $optionsForm = document.getElementById("js-options-form");

  // Prevent submission when clicking random buttons
  $optionsForm.addEventListener("submit", (e) => e.preventDefault());

  chrome.storage.local.get("options", (data) => {
    // if (!data.options.enabled) {
    //   document.location = 'popup-disabled.html';
    //   return;
    // }
    Object.assign(options, data.options);
    console.log("chrome.storage.local.get('options')", { options });
    $optionsForm.showUnreadBadge.checked = options.showUnreadBadge;
    $optionsForm.enableFading.checked = options.enableFading;
    $optionsForm.fadeHalfLife.value = fadeHalfLife.valueToStep(
      options.fadeHalfLife
    );
    $optionsForm.minFavIconOpacity.value = minFavIconOpacity.valueToStep(
      options.minFavIconOpacity
    );
    $optionsForm.fadeTimeToReset.value = fadeTimeToReset.valueToStep(
      options.fadeTimeToReset
    );
    updateFromOptions(options);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.options?.newValue) {
      Object.assign(options, changes.options.newValue);
      updateFromOptions(options);
    }
  });

  $optionsForm.showUnreadBadge.addEventListener("change", (event) => {
    options.showUnreadBadge = event.target.checked;
    chrome.storage.local.set({ options });
    updateFromOptions(options);
  });

  $optionsForm.enableFading.addEventListener("change", (event) => {
    options.enableFading = event.target.checked;
    chrome.storage.local.set({ options });
    updateFromOptions(options);
  });

  $optionsForm.fadeHalfLife.addEventListener("input", (e) => {
    const step = parseInt(e.target.value);
    options.fadeHalfLife = fadeHalfLife.stepValue(step);
    chrome.storage.local.set({ options });
    updateFromOptions(options);
  });

  $optionsForm.minFavIconOpacity.addEventListener("input", (e) => {
    const step = parseInt(e.target.value);
    options.minFavIconOpacity = minFavIconOpacity.stepValue(step);
    chrome.storage.local.set({ options });
    updateFromOptions(options);
  });

  $optionsForm.fadeTimeToReset.addEventListener("input", (e) => {
    const step = parseInt(e.target.value);
    options.fadeTimeToReset = fadeTimeToReset.stepValue(step);
    chrome.storage.local.set({ options });
    updateFromOptions(options);
  });

  async function setEnabled(isEnabled) {
    options.enabled = isEnabled;
    await chrome.storage.local.set({ options });
    updateFromOptions(options);
  }

  document
    .getElementById("js-enable-extension")
    .addEventListener("click", () => setEnabled(true));
  document
    .getElementById("js-disable-extension")
    .addEventListener("click", () => {
      if (window.confirm("Are you sure you want to reset the extension?")) {
        setEnabled(false);
      }
    });
}

document
  .getElementById("js-unread-selected-tabs")
  .addEventListener("click", async () => {
    const tabs = await chrome.tabs.query({
      currentWindow: true,
      highlighted: true,
    });
    tabs.forEach((tab) => {
      chrome.tabs.sendMessage(tab.id, {
        action: "MARK_UNREAD",
      });
    });
  });

document
  .getElementById("js-read-selected-tabs")
  .addEventListener("click", async () => {
    const tabs = await chrome.tabs.query({
      currentWindow: true,
      highlighted: true,
    });
    tabs.forEach((tab) => {
      chrome.tabs.sendMessage(tab.id, {
        action: "MARK_READ",
      });
    });
  });
