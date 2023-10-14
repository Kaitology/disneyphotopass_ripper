chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        if (message.action === "extractPictureKeys") {
            console.log("EXTRACTOR: Received extraction request...");

            // Inject the external page script
            let script = document.createElement('script');
            script.src = chrome.runtime.getURL('pageScript.js');
            (document.head || document.documentElement).appendChild(script);
            
            // Listen for our custom event from the page script
			document.addEventListener('ViewPicturesExtracted', (e) => {
				let pictures = e.detail;
				let pictureKeys = pictures.map(pic => pic.PictureKey);
				chrome.runtime.sendMessage({ action: "downloadImages", pictureKeys: pictureKeys }, (response) => {
					console.log("EXTRACTOR:", response.status);
				});
			});

            
            // Indicate that we will send a response asynchronously
            return true;
        }
    } catch (error) {
        console.error("EXTRACTOR: Error processing message:", error);
        sendResponse({ status: "error", message: error.message });
        return false;
    }
});
