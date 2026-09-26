# Disney PhotoPass Ripper

Chrome extension to download **full-resolution** photos from [disneyphotopass.eu](https://www.disneyphotopass.eu) (Disneyland Paris PhotoPass). It uses the site’s `GetGraphic.ashx` “flex” URLs so you get large JPEGs, not only small thumbnails.

You must be **logged in** in Chrome. Downloads use your normal browser session.

---

## What you need

- **Google Chrome** (or another Chromium browser with “Load unpacked” support)
- A **folder on your PC** that contains this extension (see below)
- Your **Disney PhotoPass account**

---

## Get the extension files

### Option A — Clone or copy the project folder

Use the folder that contains **`manifest.json`** and the **`icons`** subfolder.

Example after clone:

`K:\PhotopassRipper`

### Option B — Zip file

In the project root you also have:

`disneyphotopass-ripper.zip`

1. Right-click the zip → **Extract All…**
2. Choose a location, for example: `C:\Users\YourName\DisneyPhotoPassRipper`
3. Open the extracted folder and confirm you see **`manifest.json`** and **`icons`** in the **same** folder.

Chrome **cannot** install an extension by opening the zip. You always use **Load unpacked** on the **extracted** folder.

### Important: use a local disk folder

Chrome often **refuses** unpacked extensions on **network drives** or some mapped drives (for example `K:` on some setups).

If **Load unpacked** does nothing or the extension never appears:

1. Copy the whole folder to a local path, for example:  
   `C:\Users\YourName\DisneyPhotoPassRipper`
2. Load **that** folder in Chrome.

---

## Install in Chrome (one-time)

1. Open Chrome.
2. In the address bar, type: `chrome://extensions` and press Enter.
3. Turn **Developer mode** **ON** (toggle at the top right).
4. Click **Load unpacked**.
5. In the file dialog, open the extension folder (the one with `manifest.json` and `icons`).
6. Click **Select Folder**.

You should see **Disney Photo Pass Downloader** on the extensions page.

### Pin the extension (so you can click it)

1. Click the **puzzle piece** icon on the Chrome toolbar.
2. Find **Disney Photo Pass Downloader**.
3. Click the **pin** icon next to it.

The extension icon should stay visible on the toolbar.

### If it still does not show

- You selected the **wrong folder** (must contain `manifest.json` + `icons`, not only `.js` files in a subfolder).
- Read any **red error** text on `chrome://extensions` and fix the path or copy to `C:\`.
- Click **Reload** on the extension card after you change files.

---

## How to use it (every time you want downloads)

### 1. Sign in

1. In Chrome, go to [https://www.disneyphotopass.eu](https://www.disneyphotopass.eu).
2. Sign in to your account (email and password).

### 2. Open your photo gallery

1. Go to your **Photos** / **Photo collection** page (URL usually contains `/Photos`).
2. Wait until **thumbnails** appear on the page.  
   If you see only empty space, wait a few seconds or refresh once.

### 3. Load more photos by scrolling

The extension only downloads photos that are **already loaded in the page** (visible in the HTML).

1. **Scroll down** through your gallery slowly.
2. Pause when new date groups or new thumbnails appear.
3. Repeat until you have scrolled through **all dates** you care about.

If you skip scrolling, you will only get photos from the part of the gallery that was loaded at the top.

### 4. Click the extension button

1. Click the **Disney Photo Pass Downloader** icon in the toolbar.
2. In the small popup, click **Download visible photos**.
3. Wait for the green success message (or a red error with a hint).

Chrome will start one download per photo. Check the **Downloads** bar at the bottom of Chrome or your system **Downloads** folder.

### 5. Repeat for more batches (optional)

If you scroll further and load **new** thumbnails that were not on the page before:

1. Scroll to load them.
2. Click **Download visible photos** again.

Already-downloaded files may get a new name (`(1)`, `(2)`, etc.) because Chrome avoids overwriting.

---

## Quick checklist

| Step | Action |
|------|--------|
| Install | `chrome://extensions` → Developer mode → **Load unpacked** → folder with `manifest.json` |
| Pin | Puzzle icon → pin **Disney Photo Pass Downloader** |
| Login | disneyphotopass.eu → sign in |
| Gallery | Open **Photos** → wait for thumbnails |
| Scroll | Scroll through **all** dates you want |
| Download | Extension popup → **Download visible photos** |

---

## Troubleshooting

| Problem | What to do |
|---------|------------|
| Extension not in list after Load unpacked | Copy folder to `C:\...`, try again; check red errors on `chrome://extensions` |
| “Cannot reach the page” in popup | Reload the PhotoPass tab; make sure the tab URL is `disneyphotopass.eu` |
| “No photos found” | Wait for thumbnails; scroll the gallery; try again |
| Only a few photos download | Scroll more, then click the button again |
| Small or wrong files | Make sure you are on the gallery page, not login or account settings |
| After code update | `chrome://extensions` → **Reload** on this extension |

---

## Privacy and security

- The extension runs only on `disneyphotopass.eu` domains.
- It does not store your password. It reads photo URLs from the page you have open and asks Chrome to download them using your existing login cookies.

---

## For developers

- **Manifest:** Chrome MV3 (`manifest.json`)
- **Flow:** Popup → content script → page script collects `obqs1` tokens → background service worker builds `GetGraphic.ashx?flex=true&obqs1=...&region=en-GB&maxdim=6000` URLs → `chrome.downloads`

After you change code, reload the extension on `chrome://extensions` and refresh the PhotoPass tab.
