document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["shortsLimit", "maxVideoLength"], (data) => {
    document.getElementById("shortsLimit").value = data.shortsLimit || 5;
    document.getElementById("videoLimit").value = data.maxVideoLength || 20;
  });

  document.getElementById("save").addEventListener("click", () => {
    const shortsLimit = Number(document.getElementById("shortsLimit").value);
    const videoLimit = Number(document.getElementById("videoLimit").value);

    chrome.storage.local.set({
      shortsLimit,
      maxVideoLength: videoLimit
    });
  });
});
