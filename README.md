# İşletme Asistanı

Küçük işletmeler için **müşteri, randevu, paket ve ödeme yönetimini** tek panelde toplayan, mobil uyumlu, **sektör bağımsız** bir yönetim uygulaması. Kuaför, pilates/spor stüdyosu, güzellik salonu, özel ders, klinik gibi randevuyla çalışan her işletme için uyarlanabilir.

> Portföy / öğrenme projesi. Ücretsiz çalışır (paralı API bağımlılığı yoktur).

## Özellikler

- **Müşteri yönetimi** — notlar, etiketler, Türk telefon formatı/doğrulama, KVKK açık rıza takibi
- **Randevu** — hizmet bazlı süre/fiyat, durum takibi (planlandı/tamamlandı/iptal/gelmedi), **tekrarlayan randevu** (haftalık/2 haftada bir/aylık), **takvim görünümü**
- **Paket & üyelik** — *seans paketi* (ders hakkı bazlı) ve *aylık üyelik* (ödeme günü takipli); otomatik kalan seans hesabı
- **Telafi sistemi** — kaçırılan randevu için telafi kaydı + pakete saymayan telafi randevusu (paket başına 1 hak, alındığı ay içinde)
- **Çalışanlar** — müşteri/randevuya sorumlu çalışan atama, çalışana göre filtre ve performans raporu
- **Çalışma saatleri & kapalı günler** — randevuda uygunluk uyarısı (opt-in)
- **Bildirim merkezi** — yaklaşan randevu, ödeme ve bitmek üzere paket bildirimleri; her birinde önceden hazırlanmış WhatsApp mesajı
- **Mesajlaşma** — dinamik şablonlar (`{ad} {tarih} {saat} {hizmet} {paket} {kalan} {isletme}`), toplu mesaj (segment + KVKK), hatırlatma takibi — tümü WhatsApp (wa.me) ile, ücretsiz
- **Ödeme defteri** — fiilen tahsil edilen ödemelerin kaydı (nakit/kart/havale) + IBAN'lı ödeme mesajı
- **Raporlar** — aylık gelir tahmini, tahsilat, tamamlanma oranı, no-show, en çok kazandıran hizmetler, sadık müşteriler, çalışan performansı

## Teknolojiler

| Katman | Teknoloji |
|---|---|
| Framework | Next.js 16 (App Router, Server Components) |
| Dil | TypeScript |
| UI | React 19, Tailwind CSS 4, lucide-react, sonner |
| Veritabanı & Auth | Supabase (PostgreSQL + Auth + Row Level Security) |
| Doğrulama | Zod |

## Mimari notlar

- **Çok kiracılı (multi-tenant):** her satır `organization_id` ile sahibine bağlı; **RLS** ile her işletme yalnızca kendi verisini görür.
- **Sektör bağımsız:** tablo ve arayüz metinleri jeneriktir (hasta/öğrenci yerine `customers`, ders/tedavi yerine `services`). Sektöre özel kavramlar (paket türü, telafi, çalışan) verisi yoksa arayüzde görünmez.
- **Saat dilimi:** tüm tarih/saat işlemleri Türkiye'ye (Europe/Istanbul) sabitlenmiştir; sunucu UTC'de çalışsa bile doğru.

## Kurulum

1. **Supabase projesi oluştur** ve `supabase/schema.sql` dosyasını SQL Editor'de çalıştır (tüm tablolar + RLS; idempotent — tekrar çalıştırmak güvenli).
2. **`.env.local`** oluştur:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
3. Bağımlılıklar ve geliştirme sunucusu:
   ```bash
   npm install
   npm run dev
   ```
   → http://localhost:3000

## Veritabanı

Şema `supabase/schema.sql` içindedir; artımlı değişiklikler `supabase/migrations/` altında (001–007). Mevcut bir veritabanını güncellemek için `schema.sql`'i yeniden çalıştırmak yeterlidir (`create ... if not exists`, `add column if not exists`, `drop policy if exists` ile idempotent).

Başlıca tablolar: `organizations`, `organization_members`, `customers`, `services`, `appointments`, `customer_packages`, `makeups`, `staff`, `business_hours`, `closed_days`, `payments`.
