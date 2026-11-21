/*
 * Düzenleme paneli (eşya kataloğu, seçili eşya işlemleri, görünüm) ve mekan seçici.
 */
(() => {
  'use strict';

  const App = window.App;
  const Art = App.Art;
  const Game = App.Game;
  const { $ } = App;

  const editBtn = $('#btn-edit');
  const panel = $('#editor');
  const stage = $('#stage');
  const catalog = $('#catalog');
  const stylePanel = $('#style-panel');
  const tabs = panel.querySelectorAll('.tab');
  const selection = $('#selection');
  const selName = $('#sel-name');
  const selColors = $('#sel-colors');
  const selActions = $('#selection-actions');
  const hint = $('#editor-hint');
  const resetBtn = $('#room-reset');
  const venueBar = $('#venue-bar');
  const touch = window.matchMedia && window.matchMedia('(hover: none)').matches;

  let tab = 'furniture';

  // ---------- Mekan seçici ----------
  function renderVenues() {
    const current = Game.venue();
    const guest = !Game.canEdit();
    venueBar.querySelectorAll('.venue').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.venue === current));
      b.disabled = guest && b.dataset.venue !== current;
      b.title = guest ? 'Mekanı oda sahibi seçer' : '';
    });
  }

  venueBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.venue');
    if (!btn || btn.dataset.venue === Game.venue()) return;
    if (Game.setVenue(btn.dataset.venue)) App.toast(`Mekan: ${Art.VENUE_NAMES[btn.dataset.venue]}`);
  });

  // ---------- Katalog ----------
  function buildCatalog() {
    const types = Art.TABS[tab] || [];
    catalog.replaceChildren(
      ...types.map((type) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cat-item';
        btn.dataset.type = type;
        btn.setAttribute('aria-pressed', 'false');
        const thumb = Art.thumb(type, 0, 48);
        thumb.className = 'cat-thumb';
        thumb.setAttribute('aria-hidden', 'true');
        const label = document.createElement('span');
        label.textContent = Art.ITEMS[type].name;
        const count = document.createElement('small');
        const n = Art.ITEMS[type].colors.length;
        count.textContent = n > 1 ? `${n} renk` : '';
        btn.append(thumb, label, count);
        return btn;
      }),
    );
    catalog.scrollLeft = 0;
  }

  // Fare tekerleği ile yatay kaydırma
  catalog.addEventListener(
    'wheel',
    (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || catalog.scrollWidth <= catalog.clientWidth) return;
      e.preventDefault();
      catalog.scrollLeft += e.deltaY;
    },
    { passive: false },
  );

  function swatchButton(color, label, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'swatch';
    btn.style.setProperty('--swatch', color);
    btn.setAttribute('aria-label', label);
    btn.title = label;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function chipButton(text, color, onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    if (color) {
      const dot = document.createElement('span');
      dot.className = 'chip-dot';
      dot.style.setProperty('--swatch', color);
      btn.append(dot);
    }
    btn.append(text);
    btn.addEventListener('click', onClick);
    return btn;
  }

  function buildStyle() {
    $('#sw-wall').replaceChildren(
      ...Art.WALLS.map((c, i) => swatchButton(c, Art.WALL_NAMES[i], () => Game.edit.setStyle('wall', i))),
    );
    $('#sw-pattern').replaceChildren(
      ...Art.PATTERN_NAMES.map((n, i) => chipButton(n, null, () => Game.edit.setStyle('pattern', i))),
    );
    $('#sw-floor').replaceChildren(
      ...Art.FLOOR_NAMES.map((n, i) => chipButton(n, Art.FLOOR_SWATCH[i], () => Game.edit.setStyle('floor', i))),
    );
  }

  function render() {
    renderVenues();
    const st = Game.edit.state();
    const canEdit = Game.canEdit();
    panel.hidden = !st.on;
    stage.classList.toggle('editing', st.on);
    editBtn.textContent = st.on ? 'Düzenlemeyi bitir' : 'Düzenle';
    editBtn.setAttribute('aria-pressed', String(st.on));
    editBtn.disabled = !canEdit;
    editBtn.title = canEdit ? '' : 'Bu odayı sadece oda sahibi düzenleyebilir';
    if (!st.on) return;

    tabs.forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.tab === tab)));
    catalog.hidden = tab === 'style';
    stylePanel.hidden = tab !== 'style';

    const placingNew = st.placing && !st.placing.id ? st.placing : null;
    catalog.querySelectorAll('.cat-item').forEach((b) =>
      b.setAttribute('aria-pressed', String(Boolean(placingNew) && b.dataset.type === placingNew.type)),
    );

    const style = Game.room().style;
    $('#sw-wall').querySelectorAll('.swatch').forEach((b, i) => b.setAttribute('aria-pressed', String(i === style.wall)));
    $('#sw-pattern').querySelectorAll('.chip').forEach((b, i) => b.setAttribute('aria-pressed', String(i === style.pattern)));
    $('#sw-floor').querySelectorAll('.chip').forEach((b, i) => b.setAttribute('aria-pressed', String(i === style.floor)));

    // Seçili eşya ya da yerleştirilmeyi bekleyen yeni eşya
    const sel = Game.edit.selectedItem();
    const subject = placingNew || sel;
    selection.hidden = !subject;
    if (subject) {
      const def = Art.ITEMS[subject.type];
      selName.textContent = placingNew ? `Yeni: ${def.name}` : def.name;
      selColors.hidden = def.colors.length < 2;
      selColors.replaceChildren(
        ...def.colors.map((c, i) => {
          const btn = swatchButton(c, def.colorNames[i], () => Game.edit.setColor(i));
          btn.setAttribute('aria-pressed', String(i === subject.c));
          return btn;
        }),
      );
      selActions.hidden = Boolean(placingNew);
    }

    if (st.placing) {
      hint.textContent = touch
        ? 'Önizleme için dokun, yerleştirmek için aynı yere tekrar dokun. Rengini önceden seçebilirsin.'
        : 'Yerleştirmek için tıkla. Rengini önceden seçebilirsin; Esc ile vazgeç.';
    } else if (sel) {
      hint.textContent = 'Seçili eşyayı taşıyabilir, çoğaltabilir, rengini değiştirebilir ya da kaldırabilirsin.';
    } else {
      hint.textContent = 'Eklemek için bir eşya seç ya da odadaki bir eşyaya tıklayarak düzenle.';
    }
  }

  editBtn.addEventListener('click', () => Game.edit.setOn(!Game.edit.state().on));
  $('#edit-done').addEventListener('click', () => Game.edit.setOn(false));

  tabs.forEach((t) =>
    t.addEventListener('click', () => {
      tab = t.dataset.tab;
      if (Game.edit.state().placing) Game.edit.cancel();
      if (tab !== 'style') buildCatalog();
      render();
    }),
  );

  catalog.addEventListener('click', (e) => {
    const btn = e.target.closest('.cat-item');
    if (!btn) return;
    const st = Game.edit.state();
    if (st.placing && !st.placing.id && st.placing.type === btn.dataset.type) Game.edit.cancel();
    else Game.edit.startPlacing(btn.dataset.type);
  });

  $('#sel-move').addEventListener('click', () => Game.edit.startMove());
  $('#sel-copy').addEventListener('click', () => Game.edit.duplicate());
  $('#sel-delete').addEventListener('click', () => Game.edit.removeSelected());

  let resetArmed = null;
  resetBtn.addEventListener('click', () => {
    if (!resetArmed) {
      resetBtn.textContent = 'Emin misin? Tekrar tıkla';
      resetArmed = setTimeout(() => {
        resetArmed = null;
        resetBtn.textContent = 'Bu mekanı varsayılana döndür';
      }, 3000);
      return;
    }
    clearTimeout(resetArmed);
    resetArmed = null;
    resetBtn.textContent = 'Bu mekanı varsayılana döndür';
    Game.edit.resetRoom();
    App.toast(`${Art.VENUE_NAMES[Game.venue()]} varsayılan haline döndü.`);
  });

  App.on('edit:changed', render);
  App.on('room:changed', render);
  App.on('session:changed', render);

  buildCatalog();
  buildStyle();
  render();
})();
