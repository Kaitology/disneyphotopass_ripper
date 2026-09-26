(function () {
    const script = document.currentScript;
    let pictureKeys = [];
    try {
        pictureKeys = JSON.parse(script?.dataset?.keys || '[]');
    } catch (_) {
        pictureKeys = [];
    }

    const REGION = 'en-GB';
    const MAXDIM = '6000';
    const DEFAULT_PRODUCT_ID = 7;
    const DEFAULT_TEMPLATE_ID = 139;

    function buildTemplateAssetUrl(root, part, version, ts) {
        const q = [
            'flex=true',
            `root=${encodeURIComponent(root)}`,
            `part=${encodeURIComponent(part)}`,
            `version=${encodeURIComponent(String(version))}`,
            `maxdim=${MAXDIM}`,
            `ts=${encodeURIComponent(String(ts || ''))}`,
            `region=${REGION}`,
        ].join('&');
        return `https://www.disneyphotopass.eu/Imaging/GetTemplateAsset.ashx?${q}`;
    }

    function clipArtLayer(templateInstance) {
        const layers = templateInstance?.LayerInstances || [];
        return layers.find(
            (layer) =>
                String(layer.SourceLayerName || '') === 'ClipArt' ||
                String(layer.Source || '').includes('ClipArt')
        );
    }

    async function resolveOne(pictureKey, token, productId, templateId) {
        const body = {
            PictureKey: pictureKey,
            ProductID: productId,
            TemplateID: templateId,
            CollectionType: 'BuildYourOwn',
            PreloadedData: { Products: [], Templates: [] },
        };

        const response = await fetch('/api/Designer/LoadOrCreateProjectForPicture', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                __RequestVerificationToken: token,
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) return null;

        let data;
        try {
            data = await response.json();
        } catch (_) {
            return null;
        }

        const templateInstance = data?.Project?.TemplateInstances?.[0];
        if (!templateInstance?.TemplateRoot) return null;

        const clip = clipArtLayer(templateInstance);
        const part = clip?.Source || 'ClipArt.FixedPosition.NotEditable.png';

        return buildTemplateAssetUrl(
            templateInstance.TemplateRoot,
            part,
            templateInstance.TemplateVersion || 4,
            templateInstance.TemplateUpdateTimestamp
        );
    }

    (async () => {
        const token =
            document.querySelector('input[name="__RequestVerificationToken"]')?.value || '';
        const startProduct = Number(window.View?.StartProductID);
        const productId = startProduct > 0 ? startProduct : DEFAULT_PRODUCT_ID;
        const templateId = DEFAULT_TEMPLATE_ID;

        const urls = {};
        for (const key of pictureKeys) {
            const normalized = String(key).replace(/-/g, '');
            if (!normalized) continue;
            try {
                urls[normalized] = await resolveOne(normalized, token, productId, templateId);
            } catch (_) {
                urls[normalized] = null;
            }
        }

        document.dispatchEvent(
            new CustomEvent('PhotoPassOverlayResolved', {
                detail: { urls },
            })
        );
    })();
})();
