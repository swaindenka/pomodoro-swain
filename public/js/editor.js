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

  let tab = 'seating';

  // ---------- Mekan seçici ----------
  function renderVenues() {
    const current = Game.venue();
    const guest = !Game.canEdit();
    venueBar.querySelectorAll('.venue').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.venue === current));
      b.disabled = guest && b.dataset.venue !== current;
      b.title = guest ? 'The host picks the place' : '';
    });
  }

  venueBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.venue');
    if (!btn || btn.dataset.venue === Game.venue()) return;
    if (Game.setVenue(btn.dataset.venue)) App.toast(`Place: ${Art.VENUE_NAMES[btn.dataset.venue]}`);
  });

  // ---------- Katalog ----------
  // Paket kartı: grubun bütün eşyalarını boş yerlere tek tıkla ekler
  function packCard(id) {
    const pack = Art.PACKS[id];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cat-pack';
    btn.dataset.pack = id;
    const icon = document.createElement('span');
    icon.className = 'cat-pack-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = pack.icon;
    const label = document.createElement('span');
    label.textContent = pack.name;
    const sub = document.createElement('small');
    sub.textContent = 'Add all';
    btn.append(icon, label, sub);
    btn.title = `Place the whole ${pack.name.toLowerCase()} in free spots`;
    return btn;
  }

  function buildCatalog() {
    const groups = Art.TAB_GROUPS && Art.TAB_GROUPS[tab];
    if (groups) {
      catalog.replaceChildren(...groups.flatMap((g) => [packCard(g.pack), ...g.types.map(catItem)]));
      catalog.scrollLeft = 0;
      return;
    }
    const types = Art.TABS[tab] || [];
    catalog.replaceChildren(...types.map(catItem));
    catalog.scrollLeft = 0;
  }

  function catItem(type) {
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
    count.textContent = n > 1 ? `${n} colors` : '';
    btn.append(thumb, label, count);
    return btn;
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
    editBtn.textContent = st.on ? 'Done editing' : 'Edit';
    editBtn.setAttribute('aria-pressed', String(st.on));
    editBtn.disabled = !canEdit;
    editBtn.title = canEdit ? '' : 'Only the host can edit this room';
    if (!st.on) return;

    tabs.forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.tab === tab)));
    catalog.hidden = tab === 'style';
    stylePanel.hidden = tab !== 'style';

    const placingNew = st.placing && !st.placing.id ? st.placing : null;
    const canRotate = (type) => window.Shared.rotsOf(type).length > 1;
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
      selName.textContent = placingNew ? `New: ${def.name}` : def.name;
      selColors.hidden = def.colors.length < 2;
      selColors.replaceChildren(
        ...def.colors.map((c, i) => {
          const btn = swatchButton(c, def.colorNames[i], () => Game.edit.setColor(i));
          btn.setAttribute('aria-pressed', String(i === subject.c));
          return btn;
        }),
      );
      selActions.hidden = Boolean(placingNew);
      $('#sel-rotate').hidden = window.Shared.rotsOf(subject.type).length < 2;
      // not kâğıdı: yazısı burada düzenlenir
      const noteInput = $('#sel-note');
      const isNote = Boolean(sel) && !placingNew && Boolean(window.Shared.CATALOG[sel.type].text);
      noteInput.hidden = !isNote;
      if (isNote && document.activeElement !== noteInput) noteInput.value = sel.t || '';
    }

    if (st.placing) {
      hint.textContent = touch
        ? 'Tap to preview, tap the same spot again to place. You can pick the color and rotate it first.'
        : `Click to place.${canRotate(st.placing.type) ? ' R rotates,' : ''} arrow keys nudge, Esc cancels.`;
    } else if (sel) {
      hint.textContent = touch
        ? 'Drag the item to move it, or use the buttons to rotate, duplicate, recolor or remove it.'
        : `Drag to move or use the arrow keys.${canRotate(sel.type) ? ' R rotates.' : ''} Delete removes it.`;
    } else if (tab === 'small') {
      hint.textContent = 'Tabletop items go on tables, desks, shelves and counters, and move along with them.';
    } else if (tab === 'seasonal') {
      hint.textContent = 'Add a whole winter or autumn pack in one click, or pick single items. Undo takes a pack away in one step.';
    } else if (tab === 'pets') {
      hint.textContent = 'The cat, dog and rabbit wander around when they wake up. Click the bird cage to hear it sing, and feed the fish in a bowl or aquarium.';
    } else {
      hint.textContent = touch
        ? 'Pick an item to add, or tap an item in the room to edit it. Drag items to move them.'
        : 'Pick an item to add, or click an item in the room to edit it. Drag items to move them.';
    }
  }

  editBtn.addEventListener('click', () => Game.edit.setOn(!Game.edit.state().on));
  $('#edit-done').addEventListener('click', () => Game.edit.setOn(false));

  // Geri al / yinele düğmeleri
  const undoBtn = $('#edit-undo');
  const redoBtn = $('#edit-redo');
  const renderHistory = () => {
    undoBtn.disabled = !Game.edit.canUndo();
    redoBtn.disabled = !Game.edit.canRedo();
  };
  undoBtn.addEventListener('click', () => Game.edit.undo());
  redoBtn.addEventListener('click', () => Game.edit.redo());
  App.on('history:changed', renderHistory);
  App.on('edit:changed', renderHistory);

  tabs.forEach((t) =>
    t.addEventListener('click', () => {
      tab = t.dataset.tab;
      if (Game.edit.state().placing) Game.edit.cancel();
      if (tab !== 'style') buildCatalog();
      render();
    }),
  );

  catalog.addEventListener('click', (e) => {
    const pack = e.target.closest('.cat-pack');
    if (pack) {
      Game.edit.addPack(pack.dataset.pack);
      return;
    }
    const btn = e.target.closest('.cat-item');
    if (!btn) return;
    const st = Game.edit.state();
    if (st.placing && !st.placing.id && st.placing.type === btn.dataset.type) Game.edit.cancel();
    else {
      Game.edit.startPlacing(btn.dataset.type);
      // telefonda katalog odanın altında: eşyayı yerleştirmek için oda görünür alana kayar
      const stage = document.querySelector('.stage');
      const r = stage.getBoundingClientRect();
      if (window.innerWidth < 960 && (r.top < 0 || r.bottom > window.innerHeight)) stage.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  });

  // Not yazısı: yazmayı bırakınca (ya da Enter'da) kaydedilir
  let noteTimer = null;
  const noteInput = $('#sel-note');
  const saveNote = () => {
    clearTimeout(noteTimer);
    Game.edit.setText(noteInput.value);
  };
  noteInput.addEventListener('input', () => {
    clearTimeout(noteTimer);
    noteTimer = setTimeout(saveNote, 600);
  });
  noteInput.addEventListener('change', saveNote);
  noteInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveNote();
      noteInput.blur();
    }
  });

  $('#sel-move').addEventListener('click', () => Game.edit.startMove());
  $('#sel-rotate').addEventListener('click', () => Game.edit.rotate());
  $('#sel-copy').addEventListener('click', () => Game.edit.duplicate());
  $('#sel-delete').addEventListener('click', () => Game.edit.removeSelected());

  let resetArmed = null;
  resetBtn.addEventListener('click', () => {
    if (!resetArmed) {
      resetBtn.textContent = 'Are you sure? Click again';
      resetArmed = setTimeout(() => {
        resetArmed = null;
        resetBtn.textContent = 'Reset this place to default';
      }, 3000);
      return;
    }
    clearTimeout(resetArmed);
    resetArmed = null;
    resetBtn.textContent = 'Reset this place to default';
    Game.edit.resetRoom();
    App.toast(`${Art.VENUE_NAMES[Game.venue()]} was reset to default.`);
  });

  App.on('edit:changed', render);
  App.on('room:changed', render);
  App.on('session:changed', render);

  buildCatalog();
  buildStyle();
  render();
})();
