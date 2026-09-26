/** Shared URL builders for Disney PhotoPass imaging endpoints. */
const IMAGING_ORIGIN = 'https://www.disneyphotopass.eu/Imaging';
const REGION = 'en-GB';
const MAXDIM = '6000';

const PICTURE_KEY_RE = /^[a-f0-9]{32}$/i;

export const FORMAT = {
    composite: 'composite',
    photo: 'photo',
    overlay: 'overlay',
};

const FORMAT_SUFFIX = {
    [FORMAT.composite]: 'with-frame',
    [FORMAT.photo]: 'photo-only',
    [FORMAT.overlay]: 'frame-only',
};

/** obqs tokens are opaque strings with Kodak-style punctuation. */
export function isObqsToken(value) {
    if (!value || typeof value !== 'string') return false;
    return value.length > 40 && /[:[\]{}]/.test(value);
}

export function normalizePictureKey(value) {
    if (!value) return '';
    const key = String(value).replace(/-/g, '');
    return PICTURE_KEY_RE.test(key) ? key : '';
}

export function normalizeQueryParams(raw) {
    if (!raw) return '';
    let s = String(raw).trim();
    if (s.startsWith('?')) s = s.slice(1);
    if (s.startsWith('&')) s = s.slice(1);
    return s;
}

export function buildTemplateAssetUrl({
    templateRoot,
    templatePart,
    templateVersion,
    templateTs,
    maxdim = MAXDIM,
}) {
    const q = [
        'flex=true',
        `root=${encodeURIComponent(templateRoot)}`,
        `part=${encodeURIComponent(templatePart)}`,
        `version=${encodeURIComponent(String(templateVersion))}`,
        `maxdim=${maxdim}`,
        `ts=${encodeURIComponent(String(templateTs || ''))}`,
        `region=${REGION}`,
    ].join('&');
    return `${IMAGING_ORIGIN}/GetTemplateAsset.ashx?${q}`;
}

/**
 * Build a download URL for one photo and format.
 * Photo: full-res JPEG via PictureKey (editor uses flex=true).
 * Composite: framed preview from UrlParamsL / UrlParams on GetImage.
 * Overlay: template frame asset (URL or template fields).
 */
export function buildDownloadUrl(photo, format) {
    if (!photo) return null;

    switch (format) {
        case FORMAT.photo: {
            const pictureKey = normalizePictureKey(photo.pictureKey || photo.id);
            if (!pictureKey) return null;
            return `${IMAGING_ORIGIN}/GetGraphic.ashx?flex=true&key=${pictureKey}&region=${REGION}&maxdim=${MAXDIM}`;
        }
        case FORMAT.composite: {
            const params = normalizeQueryParams(photo.urlParamsL || photo.urlParams);
            if (params) {
                return `${IMAGING_ORIGIN}/GetImage.ashx?${params}`;
            }
            if (isObqsToken(photo.obqs)) {
                return `${IMAGING_ORIGIN}/GetImage.ashx?obqs1=${encodeURIComponent(photo.obqs)}`;
            }
            return null;
        }
        case FORMAT.overlay: {
            if (photo.templateAssetUrl) return photo.templateAssetUrl;
            if (photo.templateRoot && photo.templatePart) {
                return buildTemplateAssetUrl({
                    templateRoot: photo.templateRoot,
                    templatePart: photo.templatePart,
                    templateVersion: photo.templateVersion,
                    templateTs: photo.templateTs,
                });
            }
            return null;
        }
        default:
            return null;
    }
}

export function buildThumbUrl(photo) {
    if (photo && typeof photo === 'object') {
        const params = normalizeQueryParams(photo.urlParams || photo.urlParamsL);
        if (params) {
            return `${IMAGING_ORIGIN}/GetImage.ashx?${params}`;
        }
        if (isObqsToken(photo.obqs)) {
            return `${IMAGING_ORIGIN}/GetImage.ashx?obqs1=${encodeURIComponent(photo.obqs)}`;
        }
    }
    if (isObqsToken(photo)) {
        return `${IMAGING_ORIGIN}/GetImage.ashx?obqs1=${encodeURIComponent(photo)}`;
    }
    return '';
}

export function canDownloadFormat(photo, format, options = {}) {
    if (!photo) return false;
    const { overlayResolved = false } = options;

    switch (format) {
        case FORMAT.photo:
            return Boolean(normalizePictureKey(photo.pictureKey || photo.id));
        case FORMAT.composite:
            return Boolean(
                normalizeQueryParams(photo.urlParamsL || photo.urlParams) || isObqsToken(photo.obqs)
            );
        case FORMAT.overlay:
            if (photo.templateAssetUrl || (photo.templateRoot && photo.templatePart)) {
                return true;
            }
            if (overlayResolved) {
                return false;
            }
            return Boolean(normalizePictureKey(photo.pictureKey || photo.id));
        default:
            return false;
    }
}

export function buildDownloadFilename(photo, format, sequence = 0) {
    const suffix = FORMAT_SUFFIX[format] || 'photo';
    const ext = format === FORMAT.overlay ? 'png' : 'jpg';
    const key = photo?.pictureKey || photo?.id || photo?.obqs || 'photo';
    const id = String(key).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'photo';
    const seq = String(sequence).padStart(3, '0');
    return `photopass-${seq}-${id}-${suffix}.${ext}`;
}
