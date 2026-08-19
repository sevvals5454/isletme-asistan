// Service worker — PWA kurulabilirliği + push bildirim.
// Ağ geçişli (agresif cache yok → bayat içerik olmaz).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("fetch", () => {
  // Varsayılan ağ davranışı.
});

// Sunucudan gelen push → bildirim göster (uygulama kapalıyken bile).
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "TechİŞ";
  const options = {
    body: data.body || "",
    icon: "/icon.png",
    badge: "/icon.png",
    data: { url: data.url || "/dashboard" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Bildirime tıklanınca uygulamayı aç/odakla.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const c of list) {
          if ("focus" in c && c.url.includes(url)) return c.focus();
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
      }),
  );
});
