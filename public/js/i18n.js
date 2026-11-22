/*
 * Dil desteği: İngilizce (varsayılan) ve Türkçe.
 * Metinlerin İngilizcesi anahtardır; Türkçe seçiliyse sözlükteki karşılığı kullanılır, yoksa İngilizcesi.
 * Değişkenler {ad} biçiminde yazılır: t('{n} tasks left', { n: 3 }).
 * Sayfadaki sabit metinler (HTML) yüklenirken çevrilir; JavaScript'in ürettiği metinler t() ile çevrilir.
 * Seçim tarayıcıda saklanır (Ayarlar → Language / Dil).
 */
(function () {
  'use strict';

  const KEY = 'pomodoro.lang';
  const LANGS = ['en', 'tr'];
  let lang = 'en';
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (LANGS.includes(saved)) lang = saved;
  } catch {
    /* tarayıcı depolaması yok: İngilizce */
  }

  // ---------- Türkçe sözlük ----------
  const TR = {
    // üst çubuk ve genel
    'Install app': 'Uygulamayı yükle',
    Sounds: 'Sesler',
    Character: 'Karakter',
    Edit: 'Düzenle',
    'Done editing': 'Düzenlemeyi bitir',
    'Study together': 'Birlikte çalış',
    'Room {code}': 'Oda {code}',
    'Daily goal and focus stats': 'Günlük hedef ve odak istatistikleri',
    'Room actions': 'Oda işlemleri',
    Tasks: 'Görevler',
    Place: 'Mekan',
    'Study place': 'Çalışma mekanı',
    'Study in your room, a café, a library or on a terrace; decorate your place and do pomodoros with friends.':
      'Odanda, bir kafede, kütüphanede ya da terasta çalış; mekanını süsle ve arkadaşlarınla pomodoro yap.',
    Close: 'Kapat',
    Save: 'Kaydet',
    Add: 'Ekle',
    Delete: 'Sil',
    Clear: 'Temizle',
    Today: 'Bugün',
    Tomorrow: 'Yarın',
    Yesterday: 'Dün',
    Done: 'Bitti',
    Someone: 'Biri',
    ' and ': ' ve ',
    '{x} h': '{x} sa',
    '{x} min': '{x} dk',
    Pomodoro: 'Pomodoro',
    '{n} pomodoro': '{n} pomodoro',
    '{n} pomodoros': '{n} pomodoro',
    '{n} day': '{n} gün',
    '{n} days': '{n} gün',
    '{n} note': '{n} not',
    '{n} notes': '{n} not',
    '{n} task': '{n} görev',
    '{n} tasks': '{n} görev',

    // mekanlar
    'My room': 'Odam',
    Café: 'Kafe',
    Library: 'Kütüphane',
    Terrace: 'Teras',
    Attic: 'Çatı katı',
    'Art studio': 'Atölye',
    Kitchen: 'Mutfak',
    'Place: {venue}': 'Mekan: {venue}',
    'The host picks the place': 'Mekanı oda sahibi seçer',

    // oda çubuğu ve sohbet
    Room: 'Oda',
    Invite: 'Davet et',
    Leave: 'Ayrıl',
    'Copy the invite link': 'Davet bağlantısını kopyala',
    'Leave the room': 'Odadan ayrıl',
    'People in the room': 'Odadakiler',
    'Room chat': 'Oda sohbeti',
    Chat: 'Sohbet',
    'Invite link': 'Davet bağlantısı',
    'Press Enter to chat': 'Yazmak için Enter',
    'Tap to chat': 'Yazmak için dokun',
    'Write a message…': 'Bir mesaj yaz…',
    'Chat message': 'Sohbet mesajı',
    Send: 'Gönder',
    '{n} person': '{n} kişi',
    '{n} people': '{n} kişi',
    '{people} in the room': 'Odada {people}',
    'You are the host': 'Odanın sahibi sensin',
    'Host: {name}': 'Oda sahibi: {name}',
    'Room {code} · {host}': 'Oda {code} · {host}',
    '{name} (you)': '{name} (sen)',
    host: 'sahip',
    'Lost connection to the server. You are back in your own place.': 'Sunucuyla bağlantı koptu. Kendi mekanına döndün.',
    'Room is ready. Share the code or link with your friends.': 'Oda hazır. Kodu ya da bağlantıyı arkadaşlarınla paylaş.',
    'You joined the room. Happy studying!': 'Odaya katıldın. İyi çalışmalar!',
    '{name} joined.': '{name} katıldı.',
    '{name} left.': '{name} ayrıldı.',
    'You are now the host and can edit the room.': 'Artık odanın sahibisin ve odayı düzenleyebilirsin.',
    '{name} is now the host.': 'Odanın yeni sahibi: {name}.',
    '{name} started the timer.': '{name} zamanlayıcıyı başlattı.',
    '{name} paused the timer.': '{name} zamanlayıcıyı duraklattı.',
    '{name} reset the timer.': '{name} zamanlayıcıyı sıfırladı.',
    '{name} skipped the session.': '{name} oturumu atladı.',
    '{name} changed the mode.': '{name} modu değiştirdi.',
    '{name} changed the durations.': '{name} süreleri değiştirdi.',
    'Something went wrong.': 'Bir şeyler ters gitti.',
    'The server is busy right now. Please try again later.': 'Sunucu şu an meşgul. Lütfen biraz sonra tekrar dene.',
    'No room found with that code. Please check it.': 'Bu kodla bir oda bulunamadı. Lütfen kontrol et.',
    'The room is full (up to 8 people).': 'Oda dolu (en fazla 8 kişi).',
    'Invite link copied.': 'Davet bağlantısı kopyalandı.',
    'You left the room.': 'Odadan ayrıldın.',
    "Couldn't connect to the server. Make sure it is running.": 'Sunucuya bağlanılamadı. Çalıştığından emin ol.',
    'Check the room code (e.g. K7M2Q).': 'Oda kodunu kontrol et (ör. K7M2Q).',
    Working: 'Çalışıyor',
    'Playing drums': 'Davul çalıyor',
    'Playing piano': 'Piyano çalıyor',
    Resting: 'Dinleniyor',
    'Working out': 'Spor yapıyor',
    Sitting: 'Oturuyor',
    Walking: 'Yürüyor',
    Standing: 'Ayakta',
    'Open a room and share the code with your friends. Everyone in the room can see each other, chat and study with the same pomodoro timer.':
      'Bir oda aç ve kodu arkadaşlarınla paylaş. Odadaki herkes birbirini görür, sohbet eder ve aynı pomodoro zamanlayıcısıyla çalışır.',
    'Your name': 'Adın',
    'e.g. Alex': 'ör. Ayşe',
    'Open a new room': 'Yeni oda aç',
    'or join a room': 'ya da bir odaya katıl',
    'Room code': 'Oda kodu',
    Join: 'Katıl',
    'Multiplayer needs a server. Run the project with': 'Birlikte çalışmak için sunucu gerekir. Projeyi şununla çalıştır:',
    'and open': 've şunu aç:',

    // ışık
    Lighting: 'Işıklandırma',
    'Lighting (L turns the room lights on and off)': 'Işıklandırma (L tuşu tavan ışığını açıp kapatır)',
    'Time of day': 'Günün saati',
    'Room lights': 'Tavan ışığı',
    'Lamp brightness': 'Lamba parlaklığı',
    'Light color': 'Işık rengi',
    'Reset lighting': 'Işıkları sıfırla',
    'Real time': 'Gerçek saat',
    Morning: 'Sabah',
    Day: 'Gündüz',
    Sunset: 'Gün batımı',
    Night: 'Gece',
    Auto: 'Otomatik',
    On: 'Açık',
    Off: 'Kapalı',
    Warm: 'Sıcak',
    'Soft white': 'Yumuşak beyaz',
    Cool: 'Soğuk',
    Candle: 'Mum',
    Rose: 'Gül pembesi',
    'Room lights off.': 'Tavan ışığı kapandı.',
    'Room lights on.': 'Tavan ışığı açıldı.',

    // ipuçları
    '/ arrow keys or click to walk · Click furniture: sit, lie down, work ·': '/ ok tuşları ya da tıklayarak yürü · Eşyaya tıkla: otur, uzan, çalış ·',
    'interact ·': 'etkileşim ·',
    'timer ·': 'zamanlayıcı ·',
    reactions: 'tepkiler',
    'Tap the room to walk · Tap furniture: sit, lie down, work': 'Yürümek için odaya dokun · Eşyaya dokun: otur, uzan, çalış',
    'Your study place. Click or use WASD and the arrow keys to walk; click furniture to sit, lie down or work.':
      'Çalışma mekanın. Yürümek için tıkla ya da WASD ve ok tuşlarını kullan; oturmak, uzanmak ya da çalışmak için eşyaya tıkla.',
    'Quick reactions': 'Hızlı tepkiler',
    Wave: 'El salla',
    'Thumbs up': 'Beğen',
    'Coffee break': 'Kahve molası',
    'Love it': 'Bayıldım',
    Celebrate: 'Kutla',
    'Keep going': 'Devam',

    // düzenleme
    'Edit place': 'Mekanı düzenle',
    'Edit section': 'Düzenleme bölümü',
    Seating: 'Oturma',
    Tables: 'Masalar',
    Tabletop: 'Masa üstü',
    Storage: 'Depolama',
    Plants: 'Bitkiler',
    Decor: 'Dekor',
    Fun: 'Eğlence',
    Pets: 'Evcil hayvanlar',
    Sport: 'Spor',
    Outdoor: 'Dış mekan',
    Seasonal: 'Mevsimlik',
    Rugs: 'Halılar',
    Wall: 'Duvar',
    Look: 'Görünüm',
    Undo: 'Geri al',
    'Undo (Ctrl+Z)': 'Geri al (Ctrl+Z)',
    Redo: 'Yinele',
    'Redo (Ctrl+Y)': 'Yinele (Ctrl+Y)',
    'Wall color': 'Duvar rengi',
    'Wall pattern': 'Duvar deseni',
    Floor: 'Zemin',
    'Reset this place to default': 'Bu mekanı varsayılana döndür',
    'Are you sure? Click again': 'Emin misin? Tekrar tıkla',
    '{venue} was reset to default.': '{venue} varsayılana döndürüldü.',
    Color: 'Renk',
    Rotate: 'Döndür',
    'Rotate (R)': 'Döndür (R)',
    Move: 'Taşı',
    Duplicate: 'Kopyala',
    Remove: 'Kaldır',
    'Write on the note…': 'Nota yaz…',
    'Note text': 'Not yazısı',
    'Add all': 'Hepsini ekle',
    'Place the whole pack in free spots': 'Paketin tamamını boş yerlere yerleştir',
    'Winter pack': 'Kış paketi',
    'Autumn pack': 'Sonbahar paketi',
    '{n} colors': '{n} renk',
    'New: {name}': 'Yeni: {name}',
    'Only the host can edit this room': 'Bu odayı yalnızca oda sahibi düzenleyebilir',
    'Tap to preview, tap the same spot again to place. You can pick the color and rotate it first.':
      'Önizlemek için dokun, yerleştirmek için aynı yere tekrar dokun. Önce rengini seçip döndürebilirsin.',
    'Click to place. R rotates, arrow keys nudge, Esc cancels.': 'Yerleştirmek için tıkla. R döndürür, ok tuşları kaydırır, Esc vazgeçer.',
    'Click to place. Arrow keys nudge, Esc cancels.': 'Yerleştirmek için tıkla. Ok tuşları kaydırır, Esc vazgeçer.',
    'Drag the item to move it, or use the buttons to rotate, duplicate, recolor or remove it.':
      'Taşımak için eşyayı sürükle ya da döndürmek, kopyalamak, rengini değiştirmek veya kaldırmak için düğmeleri kullan.',
    'Drag to move or use the arrow keys. R rotates. Delete removes it.': 'Taşımak için sürükle ya da ok tuşlarını kullan. R döndürür. Delete kaldırır.',
    'Drag to move or use the arrow keys. Delete removes it.': 'Taşımak için sürükle ya da ok tuşlarını kullan. Delete kaldırır.',
    'Tabletop items go on tables, desks, shelves and counters, and move along with them.':
      'Masa üstü eşyaları masalara, raflara ve tezgahlara konur ve onlarla birlikte taşınır.',
    'Add a whole winter or autumn pack in one click, or pick single items. Undo takes a pack away in one step.':
      'Tek tıkla bütün bir kış ya da sonbahar paketi ekle ya da eşyaları tek tek seç. Geri al, paketi tek adımda kaldırır.',
    'The cat, dog and rabbit wander around when they wake up. Click the bird cage to hear it sing, and feed the fish in a bowl or aquarium.':
      'Kedi, köpek ve tavşan uyanınca dolaşır. Kuşun ötmesi için kafese tıkla; fanustaki ya da akvaryumdaki balıkları besle.',
    'Pick an item to add, or tap an item in the room to edit it. Drag items to move them.':
      'Eklemek için bir eşya seç ya da düzenlemek için odadaki bir eşyaya dokun. Taşımak için eşyaları sürükle.',
    'Pick an item to add, or click an item in the room to edit it. Drag items to move them.':
      'Eklemek için bir eşya seç ya da düzenlemek için odadaki bir eşyaya tıkla. Taşımak için eşyaları sürükle.',

    // oyun
    "Can't get there.": 'Oraya gidilemiyor.',
    'That seat is taken.': 'Bu yer dolu.',
    '{name} moved. Try again when they are standing still.': '{name} yer değiştirdi. Dururken tekrar dene.',
    'You fed the fish.': 'Balıkları besledin.',
    'You fed the fish in the aquarium.': 'Akvaryumdaki balıkları besledin.',
    'Lo-fi music is on. Click the record player again to stop it.': 'Lo-fi müzik açık. Durdurmak için pikaba tekrar tıkla.',
    'Music stopped.': 'Müzik durdu.',
    'Nowhere to sit nearby.': 'Yakında oturacak yer yok.',
    'All work spots are taken.': 'Bütün çalışma yerleri dolu.',
    'No desk here yet. You can add one from Edit.': 'Burada henüz masa yok. Düzenle bölümünden ekleyebilirsin.',
    'Small items go on free spots of tables, shelves and counters.': 'Küçük eşyalar masaların, rafların ve tezgahların boş yerlerine konur.',
    "It doesn't fit there. Try another spot.": 'Oraya sığmıyor. Başka bir yer dene.',
    'You can place up to {n} items.': 'En fazla {n} eşya yerleştirebilirsin.',
    'No free spots for this pack. Make some room first.': 'Bu paket için boş yer yok. Önce biraz yer aç.',
    'Added the {pack} ({n} items). Undo removes it.': 'Paket eklendi: {pack} ({n} eşya). Geri al ile kaldırabilirsin.',
    'Added {added} of {wanted} items; there was no room for the rest.': '{wanted} eşyanın {added} tanesi eklendi; kalanlara yer yoktu.',
    'No room to rotate it here. Move it somewhere roomier first.': 'Burada döndürmeye yer yok. Önce daha geniş bir yere taşı.',
    'No room to stand next to {name}.': '{name} yanında duracak yer yok.',
    'Daily goal reached · {count}!': 'Günlük hedef tamam · {count}!',
    'Empty note. Write on it in Edit mode.': 'Boş not. Düzenle modunda üzerine yazabilirsin.',
    'You sat down to work. Start the timer to focus.': 'Çalışmak için oturdun. Odaklanmak için zamanlayıcıyı başlat.',

    // zamanlayıcı
    Timer: 'Zamanlayıcı',
    Mode: 'Mod',
    'Short Break': 'Kısa mola',
    'Long Break': 'Uzun mola',
    'Time to focus': 'Odaklanma zamanı',
    Focus: 'Odak',
    'Short break': 'Kısa mola',
    'Long break': 'Uzun mola',
    'Working on': 'Üzerinde çalışılan:',
    'Stop focusing on this task': 'Bu göreve odaklanmayı bırak',
    'Shared timer · everyone in the room sees it': 'Ortak zamanlayıcı · odadaki herkes görür',
    Reset: 'Sıfırla',
    Start: 'Başlat',
    Pause: 'Duraklat',
    Resume: 'Devam',
    Skip: 'Atla',
    'Pomodoro complete': 'Pomodoro tamamlandı',
    'Take a long break.': 'Uzun bir mola ver.',
    'Take a short break.': 'Kısa bir mola ver.',
    'Pomodoro complete! Take a break on the sofa or in bed.': 'Pomodoro tamamlandı! Kanepede ya da yatakta mola ver.',
    'Break is over': 'Mola bitti',
    'Time to focus!': 'Odaklanma zamanı!',
    'Break is over, time to focus.': 'Mola bitti, odaklanma zamanı.',
    'The timer is running. Click again to switch.': 'Zamanlayıcı çalışıyor. Geçmek için tekrar tıkla.',
    Settings: 'Ayarlar',
    'Pomodoro (min)': 'Pomodoro (dk)',
    'Short break (min)': 'Kısa mola (dk)',
    'Long break (min)': 'Uzun mola (dk)',
    'Long break every': 'Uzun mola sıklığı',
    'Daily goal (pomodoros)': 'Günlük hedef (pomodoro)',
    'Auto-start the next session': 'Sonraki oturumu otomatik başlat',
    'Walk to a desk when focus starts': 'Odak başlayınca masaya git',
    'Play a sound when time is up': 'Süre bitince ses çal',
    'Focus mode while the timer runs (fades the rest of the page and mutes sound effects)':
      'Zamanlayıcı çalışırken odak modu (sayfanın geri kalanı soluklaşır, ses efektleri susar)',
    'Seasons in the windows (snow in winter, falling leaves in autumn)': 'Pencerelerde mevsimler (kışın kar, sonbaharda düşen yapraklar)',
    'Show the clock at the top': 'Saati üstte göster',

    // saat
    'Click to switch between 12- and 24-hour time': '12 / 24 saat biçimi arasında geçmek için tıkla',
    '{time}, {date}. Switch between 12- and 24-hour time.': '{time}, {date}. 12 / 24 saat biçimi arasında geç.',
    AM: 'ÖÖ',
    PM: 'ÖS',

    // mola önerileri
    'Break idea': 'Mola önerisi',
    'Do it': 'Yap',
    'Another idea': 'Başka öneri',
    'Start {s}s': '{s} sn başlat',
    '{s}s': '{s} sn',
    'Nice! ✓': 'Harika! ✓',
    'Done! ✓': 'Tamam! ✓',
    'Stand up and stretch your arms and back.': 'Kalk, kollarını ve sırtını esnet.',
    'Drink a glass of water.': 'Bir bardak su iç.',
    '20-20-20: look at something about 6 meters away for 20 seconds.': '20-20-20: yaklaşık 6 metre uzaktaki bir şeye 20 saniye bak.',
    'Take five slow, deep breaths: in for 4, out for 6.': 'Beş kez yavaş ve derin nefes al: 4 sayıda al, 6 sayıda ver.',
    'Roll your shoulders and gently turn your neck.': 'Omuzlarını çevir ve boynunu yavaşça döndür.',
    'Close your eyes and rest them for 30 seconds.': 'Gözlerini kapat ve 30 saniye dinlendir.',
    'Tidy up your desk a little.': 'Masanı biraz topla.',
    'Open a window and get some fresh air.': 'Bir pencere aç ve temiz hava al.',
    'Go for a short walk, even just around the room.': 'Kısa bir yürüyüş yap, odanın içinde bile olur.',
    'Have a healthy snack.': 'Sağlıklı bir şeyler atıştır.',
    'Step outside or get some daylight for a few minutes.': 'Birkaç dakika dışarı çık ya da gün ışığı al.',
    'Make yourself a cup of tea.': 'Kendine bir fincan çay yap.',
    'Do a quick stretching routine for your whole body.': 'Bütün vücudun için kısa bir esneme yap.',
    'Check in with a friend or send a nice message.': 'Bir arkadaşına haber ver ya da güzel bir mesaj gönder.',

    // günlük hedef
    '{count} today · goal reached': 'Bugün {count} · hedef tamam',
    '{n} / {goal} today': 'Bugün {n} / {goal}',
    '{count} today, daily goal {goal}. Open your focus stats.': 'Bugün {count}, günlük hedef {goal}. Odak istatistiklerini aç.',
    'Daily goal reached!': 'Günlük hedefe ulaştın!',
    '{n} to go today': 'Bugün {n} kaldı',
    'You set {goal} a day. Anything more is a bonus.': 'Günde {goal} hedefledin. Fazlası bonus.',
    'Daily goal: {goal}': 'Günlük hedef: {goal}',
    'Daily goal reached: {goal} today! 🎉': 'Günlük hedefe ulaştın: bugün {goal}! 🎉',
    'Daily goal': 'Günlük hedef',
    'Lower the daily goal': 'Günlük hedefi düşür',
    'Lower the goal': 'Hedefi düşür',
    'Raise the daily goal': 'Günlük hedefi yükselt',
    'Raise the goal': 'Hedefi yükselt',

    // oturum günlüğü
    'Pomodoro done! What did you get done?': 'Pomodoro bitti! Neler yaptın?',
    'Pomodoro done! What did you get done on “{task}”?': 'Pomodoro bitti! “{task}” için neler yaptın?',
    'One line is enough, e.g. wrote the intro': 'Tek satır yeter, ör. girişi yazdım',
    'Saved to your log. See the whole week in your focus stats.': 'Günlüğüne kaydedildi. Haftanın tamamını odak istatistiklerinde görebilirsin.',
    'Delete note: {text}': 'Notu sil: {text}',
    'Delete note': 'Notu sil',
    'Weekly summary copied.': 'Haftalık özet kopyalandı.',
    "Couldn't copy. Your browser blocked the clipboard.": 'Kopyalanamadı. Tarayıcın panoya erişimi engelledi.',
    'My focus week ({range})': 'Odak haftam ({range})',
    ' · {n}-day streak': ' · {n} günlük seri',

    // istatistikler
    'Your focus': 'Odak istatistiklerin',
    'Focus stats': 'Odak istatistikleri',
    Overview: 'Genel',
    Insights: 'Analiz',
    Log: 'Günlük',
    today: 'bugün',
    'this week': 'bu hafta',
    'day streak': 'günlük seri',
    'today · {time}': 'bugün · {time}',
    'last 7 days · {time}': 'son 7 gün · {time}',
    'day streak · best {n}': 'günlük seri · en iyi {n}',
    'Pomodoros in the last 7 days: {list}': 'Son 7 günün pomodoroları: {list}',
    'Focus calendar': 'Odak takvimi',
    Less: 'Az',
    Goal: 'Hedef',
    'no focus': 'odak yok',
    '{pomodoros} · {days} in {weeks} weeks': '{weeks} haftada {pomodoros} · {days}',
    'Focus calendar for the last {weeks} weeks: {pomodoros} on {days}.': 'Son {weeks} haftanın odak takvimi: {days} içinde {pomodoros}.',
    Period: 'Dönem',
    '7 days': '7 gün',
    '30 days': '30 gün',
    '90 days': '90 gün',
    'focus time': 'odak süresi',
    pomodoros: 'pomodoro',
    'tasks done': 'biten görev',
    'a day': 'günde',
    'a day (on {days})': 'günde ({days})',
    '{n} active day': '{n} aktif gün',
    '{n} active days': '{n} aktif gün',
    'Focus by tag': 'Etiketlere göre odak',
    'No tag': 'Etiketsiz',
    'Without a tag': 'Etiketsiz',
    'Label tasks with #tags and focus on them with the target button to see where your time goes.':
      'Zamanının nereye gittiğini görmek için görevleri #etiket ile etiketle ve hedef düğmesiyle onlara odaklan.',
    'When you focus': 'Ne zaman odaklanıyorsun',
    'Most often around {h}:00': 'En çok {h}:00 civarında',
    'You focus most often around {h}:00.': 'En çok {h}:00 civarında odaklanıyorsun.',
    'No pomodoros in this period yet.': 'Bu dönemde henüz pomodoro yok.',
    'Tasks you focused on': 'Odaklandığın görevler',
    'Pick a task with the target button in your to-do list; every pomodoro you finish is counted for it.':
      'Yapılacaklar listesinde hedef düğmesiyle bir görev seç; bitirdiğin her pomodoro o göreve sayılır.',
    "This week's log": 'Bu haftanın günlüğü',
    'Copy as text': 'Metin olarak kopyala',
    'After each pomodoro, write one line about what you did. Your notes show up here, day by day.':
      'Her pomodorodan sonra ne yaptığını tek satırla yaz. Notların burada gün gün görünür.',

    // sesler
    'Master volume': 'Ana ses',
    'Sound effects': 'Ses efektleri',
    'Sound effects volume': 'Ses efektleri düzeyi',
    Music: 'Müzik',
    'Lo-fi music': 'Lo-fi müzik',
    'Music volume': 'Müzik düzeyi',
    'Made live in your browser, a new tune every few minutes. You can also click the record player in the room.':
      'Tarayıcında canlı üretilir, birkaç dakikada bir yeni bir ezgi çalar. Odadaki pikaba tıklayarak da açabilirsin.',
    Ambience: 'Ortam sesleri',
    'Mix as many as you like. Rain and snow also show up in the windows and on the terrace. All sounds are generated in your browser.':
      'İstediğin kadarını karıştır. Yağmur ve kar pencerelerde ve terasta da görünür. Bütün sesler tarayıcında üretilir.',
    'Match the place': 'Mekana göre',
    '{venue}: {sounds}. Changes when you switch places (and with the time of day on the terrace).':
      '{venue}: {sounds}. Mekan değişince (terasta günün saatine göre de) değişir.',
    quiet: 'sessiz',
    'Ambience changes with the place: café chatter in the café, a fireplace in the library, birds or crickets on the terrace, rain in the attic…':
      'Ortam sesi mekana göre değişir: kafede kafe uğultusu, kütüphanede şömine, terasta kuşlar ya da cırcır böcekleri, çatı katında yağmur…',
    'Music or ambience is playing': 'Müzik ya da ortam sesi çalıyor',
    '{name} volume': '{name} ses düzeyi',

    // karakter
    'Your character': 'Karakterin',
    Customize: 'Özelleştir',
    Body: 'Vücut',
    Hair: 'Saç',
    Outfit: 'Kıyafet',
    Extras: 'Aksesuar',
    Skin: 'Ten',
    Eyes: 'Gözler',
    Face: 'Yüz',
    Hairstyle: 'Saç modeli',
    'Hair color': 'Saç rengi',
    Top: 'Üst',
    Bottom: 'Alt',
    Shoes: 'Ayakkabı',
    Head: 'Baş',
    'Neck and back': 'Boyun ve sırt',
    Random: 'Rastgele',
    'Character saved.': 'Karakter kaydedildi.',

    // yapılacaklar
    'To-do': 'Yapılacaklar',
    'Add a new task…': 'Yeni görev ekle…',
    'Add a task… (#tag)': 'Görev ekle… (#etiket)',
    'Add a #{tag} task…': '#{tag} görevi ekle…',
    'New task': 'Yeni görev',
    'Show tasks with a tag': 'Etikete göre görevleri göster',
    All: 'Hepsi',
    'No tasks yet. Add one, label it with a #tag, break it into steps and drag tasks into order. Open tasks show up as notes on the cork board.':
      'Henüz görev yok. Bir görev ekle, #etiket ile etiketle, adımlara böl ve sürükleyerek sırala. Açık görevler mantar panoda not olarak görünür.',
    'Clear completed': 'Bitenleri temizle',
    'All done': 'Hepsi bitti',
    '{n} task left': '{n} görev kaldı',
    '{n} tasks left': '{n} görev kaldı',
    '{n} #{tag} task left': '{n} #{tag} görev kaldı',
    '{n} #{tag} tasks left': '{n} #{tag} görev kaldı',
    'Show only #{tag}': 'Yalnızca #{tag}',
    'Remove tag {tag}': '{tag} etiketini kaldır',
    'Remove tag': 'Etiketi kaldır',
    'Done: {text}': 'Bitti: {text}',
    'Double-click to rename': 'Yeniden adlandırmak için çift tıkla',
    'Delete step: {text}': 'Adımı sil: {text}',
    'Delete step': 'Adımı sil',
    'Overdue · {date}': 'Gecikti · {date}',
    'Due {date}': 'Teslim: {date}',
    '{done} of {est} estimated pomodoros': 'Tahmini {est} pomodorodan {done}',
    Pomodoros: 'Pomodoro',
    'Lower the estimate': 'Tahmini düşür',
    'Raise the estimate': 'Tahmini artır',
    '{n} done': '{n} bitti',
    'No estimate': 'Tahmin yok',
    Tags: 'Etiketler',
    '+ tag': '+ etiket',
    'Add a tag to {text}': '{text} için etiket ekle',
    Due: 'Teslim',
    'Due date for {text}': '{text} için teslim tarihi',
    'Steps for {text}': '{text} adımları',
    'Up to {n} steps': 'En fazla {n} adım',
    'Add a step…': 'Adım ekle…',
    'New step for {text}': '{text} için yeni adım',
    '{steps} steps done': '{steps} adım bitti',
    'Details for: {text}': 'Ayrıntılar: {text}',
    'Steps, tags and estimate': 'Adımlar, etiketler ve tahmin',
    'Focus on: {text}': 'Odaklan: {text}',
    'Focus on this task': 'Bu göreve odaklan',
    'Delete: {text}': 'Sil: {text}',
    'Reorder: {text}': 'Sırala: {text}',
    'Drag to reorder (or use the arrow keys)': 'Sıralamak için sürükle (ya da ok tuşlarını kullan)',
    Rename: 'Yeniden adlandır',
    'All steps done! Tick off the task when you are ready.': 'Bütün adımlar bitti! Hazır olduğunda görevi işaretle.',
    'Every pomodoro you finish now counts for this task.': 'Bitirdiğin her pomodoro artık bu göreve sayılır.',

    // takvim
    Calendar: 'Takvim',
    'Previous month': 'Önceki ay',
    'Next month': 'Sonraki ay',
    Days: 'Günler',
    Mo: 'Pt',
    Tu: 'Sa',
    We: 'Ça',
    Th: 'Pe',
    Fr: 'Cu',
    Sa: 'Ct',
    Su: 'Pz',
    'Nothing planned. Add a note, an event with a time or a task for this day.': 'Planlanmış bir şey yok. Bu güne bir not, saatli bir etkinlik ya da görev ekle.',
    Note: 'Not',
    Task: 'Görev',
    'Time (optional)': 'Saat (isteğe bağlı)',
    'Time (optional): you get a reminder then': 'Saat (isteğe bağlı): o saatte hatırlatılır',
    'Add a note or event…': 'Not ya da etkinlik ekle…',
    'Add a task due this day… (#tag)': 'Bu güne teslim görevi ekle… (#etiket)',
    'No pomodoros': 'Pomodoro yok',
    '{tasks} due': '{tasks} teslim',
    'Double-click to edit': 'Düzenlemek için çift tıkla',
    'From your session log': 'Oturum günlüğünden',
    'Task added to your to-do list.': 'Görev yapılacaklar listene eklendi.',
    'Edit note': 'Notu düzenle',
    '{time} · Reminder': '{time} · Hatırlatma',

    // sütunlar ve uygulama
    'Resize the to-do column': 'Yapılacaklar sütununu boyutlandır',
    'Resize the timer column': 'Zamanlayıcı sütununu boyutlandır',
    'Drag to resize · double-click to reset': 'Boyutlandırmak için sürükle · sıfırlamak için çift tıkla',
    'You can install it later from the browser menu.': 'Daha sonra tarayıcı menüsünden yükleyebilirsin.',
    'Pomodoro Room is installed. Open it from your home screen.': 'Pomodoro Room yüklendi. Ana ekranından açabilirsin.',

    // eşyalar
    Sofa: 'Kanepe', Armchair: 'Koltuk', Pouf: 'Puf', Beanbag: 'Armut koltuk', Bench: 'Bank', Stool: 'Tabure', Desk: 'Çalışma masası',
    'Café table': 'Kafe masası', 'Reading table': 'Okuma masası', 'Bar counter': 'Bar tezgahı', 'Coffee table': 'Sehpa', Nightstand: 'Komodin',
    Bed: 'Yatak', Bookshelf: 'Kitaplık', 'Narrow bookshelf': 'Dar kitaplık', Wardrobe: 'Gardırop', 'Pastry case': 'Pasta vitrini', Plant: 'Bitki',
    'Large plant': 'Büyük bitki', Cactus: 'Kaktüs', 'Flower pot': 'Çiçek saksısı', 'Floor lamp': 'Lambader', Lantern: 'Fener', Fireplace: 'Şömine',
    'Record player': 'Pikap', Globe: 'Küre', Cat: 'Kedi', Rug: 'Halı', 'Round rug': 'Yuvarlak halı', Window: 'Pencere', 'Arched window': 'Kemerli pencere',
    'Cork board': 'Mantar pano', 'Menu board': 'Menü panosu', 'Wall shelf': 'Duvar rafı', Painting: 'Tablo', Poster: 'Poster', 'Wall clock': 'Duvar saati',
    Sconce: 'Aplik', 'String lights': 'Işık zinciri', 'Neon sign': 'Neon tabela', 'Hanging planter': 'Askılı saksı', 'Rocking chair': 'Sallanan sandalye',
    'Egg chair': 'Yumurta koltuk', 'Floor cushion': 'Yer minderi', Hammock: 'Hamak', 'Gaming desk': 'Oyun masası', Piano: 'Piyano', Easel: 'Şövale',
    Dresser: 'Şifonyer', 'TV stand': 'TV ünitesi', Aquarium: 'Akvaryum', Fridge: 'Buzdolabı', 'Coat rack': 'Portmanto', Dog: 'Köpek', Guitar: 'Gitar',
    'Floor mirror': 'Boy aynası', Telescope: 'Teleskop', 'Ficus tree': 'Fikus', 'Book stack': 'Kitap yığını', Candles: 'Mumlar', 'Runner rug': 'Yolluk',
    'Curtained window': 'Perdeli pencere', Mirror: 'Ayna', 'World map': 'Dünya haritası', 'Photo garland': 'Fotoğraf ipi', Pegboard: 'Delikli pano',
    Chesterfield: 'Chester kanepe', 'Lounge chair': 'Dinlenme koltuğu', 'Office chair': 'Ofis sandalyesi', Daybed: 'Sedir', 'Sun lounger': 'Şezlong',
    'Porch swing': 'Bahçe salıncağı', Stove: 'Ocak', 'Kitchen sink': 'Evye', 'Coffee cart': 'Kahve arabası', 'Vending machine': 'Otomat',
    'Cube shelf': 'Küp raf', 'Ladder shelf': 'Merdiven raf', 'Display cabinet': 'Vitrin dolabı', 'Toy chest': 'Oyuncak sandığı',
    'Arcade machine': 'Atari makinesi', 'Drum kit': 'Davul seti', 'Teddy bear': 'Oyuncak ayı', 'Lava lamp': 'Lav lambası', 'Floor fan': 'Ayaklı vantilatör',
    'Holiday tree': 'Yılbaşı ağacı', Pumpkin: 'Bal kabağı', Palm: 'Palmiye', Bonsai: 'Bonsai', 'Pampas vase': 'Pampas vazo', Campfire: 'Kamp ateşi',
    'Lamp post': 'Sokak lambası', 'Planter box': 'Saksı kutusu', Fountain: 'Fıskiye', Snowman: 'Kardan adam', Bicycle: 'Bisiklet', 'Shag rug': 'Post halı',
    'Checkered rug': 'Damalı halı', 'Yoga mat': 'Yoga matı', 'Wall TV': 'Duvar televizyonu', Whiteboard: 'Beyaz tahta', Dartboard: 'Dart tahtası',
    'Gallery wall': 'Galeri duvarı', Tapestry: 'Duvar örtüsü', Bunting: 'Bayrak süsü', 'Round window': 'Yuvarlak pencere', 'Neon art': 'Neon süs',
    Mug: 'Kupa', Teapot: 'Demlik', 'Desk lamp': 'Masa lambası', 'Book pile': 'Kitap destesi', Succulent: 'Sukulent', 'Flower vase': 'Çiçek vazosu',
    Laptop: 'Dizüstü bilgisayar', Typewriter: 'Daktilo', 'Desk clock': 'Masa saati', 'Photo frame': 'Fotoğraf çerçevesi', Cake: 'Pasta',
    'Fruit bowl': 'Meyve kâsesi', 'Bread basket': 'Ekmek sepeti', Jars: 'Kavanozlar', 'Pencil cup': 'Kalemlik', Crystals: 'Kristaller',
    'Potion bottles': 'İksir şişeleri', 'Retro radio': 'Retro radyo', Hourglass: 'Kum saati', 'Paint jars': 'Boya kavanozları',
    'Coffee maker': 'Kahve makinesi', 'Mini globe': 'Mini küre', Gramophone: 'Gramofon', 'Kitchen counter': 'Mutfak dolabı', 'Wall cabinet': 'Üst dolap',
    'Range hood': 'Davlumbaz', 'Hanging pans': 'Asılı tavalar', 'Spice rack': 'Baharatlık', 'Dining table': 'Yemek masası', 'Pedal bin': 'Pedallı çöp kutusu',
    'Drawer cabinet': 'Çekmeceli dolap', 'World clocks': 'Dünya saatleri', 'Digital clock': 'Dijital saat', 'Pendant lamp': 'Sarkıt lamba',
    'Ivy garland': 'Sarmaşık', 'Cushion bench': 'Minderli bank', 'Apothecary shelf': 'Aktar rafı', Cauldron: 'Kazan', Candelabra: 'Şamdan',
    'Canvas stack': 'Tuval yığını', 'Canvas on the floor': 'Yerde tuval', 'Art table': 'Sanat masası', Treadmill: 'Koşu bandı',
    'Exercise bike': 'Kondisyon bisikleti', 'Dumbbell rack': 'Dambıl rafı', 'Punching bag': 'Kum torbası', 'Exercise ball': 'Pilates topu',
    'Sticky note': 'Yapışkan not', Wreath: 'Çelenk', Stockings: 'Yılbaşı çorapları', 'Snow globe': 'Kar küresi', 'Gift pile': 'Hediye yığını', Sled: 'Kızak',
    'Autumn wreath': 'Sonbahar çelengi', 'Leaf pile': 'Yaprak yığını', 'Hay bale': 'Saman balyası', 'Maple tree': 'Akçaağaç', 'Apple crate': 'Elma kasası',
    Rabbit: 'Tavşan', 'Bird cage': 'Kuş kafesi', 'Fish bowl': 'Balık fanusu',

    // renk ve çeşit adları
    Marble: 'Mermer', Yellow: 'Sarı', Orange: 'Turuncu', Cork: 'Mantar', Mountains: 'Dağlar', Sea: 'Deniz', Flowers: 'Çiçekler', Abstract: 'Soyut',
    'Night city': 'Gece şehri', 'Cat portrait': 'Kedi portresi', Lighthouse: 'Deniz feneri', Lemons: 'Limonlar', Tomato: 'Domates', Coffee: 'Kahve',
    Waves: 'Dalgalar', Monstera: 'Deve tabanı', Rocket: 'Roket', Rainbow: 'Gökkuşağı', Colorful: 'Renkli', 'Ice blue': 'Buz mavisi',
    Turquoise: 'Turkuaz', Sunflower: 'Ayçiçeği', Sketch: 'Eskiz', Golden: 'Altın sarısı', Natural: 'Doğal', Classic: 'Klasik', Moody: 'Loş',
    Pastel: 'Pastel', Ocean: 'Okyanus', Vintage: 'Eskitme', 'Gold string': 'Altın ip', 'Dark string': 'Koyu ip', Slate: 'Arduvaz', Snow: 'Kar',
    Cocoa: 'Kakao', Gold: 'Altın', Sand: 'Kum', Sandstone: 'Kumtaşı', Granite: 'Granit', Heart: 'Kalp', Moon: 'Ay', Star: 'Yıldız', Bolt: 'Şimşek',
    Vanilla: 'Vanilya', Strawberry: 'Çilek', Chocolate: 'Çikolata', Wicker: 'Hasır', 'Dark wicker': 'Koyu hasır', Herb: 'Ot', Amethyst: 'Ametist',
    Quartz: 'Kuvars', Glass: 'Cam', Clay: 'Kil', Steel: 'Çelik', 'Red check': 'Kırmızı ekose', 'Blue check': 'Mavi ekose', 'Green check': 'Yeşil ekose',
    'Yellow check': 'Sarı ekose', Ivy: 'Sarmaşık', 'Blooming ivy': 'Çiçekli sarmaşık', 'Green brew': 'Yeşil iksir', 'Violet brew': 'Mor iksir',
    'Ember brew': 'Kor iksir', Blossom: 'Çiçekli', Meadow: 'Çayır', 'Red bow': 'Kırmızı fiyonk', 'Gold bow': 'Altın fiyonk', 'Blue bow': 'Mavi fiyonk',
    Candy: 'Şeker', Nordic: 'İskandinav', Maple: 'Akçaağaç', Straw: 'Saman', Dutch: 'Hollanda', Canary: 'Kanarya', Budgie: 'Muhabbet kuşu',
    'Green finch': 'Florya', Dove: 'Güvercin', Goldfish: 'Japon balığı', Betta: 'Beta', Calico: 'Alacalı',
    Terracotta: 'Kiremit', Sage: 'Adaçayı', Blue: 'Mavi', Mustard: 'Hardal', Lavender: 'Lavanta', Pink: 'Pembe', Teal: 'Petrol mavisi',
    Charcoal: 'Füme', Cream: 'Krem', Forest: 'Orman yeşili', Burgundy: 'Bordo', Navy: 'Lacivert', Oak: 'Meşe', Walnut: 'Ceviz', White: 'Beyaz',
    Black: 'Siyah', Birch: 'Huş', Cherry: 'Kiraz', 'Gray wash': 'Gri eskitme', Gray: 'Gri', Brass: 'Pirinç', Wood: 'Ahşap', Sky: 'Gök mavisi',
    Coal: 'Kömür', Butter: 'Tereyağı', Mint: 'Nane', Plain: 'Düz', Stripes: 'Çizgili', 'Polka dots': 'Puantiyeli', Brick: 'Tuğla',
    'Wood paneling': 'Ahşap lambri', 'Fence and sky': 'Çit ve gökyüzü', Tiles: 'Fayans', 'Floral wallpaper': 'Çiçekli duvar kağıdı',
    'Oak planks': 'Meşe parke', 'Walnut planks': 'Ceviz parke', Carpet: 'Halıfleks', Checkerboard: 'Dama', 'Basketweave parquet': 'Hasır örgü parke',
    Stone: 'Taş', Grass: 'Çim', 'Wooden deck': 'Ahşap deck', 'Terracotta tiles': 'Kiremit karo', Herringbone: 'Balıksırtı',
    Light: 'Açık', Wheat: 'Buğday', Tan: 'Bronz', Brown: 'Kahverengi', Deep: 'Koyu ten', Pale: 'Soluk', Honey: 'Bal', Espresso: 'Espresso',
    Chestnut: 'Kestane', Blonde: 'Sarışın', Auburn: 'Kızıl kahve', Purple: 'Mor', Platinum: 'Platin', Green: 'Yeşil', Ginger: 'Kızıl', Silver: 'Gümüş',
    Red: 'Kırmızı', Anthracite: 'Antrasit', Olive: 'Zeytin yeşili', Lime: 'Fıstık yeşili', Coral: 'Mercan', Beige: 'Bej', Rust: 'Pas',
    Denim: 'Kot mavisi', Khaki: 'Haki', Dark: 'Koyu', Hazel: 'Ela', Violet: 'Menekşe', Amber: 'Kehribar',
    Short: 'Kısa', Long: 'Uzun', Bun: 'Topuz', Ponytail: 'At kuyruğu', Curly: 'Kıvırcık', Pigtails: 'İki yandan', Bob: 'Küt', Afro: 'Afro',
    Spiky: 'Dikenli', 'Side part': 'Yandan ayrık', Braid: 'Örgü', 'Space buns': 'Çift topuz', Wavy: 'Dalgalı', 'Buzz cut': 'Sıfır numara',
    Mohawk: 'Mohikan', Pixie: 'Pixie', Locs: 'Rasta', 'Twin braids': 'Çift örgü', 'Messy bun': 'Dağınık topuz', 'Hime cut': 'Hime kesim',
    Undercut: 'Undercut', 'Curtain bangs': 'Perde kâkül', Boy: 'Erkek', Girl: 'Kız', None: 'Yok', Freckles: 'Çil', Mustache: 'Bıyık', Beard: 'Sakal',
    'Rosy cheeks': 'Pembe yanaklar', Goatee: 'Keçi sakalı', Stubble: 'Kirli sakal', 'Beauty mark': 'Ben', Bandage: 'Yara bandı',
    'Star sticker': 'Yıldız çıkartma', 'T-shirt': 'Tişört', Hoodie: 'Kapüşonlu', Sweater: 'Kazak', Shirt: 'Gömlek', Dress: 'Elbise', Jacket: 'Ceket',
    Overalls: 'Tulum', 'Tank top': 'Atlet', Kimono: 'Kimono', 'Striped tee': 'Çizgili tişört', 'Graphic tee': 'Baskılı tişört', Cardigan: 'Hırka',
    'Varsity jacket': 'Kolej ceketi', Pants: 'Pantolon', Shorts: 'Şort', Skirt: 'Etek', 'Long skirt': 'Uzun etek', Jeans: 'Kot', 'Track pants': 'Eşofman',
    Glasses: 'Gözlük', Beanie: 'Bere', Headphones: 'Kulaklık', Cap: 'Şapka', Bow: 'Fiyonk', Scarf: 'Atkı', 'Cat ears': 'Kedi kulakları',
    Headband: 'Saç bandı', Flower: 'Çiçek', Sunglasses: 'Güneş gözlüğü', Bandana: 'Bandana', Crown: 'Taç', Earrings: 'Küpe', 'Witch hat': 'Cadı şapkası',
    'Party hat': 'Parti şapkası', Backpack: 'Sırt çantası', Necklace: 'Kolye', 'Bow tie': 'Papyon', Tie: 'Kravat', 'White sneakers': 'Beyaz spor ayakkabı',
    'Brown boots': 'Kahverengi bot', 'Yellow boots': 'Sarı bot',
    Rain: 'Yağmur', Wind: 'Rüzgar', Snowfall: 'Kar yağışı', Crickets: 'Cırcır böcekleri', Birds: 'Kuşlar', 'Café chatter': 'Kafe uğultusu',
    'Simmering pot': 'Kaynayan tencere',
  };

  const DAYS = {
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    tr: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
  };
  const DAYS_SHORT = {
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    tr: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'],
  };
  const MONTHS = {
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    tr: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
  };
  const MONTHS_SHORT = {
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    tr: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
  };

  const has = (obj, k) => Object.prototype.hasOwnProperty.call(obj, k);
  const fill = (s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k) => (has(vars, k) ? String(vars[k]) : m)) : s);

  // Çeviri: sözlükte yoksa İngilizcesi
  function t(key, vars) {
    const s = lang === 'tr' && has(TR, key) ? TR[key] : key;
    return fill(s, vars);
  }

  // Sayıya göre tekil / çoğul (Türkçede sayıdan sonra ad hep tekil)
  function tn(n, one, other, vars) {
    return t(n === 1 ? one : other, { n, ...vars });
  }

  const day = (i, short) => (short ? DAYS_SHORT : DAYS)[lang][i];
  const month = (i, short) => (short ? MONTHS_SHORT : MONTHS)[lang][i];

  // Tarih: İngilizcede "Sunday, 22 November", Türkçede "22 Kasım Pazar"
  function dateLabel(d, opts = {}) {
    const weekday = opts.weekday === undefined ? 'long' : opts.weekday;
    const dn = weekday ? day(d.getDay(), weekday === 'short') : '';
    const mn = month(d.getMonth(), opts.month === 'short');
    if (lang === 'tr') return `${d.getDate()} ${mn}${dn ? ` ${dn}` : ''}`;
    return `${dn ? `${dn}, ` : ''}${d.getDate()} ${mn}`;
  }

  // Ondalık sayı (Türkçede virgül)
  function num(x, digits = 1) {
    const s = Number(x).toFixed(digits).replace(/\.0+$/, '');
    return lang === 'tr' ? s.replace('.', ',') : s;
  }

  // Süre: "45 min", "1.5 h" / "45 dk", "1,5 sa"
  function duration(min) {
    return min >= 60 ? t('{x} h', { x: num(min / 60, min >= 600 ? 0 : 1) }) : t('{x} min', { x: min });
  }

  // Sayfadaki sabit metinleri çevirir (data-no-i18n işaretli öğelere dokunmaz)
  const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  function translateText(raw) {
    const key = raw.replace(/\s+/g, ' ').trim();
    if (!key || !has(TR, key)) return null;
    const lead = raw.match(/^\s*/)[0] ? ' ' : '';
    const trail = raw.match(/\s*$/)[0] ? ' ' : '';
    return `${lead}${TR[key]}${trail}`;
  }

  function apply(root) {
    if (lang === 'en' || !root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement && !n.parentElement.closest('script, style, svg, [data-no-i18n]') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      const v = translateText(n.nodeValue);
      if (v !== null) n.nodeValue = v;
    }
    for (const el of root.querySelectorAll('[placeholder], [title], [aria-label], [alt]')) {
      if (el.closest('[data-no-i18n]')) continue;
      for (const a of ATTRS) {
        const v = el.getAttribute(a);
        if (v && has(TR, v)) el.setAttribute(a, TR[v]);
      }
    }
  }

  function setLang(next) {
    if (!LANGS.includes(next) || next === lang) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* yoksay */
    }
    location.reload();
  }

  const api = { lang, LANGS, TR, t, tn, day, month, dateLabel, num, duration, apply, setLang };

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
    return;
  }
  window.I18N = api;
  document.documentElement.lang = lang;
  if (lang !== 'en') {
    apply(document.body);
    const meta = document.querySelector('meta[name="description"]');
    if (meta && has(TR, meta.content)) meta.content = TR[meta.content];
  }
})();
