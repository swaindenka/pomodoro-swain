/*
 * Sütun genişlikleri: geniş ekranda yapılacaklar sütununun ve zamanlayıcı sütununun kenarından
 * tutup sürükleyerek genişlik ayarlanır. Çift tıklama varsayılana döndürür; ayar tarayıcıda saklanır.
 */
(() => {
  'use strict';

  const App = window.App;
  const { storage, $ } = App;
  const KEY = 'pomodoro.layout';

  const layout = $('.layout');
  const DEFAULTS = { left: 320, side: 360 };
  const LIMITS = { left: [240, 640], side: [300, 640] };
  const STAGE_MIN = 420; // ortadaki oda bundan daha dar olmasın
  const GAP = 16;

  const saved = storage.get(KEY, null);
  const widths = { ...DEFAULTS };
  if (saved && typeof saved === 'object') {
    for (const k of Object.keys(DEFAULTS)) if (Number.isFinite(saved[k])) widths[k] = saved[k];
  }

  const wide = window.matchMedia('(min-width: 961px)');
  const wider = window.matchMedia('(min-width: 1500px)');

  // Ortadaki odaya yer kalacak şekilde sınırla
  function clamp(key, value) {
    const [min, max] = LIMITS[key];
    const other = key === 'left' ? widths.side : widths.left;
    const cols = wider.matches ? 2 : 1;
    const style = getComputedStyle(layout);
    const inner = layout.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const room = inner - STAGE_MIN - GAP * cols - (wider.matches ? other : 0);
    return Math.round(Math.max(min, Math.min(max, room, value)));
  }

  // widths kullanıcının tercihidir; ekran daralınca yalnızca uygulanan değer küçülür
  function apply() {
    const shown = { ...widths };
    if (wide.matches) {
      if (wider.matches) shown.left = clamp('left', widths.left);
      shown.side = clamp('side', widths.side);
    }
    layout.style.setProperty('--left-w', `${shown.left}px`);
    layout.style.setProperty('--side-w', `${shown.side}px`);
    for (const h of handles) h.setAttribute('aria-valuenow', String(shown[h.dataset.col]));
  }

  const save = () => storage.set(KEY, widths);

  // Tutamaç: sol sütunun sağ kenarında, sağ sütunun sol kenarında
  function makeHandle(col, parent, label) {
    const h = document.createElement('div');
    h.className = `col-resizer col-resizer-${col}`;
    h.dataset.col = col;
    h.tabIndex = 0;
    h.setAttribute('role', 'separator');
    h.setAttribute('aria-orientation', 'vertical');
    h.setAttribute('aria-label', label);
    h.setAttribute('aria-valuemin', String(LIMITS[col][0]));
    h.setAttribute('aria-valuemax', String(LIMITS[col][1]));
    h.title = 'Drag to resize · double-click to reset';
    parent.prepend(h);
    return h;
  }

  const handles = [
    makeHandle('left', $('#leftbar'), 'Resize the to-do column'),
    makeHandle('side', $('.sidebar'), 'Resize the timer column'),
  ];

  let drag = null;

  function onMove(e) {
    if (!drag || e.pointerId !== drag.pid) return;
    e.preventDefault();
    const dx = e.clientX - drag.x;
    // sol sütun sağa çekilince, sağ sütun sola çekilince genişler
    widths[drag.col] = clamp(drag.col, drag.start + (drag.col === 'left' ? dx : -dx));
    apply();
  }

  function onUp(e) {
    if (!drag || e.pointerId !== drag.pid) return;
    drag.handle.classList.remove('dragging');
    document.body.classList.remove('col-resizing');
    drag = null;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    save();
  }

  for (const h of handles) {
    h.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      drag = { col: h.dataset.col, pid: e.pointerId, x: e.clientX, start: widths[h.dataset.col], handle: h };
      h.classList.add('dragging');
      document.body.classList.add('col-resizing');
      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    });
    h.addEventListener('dblclick', () => {
      widths[h.dataset.col] = DEFAULTS[h.dataset.col];
      apply();
      save();
    });
    // Klavye: sol / sağ ok tuşları (Shift ile daha büyük adım)
    h.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const step = (e.shiftKey ? 40 : 10) * (e.key === 'ArrowRight' ? 1 : -1);
      const col = h.dataset.col;
      widths[col] = clamp(col, widths[col] + (col === 'left' ? step : -step));
      apply();
      save();
    });
  }

  window.addEventListener('resize', apply);
  for (const mq of [wide, wider]) {
    if (mq.addEventListener) mq.addEventListener('change', apply);
    else if (mq.addListener) mq.addListener(apply);
  }
  apply();
})();
