document.addEventListener("DOMContentLoaded", () => {
  const shortsLimitInput = document.getElementById("shortsLimit");
  const videoLimitInput = document.getElementById("videoLimit");
  const status = document.getElementById("status");
  const saveButton = document.getElementById("save");

  function setStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle("error", isError);
  }

  chrome.storage.local.get(
    { shortsLimit: 5, maxVideoLength: 20 },
    (data) => {
      shortsLimitInput.value = data.shortsLimit ?? 5;
      videoLimitInput.value = data.maxVideoLength ?? 20;
    }
  );

  saveButton.addEventListener("click", () => {
    const shortsLimit = Number(shortsLimitInput.value);
    const maxVideoLength = Number(videoLimitInput.value);

    if (!Number.isFinite(shortsLimit) || shortsLimit < 1) {
      setStatus("Shorts limit must be at least 1.", true);
      return;
    }

    if (!Number.isFinite(maxVideoLength) || maxVideoLength < 1) {
      setStatus("Video length must be at least 1 minute.", true);
      return;
    }

    chrome.storage.local.set(
      { shortsLimit, maxVideoLength },
      () => {
        setStatus("Saved. Changes apply immediately.");
        setTimeout(() => setStatus(""), 2000);
      }
    );
  });
});
