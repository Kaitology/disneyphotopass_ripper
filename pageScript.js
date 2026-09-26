(function () {
    const tokens = new Set();

    const collectFromText = (text) => {
        if (!text) return;
        const re = /[?&]obqs1=([^&"'\\)\s]+)/g;
        let match;
        while ((match = re.exec(text)) !== null) {
            let value = match[1];
            try {
                value = decodeURIComponent(value);
            } catch (_) {
                /* keep raw */
            }
            if (value.length > 0) {
                tokens.add(value);
            }
        }
    };

    document.querySelectorAll('img[src*="obqs1"]').forEach((img) => collectFromText(img.src));

    document.querySelectorAll('[style*="obqs1"]').forEach((el) => {
        collectFromText(el.getAttribute('style'));
    });

    collectFromText(document.documentElement.innerHTML);

    if (window.View && Array.isArray(window.View.Pictures)) {
        window.View.Pictures.forEach((pic) => {
            if (pic && pic.PictureKey) {
                tokens.add(String(pic.PictureKey));
            }
        });
    }

    document.dispatchEvent(
        new CustomEvent('PhotoPassObqsExtracted', { detail: Array.from(tokens) })
    );
})();
