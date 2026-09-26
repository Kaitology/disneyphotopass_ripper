const LIST_EVENT = 'PhotoPassPhotosListed';
const OVERLAY_EVENT = 'PhotoPassOverlayResolved';
const LIST_TIMEOUT_MS = 15000;
const OVERLAY_TIMEOUT_MS = 120000;

let listInFlight = false;
let overlayInFlight = false;

function injectPageScript() {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            document.removeEventListener(LIST_EVENT, onListed);
            reject(new Error('Timed out while reading photos from the page.'));
        }, LIST_TIMEOUT_MS);

        const onListed = (event) => {
            clearTimeout(timeoutId);
            document.removeEventListener(LIST_EVENT, onListed);
            const payload = event.detail;
            if (Array.isArray(payload)) {
                resolve({ photos: payload, source: 'legacy' });
                return;
            }
            resolve({
                photos: Array.isArray(payload?.photos) ? payload.photos : [],
                source: payload?.source || 'unknown',
            });
        };

        document.addEventListener(LIST_EVENT, onListed);

        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('pageScript.js');
        script.onload = () => script.remove();
        script.onerror = () => {
            clearTimeout(timeoutId);
            document.removeEventListener(LIST_EVENT, onListed);
            reject(new Error('Could not load page script.'));
        };
        (document.head || document.documentElement).appendChild(script);
    });
}

function injectOverlayResolver(pictureKeys) {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            document.removeEventListener(OVERLAY_EVENT, onResolved);
            reject(new Error('Timed out while resolving frame assets.'));
        }, OVERLAY_TIMEOUT_MS);

        const onResolved = (event) => {
            clearTimeout(timeoutId);
            document.removeEventListener(OVERLAY_EVENT, onResolved);
            resolve(event.detail?.urls || {});
        };

        document.addEventListener(OVERLAY_EVENT, onResolved);

        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('resolveOverlayScript.js');
        script.dataset.keys = JSON.stringify(pictureKeys);
        script.onload = () => script.remove();
        script.onerror = () => {
            clearTimeout(timeoutId);
            document.removeEventListener(OVERLAY_EVENT, onResolved);
            reject(new Error('Could not load overlay resolver.'));
        };
        (document.head || document.documentElement).appendChild(script);
    });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'listPhotos') {
        if (listInFlight) {
            sendResponse({ status: 'error', message: 'Already loading photos. Wait a moment.' });
            return false;
        }

        listInFlight = true;
        injectPageScript()
            .then(({ photos, source }) => {
                listInFlight = false;
                if (!photos.length) {
                    sendResponse({
                        status: 'error',
                        message:
                            'No photos found. Open your gallery, scroll until thumbnails load, then tap Refresh.',
                    });
                    return;
                }
                sendResponse({ status: 'success', photos, source });
            })
            .catch((err) => {
                listInFlight = false;
                sendResponse({ status: 'error', message: err.message });
            });

        return true;
    }

    if (message.action === 'resolveOverlay') {
        const keys = Array.isArray(message.pictureKeys) ? message.pictureKeys : [];
        if (!keys.length) {
            sendResponse({ urls: {} });
            return false;
        }

        if (overlayInFlight) {
            sendResponse({ urls: {}, error: 'Overlay resolve already in progress.' });
            return false;
        }

        overlayInFlight = true;
        injectOverlayResolver(keys)
            .then((urls) => {
                overlayInFlight = false;
                sendResponse({ urls });
            })
            .catch((err) => {
                overlayInFlight = false;
                sendResponse({ urls: {}, error: err.message });
            });

        return true;
    }

    return false;
});
