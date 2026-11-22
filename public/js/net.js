/*
 * Çok oyunculu mod: WebSocket ile oda oluşturma/katılma, konum eşitleme, sohbet, ortak zamanlayıcı.
 */
(() => {
  'use strict';

  const App = window.App;
  const Sh = window.Shared;
  const { $, t } = App;
  const Net = (App.Net = {});
  const cfg = window.POMODORO_CONFIG || {};

  const ACTION_TEXT = {
    start: '{name} started the timer.',
    pause: '{name} paused the timer.',
    reset: '{name} reset the timer.',
    skip: '{name} skipped the session.',
    mode: '{name} changed the mode.',
    settings: '{name} changed the durations.',
  };

  let ws = null;
  let code = null;
  let selfId = null;
  let ownerId = null;
  let createdByMe = false;
  let busy = false;
  const names = new Map();
  let lastSent = '';
  let lastSentAt = 0;

  // ---------- Sunucu adresi ----------
  function normalize(url) {
    let u = String(url).trim();
    if (/^https?:\/\//i.test(u)) {
      u = u.replace(/^http/i, 'ws');
      if (!/\/ws\/?$/.test(u)) u = `${u.replace(/\/+$/, '')}/ws`;
    }
    return /^wss?:\/\//i.test(u) ? u : null;
  }

  function serverUrl() {
    const q = new URLSearchParams(location.search).get('sunucu');
    if (q) return normalize(q);
    if (cfg.offline) return null;
    if (cfg.server) return normalize(cfg.server);
    if (location.protocol === 'http:' || location.protocol === 'https:') {
      return `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`;
    }
    return null;
  }

  // ---------- Bağlantı ----------
  function connect() {
    return new Promise((resolve, reject) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }
      const url = serverUrl();
      if (!url) {
        reject(new Error('no-server'));
        return;
      }
      let sock;
      try {
        sock = new WebSocket(url);
      } catch (err) {
        reject(err);
        return;
      }
      ws = sock;
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        sock.close();
        reject(new Error('timeout'));
      }, 7000);
      sock.addEventListener('open', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve();
      });
      sock.addEventListener('error', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(new Error('error'));
      });
      sock.addEventListener('message', (ev) => {
        if (sock === ws) onMessage(ev);
      });
      sock.addEventListener('close', () => {
        if (sock !== ws) return;
        ws = null;
        if (code) {
          App.toast(t('Lost connection to the server. You are back in your own place.'), 4000);
          teardown();
        }
      });
    });
  }

  Net.send = (msg) => {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  };

  Net.inRoom = () => code !== null;

  // Arka plan sinyali: sekme arka plandayken oyun döngüsü durur ve konum mesajları kesilir.
  // Odadayken dakikada bir küçük bir mesaj göndererek sunucunun (ör. Render ücretsiz planı) boşta sayılıp uyumasını önleriz.
  setInterval(() => {
    if (code) Net.send({ t: 'hb' });
  }, 60000);
  Net.available = () => serverUrl() !== null;

  function teardown() {
    code = null;
    selfId = null;
    ownerId = null;
    createdByMe = false;
    names.clear();
    App.Game.leaveSession();
    App.Timer.useLocal();
    renderRoom();
    updateUrl(null);
  }

  function updateUrl(roomCode) {
    try {
      const url = new URL(location.href);
      if (roomCode) url.searchParams.set('oda', roomCode);
      else url.searchParams.delete('oda');
      history.replaceState(null, '', url);
    } catch {
      /* bazı gömülü görünümlerde geçmiş değiştirilemez */
    }
  }

  function inviteLink() {
    const url = new URL(location.href);
    url.search = '';
    url.hash = '';
    const server = new URLSearchParams(location.search).get('sunucu');
    if (server) url.searchParams.set('sunucu', server);
    url.searchParams.set('oda', code);
    return url.toString();
  }

  // ---------- Mesajlar ----------
  function onMessage(ev) {
    let msg;
    try {
      msg = JSON.parse(ev.data);
    } catch {
      return;
    }
    if (!msg || typeof msg.t !== 'string') return;
    switch (msg.t) {
      case 'joined': {
        code = msg.code;
        selfId = msg.you;
        ownerId = msg.owner;
        createdByMe = msg.created === true;
        names.clear();
        for (const p of msg.players || []) names.set(p.id, Sh.sanitizeName(p.name));
        App.Game.enterSession({
          role: ownerId === selfId ? 'owner' : 'guest',
          mine: createdByMe,
          room: msg.room,
          players: msg.players,
        });
        App.Timer.applyRemote(msg.timer);
        clearChat();
        addSystem(createdByMe ? t('Room is ready. Share the code or link with your friends.') : t('You joined the room. Happy studying!'));
        updateUrl(code);
        App.closeModal();
        renderRoom();
        lastSent = '';
        break;
      }
      case 'peer-join':
        names.set(msg.player.id, Sh.sanitizeName(msg.player.name));
        App.Game.upsertOther(msg.player);
        addSystem(t('{name} joined.', { name: names.get(msg.player.id) }));
        App.emit('sfx', 'join');
        renderPlayers();
        break;
      case 'peer-leave':
        addSystem(t('{name} left.', { name: names.get(msg.id) || t('Someone') }));
        App.emit('sfx', 'leave');
        names.delete(msg.id);
        App.Game.removeOther(msg.id);
        renderPlayers();
        break;
      case 'player':
        App.Game.updateOther(msg.id, msg.s);
        break;
      case 'profile':
        names.set(msg.id, Sh.sanitizeName(msg.name));
        App.Game.upsertOther({ id: msg.id, name: msg.name, look: msg.look });
        renderPlayers();
        break;
      case 'room':
        App.Game.setRemoteRoom(msg.room);
        break;
      case 'owner':
        ownerId = msg.id;
        App.Game.setRole(ownerId === selfId ? 'owner' : 'guest');
        addSystem(ownerId === selfId ? t('You are now the host and can edit the room.') : t('{name} is now the host.', { name: names.get(ownerId) || t('Someone') }));
        renderRoom();
        break;
      case 'timer':
        App.Timer.applyRemote(msg.timer, msg);
        if (msg.by && msg.by !== selfId && ACTION_TEXT[msg.action]) {
          addSystem(t(ACTION_TEXT[msg.action], { name: names.get(msg.by) || t('Someone') }));
        }
        break;
      case 'hi5': {
        // yan yana duran iki kişi çak yaptı
        const who = (id) => (id === selfId ? 'me' : id);
        if (typeof msg.a === 'string' && typeof msg.b === 'string') App.Game.highFive(who(msg.a), who(msg.b));
        break;
      }
      case 'react': {
        const r = Sh.sanitizeReaction(msg.r);
        if (r >= 0) App.Game.react(msg.id === selfId ? 'me' : msg.id, r);
        break;
      }
      case 'chat': {
        const text = Sh.sanitizeChat(msg.text);
        if (!text) break;
        const mine = msg.id === selfId;
        addChat(mine ? App.Game.profile().name : names.get(msg.id) || 'Someone', text, mine);
        App.Game.say(mine ? 'me' : msg.id, text);
        if (!mine) App.emit('sfx', 'message');
        break;
      }
      case 'error':
        showError(typeof msg.message === 'string' ? t(msg.message) : t('Something went wrong.'));
        break;
      default:
        break;
    }
  }

  // Konum güncellemesi: değiştiğinde en fazla saniyede 10 kez, değişmese bile 3 saniyede bir
  App.on('frame', (now) => {
    if (!code || !ws || ws.readyState !== WebSocket.OPEN) return;
    if (now - lastSentAt < 100) return;
    const s = JSON.stringify(App.Game.localState());
    if (s === lastSent && now - lastSentAt < 3000) return;
    lastSent = s;
    lastSentAt = now;
    ws.send(`{"t":"state","s":${s}}`);
  });

  App.on('profile:changed', (p) => {
    if (code) Net.send({ t: 'profile', name: p.name, look: p.look });
    renderPlayers();
  });

  App.on('room:changed', () => {
    if (code) renderRoom();
  });

  App.on('room:edited', (room) => {
    if (code && ownerId === selfId) Net.send({ t: 'room', room });
  });

  // ---------- Arayüz ----------
  const chatPanel = $('#chat-panel');
  const placeBar = $('#place-bar');
  const roomChip = $('#room-chip');
  const roomActions = $('#room-actions');
  const roomCount = $('#room-count');
  const peopleCount = $('#people-count');
  const chatUnread = $('#chat-unread');
  const touch = window.matchMedia && window.matchMedia('(hover: none)').matches;
  const roomCodeEl = $('#room-code');
  const roomOwnerEl = $('#room-owner');
  const playerList = $('#player-list');
  const chatLog = $('#chat-log');
  const chatForm = $('#chat-form');
  const chatInput = $('#chat-input');
  const togetherBtn = $('#btn-together');
  const modalError = $('#together-error');
  const serverNote = $('#together-server-note');
  const nameInput = $('#together-name');
  const codeInput = $('#together-code');
  const createBtn = $('#together-create');
  const joinBtn = $('#together-join');

  // Odadayken: üstte oda kodu ve Invite / Leave, oyunun içinde yarı saydam sohbet paneli
  function renderRoom() {
    if (!code) {
      setOpen(false);
      unread = 0;
      renderUnread();
    }
    chatPanel.hidden = !code;
    roomChip.hidden = !code;
    roomActions.hidden = !code;
    placeBar.classList.toggle('in-room', Boolean(code));
    togetherBtn.textContent = code ? t('Room {code}', { code }) : t('Study together');
    if (!code) return;
    roomCodeEl.textContent = code;
    const host = ownerId === selfId ? t('You are the host') : t('Host: {name}', { name: names.get(ownerId) || '—' });
    roomOwnerEl.textContent = host;
    roomChip.title = t('Room {code} · {host}', { code, host });
    renderPlayers();
  }

  // ---------- Oyun tarzı sohbet ----------
  // Boştayken yalnızca ince bir "Enter ile yaz" çubuğu görünür; gelen mesajlar sol altta birkaç saniye
  // belirip solar. Enter'a basınca (ya da çubuğa tıklayınca) yazma açılır ve geçmişin tamamı görünür.
  const FRESH_MS = 9000;
  const FRESH_MAX = 4;
  let unread = 0;
  const chatOpen = () => chatPanel.classList.contains('open');

  function renderUnread() {
    chatUnread.hidden = !unread;
    chatUnread.textContent = unread > 9 ? '9+' : String(unread);
  }

  function setOpen(on) {
    if (on === chatOpen()) return;
    chatPanel.classList.toggle('open', on);
    chatInput.placeholder = on ? t('Write a message…') : touch ? t('Tap to chat') : t('Press Enter to chat');
    if (on) {
      unread = 0;
      renderUnread();
      chatLog.scrollTop = chatLog.scrollHeight;
    }
  }

  function openChat() {
    if (!code) return;
    setOpen(true);
    chatInput.focus({ preventScroll: true });
  }

  function closeChat() {
    setOpen(false);
    if (chatPanel.contains(document.activeElement)) document.activeElement.blur();
  }

  // Yazı alanına ya da geçmişe odaklanınca açılır; odak başka yere gidince kapanır
  const inChat = (el) => el === chatInput || el === chatLog;
  chatPanel.addEventListener('focusin', (e) => {
    if (inChat(e.target)) setOpen(true);
  });
  chatPanel.addEventListener('focusout', () => {
    setTimeout(() => {
      if (!inChat(document.activeElement)) setOpen(false);
    }, 0);
  });

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeChat();
    }
  });

  // Enter: odadayken sohbeti aç (bir alana yazılmıyorsa, pencere açık değilse ve düzenlenmiyorsa)
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.repeat || e.ctrlKey || e.metaKey || e.altKey || !code || chatOpen()) return;
    if (App.modalOpen() || App.isFormField(e.target) || (e.target instanceof Element && e.target.closest('button, a, summary'))) return;
    if (App.Game.edit.state().on) return;
    e.preventDefault();
    openChat();
  });

  chatInput.placeholder = touch ? t('Tap to chat') : t('Press Enter to chat');

  function renderPlayers() {
    if (!code) return;
    const rows = [];
    const me = App.Game.me();
    rows.push({ name: t('{name} (you)', { name: App.Game.profile().name }), activity: t(App.Game.activity(me)), owner: ownerId === selfId });
    for (const o of App.Game.others().values()) {
      rows.push({ name: o.name, activity: t(App.Game.activity(o)), owner: ownerId === o.id });
    }
    const people = App.tn(rows.length, '{n} person', '{n} people');
    peopleCount.textContent = people;
    roomCount.textContent = String(rows.length);
    roomCount.title = t('{people} in the room', { people });
    playerList.replaceChildren(
      ...rows.map((r) => {
        const li = document.createElement('li');
        const name = document.createElement('span');
        name.className = 'player-name';
        name.textContent = r.name;
        if (r.owner) {
          const badge = document.createElement('span');
          badge.className = 'badge';
          badge.textContent = t('host');
          name.append(' ', badge);
        }
        const act = document.createElement('span');
        act.className = 'player-activity';
        act.textContent = r.activity;
        li.append(name, act);
        return li;
      }),
    );
  }

  setInterval(renderPlayers, 1000);

  function clearChat() {
    chatLog.replaceChildren();
  }

  // Yeni satır birkaç saniye "taze" kalır (sohbet kapalıyken görünür, sonra solar)
  function pushLine(li) {
    li.classList.add('fresh');
    chatLog.append(li);
    while (chatLog.children.length > 60) chatLog.firstElementChild.remove();
    const fresh = chatLog.querySelectorAll('.chat-line.fresh');
    for (let i = 0; i < fresh.length - FRESH_MAX; i++) fresh[i].classList.remove('fresh');
    setTimeout(() => li.classList.remove('fresh'), FRESH_MS);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function addChat(name, text, mine) {
    const li = document.createElement('li');
    li.className = mine ? 'chat-line mine' : 'chat-line';
    const who = document.createElement('strong');
    who.textContent = `${name}: `;
    li.append(who, document.createTextNode(text));
    pushLine(li);
    if (!mine && !chatOpen()) {
      unread++;
      renderUnread();
    }
  }

  function addSystem(text) {
    const li = document.createElement('li');
    li.className = 'chat-line system';
    li.textContent = text;
    pushLine(li);
  }

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = Sh.sanitizeChat(chatInput.value);
    if (!text || !code) {
      closeChat();
      return;
    }
    Net.send({ t: 'chat', text });
    chatInput.value = '';
    // oyunlardaki gibi: gönderince sohbet kapanır, yürüme tuşları yeniden karaktere gider
    closeChat();
  });

  $('#room-copy').addEventListener('click', async () => {
    const link = inviteLink();
    try {
      await navigator.clipboard.writeText(link);
      App.toast(t('Invite link copied.'));
    } catch {
      const field = $('#room-link');
      field.hidden = false;
      field.value = link;
      field.focus();
      field.select();
    }
  });

  $('#room-leave').addEventListener('click', () => {
    if (!code) return;
    Net.send({ t: 'leave' });
    const sock = ws;
    ws = null;
    teardown();
    if (sock) sock.close();
    App.toast(t('You left the room.'));
  });

  function showError(text) {
    modalError.textContent = text;
    modalError.hidden = !text;
    if (text && !App.modalOpen()) App.toast(text, 4000);
  }

  function setBusy(on) {
    busy = on;
    createBtn.disabled = on || !Net.available();
    joinBtn.disabled = on || !Net.available();
  }

  function prepareModal(prefillCode) {
    nameInput.value = ['Guest', 'Misafir'].includes(App.Game.profile().name) ? '' : App.Game.profile().name;
    if (prefillCode) codeInput.value = prefillCode;
    showError('');
    const available = Net.available();
    serverNote.hidden = available;
    setBusy(false);
  }

  function applyName() {
    const name = nameInput.value.trim();
    const p = App.Game.profile();
    if (name && name !== p.name) App.Game.setProfile(name, p.look);
  }

  async function run(payload) {
    if (busy) return;
    applyName();
    setBusy(true);
    showError('');
    try {
      await connect();
      const p = App.Game.profile();
      Net.send({ ...payload, name: p.name, look: p.look });
    } catch {
      showError(t("Couldn't connect to the server. Make sure it is running."));
    } finally {
      setBusy(false);
    }
  }

  createBtn.addEventListener('click', () => {
    run({ t: 'create', room: App.Game.localRoom(), settings: App.Timer.localSettings() });
  });

  $('#together-join-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const roomCode = Sh.sanitizeCode(codeInput.value);
    if (roomCode.length < 4) {
      showError(t('Check the room code (e.g. K7M2Q).'));
      return;
    }
    run({ t: 'join', code: roomCode });
  });

  togetherBtn.addEventListener('click', () => {
    if (code) {
      chatPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      openChat();
      return;
    }
    prepareModal();
    App.openModal('modal-together');
  });

  // Davet bağlantısıyla gelindiyse katılma penceresini aç
  const invited = Sh.sanitizeCode(new URLSearchParams(location.search).get('oda') || '');
  if (invited) {
    prepareModal(invited);
    App.openModal('modal-together');
  }

  renderRoom();
})();
