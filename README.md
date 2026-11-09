# pomodoro-swain

Sade bir pomodoro zamanlayıcı ve yapılacaklar listesi. Bağımlılık veya derleme adımı yok; düz HTML, CSS ve JavaScript.

## Özellikler

**Pomodoro**
- Pomodoro (25 dk), kısa mola (5 dk) ve uzun mola (15 dk) modları
- Başlat / duraklat, sıfırla ve atla
- Her 4 pomodorodan sonra otomatik uzun mola
- Süre bitince ses ve (izin verilirse) tarayıcı bildirimi
- Kalan süre sekme başlığında görünür
- Ayarlardan süreler, uzun mola aralığı, otomatik başlatma ve ses değiştirilebilir
- Bugün tamamlanan pomodoro sayısı
- <kbd>Boşluk</kbd> tuşu ile başlat / duraklat

**Yapılacaklar**
- Görev ekleme, tamamlandı işaretleme ve silme
- Tamamlananları tek tıkla temizleme

Görevler, ayarlar ve günlük sayaç tarayıcının `localStorage`'ında saklanır; sayfa yenilense de kaybolmaz. Açık ve koyu tema sistem ayarına göre otomatik seçilir.

## Çalıştırma

`index.html` dosyasını tarayıcıda açmanız yeterli. İsterseniz yerel bir sunucuyla da çalıştırabilirsiniz:

```bash
python3 -m http.server 8000
```

Ardından http://localhost:8000 adresine gidin.

GitHub Pages ile yayınlamak için: **Settings → Pages → Branch: `main` / `(root)`**.

## Dosyalar

- `index.html` — sayfa yapısı
- `style.css` — tasarım (açık/koyu tema, mobil uyumlu)
- `script.js` — zamanlayıcı ve yapılacaklar mantığı
