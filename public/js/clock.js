/*
 * Gerçek saat: üst çubuğun ortasında dijital saat ve tarih (odak modunda da görünür kalır).
 * Tıklayınca 12 / 24 saat biçimi arasında geçer; Ayarlar'dan gizlenebilir. Tercih tarayıcıda saklanır.
 */
(() => {
  'use strict';

  const App = window.App;
  const { storage, $, t } = App;
  const I18N = App.i18n;
  const KEY = 'pomodoro.clock';

  const clock = $('#clock');
  const hEl = $('#clock-h');
  const mEl = $('#clock-m');
  const ampmEl = $('#clock-ampm');
  const dateEl = $('#clock-date');
  const showBox = $('#clock-show');
  const pad = (n) => String(n).padStart(2, '0');

  // Varsayılan biçim: Türkçede 24 saat; İngilizcede cihazın tercihi (ör. ABD'de 12 saat)
  function deviceUses12h() {
    if (I18N.lang === 'tr') return false;
    try {
      return new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12 === true;
    } catch {
      return false;
    }
  }

  const st = { show: true, h12: deviceUses12h() };
  const saved = storage.get(KEY, null);
  if (saved && typeof saved === 'object') {
    if (typeof saved.show === 'boolean') st.show = saved.show;
    if (typeof saved.h12 === 'boolean') st.h12 = saved.h12;
  }
  const save = () => storage.set(KEY, st);

  let shown = '';
  function render(force) {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const key = `${now.toDateString()} ${h}:${m} ${st.h12}`;
    if (!force && key === shown) return;
    shown = key;
    hEl.textContent = st.h12 ? String(h % 12 || 12) : pad(h);
    mEl.textContent = pad(m);
    ampmEl.hidden = !st.h12;
    ampmEl.textContent = h < 12 ? t('AM') : t('PM');
    dateEl.textContent = I18N.dateLabel(now, { weekday: 'short', month: 'short' });
    // gündüz güneş, akşam ve gece ay
    clock.classList.toggle('is-night', h < 6 || h >= 19);
    const time = `${hEl.textContent}:${mEl.textContent}${st.h12 ? ` ${ampmEl.textContent}` : ''}`;
    const full = `${I18N.dateLabel(now)} ${now.getFullYear()}`;
    clock.title = `${full}\n${t('Click to switch between 12- and 24-hour time')}`;
    clock.setAttribute('aria-label', t('{time}, {date}. Switch between 12- and 24-hour time.', { time, date: full }));
  }

  // saniye başlarında kontrol et; dakika değişince yenilenir
  function tick() {
    render(false);
    setTimeout(tick, 1000 - (Date.now() % 1000) + 20);
  }

  function applyShow() {
    clock.hidden = !st.show;
    showBox.checked = st.show;
  }

  clock.addEventListener('click', () => {
    st.h12 = !st.h12;
    save();
    render(true);
    App.emit('sfx', 'click');
  });

  showBox.addEventListener('change', (e) => {
    e.stopPropagation(); // zamanlayıcı ayarlarına karışmasın
    st.show = showBox.checked;
    save();
    applyShow();
  });

  // arka plandaki sekmede zamanlayıcılar yavaşlar; geri dönünce hemen güncelle
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) render(true);
  });

  applyShow();
  tick();
})();
