const EXTRACT_EVENT = 'PhotoPassObqsExtracted';
const EXTRACT_TIMEOUT_MS = 15000;

let extractInFlight = false;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action !== 'extractPictureKeys') {
        return false;
    }

    if (extractInFlight) {
        sendResponse({ status: 'error', message: 'A download is already in progress.' });
        return false;
    }

    extractInFlight = true;
    let finished = false;

    const finish = (payload) => {
        if (finished) return;
        finished = true;
        extractInFlight = false;
        sendResponse(payload);
    };

    const onExtracted = (event) => {
        document.removeEventListener(EXTRACT_EVENT, onExtracted);
        clearTimeout(timeoutId);

        const obqsTokens = Array.isArray(event.detail) ? event.detail : [];
        if (obqsTokens.length === 0) {
            finish({
                status: 'error',
                message:
                    'No photos found. Open your PhotoPass gallery and wait until thumbnails appear, then try again.',
            });
            return;
        }

        chrome.runtime.sendMessage(
            { action: 'downloadImages', obqsTokens },
            (response) => {
                if (chrome.runtime.lastError) {
                    finish({ status: 'error', message: chrome.runtime.lastError.message });
                    return;
                }
                finish({
                    status: 'success',
                    message: response?.status || `Started ${obqsTokens.length} download(s).`,
                    count: obqsTokens.length,
                });
            }
        );
    };

    const timeoutId = setTimeout(() => {
        document.removeEventListener(EXTRACT_EVENT, onExtracted);
        finish({ status: 'error', message: 'Timed out while reading photos from the page.' });
    }, EXTRACT_TIMEOUT_MS);

    document.addEventListener(EXTRACT_EVENT, onExtracted);

    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('pageScript.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);

    return true;
});
