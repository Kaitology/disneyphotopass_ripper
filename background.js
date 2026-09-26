import {
    buildDownloadUrl,
    buildDownloadFilename,
    canDownloadFormat,
    FORMAT,
    normalizePictureKey,
} from './imaging.js';

const DOWNLOAD_TIMEOUT_MS = 120000;

function downloadImage(url, filename) {
    return new Promise((resolve) => {
        let settled = false;
        const finish = () => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve();
        };

        const timer = setTimeout(finish, DOWNLOAD_TIMEOUT_MS);

        chrome.downloads.download(
            { url, filename, conflictAction: 'uniquify' },
            (downloadId) => {
                if (chrome.runtime.lastError || downloadId === undefined) {
                    console.error('PhotoPass:', chrome.runtime.lastError);
                    finish();
                    return;
                }

                const onChanged = (delta) => {
                    if (delta.id !== downloadId || !delta.state) return;
                    const state = delta.state.current;
                    if (state === 'complete' || state === 'interrupted') {
                        chrome.downloads.onChanged.removeListener(onChanged);
                        finish();
                    }
                };
                chrome.downloads.onChanged.addListener(onChanged);
            }
        );
    });
}

function normalizePhotoItem(item) {
    if (typeof item === 'string') {
        return { obqs: item, urlParams: `obqs1=${item}` };
    }
    if (!item || typeof item !== 'object') {
        return null;
    }
    const pictureKey = normalizePictureKey(item.pictureKey || item.id);
    return { ...item, pictureKey };
}

function resolveOverlayUrls(tabId, pictureKeys) {
    return new Promise((resolve) => {
        if (!tabId || !pictureKeys.length) {
            resolve({});
            return;
        }
        chrome.tabs.sendMessage(
            tabId,
            { action: 'resolveOverlay', pictureKeys },
            (response) => {
                if (chrome.runtime.lastError) {
                    console.warn('PhotoPass overlay resolve:', chrome.runtime.lastError.message);
                    resolve({});
                    return;
                }
                resolve(response?.urls || {});
            }
        );
    });
}

function enrichWithOverlayUrls(items, overlayUrls) {
    return items.map((item) => {
        if (!item.pictureKey) return item;
        const url = overlayUrls[item.pictureKey];
        if (!url) return item;
        return { ...item, templateAssetUrl: url };
    });
}

function buildJobs(items, formats) {
    const jobs = [];
    let sequence = 0;
    const overlayResolved = formats.includes(FORMAT.overlay);

    for (const item of items) {
        for (const format of formats) {
            if (!canDownloadFormat(item, format, { overlayResolved })) continue;
            const url = buildDownloadUrl(item, format);
            if (!url) continue;
            sequence += 1;
            jobs.push({
                url,
                filename: buildDownloadFilename(item, format, sequence),
            });
        }
    }

    return jobs;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action !== 'downloadImages') {
        return false;
    }

    (async () => {
        const rawItems = message.items || [];
        const formats = message.formats || [FORMAT.photo];
        const items = rawItems.map(normalizePhotoItem).filter(Boolean);

        let enrichedItems = items;
        if (formats.includes(FORMAT.overlay)) {
            const keys = [
                ...new Set(
                    items
                        .filter((item) => item.pictureKey && !item.templateAssetUrl)
                        .map((item) => item.pictureKey)
                ),
            ];
            if (keys.length && message.tabId) {
                const overlayUrls = await resolveOverlayUrls(message.tabId, keys);
                enrichedItems = enrichWithOverlayUrls(items, overlayUrls);
            }
        }

        const overlayResolved = formats.includes(FORMAT.overlay);
        const planned = enrichedItems.reduce(
            (sum, item) =>
                sum + formats.filter((f) => canDownloadFormat(item, f, { overlayResolved })).length,
            0
        );
        const jobs = buildJobs(enrichedItems, formats);

        if (jobs.length === 0) {
            sendResponse({
                status:
                    'No valid downloads. Open your gallery tab, stay logged in, and refresh the photo list.',
            });
            return;
        }

        let completed = 0;
        for (const job of jobs) {
            await downloadImage(job.url, job.filename);
            completed += 1;
        }

        const skipped = Math.max(0, planned - completed);
        const status =
            skipped > 0
                ? `Finished ${completed} download(s). ${skipped} skipped (missing URL or frame resolve failed).`
                : `Finished ${completed} download(s).`;
        sendResponse({ status });
    })();

    return true;
});
