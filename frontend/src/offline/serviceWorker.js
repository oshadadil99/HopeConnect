// Stub for Phase 2 — offline/PWA support
// Register via: navigator.serviceWorker.register('/sw.js')
// Will handle: cache-first strategy for API responses, background sync for pending case submissions

export function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    });
  }
}
