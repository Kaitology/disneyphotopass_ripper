const GRAPHIC_BASE =
    'https://www.disneyphotopass.eu/Imaging/GetGraphic.ashx?flex=true&obqs1=';
const DOWNLOAD_PARAMS = '&region=en-GB&maxdim=6000';

function buildDownloadUrl(obqsToken) {
    return GRAPHIC_BASE + encodeURIComponent(obqsToken) + DOWNLOAD_PARAMS;
}

/** @deprecated Legacy PictureKey URLs */
function buildLegacyDownloadUrl(pictureKey) {
    return (
        'https://www.disneyphotopass.eu/Imaging/GetGraphic.ashx?flex=true&key=' +
        encodeURIComponent(pictureKey) +
        DOWNLOAD_PARAMS
    );
}

function downloadImage(url) {
    return new Promise((resolve) => {
        chrome.downloads.download({ url, conflictAction: 'uniquify' }, (downloadId) => {
            if (chrome.runtime.lastError || downloadId === undefined) {
                console.error('EXTRACTOR:', chrome.runtime.lastError);
                resolve();
                return;
            }

            const onChanged = (delta) => {
                if (delta.id !== downloadId || !delta.state) return;
                const state = delta.state.current;
                if (state === 'complete' || state === 'interrupted') {
                    chrome.downloads.onChanged.removeListener(onChanged);
                    resolve();
                }
            };
            chrome.downloads.onChanged.addListener(onChanged);
        });
    });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action !== 'downloadImages') {
        return false;
    }

    const obqsTokens = message.obqsTokens || [];
    const legacyKeys = message.pictureKeys || [];
    const urls = [
        ...obqsTokens.map(buildDownloadUrl),
        ...legacyKeys.map(buildLegacyDownloadUrl),
    ];

    if (urls.length === 0) {
        sendResponse({ status: 'No images to download.' });
        return false;
    }

    (async () => {
        for (const url of urls) {
            await downloadImage(url);
        }
        sendResponse({ status: `Downloaded ${urls.length} image(s).` });
    })();

    return true;
});
