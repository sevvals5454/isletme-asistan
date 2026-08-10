import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/sw-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://isletme-asistan.vercel.app"),
  title: "TechİŞ — İşletme Asistanı",
  description: "Müşteri, randevu, paket ve gelir-gider yönetimi tek panelde",
  appleWebApp: { capable: true, title: "TechİŞ", statusBarStyle: "default" },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: "TechİŞ — İşletme Asistanı",
    description: "Müşteri, randevu, paket ve gelir-gider yönetimi tek panelde",
    type: "website",
    locale: "tr_TR",
    images: [{ url: "/og.png", width: 1229, height: 1229, alt: "TechİŞ" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TechİŞ — İşletme Asistanı",
    description: "Müşteri, randevu, paket ve gelir-gider yönetimi tek panelde",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster richColors position="top-right" />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
