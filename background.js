// background.js (service worker)

// Basic URL sanity + normalization
function normalizeUrl(raw) {
  const s = (raw || "").trim();
  if (!s) return null;

  // Skip comments / junk lines
  if (s.startsWith("#") || s.startsWith("//")) return null;

  // If it already has a scheme, keep it
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(s)) return s;

  // If it looks like a domain/path, assume https
  // (This is a convenience; you can remove if you want strict URL-only.)
  if (/^[\w.-]+\.[a-zA-Z]{2,}(\/|$)/.test(s)) return `https://${s}`;

  return null;
}

function parseUrlsFromText(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const out = [];
  for (const line of lines) {
    const url = normalizeUrl(line);
    if (url) out.push(url);
  }

  // de-dup while preserving order
  return [...new Set(out)];
}

async function openUrls(urls, mode) {
  // mode: "newWindow" | "currentWindow"
  if (!urls || urls.length === 0) {
    return { opened: 0 };
  }

  if (mode === "currentWindow") {
    // Open first in current active tab? We'll open all as new tabs.
    for (const url of urls) {
      await chrome.tabs.create({ url, active: false });
    }
    // Make the last opened tab active? Keep current tab active.
    return { opened: urls.length };
  }

  // Default: new window
  const first = urls[0];
  const rest = urls.slice(1);

  const win = await chrome.windows.create({
    url: first,
    focused: true
  });

  // Some builds return tab IDs; but we don't need them.
  for (const url of rest) {
    await chrome.tabs.create({
      windowId: win.id,
      url,
      active: false
    });
  }

  return { opened: urls.length };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg?.type === "IMPORT_OPEN_URLS") {
        const urls = parseUrlsFromText(msg.text);
        const mode = msg.mode === "currentWindow" ? "currentWindow" : "newWindow";
        const result = await openUrls(urls, mode);
        sendResponse({ ok: true, ...result, totalParsed: urls.length });
        return;
      }

      sendResponse({ ok: false, error: "Unknown message type" });
    } catch (e) {
      sendResponse({ ok: false, error: String(e) });
    }
  })();

  // Keep the message channel open for async response
  return true;
});