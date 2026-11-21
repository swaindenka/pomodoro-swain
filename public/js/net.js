/*
 * Çok oyunculu mod: WebSocket ile oda oluşturma/katılma, konum eşitleme, sohbet, ortak zamanlayıcı.
 */
(() => {
  'use strict';

  const App = window.App;
  const Sh = window.Shared;
  const { $ } = App;
  const Net = (App.Net = {});
  const cfg = window.POMODORO_CONFIG || {};

  const ACTION_TEXT = {
    start: 'started the timer',
    pause: 'paused the timer',
    reset: 'reset the timer',
    skip: 'skipped the session',
    mode: 'changed the mode',
    settings: 'changed the durations',
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
          App.toast('Lost connection to the server. You are back in your own place.', 4000);
          teardown();
        }
      });
    });
  }

  Net.send = (msg) => {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  };

  Net.inRoom = () => code !== null;
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
        addSystem(createdByMe ? 'Room is ready. Share the code or link with your friends.' : 'You joined the room. Happy studying!');
        updateUrl(code);
        App.closeModal();
        renderRoom();
        lastSent = '';
        break;
      }
      case 'peer-join':
        names.set(msg.player.id, Sh.sanitizeName(msg.player.name));
        App.Game.upsertOther(msg.player);
        addSystem(`${names.get(msg.player.id)} joined.`);
        App.emit('sfx', 'join');
        renderPlayers();
        break;
      case 'peer-leave':
        addSystem(`${names.get(msg.id) || 'Someone'} left.`);
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
        addSystem(ownerId === selfId ? 'You are now the host and can edit the room.' : `${names.get(ownerId) || 'Someone'} is now the host.`);
        renderRoom();
        break;
      case 'timer':
        App.Timer.applyRemote(msg.timer, msg);
        if (msg.by && msg.by !== selfId && ACTION_TEXT[msg.action]) {
          addSystem(`${names.get(msg.by) || 'Someone'} ${ACTION_TEXT[msg.action]}.`);
        }
        break;
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
        showError(typeof msg.message === 'string' ? msg.message : 'Something went wrong.');
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
  const roomCard = $('#room-card');
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

  function renderRoom() {
    roomCard.hidden = !code;
    togetherBtn.textContent = code ? `Room ${code}` : 'Study together';
    if (!code) return;
    roomCodeEl.textContent = code;
    $('#room-venue').textContent = `· ${App.Art.VENUE_NAMES[App.Game.venue()]}`;
    roomOwnerEl.textContent = ownerId === selfId ? 'You are the host' : `Host: ${names.get(ownerId) || '—'}`;
    renderPlayers();
  }

  function renderPlayers() {
    if (!code) return;
    const rows = [];
    const me = App.Game.me();
    rows.push({ name: `${App.Game.profile().name} (you)`, activity: App.Game.activity(me), owner: ownerId === selfId });
    for (const o of App.Game.others().values()) {
      rows.push({ name: o.name, activity: App.Game.activity(o), owner: ownerId === o.id });
    }
    playerList.replaceChildren(
      ...rows.map((r) => {
        const li = document.createElement('li');
        const name = document.createElement('span');
        name.className = 'player-name';
        name.textContent = r.name;
        if (r.owner) {
          const badge = document.createElement('span');
          badge.className = 'badge';
          badge.textContent = 'host';
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

  function pushLine(li) {
    chatLog.append(li);
    while (chatLog.children.length > 60) chatLog.firstElementChild.remove();
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function addChat(name, text, mine) {
    const li = document.createElement('li');
    li.className = mine ? 'chat-line mine' : 'chat-line';
    const who = document.createElement('strong');
    who.textContent = `${name}: `;
    li.append(who, document.createTextNode(text));
    pushLine(li);
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
    if (!text || !code) return;
    Net.send({ t: 'chat', text });
    chatInput.value = '';
  });

  $('#room-copy').addEventListener('click', async () => {
    const link = inviteLink();
    try {
      await navigator.clipboard.writeText(link);
      App.toast('Invite link copied.');
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
    App.toast('You left the room.');
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
      showError("Couldn't connect to the server. Make sure it is running.");
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
      showError('Check the room code (e.g. K7M2Q).');
      return;
    }
    run({ t: 'join', code: roomCode });
  });

  togetherBtn.addEventListener('click', () => {
    if (code) {
      chatInput.focus();
      roomCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
