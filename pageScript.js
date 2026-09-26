(function () {
    function decodeObqsPayload(encoded) {
        if (!encoded) return '';
        try {
            return atob(
                encoded
                    .split('')
                    .map((c) => String.fromCharCode(c.charCodeAt(0) - 1))
                    .reverse()
                    .join('')
            );
        } catch (_) {
            return '';
        }
    }

    function extractObqsFromText(text) {
        const tokens = [];
        if (!text) return tokens;
        const re = /[?&]obqs1=([^&"'\\)\s]+)/g;
        let match;
        while ((match = re.exec(text)) !== null) {
            let value = match[1];
            try {
                value = decodeURIComponent(value);
            } catch (_) {
                /* keep raw */
            }
            if (value.length > 0) tokens.push(value);
        }
        return tokens;
    }

    function isObqsToken(value) {
        return typeof value === 'string' && value.length > 40 && /[:[\]{}]/.test(value);
    }

    function normalizeQueryParams(raw) {
        if (!raw) return '';
        let s = String(raw).trim();
        if (s.startsWith('?')) s = s.slice(1);
        if (s.startsWith('&')) s = s.slice(1);
        return s;
    }

    function obqsFromPicture(picture) {
        if (!picture) return null;
        if (picture.Obqs1 && isObqsToken(String(picture.Obqs1))) {
            return String(picture.Obqs1);
        }
        const params = picture.UrlParams || picture.urlParams || '';
        const fromParams = extractObqsFromText(params)[0];
        if (fromParams && isObqsToken(fromParams)) return fromParams;

        const base = window.View?.BasePictureUrl || '';
        let url = base;
        if (params) {
            const join = url.includes('?') ? '&' : '?';
            url += join + params.replace(/^&/, '');
        }
        const fromUrl = extractObqsFromText(url)[0];
        return isObqsToken(fromUrl) ? fromUrl : null;
    }

    function formatCaptureLabel(picture) {
        if (picture?.CaptureDate) return String(picture.CaptureDate);
        if (picture?.FormattedCaptureTime) return String(picture.FormattedCaptureTime);
        if (picture?.CaptureDateTicks) {
            try {
                const ms = Number(picture.CaptureDateTicks) / 10000 - 11644473600000;
                return new Date(ms).toLocaleDateString();
            } catch (_) {
                /* ignore */
            }
        }
        return '';
    }

    function photoRecordFromPicture(pic, index) {
        const pictureKey = pic.PictureKey ? String(pic.PictureKey).replace(/-/g, '') : '';
        const urlParams = normalizeQueryParams(pic.UrlParams || pic.urlParams);
        const urlParamsL = normalizeQueryParams(pic.UrlParamsL || pic.urlParamsL);
        const obqs = obqsFromPicture(pic);
        if (!pictureKey && !urlParams && !obqs) return null;

        return {
            id: pictureKey || pic.PictureKey || `pic-${index}`,
            pictureKey,
            urlParams,
            urlParamsL,
            obqs: obqs || extractObqsFromText(urlParams)[0] || null,
            label: formatCaptureLabel(pic),
        };
    }

    function photosFromViewData() {
        const raw = window.View?.Data?.P;
        if (!raw) return [];
        const json = decodeObqsPayload(raw);
        if (!json) return [];
        let pictures;
        try {
            pictures = JSON.parse(json);
        } catch (_) {
            return [];
        }
        if (!Array.isArray(pictures)) return [];

        const out = [];
        const seen = new Set();
        pictures.forEach((pic, index) => {
            const record = photoRecordFromPicture(pic, index);
            if (!record) return;
            const dedupeKey = record.pictureKey || record.obqs || record.id;
            if (seen.has(dedupeKey)) return;
            seen.add(dedupeKey);
            out.push(record);
        });
        return out;
    }

    function backgroundImageForTile(el) {
        if (window.jQuery) {
            const stored = window.jQuery(el).data('backgroundImage');
            if (stored) return String(stored);
        }
        return el.style?.backgroundImage || '';
    }

    function photosFromDom() {
        const byKey = new Map();

        const add = (record) => {
            if (!record) return;
            const dedupeKey = record.pictureKey || record.obqs || record.id;
            if (!dedupeKey || byKey.has(dedupeKey)) return;
            byKey.set(dedupeKey, record);
        };

        document.querySelectorAll('.photo-grid-picture').forEach((el) => {
            const key = (el.getAttribute('data-picture-key') || '').replace(/-/g, '');
            const bg = backgroundImageForTile(el);
            const token = extractObqsFromText(bg)[0];
            add({
                id: key || token?.slice(0, 16) || 'photo',
                pictureKey: key || '',
                urlParams: token ? `obqs1=${token}` : '',
                urlParamsL: '',
                obqs: token || null,
                label: key,
            });
        });

        if (byKey.size === 0) {
            document.querySelectorAll('img[src*="obqs1"]').forEach((img) => {
                const token = extractObqsFromText(img.src)[0];
                if (!token) return;
                add({
                    id: token.slice(0, 16),
                    pictureKey: '',
                    urlParams: `obqs1=${token}`,
                    urlParamsL: '',
                    obqs: token,
                    label: '',
                });
            });
            document.querySelectorAll('[style*="obqs1"]').forEach((el) => {
                extractObqsFromText(el.getAttribute('style')).forEach((token) => {
                    add({
                        id: token.slice(0, 16),
                        pictureKey: '',
                        urlParams: `obqs1=${token}`,
                        urlParamsL: '',
                        obqs: token,
                        label: '',
                    });
                });
            });
        }

        return Array.from(byKey.values());
    }

    let photos = photosFromViewData();
    const source = photos.length ? 'library' : 'visible';

    if (!photos.length) {
        photos = photosFromDom();
    }

    document.dispatchEvent(
        new CustomEvent('PhotoPassPhotosListed', {
            detail: { photos, source },
        })
    );
})();
