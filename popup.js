const statusEl = document.getElementById('status');
const extractBtn = document.getElementById('extractBtn');

function setStatus(text, kind) {
    statusEl.textContent = text;
    statusEl.className = kind || '';
}

extractBtn.addEventListener('click', () => {
    setStatus('Reading photos from the page…', '');
    extractBtn.disabled = true;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab?.id) {
            setStatus('No active tab.', 'error');
            extractBtn.disabled = false;
            return;
        }

        if (!tab.url || !/disneyphotopass\.eu/i.test(tab.url)) {
            setStatus('Open disneyphotopass.eu in this tab first.', 'error');
            extractBtn.disabled = false;
            return;
        }

        chrome.tabs.sendMessage(tab.id, { action: 'extractPictureKeys' }, (response) => {
            extractBtn.disabled = false;

            if (chrome.runtime.lastError) {
                setStatus(
                    'Cannot reach the page. Reload the gallery and try again.',
                    'error'
                );
                console.error('EXTRACTOR:', chrome.runtime.lastError.message);
                return;
            }

            if (response?.status === 'success') {
                setStatus(response.message || 'Downloads started.', 'success');
            } else {
                setStatus(response?.message || 'Extraction failed.', 'error');
            }
        });
    });
});
