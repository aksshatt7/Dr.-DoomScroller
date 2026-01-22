// Initialize defaults on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    shortsLimit: 5,
    maxVideoLength: 20 // minutes
  });
});
