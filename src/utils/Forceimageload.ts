// Add this file as src/utils/forceImageLoad.ts
// Call forceImageLoad() once in your main.tsx or App.tsx

// src/utils/forceImageLoad.ts
// Call forceImageLoad() once in your main.tsx or App.tsx

let _observer: MutationObserver | null = null;

export function forceImageLoad() {
  if (typeof window === 'undefined') return;

  // Disconnect any previous observer before creating a new one.
  // Prevents accumulation on HMR reloads or accidental double-calls.
  if (_observer) {
    _observer.disconnect();
    _observer = null;
  }

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

  const fixAll = () => {
    document.querySelectorAll<HTMLImageElement>('img').forEach(fixImage);
  };

  // Watch for new images added to the DOM (React renders them dynamically)
  _observer = new MutationObserver((mutations) => {
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

  _observer.observe(document.body, { childList: true, subtree: true });

  // Fix existing images immediately and after React hydration delays
  fixAll();
  setTimeout(fixAll, 500);
  setTimeout(fixAll, 1500);
}