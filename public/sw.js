// Minimal service worker — kurulabilirlik (PWA) için fetch dinleyicisi.
// Ağ geçişli (passthrough): agresif cache yok → bayat içerik sorunu olmaz.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("fetch", () => {
  // Varsayılan ağ davranışı; sadece SW'nin var olması yeterli.
});
