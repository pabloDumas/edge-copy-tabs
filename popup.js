const pasteBoxEl = document.getElementById("pasteBox");
const statusEl = document.getElementById("status");
const includeTitlesEl = document.getElementById("includeTitles");
const openModeEl = document.getElementById("openMode");
const fileInputEl = document.getElementById("fileInput");

function setStatus(msg) {
  statusEl.textContent = msg;
}

function safeFilename(base) {
  return base.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").slice(0, 150);
}

async function getTabsText() {
  const tabs = await chrome.tabs.query({ currentWindow: true });

  const lines = [];
  for (const t of tabs) {
    const url = t.url || "";
    if (!url || url.startsWith("edge://") || url.startsWith("chrome://")) continue;

    if (includeTitlesEl.checked) {
      const title = (t.title || "").trim();
      lines.push(`${title}\n${url}\n`);
    } else {
      lines.push(url);
    }
  }

  if (lines.length === 0) return { text: "", count: 0 };

  const text = includeTitlesEl.checked ? lines.join("\n") : lines.join("\n");
  return { text, count: lines.length };
}

async function copyToClipboard(text) {
  await navigator.clipboard.writeText(text);
}

async function exportToTxt(text) {
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const filename = safeFilename(`tabs-${stamp}.txt`);

  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    await chrome.downloads.download({
      url,
      filename,
      saveAs: true
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsText(file);
  });
}

async function sendImportToBackground(text) {
  const mode = openModeEl.value === "currentWindow" ? "currentWindow" : "newWindow";
  const resp = await chrome.runtime.sendMessage({
    type: "IMPORT_OPEN_URLS",
    text,
    mode
  });

  if (!resp || !resp.ok) {
    throw new Error(resp?.error || "No response from background");
  }
  return resp;
}

// EXPORT actions
document.getElementById("copy").addEventListener("click", async () => {
  try {
    setStatus("Reading tabs...");
    const { text, count } = await getTabsText();
    if (!text) {
      setStatus("No exportable tab URLs found in this window (skipped internal pages).");
      return;
    }
    await copyToClipboard(text);
    setStatus(`Copied ${count} line(s) to clipboard.`);
  } catch (err) {
    setStatus(`Error copying:\n${String(err)}`);
  }
});

document.getElementById("export").addEventListener("click", async () => {
  try {
    setStatus("Reading tabs...");
    const { text, count } = await getTabsText();
    if (!text) {
      setStatus("No exportable tab URLs found in this window (skipped internal pages).");
      return;
    }
    await exportToTxt(text);
    setStatus(`Export started for ${count} line(s). Check your Downloads / save dialog.`);
  } catch (err) {
    setStatus(`Error exporting:\n${String(err)}`);
  }
});

// IMPORT actions
document.getElementById("importPasted").addEventListener("click", async () => {
  try {
    const text = (pasteBoxEl.value || "").trim();
    if (!text) {
      setStatus("Paste URLs into the box first.");
      return;
    }
    setStatus("Parsing URLs + opening tabs...");
    const resp = await sendImportToBackground(text);
    setStatus(`Opened ${resp.opened} URL(s) (${openModeEl.value}).`);
  } catch (err) {
    setStatus(`Error importing pasted URLs:\n${String(err)}`);
  }
});

document.getElementById("importFile").addEventListener("click", async () => {
  try {
    const file = fileInputEl.files?.[0];
    if (!file) {
      setStatus("Choose a .txt file first.");
      return;
    }
    setStatus("Reading file...");
    const text = await readFileAsText(file);
    if (!text || !text.trim()) {
      setStatus("File had no text.");
      return;
    }

    setStatus("Parsing URLs + opening tabs...");
    const resp = await sendImportToBackground(text);
    setStatus(`Opened ${resp.opened} URL(s) from file (${openModeEl.value}).`);
  } catch (err) {
    setStatus(`Error importing from file:\n${String(err)}`);
  }
});