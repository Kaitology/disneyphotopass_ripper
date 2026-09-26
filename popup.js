import { buildThumbUrl, canDownloadFormat } from './imaging.js';

const gridEl = document.getElementById('grid');
const statusEl = document.getElementById('status');
const downloadBtn = document.getElementById('downloadBtn');
const refreshBtn = document.getElementById('refreshBtn');
const selectAllBtn = document.getElementById('selectAllBtn');
const selectNoneBtn = document.getElementById('selectNoneBtn');
const selectedCountEl = document.getElementById('selectedCount');
const photoCountEl = document.getElementById('photoCount');

let photos = [];
const selected = new Set();
let downloadInFlight = false;
let loadInFlight = false;

function setStatus(text, kind = '') {
    statusEl.textContent = text;
    statusEl.className = `status ${kind}`.trim();
}

function getSelectedFormats() {
    return [...document.querySelectorAll('input[name="format"]:checked')].map((el) => el.value);
}

function updateSelectionUi() {
    const n = selected.size;
    selectedCountEl.textContent = `${n} selected`;
    downloadBtn.disabled =
        downloadInFlight || n === 0 || getSelectedFormats().length === 0 || loadInFlight;
    document.querySelectorAll('.card').forEach((card) => {
        const id = card.dataset.id;
        const on = selected.has(id);
        card.classList.toggle('selected', on);
        card.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
}

function renderGrid(preserveSelection = false) {
    const previous = preserveSelection ? new Set(selected) : null;

    gridEl.innerHTML = '';
    selected.clear();

    if (!photos.length) {
        gridEl.innerHTML =
            '<p class="empty">Open your PhotoPass gallery, scroll to load photos, then tap ↻.</p>';
        photoCountEl.textContent = 'No photos loaded';
        updateSelectionUi();
        return;
    }

    photos.forEach((photo) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'card';
        card.dataset.id = photo.id;
        card.setAttribute('role', 'listitem');
        card.setAttribute('aria-pressed', 'false');
        card.title = photo.label || 'Photo';

        const img = document.createElement('img');
        img.src = buildThumbUrl(photo);
        img.alt = photo.label || '';
        img.loading = 'lazy';
        img.addEventListener('error', () => {
            img.style.opacity = '0.35';
        });

        const check = document.createElement('span');
        check.className = 'check';
        check.setAttribute('aria-hidden', 'true');

        card.append(img, check);
        card.addEventListener('click', () => {
            if (selected.has(photo.id)) selected.delete(photo.id);
            else selected.add(photo.id);
            updateSelectionUi();
        });

        gridEl.appendChild(card);

        if (previous?.has(photo.id)) selected.add(photo.id);
        else if (!previous) selected.add(photo.id);
    });

    updateSelectionUi();
}

function getActiveTab() {
    return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs[0]));
    });
}

async function loadPhotosFromPage() {
    if (loadInFlight) return;

    loadInFlight = true;
    setStatus('Reading photos from the page…');
    refreshBtn.disabled = true;
    downloadBtn.disabled = true;

    const tab = await getActiveTab();
    if (!tab?.id) {
        setStatus('No active tab.', 'error');
        loadInFlight = false;
        refreshBtn.disabled = false;
        return;
    }
    if (!tab.url || !/disneyphotopass\.eu/i.test(tab.url)) {
        setStatus('Open disneyphotopass.eu in this tab first.', 'error');
        loadInFlight = false;
        refreshBtn.disabled = false;
        return;
    }

    chrome.tabs.sendMessage(tab.id, { action: 'listPhotos' }, (response) => {
        loadInFlight = false;
        refreshBtn.disabled = false;

        if (chrome.runtime.lastError) {
            setStatus('Reload the gallery tab, then tap ↻ again.', 'error');
            return;
        }

        if (response?.status !== 'success' || !response.photos?.length) {
            setStatus(response?.message || 'No photos found.', 'error');
            photos = [];
            renderGrid(false);
            return;
        }

        photos = response.photos;
        const sourceLabel =
            response.source === 'library'
                ? `${photos.length} in your collection`
                : `${photos.length} visible on page`;
        photoCountEl.textContent = sourceLabel;
        renderGrid(true);
        setStatus('Choose types, select photos, then download.', 'success');
    });
}

function downloadSelected() {
    if (downloadInFlight) return;

    const formats = getSelectedFormats();
    if (!formats.length) {
        setStatus('Choose at least one download type.', 'error');
        return;
    }

    const items = photos
        .filter((p) => selected.has(p.id))
        .map((p) => ({
            id: p.id,
            pictureKey: p.pictureKey,
            urlParams: p.urlParams,
            urlParamsL: p.urlParamsL,
            obqs: p.obqs,
        }));
    if (!items.length) {
        setStatus('Select at least one photo.', 'error');
        return;
    }

    const fileCount = items.reduce(
        (sum, item) => sum + formats.filter((f) => canDownloadFormat(item, f)).length,
        0
    );
    if (fileCount === 0) {
        setStatus('Selected photos cannot use the chosen download types.', 'error');
        return;
    }
    downloadInFlight = true;
    setStatus(`Downloading ${fileCount} file(s)…`);
    updateSelectionUi();

    getActiveTab().then((tab) => {
        chrome.runtime.sendMessage(
            { action: 'downloadImages', items, formats, tabId: tab?.id },
            (response) => {
                downloadInFlight = false;
                if (chrome.runtime.lastError) {
                    setStatus(chrome.runtime.lastError.message, 'error');
                    updateSelectionUi();
                    return;
                }
                setStatus(response?.status || 'Downloads finished.', 'success');
                updateSelectionUi();
            }
        );
    });
}

selectAllBtn.addEventListener('click', () => {
    photos.forEach((p) => selected.add(p.id));
    updateSelectionUi();
});

selectNoneBtn.addEventListener('click', () => {
    selected.clear();
    updateSelectionUi();
});

document.querySelectorAll('input[name="format"]').forEach((el) => {
    el.addEventListener('change', updateSelectionUi);
});

refreshBtn.addEventListener('click', loadPhotosFromPage);
downloadBtn.addEventListener('click', downloadSelected);

loadPhotosFromPage();
