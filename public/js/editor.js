/*
 * Oda düzenleme paneli: eşya kataloğu, seçili eşya işlemleri, duvar ve zemin stili.
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
  const hint = $('#editor-hint');
  const resetBtn = $('#room-reset');
  const touch = window.matchMedia && window.matchMedia('(hover: none)').matches;

  let tab = 'furniture';

  function buildCatalog() {
    const types = tab === 'furniture' ? Art.FURNITURE : Art.WALL_ITEMS;
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
        btn.append(thumb, label);
        return btn;
      }),
    );
  }

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
    const st = Game.edit.state();
    const canEdit = Game.canEdit();
    panel.hidden = !st.on;
    stage.classList.toggle('editing', st.on);
    editBtn.textContent = st.on ? 'Düzenlemeyi bitir' : 'Odayı düzenle';
    editBtn.setAttribute('aria-pressed', String(st.on));
    editBtn.disabled = !canEdit;
    editBtn.title = canEdit ? '' : 'Bu odayı sadece oda sahibi düzenleyebilir';
    if (!st.on) return;

    tabs.forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.tab === tab)));
    catalog.hidden = tab === 'style';
    stylePanel.hidden = tab !== 'style';

    const placingType = st.placing && !st.placing.id ? st.placing.type : null;
    catalog.querySelectorAll('.cat-item').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.type === placingType)));

    const style = Game.room().style;
    $('#sw-wall').querySelectorAll('.swatch').forEach((b, i) => b.setAttribute('aria-pressed', String(i === style.wall)));
    $('#sw-pattern').querySelectorAll('.chip').forEach((b, i) => b.setAttribute('aria-pressed', String(i === style.pattern)));
    $('#sw-floor').querySelectorAll('.chip').forEach((b, i) => b.setAttribute('aria-pressed', String(i === style.floor)));

    const sel = Game.edit.selectedItem();
    selection.hidden = !sel;
    if (sel) {
      const def = Art.ITEMS[sel.type];
      selName.textContent = def.name;
      selColors.hidden = def.colors.length < 2;
      selColors.replaceChildren(
        ...def.colors.map((c, i) => {
          const btn = swatchButton(c, def.colorNames[i], () => Game.edit.setColor(i));
          btn.setAttribute('aria-pressed', String(i === sel.c));
          return btn;
        }),
      );
    }

    if (st.placing) {
      hint.textContent = touch
        ? 'Önizleme için odaya dokun, yerleştirmek için aynı yere tekrar dokun.'
        : 'Yerleştirmek için odada bir yere tıkla. Esc ile vazgeçebilirsin.';
    } else if (sel) {
      hint.textContent = 'Seçili eşyayı taşıyabilir, rengini değiştirebilir ya da kaldırabilirsin.';
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
  $('#sel-delete').addEventListener('click', () => Game.edit.removeSelected());

  let resetArmed = null;
  resetBtn.addEventListener('click', () => {
    if (!resetArmed) {
      resetBtn.textContent = 'Emin misin? Tekrar tıkla';
      resetArmed = setTimeout(() => {
        resetArmed = null;
        resetBtn.textContent = 'Odayı varsayılana döndür';
      }, 3000);
      return;
    }
    clearTimeout(resetArmed);
    resetArmed = null;
    resetBtn.textContent = 'Odayı varsayılana döndür';
    Game.edit.resetRoom();
    App.toast('Oda varsayılan haline döndü.');
  });

  App.on('edit:changed', render);
  App.on('room:changed', render);
  App.on('session:changed', render);

  buildCatalog();
  buildStyle();
  render();
})();
