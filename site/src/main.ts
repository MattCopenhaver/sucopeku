import './style.css';

// Registering with a URL resolved against the document's base is what makes
// offline support work at any deployment prefix (FR-030). A service worker's
// scope defaults to the directory it is served from, so sw.js at /pr-42/sw.js
// controls /pr-42/ — the whole application — and at / it controls the site.
// Hardcoding '/sw.js' would break every preview.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const workerUrl = new URL('sw.js', document.baseURI);
    navigator.serviceWorker.register(workerUrl).catch((error: unknown) => {
      // A failed registration must not break the page: offline is an
      // enhancement on top of a site that already works online.
      console.warn('Service worker registration failed', error);
    });
  });
}
