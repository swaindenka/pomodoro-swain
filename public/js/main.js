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
    { key: 'body', el: '#char-body', names: Art.BODY_NAMES },
    { key: 'skin', el: '#char-skin', colors: Art.SKIN, names: Art.SKIN_NAMES },
    { key: 'eyes', el: '#char-eyes', colors: Art.EYES, names: Art.EYE_NAMES },
    { key: 'face', el: '#char-face', names: Art.FACE_NAMES },
    { key: 'style', el: '#char-style', names: Art.STYLE_NAMES },
    { key: 'hair', el: '#char-hair', colors: Art.HAIR, names: Art.HAIR_NAMES },
    { key: 'top', el: '#char-top', names: Art.TOP_NAMES },
    { key: 'shirt', el: '#char-shirt', colors: Art.SHIRT, names: Art.SHIRT_NAMES },
    { key: 'bottom', el: '#char-bottom', names: Art.BOTTOM_NAMES },
    { key: 'pants', el: '#char-pants', colors: Art.PANTS, names: Art.PANTS_NAMES },
    { key: 'shoes', el: '#char-shoes', names: Art.SHOE_NAMES },
    { key: 'acc', el: '#char-acc', names: Art.ACC_NAMES },
    { key: 'acc2', el: '#char-acc2', names: Art.ACC2_NAMES },
  ];

  // Sekmeler: gövde, saç, kıyafet, aksesuar
  const charTabs = document.querySelectorAll('[data-char-tab]');
  function showCharTab(name) {
    charTabs.forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.charTab === name)));
    document.querySelectorAll('[data-char-panel]').forEach((el) => {
      el.hidden = el.dataset.charPanel !== name;
    });
  }
  charTabs.forEach((t) => t.addEventListener('click', () => showCharTab(t.dataset.charTab)));

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
    // Elbise seçiliyken alt giyim gizlenir
    // Elbisede alt giyim yok; tulumda biçim sabit (pantolon), yalnızca rengi seçilir
    $('#char-bottom-row').hidden = draft.look.top === 4;
    $('#char-bottom').hidden = draft.look.top === 6;
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
    const img = Art.charSprite(draft.look, dir, 'stand', frame, Math.floor(now / 1400) % 4 === 0 && now % 1400 < 120);
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

  // ---------- Ses penceresi ----------
  const Audio = App.Audio;
  const soundBtn = $('#btn-sound');
  const ambienceEl = $('#ambience');

  function switchButton(id, label) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'switch';
    btn.id = id;
    const track = document.createElement('span');
    track.className = 'switch-track';
    track.setAttribute('aria-hidden', 'true');
    btn.append(track, label);
    return btn;
  }

  function slider(id, label, value, onInput) {
    const input = document.createElement('input');
    input.type = 'range';
    input.id = id;
    input.min = '0';
    input.max = '100';
    input.step = '1';
    input.value = String(Math.round(value * 100));
    input.setAttribute('aria-label', label);
    input.addEventListener('input', () => onInput(Number(input.value) / 100));
    return input;
  }

  function buildAmbience() {
    const s = Audio.settings();
    ambienceEl.replaceChildren(
      ...Audio.AMBIENTS.map((a) => {
        const row = document.createElement('div');
        row.className = 'sound-row';
        const btn = switchButton(`amb-${a.id}`, a.name);
        btn.setAttribute('aria-pressed', String(s.amb[a.id].on));
        btn.addEventListener('click', () => {
          const on = btn.getAttribute('aria-pressed') !== 'true';
          btn.setAttribute('aria-pressed', String(on));
          Audio.setAmbient(a.id, on);
        });
        row.append(btn, slider(`amb-vol-${a.id}`, `${a.name} volume`, s.amb[a.id].vol, (v) => Audio.setAmbientVol(a.id, v)));
        return row;
      }),
    );
  }

  function renderSound() {
    const s = Audio.settings();
    $('#vol-master').value = String(Math.round(s.master * 100));
    $('#vol-sfx').value = String(Math.round(s.sfx * 100));
    $('#sfx-toggle').setAttribute('aria-pressed', String(s.sfxOn));
    soundBtn.classList.toggle('playing', Audio.playing());
    soundBtn.title = Audio.playing() ? 'Ambience is playing' : '';
  }

  $('#vol-master').addEventListener('input', (e) => Audio.setMaster(Number(e.target.value) / 100));
  $('#vol-sfx').addEventListener('input', (e) => Audio.setSfx(Number(e.target.value) / 100));
  $('#sfx-toggle').addEventListener('click', () => {
    Audio.setSfxOn(!Audio.settings().sfxOn);
    renderSound();
  });
  soundBtn.addEventListener('click', () => {
    buildAmbience();
    renderSound();
    App.openModal('modal-sound');
  });
  App.on('sound:changed', renderSound);
  renderSound();

  // ---------- Yapılacaklar listesinin yeri ----------
  // Birlikte çalışırken sağ sütunda oda kartı da olduğu için liste aşağıda kalıyordu;
  // geniş ekranda odanın altına (sol sütuna) taşınır. Tek sütunlu düzende yeri değişmez.
  const todosCard = document.querySelector('.todos');
  const sidebar = document.querySelector('.sidebar');
  const stageCol = document.querySelector('.stage-col');
  const leftbar = document.getElementById('leftbar');
  const wide = window.matchMedia('(min-width: 961px)');
  const wider = window.matchMedia('(min-width: 1500px)');

  // Çok geniş ekranda: solda liste, ortada oda, sağda zamanlayıcı
  function placeTodos() {
    const inRoom = Game.session().role !== 'solo';
    let target = sidebar;
    if (wider.matches) target = leftbar;
    else if (inRoom && wide.matches) target = stageCol;
    if (todosCard.parentElement !== target) target.append(todosCard);
    todosCard.classList.toggle('todos-wide', target === stageCol);
  }

  App.on('session:changed', placeTodos);
  for (const mq of [wide, wider]) {
    if (mq.addEventListener) mq.addEventListener('change', placeTodos);
    else if (mq.addListener) mq.addListener(placeTodos);
  }
  placeTodos();

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
