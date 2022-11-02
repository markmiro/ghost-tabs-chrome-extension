document.getElementById('js-reload-all-tabs').addEventListener('click', async () => {
  const tabs = await chrome.tabs.query({ pinned: false, windowType: 'normal' });
  tabs.forEach((tab) => chrome.tabs.reload(tab.id));
  window.close();
});