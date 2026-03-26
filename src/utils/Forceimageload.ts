// Add this file as src/utils/forceImageLoad.ts
// Call forceImageLoad() once in your main.tsx or App.tsx

export function forceImageLoad() {
  if (typeof window === 'undefined') return;

  // Edge intercepts the loading attribute and defers images when it detects
  // low memory or efficiency mode. This observer watches for any img element
  // that has a src but hasn't loaded, and forces it by re-assigning the src.
  const fixImage = (img: HTMLImageElement) => {
    if (img.complete && img.naturalWidth > 0) return; // already loaded
    if (!img.src && !img.dataset.src) return;         // no src yet

    // Remove loading attribute — Edge uses this as the trigger for its intervention
    img.removeAttribute('loading');

    // Force reload by re-assigning src
    const src = img.src;
    if (src) {
      img.src = '';
      img.src = src;
    }
  };

  // Fix all existing images on the page
  const fixAll = () => {
    document.querySelectorAll<HTMLImageElement>('img').forEach(fixImage);
  };

  // Watch for new images added to the DOM (React renders them dynamically)
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLImageElement) {
          fixImage(node);
        } else if (node instanceof Element) {
          node.querySelectorAll<HTMLImageElement>('img').forEach(fixImage);
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Also fix on DOMContentLoaded and after a short delay for React hydration
  fixAll();
  setTimeout(fixAll, 500);
  setTimeout(fixAll, 1500);
}