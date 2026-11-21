/*
 * Karakter penceresi ve küçük bağlantılar.
 */
(() => {
  'use strict';

  const App = window.App;
  const Sh = window.Shared;
  const Art = App.Art;
  const Game = App.Game;
  const { $ } = App;

  // ---------- Karakter penceresi ----------
  const nameInput = $('#char-name');
  const preview = $('#char-preview');
  const pctx = preview.getContext('2d');
  const GROUPS = [
    { key: 'skin', el: '#char-skin', colors: Art.SKIN, names: Art.SKIN_NAMES },
    { key: 'hair', el: '#char-hair', colors: Art.HAIR, names: Art.HAIR_NAMES },
    { key: 'style', el: '#char-style', names: Art.STYLE_NAMES },
    { key: 'shirt', el: '#char-shirt', colors: Art.SHIRT, names: Art.SHIRT_NAMES },
    { key: 'pants', el: '#char-pants', colors: Art.PANTS, names: Art.PANTS_NAMES },
  ];

  let draft = Game.profile();
  let previewOpen = false;

  function buildGroups() {
    for (const g of GROUPS) {
      const root = $(g.el);
      root.replaceChildren(
        ...g.names.map((label, i) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.dataset.key = g.key;
          btn.dataset.value = String(i);
          if (g.colors) {
            btn.className = 'swatch';
            btn.style.setProperty('--swatch', g.colors[i]);
            btn.setAttribute('aria-label', label);
            btn.title = label;
          } else {
            btn.className = 'chip';
            btn.textContent = label;
          }
          return btn;
        }),
      );
      root.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-key]');
        if (!btn) return;
        draft.look[btn.dataset.key] = Number(btn.dataset.value);
        renderGroups();
      });
    }
  }

  function renderGroups() {
    for (const g of GROUPS) {
      $(g.el)
        .querySelectorAll('button')
        .forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.value) === draft.look[g.key])));
    }
  }

  function drawPreview(now) {
    const dirs = ['down', 'left', 'up', 'right'];
    const dir = dirs[Math.floor(now / 1400) % 4];
    const frame = Math.floor(now / 140) % 4;
    const img = Art.charSprite(draft.look, dir, 'stand', frame, false);
    const k = Math.floor(Math.min(preview.width / (img.width + 4), preview.height / (img.height + 4)));
    pctx.clearRect(0, 0, preview.width, preview.height);
    pctx.imageSmoothingEnabled = false;
    const x = Math.floor((preview.width - img.width * k) / 2);
    const y = Math.floor(preview.height - img.height * k - k * 2);
    pctx.fillStyle = 'rgba(40, 28, 36, 0.16)';
    pctx.fillRect(x + 3 * k, y + img.height * k - k, (img.width - 6) * k, k * 2);
    pctx.drawImage(img, x, y, img.width * k, img.height * k);
  }

  function openCharacter() {
    draft = Game.profile();
    nameInput.value = ['Guest', 'Misafir'].includes(draft.name) ? '' : draft.name;
    renderGroups();
    App.openModal('modal-character');
    previewOpen = true;
  }

  $('#btn-character').addEventListener('click', openCharacter);

  $('#char-random').addEventListener('click', () => {
    for (const [key, count] of Object.entries(Sh.LOOK_COUNTS)) draft.look[key] = Math.floor(Math.random() * count);
    renderGroups();
  });

  $('#char-form').addEventListener('submit', (e) => {
    e.preventDefault();
    Game.setProfile(nameInput.value, draft.look);
    App.closeModal();
    App.toast('Character saved.');
  });

  App.on('modal:close', (id) => {
    if (id === 'modal-character') previewOpen = false;
  });

  App.on('frame', (now) => {
    if (previewOpen) drawPreview(now);
  });

  // ---------- Küçük ipuçları ----------
  let deskHintShown = false;
  App.on('player:seated', ({ pose }) => {
    if (pose === 'work' && !App.Timer.isRunning() && !deskHintShown) {
      deskHintShown = true;
      App.toast('You sat down to work. Start the timer to focus.');
    }
  });

  buildGroups();
})();
