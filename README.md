# Takviye Hatırlatıcısı PWA

Kız arkadaşın için günlük takviye hatırlatma uygulaması.

## Mantık

- Kız arkadaşın linki Safari'de açar.
- Paylaş > Ana Ekrana Ekle yapar.
- Ana ekrandaki uygulamayı açar.
- Bildirimleri aç butonuna basar.
- Sen `/admin.html` panelinden saati ve mesajları yönetirsin.
- Server her dakika saati kontrol eder, belirlenen saatte Web Push gönderir.

## Lokal çalıştırma

```bash
npm install
npm run generate-vapid
```

`.env.example` dosyasını `.env` diye kopyala ve değerleri doldur:

```bash
PORT=3000
ADMIN_KEY=super-gizli-sifre
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
CONTACT_EMAIL=mailto:seninmailin@example.com
TZ=Europe/Istanbul
```

Sonra:

```bash
npm start
```

Ana uygulama:

```text
http://localhost:3000
```

Admin panel:

```text
http://localhost:3000/admin.html?key=super-gizli-sifre
```

## Render'a yükleme

1. GitHub'a repo olarak yükle.
2. Render > New Web Service.
3. Build command: `npm install`
4. Start command: `npm start`
5. Environment Variables:
   - `ADMIN_KEY`
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `CONTACT_EMAIL`
   - `TZ=Europe/Istanbul`

## Önemli iPhone notu

iPhone'da bildirim için:
1. Safari'den aç.
2. Ana ekrana ekle.
3. Ana ekrandaki ikonla aç.
4. Bildirim izni ver.

Tarayıcı sekmesinden bildirim izni çıkmayabilir; ana ekrandan açmak önemli.
