import type { CapacitorConfig } from "@capacitor/cli";

// TechİŞ mobil kabuk. Uygulama SSR/auth/API içerdiği için native içine paketlemek
// yerine canlı siteyi yükleriz (server.url). Oturum native depoda kalıcı olur,
// tek kod tabanı hem web hem mobilde çalışır.
const config: CapacitorConfig = {
  appId: "com.veritechsoft.techis",
  appName: "TechİŞ",
  webDir: "public",
  server: {
    // Yayınlanınca kendi alan adınla değiştir (örn. https://app.techis.com)
    url: "https://isletme-asistan.vercel.app",
    cleartext: false,
  },
};

export default config;
