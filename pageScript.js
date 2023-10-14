if (window.View && Array.isArray(window.View.Pictures)) {
    document.dispatchEvent(new CustomEvent('ViewPicturesExtracted', { detail: window.View.Pictures }));
}
