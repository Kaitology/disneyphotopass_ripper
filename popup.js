// popup.js
document.getElementById("extractBtn").addEventListener("click", function() {
    console.log("EXTRACTOR: Sending extraction request to content script...");
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "extractPictureKeys" }, function(response) {
            if (chrome.runtime.lastError) {
                console.error("EXTRACTOR:", chrome.runtime.lastError.message);
                return;
            }

            if (response && response.status === "success") {
                console.log("EXTRACTOR: Extraction successful!");
            } else if (response) {
                console.error("EXTRACTOR:", response.message);
            }
        });
    });
});
