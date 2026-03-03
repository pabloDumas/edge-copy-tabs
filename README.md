# Edge Copy Tabs (Export + Import)

A small, privacy-first Microsoft Edge extension that:
- **Exports** all open tab URLs (current window) to clipboard or a `.txt` file
- **Imports** URLs (one per line) from a pasted list or a `.txt` file
- Opens imported URLs in a **new window** (or the current window)

No analytics, no servers, no network calls.

## Install (Edge)
1. Click **Code → Download ZIP**
2. Extract the ZIP (Right-click → **Extract All…**)
3. In Edge, open: `edge://extensions`
4. Turn on **Developer mode** (top-right)
5. Click **Load unpacked**
6. Select the extracted folder that contains `manifest.json`

## Use
- **Copy URLs**: copies all tab URLs (current window)
- **Export URLs to .txt**: saves a text file
- **Paste URLs**: paste one URL per line, then import
- **Import from file**: select a `.txt` with one URL per line

## Notes
- Internal pages like `edge://` are skipped on export.
- Import accepts `example.com/path` and will assume `https://` if no scheme is present.
