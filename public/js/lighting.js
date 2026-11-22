/*
 * Işıklandırma seçenekleri: odanın sağ üst köşesindeki ampul düğmesi küçük bir panel açar.
 *  - Günün saati: gerçek saat ya da sabit sabah / gündüz / gün batımı / gece
 *  - Tavan ışığı: akşam kendiliğinden yanar, istenirse hep açık ya da kapalı (L tuşu açıp kapatır)
 *  - Lamba parlaklığı ve ışık rengi
 * Ayarlar kişiseldir, tarayıcıda saklanır (odadaki diğer kişilerin ekranını değiştirmez).
 */
(() => {
  'use strict';

  const App = window.App;
  const Art = App.Art;
  const { storage, $ } = App;
  const KEY = 'pomodoro.lighting';

  const TIMES = [
    { id: 'auto', label: 'Real time', hour: NaN },
    { id: 'morning', label: 'Morning', hour: 7.1 },
    { id: 'day', label: 'Day', hour: 13 },
    { id: 'sunset', label: 'Sunset', hour: 19.2 },
    { id: 'night', label: 'Night', hour: 22.5 },
  ];
  const CEILING = [
    { id: 'auto', label: 'Auto' },
    { id: 'on', label: 'On' },
    { id: 'off', label: 'Off' },
  ];
  const COLORS = [
    { id: 'warm', label: 'Warm', rgb: [255, 196, 120] },
    { id: 'soft', label: 'Soft white', rgb: [255, 232, 200] },
    { id: 'cool', label: 'Cool', rgb: [205, 225, 255] },
    { id: 'candle', label: 'Candle', rgb: [255, 160, 80] },
    { id: 'rose', label: 'Rose', rgb: [255, 170, 190] },
  ];
  const DEFAULTS = { time: 'auto', ceiling: 'auto', lamps: 1, color: 'warm' };

  function load() {
    const raw = storage.get(KEY, null);
    const s = { ...DEFAULTS };
    if (raw && typeof raw === 'object') {
      if (TIMES.some((t) => t.id === raw.time)) s.time = raw.time;
      if (CEILING.some((c) => c.id === raw.ceiling)) s.ceiling = raw.ceiling;
      if (COLORS.some((c) => c.id === raw.color)) s.color = raw.color;
      if (Number.isFinite(raw.lamps)) s.lamps = Math.min(2, Math.max(0.4, raw.lamps));
    }
    return s;
  }

  let st = load();
  // adresteki ?saat= (deneme için) "Real time" seçiliyken geçerli kalır
  const urlHour = Art.forcedHour;

  function applyTime() {
    const t = TIMES.find((x) => x.id === st.time);
    Art.forcedHour = st.time === 'auto' ? urlHour : t.hour;
  }

  const save = () => storage.set(KEY, st);

  // ---------- Panel ----------
  const btn = $('#light-btn');
  const pop = $('#light-pop');

  function chips(root, list, key) {
    root.replaceChildren(
      ...list.map((o) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'light-chip';
        b.dataset.value = o.id;
        b.textContent = o.label;
        b.addEventListener('click', () => set(key, o.id));
        return b;
      }),
    );
  }

  function build() {
    chips($('#light-time'), TIMES, 'time');
    chips($('#light-ceiling'), CEILING, 'ceiling');
    $('#light-color').replaceChildren(
      ...COLORS.map((c) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'light-swatch';
        b.dataset.value = c.id;
        b.title = c.label;
        b.setAttribute('aria-label', c.label);
        b.style.setProperty('--swatch', `rgb(${c.rgb.join(',')})`);
        b.addEventListener('click', () => set('color', c.id));
        return b;
      }),
    );
  }

  function render() {
    for (const [sel, key] of [['#light-time', 'time'], ['#light-ceiling', 'ceiling'], ['#light-color', 'color']]) {
      $(sel)
        .querySelectorAll('button')
        .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === st[key])));
    }
    $('#light-lamps').value = String(Math.round(st.lamps * 100));
    $('#light-lamps-value').textContent = `${Math.round(st.lamps * 100)}%`;
    btn.classList.toggle('lit', ceilingOn(Art.lighting(new Date()).night));
  }

  function set(key, value) {
    st = { ...st, [key]: value };
    if (key === 'time') applyTime();
    save();
    render();
    App.emit('sfx', 'click');
  }

  $('#light-lamps').addEventListener('input', (e) => {
    st = { ...st, lamps: Number(e.target.value) / 100 };
    save();
    render();
  });

  $('#light-reset').addEventListener('click', () => {
    st = { ...DEFAULTS };
    applyTime();
    save();
    render();
  });

  function openPop(on) {
    pop.hidden = !on;
    btn.setAttribute('aria-expanded', String(on));
    if (on) render();
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    openPop(pop.hidden);
  });

  document.addEventListener('pointerdown', (e) => {
    if (!pop.hidden && !pop.contains(e.target) && !btn.contains(e.target)) openPop(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !pop.hidden) {
      openPop(false);
      btn.focus();
      return;
    }
    // L: tavan ışığını aç / kapat
    if (e.code !== 'KeyL' || e.repeat || e.ctrlKey || e.metaKey || e.altKey || App.modalOpen() || App.isFormField(e.target)) return;
    e.preventDefault();
    const lit = ceilingOn(Art.lighting(new Date()).night);
    set('ceiling', lit ? 'off' : 'on');
    App.toast(lit ? 'Room lights off.' : 'Room lights on.', 1600);
  });

  // ---------- Oyunun kullandığı değerler ----------
  // Tavan ışığı: "Auto" iken hava kararınca yanar
  function ceilingOn(night) {
    if (st.ceiling === 'on') return true;
    if (st.ceiling === 'off') return false;
    return night > 0.3;
  }

  setInterval(() => {
    if (!pop.hidden) render();
    else btn.classList.toggle('lit', ceilingOn(Art.lighting(new Date()).night));
  }, 5000);

  App.Lighting = {
    settings: () => ({ ...st }),
    ceilingOn,
    lamps: () => st.lamps,
    color: () => (COLORS.find((c) => c.id === st.color) || COLORS[0]).rgb,
  };

  build();
  applyTime();
  render();
})();
