let shortsCount = 0;
let lastUrl = window.location.href;
let currentDayKey = null;

function isExtensionContextValid() {
  return Boolean(chrome?.runtime?.id);
}

function safeStorageGet(keys, callback) {
  if (!isExtensionContextValid()) return;
  try {
    chrome.storage.local.get(keys, callback);
  } catch (_err) {
    // Extension was reloaded or invalidated; avoid crashing the content script.
  }
}

function safeStorageSet(items) {
  if (!isExtensionContextValid()) return;
  try {
    chrome.storage.local.set(items);
  } catch (_err) {
    // Extension was reloaded or invalidated; avoid crashing the content script.
  }
}

function safeGetRuntimeUrl(path) {
  if (!isExtensionContextValid()) return null;
  try {
    return chrome.runtime.getURL(path);
  } catch (_err) {
    return null;
  }
}

function getDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function loadDailyShortsCount() {
  const todayKey = getDayKey();
  safeStorageGet(
    { dailyShortsCount: 0, dailyShortsDate: todayKey },
    (data) => {
      if (data.dailyShortsDate !== todayKey) {
        shortsCount = 0;
        currentDayKey = todayKey;
        safeStorageSet({
          dailyShortsCount: 0,
          dailyShortsDate: todayKey
        });
        return;
      }

      shortsCount = Number(data.dailyShortsCount) || 0;
      currentDayKey = data.dailyShortsDate;
    }
  );
}

function persistDailyShortsCount() {
  safeStorageSet({
    dailyShortsCount: shortsCount,
    dailyShortsDate: currentDayKey || getDayKey()
  });
}

// ---- Helpers ----
function isShortsPage() {
  return window.location.href.includes("youtube.com/shorts");
}

function isVideoPage() {
  return window.location.href.includes("watch?v=");
}

// Track URL changes without resetting daily count
setInterval(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
  }
}, 1000);

// ---- FEATURE 1: Shorts streak limiter ----
let lastShortId = null;

function getCurrentShortId() {
  const video = document.querySelector("video");
  if (!video) return null;

  // Use current URL or player timestamp as a proxy
  return window.location.href;
}

const observer = new MutationObserver(() => {
  if (!isShortsPage()) return;

  const currentId = getCurrentShortId();

  if (currentId && currentId !== lastShortId) {
    lastShortId = currentId;
    shortsCount += 1;
    persistDailyShortsCount();

    safeStorageGet({ shortsLimit: 5 }, (data) => {
      if (shortsCount >= data.shortsLimit) {
        showInterruption();
        shortsCount = 0;
        persistDailyShortsCount();
      }
    });
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

loadDailyShortsCount();
setInterval(() => {
  const todayKey = getDayKey();
  if (currentDayKey && currentDayKey !== todayKey) {
    shortsCount = 0;
    currentDayKey = todayKey;
    persistDailyShortsCount();
  }
}, 60 * 1000);


function showInterruption() {
  if (document.getElementById("doomscroll-overlay")) return;

  const memeUrl = safeGetRuntimeUrl("meme.png");
  if (!memeUrl) return;
  const overlay = document.createElement("div");
  overlay.id = "doomscroll-overlay";
  overlay.innerHTML = `
    <div style="
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
    ">
      <div style="
        background: white;
        padding: 24px;
        border-radius: 14px;
        text-align: center;
        max-width: 320px;
      ">
        <h2>🛑 Shorts Limit Reached</h2>
        <img src="${memeUrl}" alt="Are you sure you need another Short?" style="
          width: 100%;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
          margin: 10px 0 6px 0;
        ">
        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px;">
          Are you sure you need another Short?
        </p>
        <p>You have watched too many Shorts in a row.</p>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
}

function showLongVideoInterruption(maxMinutes) {
  if (document.getElementById("doomscroll-overlay")) return;

  const memeUrl = safeGetRuntimeUrl("meme.png");
  if (!memeUrl) return;
  const overlay = document.createElement("div");
  overlay.id = "doomscroll-overlay";
  overlay.innerHTML = `
    <div style="
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
    ">
      <div style="
        background: white;
        padding: 24px;
        border-radius: 14px;
        text-align: center;
        max-width: 320px;
      ">
        <h2>⏱️ Long Video Detected</h2>
        <img src="${memeUrl}" alt="Are you sure you need a long video right now?" style="
          width: 100%;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
          margin: 10px 0 6px 0;
        ">
        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px;">
          Are you sure you need a long video right now?
        </p>
        <p>This video exceeds your ${Math.round(maxMinutes)} min limit.</p>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
}


// ---- FEATURE 2: Long video warning ----
function getVideoLengthMinutes() {
  const timestamp = document.querySelector(".ytp-time-duration");
  if (!timestamp) return null;

  const parts = timestamp.innerText.split(":").map(Number);

  if (parts.length === 2) {
    return parts[0] + parts[1] / 60;
  } else {
    return parts[0] * 60 + parts[1] + parts[2] / 60;
  }
}

function checkVideoLength() {
  if (!isVideoPage()) return;

  setTimeout(() => {
    const length = getVideoLengthMinutes();
    if (!length) return;

    safeStorageGet({ maxVideoLength: 20 }, (data) => {
      const limit = Number(data.maxVideoLength) || 0;
      if (limit > 0 && length > limit) {
        showLongVideoInterruption(limit);
      }
    });
  }, 2000);
}

// Run when page loads or changes
checkVideoLength();
setInterval(checkVideoLength, 3000);
