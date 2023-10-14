let ongoingDownloads = 0;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "downloadImages") {
        const baseURL = "https://www.disneyphotopass.eu/Imaging/GetGraphic.ashx?flex=true&key=";
        const params = "&region=en-GB&maxdim=6000";

        ongoingDownloads = message.pictureKeys.length;

        message.pictureKeys.forEach(key => {
            let url = baseURL + key + params;
            downloadImage(url, () => {
                ongoingDownloads--;
                if (ongoingDownloads <= 0) {
                    sendResponse({ status: "Downloaded all images." });
                }
            });
        });

        // Indicate that we will send a response asynchronously
        return true;
    }
});

let downloadImage = (url, callback) => {
    chrome.downloads.download({ url: url }, (downloadId) => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            callback();
        } else {
            // Use onDownloadComplete listener to know when the download is finished
            chrome.downloads.onChanged.addListener(function onDownloadChanged(downloadDelta) {
                if (downloadDelta.id === downloadId && (downloadDelta.state && downloadDelta.state.current === "complete")) {
                    chrome.downloads.onChanged.removeListener(onDownloadChanged);
                    callback();
                }
            });
        }
    });
};
