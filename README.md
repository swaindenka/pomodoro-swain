# pomodoro-swain

Pomodoro zamanlayıcı ve yapılacaklar listesi, artık sanal bir çalışma mekanında. Odanda, kafede, kütüphanede ya da terasta çalış; karakterini yürüt, mekanını dekore et, masada çalış, kanepede mola ver ve arkadaşlarınla aynı yerde birlikte ders çalış.

## Özellikler

**Çalışma mekanları**
- **Odam**, **Kafe**, **Kütüphane** ve **Teras**: her birinin kendine özgü duvarı, zemini, kapısı ve hazır bir düzeni var.
- Her mekan ayrı ayrı düzenlenir ve ayrı saklanır; kafeyi değiştirmek odanı etkilemez.
- Birlikte çalışırken mekanı oda sahibi seçer, herkes onun mekanına geçer.

**Oda ve karakter**
- Piksel sanat bir oda. Tüm grafikler kodla çizilir, harici görsel dosyası yoktur.
- <kbd>WASD</kbd> / ok tuşlarıyla ya da tıklayarak (telefonda dokunarak) yürüme. Engellerin etrafından yol bulunur.
- Eşyalarla etkileşim: kanepe, koltuk, minder, armut koltuk, bank ve taburede **oturma**; yatakta **uzanma**; çalışma masası, kafe masası, okuma masası ve bar tezgahında **çalışma**. Masanın arkasına oturan karakter önden, önüne oturan sırtı dönük görünür; odak süresi işlerken yazar.
- Kediyi sevebilirsin. Şömine yanar, plak döner, kahveler tüter, neon tabela ve ışık zinciri parlar.
- “Odak başlayınca masaya geç” ayarı: Başlat'a basınca karakter en yakın boş çalışma yerine yürür.
- Karakter özelleştirme: isim, ten rengi, saç modeli ve rengi, kıyafet renkleri.
- Gerçek saate göre gündüz ve gece: penceredeki gökyüzü değişir, akşam lambalar yanar, duvar saati gerçek saati gösterir.
- Mantar panoda, yapılacaklar listende kalan görev kadar not görünür.

**Düzenleme**
- 41 eşya, çoğu birden fazla renkte (kumaşlar 8, ahşaplar 5 renk):
  - **Mobilya:** kanepe, koltuk, minder, armut koltuk, bank, tabure, çalışma masası, kafe masası, okuma masası, bar tezgahı, sehpa, komodin, yatak, kitaplık, dar kitaplık, gardırop, pasta vitrini
  - **Dekor:** bitki, büyük bitki, kaktüs, çiçek saksısı, lambader, fener, şömine, pikap, dünya küresi, kedi, halı, yuvarlak halı
  - **Duvar:** pencere, kemerli pencere, mantar pano, menü panosu, duvar rafı, tablo, poster, duvar saati, aplik, ışık zinciri, neon tabela, askılı saksı
- Eşya ekleme (rengi önceden seçerek), taşıma, çoğaltma, renk değiştirme ve kaldırma.
- Görünüm: 9 duvar rengi; düz, çizgili, puantiyeli, tuğla, lambri ya da çit ve gökyüzü deseni; meşe, ceviz, fayans, halıfleks, dama, hasır parke, taş, çim ve ahşap güverte zemin.
- Mekanlar tarayıcıda saklanır, sayfa yenilense de kaybolmaz.

**Birlikte çalışma (çok oyunculu)**
- Bir oda açıp 5 karakterlik kodu ya da davet bağlantısını paylaşırsın; en fazla 8 kişi katılabilir.
- Herkes birbirinin karakterini, nerede oturduğunu ve ne yaptığını görür.
- **Ortak pomodoro zamanlayıcı:** biri başlattığında herkes için başlar, süre bitince herkese bildirilir.
- Sohbet. Mesajlar karakterin üstünde balon olarak da görünür.
- Odayı sahibi düzenler. Sahip ayrılırsa sahiplik odadaki bir sonraki kişiye geçer.

**Pomodoro ve yapılacaklar**
- Pomodoro, kısa mola ve uzun mola; başlat / duraklat, sıfırla, atla.
- Her 4 pomodorodan sonra uzun mola (ayarlanabilir), süre bitince ses ve bildirim.
- Görev ekleme, tamamlama, silme; bugün tamamlanan pomodoro sayısı.

## Kontroller

| Ne | Klavye | Fare / dokunmatik |
| --- | --- | --- |
| Yürü | <kbd>WASD</kbd> / ok tuşları | Odada bir yere tıkla / dokun |
| Otur, uzan, çalış | Eşyanın yanında <kbd>E</kbd> | Eşyaya / istediğin sandalyeye tıkla |
| Kalk | Hareket tuşu ya da <kbd>Esc</kbd> | Başka bir yere tıkla |
| Zamanlayıcıyı başlat / duraklat | <kbd>Boşluk</kbd> | Başlat düğmesi |
| Düzenlemede seçili eşyayı kaldır | <kbd>Delete</kbd> | Kaldır düğmesi |

## Çalıştırma

Node.js 18 veya üstü gerekir.

```bash
npm install
```

```bash
npm start
```

Ardından http://localhost:3000 adresini aç. Aynı ağdaki arkadaşların `http://<bilgisayarının-ip-adresi>:3000` adresinden katılabilir.

Tek başına kullanmak için sunucu şart değil: `public/index.html` dosyasını doğrudan tarayıcıda açabilirsin. Bu durumda yalnızca çok oyunculu mod çalışmaz.

## Yayınlama

**Render, Railway, Fly.io gibi bir Node.js barındırma (önerilen):** Hem siteyi hem çok oyunculu sunucuyu tek adreste çalıştırır.
- Build komutu: `npm install`
- Start komutu: `npm start`
- Sunucu `PORT` ortam değişkenini kullanır. Sağlık kontrolü için `/healthz` adresi vardır.

**GitHub Pages (yalnızca statik site):** Settings → Pages → Branch: `main` / `(root)`. Kökteki `index.html` seni `public/` klasörüne yönlendirir. Çok oyunculu modu kullanmak için sunucuyu ayrıca bir yerde çalıştırıp adresini `public/js/config.js` dosyasındaki `server` alanına yaz.

## Test

```bash
npm test
```

Testler mekan ve oda doğrulama kurallarını ve sunucuyu (statik dosyalar, oda oluşturma/katılma, konum ve sohbet iletimi, oda sahipliği, ortak zamanlayıcı, oda kapasitesi) kapsar.

## Proje yapısı

```
server.js            Statik dosya + WebSocket sunucusu (odalar, ortak zamanlayıcı, sohbet)
public/
  index.html         Sayfa yapısı
  style.css          Tasarım (açık/koyu tema, mobil uyumlu)
  js/shared.js       Tarayıcı ve sunucunun ortak kullandığı kurallar ve doğrulama
  js/art.js          Piksel sanat çekirdeği: duvar, zemin, kapı, karakter
  js/items.js        Eşya kataloğu: çizimler, renkler, oturma yerleri, ışıklar
  js/game.js         Hareket, yol bulma, etkileşim, düzenleme modu, çizim
  js/editor.js       Düzenleme paneli
  js/timer.js        Pomodoro (tek başına ve ortak oda modu)
  js/todos.js        Yapılacaklar listesi
  js/net.js          Çok oyunculu bağlantı, oda kartı, sohbet
  js/main.js         Karakter penceresi
  js/config.js       Ayrı sunucu adresi (isteğe bağlı)
tests/               node:test testleri
```
