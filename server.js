'use strict';

/*
 * Pomodoro Odası sunucusu
 * - public/ klasöründeki dosyaları sunar
 * - /ws adresinde WebSocket ile odaları, konum eşitlemeyi, sohbeti ve ortak zamanlayıcıyı yönetir
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer, WebSocket } = require('ws');
const Shared = require('./public/js/shared.js');

const PUBLIC_DIR = path.join(__dirname, 'public');
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 5;
const MAX_ROOMS = 500;
const SHARED_SETTING_KEYS = ['work', 'short', 'long', 'interval', 'autoStart'];

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function serveStatic(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end();
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400);
    res.end();
    return;
  }
  if (pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('ok');
    return;
  }
  if (pathname.includes('\0')) {
    res.writeHead(400);
    res.end();
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = path.resolve(PUBLIC_DIR, `.${pathname}`);
  if (!file.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403);
    res.end();
    return;
  }
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(file).pipe(res);
  });
}

function sharedSettings(input) {
  const full = Shared.sanitizeSettings(input);
  const out = {};
  for (const key of SHARED_SETTING_KEYS) out[key] = full[key];
  return out;
}

/**
 * @param {{ minuteMs?: number }} [options] minuteMs testlerde zamanı hızlandırmak için kullanılır
 */
function createApp(options = {}) {
  const minuteMs = options.minuteMs || 60000;
  const rooms = new Map();
  const server = http.createServer(serveStatic);
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 64 * 1024 });

  const duration = (settings, mode) => Shared.durationMs(settings, mode, minuteMs);

  // ---------- Yardımcılar ----------
  function send(client, msg) {
    if (client.ws.readyState === WebSocket.OPEN) client.ws.send(JSON.stringify(msg));
  }

  function broadcast(room, msg, except) {
    const data = JSON.stringify(msg);
    for (const p of room.players.values()) {
      if (p !== except && p.ws.readyState === WebSocket.OPEN) p.ws.send(data);
    }
  }

  function sendError(client, message) {
    send(client, { t: 'error', message });
  }

  function newCode() {
    for (let tries = 0; tries < 50; tries++) {
      let code = '';
      for (let i = 0; i < CODE_LENGTH; i++) code += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
      if (!rooms.has(code)) return code;
    }
    return null;
  }

  const publicPlayer = (c) => ({ id: c.id, name: c.name, look: c.look, state: c.state });

  function setProfile(client, msg) {
    client.name = Shared.sanitizeName(msg.name);
    client.look = Shared.sanitizeLook(msg.look);
  }

  // ---------- Ortak zamanlayıcı ----------
  function newTimer(settings) {
    const s = sharedSettings(settings);
    return { settings: s, mode: 'work', running: false, endAt: 0, remaining: duration(s, 'work'), count: 0, handle: null };
  }

  function timerView(t) {
    return {
      mode: t.mode,
      running: t.running,
      remaining: t.running ? Math.max(0, t.endAt - Date.now()) : t.remaining,
      count: t.count,
      settings: t.settings,
    };
  }

  function timerStart(room) {
    const t = room.timer;
    if (t.running) return;
    t.running = true;
    t.endAt = Date.now() + t.remaining;
    t.handle = setTimeout(() => timerFinish(room), t.remaining);
  }

  function timerPause(room) {
    const t = room.timer;
    if (!t.running) return;
    t.remaining = Math.max(0, t.endAt - Date.now());
    t.running = false;
    clearTimeout(t.handle);
    t.handle = null;
  }

  function timerSetMode(room, mode) {
    const t = room.timer;
    clearTimeout(t.handle);
    t.handle = null;
    t.running = false;
    t.mode = mode;
    t.remaining = duration(t.settings, mode);
  }

  function timerFinish(room) {
    const t = room.timer;
    if (!rooms.has(room.code)) return;
    const finished = t.mode;
    if (finished === 'work') t.count += 1;
    timerSetMode(room, Shared.nextMode(finished, t.count, t.settings.interval));
    if (t.settings.autoStart) timerStart(room);
    broadcast(room, { t: 'timer', timer: timerView(t), event: 'finished', finished });
  }

  // ---------- Oda yaşam döngüsü ----------
  function join(client, room, created) {
    client.room = room;
    client.state = Shared.sanitizeState({});
    room.players.set(client.id, client);
    send(client, {
      t: 'joined',
      code: room.code,
      you: client.id,
      owner: room.owner,
      created,
      room: room.layout,
      players: [...room.players.values()].filter((p) => p !== client).map(publicPlayer),
      timer: timerView(room.timer),
    });
    broadcast(room, { t: 'peer-join', player: publicPlayer(client) }, client);
  }

  function leave(client) {
    const room = client.room;
    if (!room) return;
    client.room = null;
    room.players.delete(client.id);
    if (room.players.size === 0) {
      clearTimeout(room.timer.handle);
      rooms.delete(room.code);
      return;
    }
    broadcast(room, { t: 'peer-leave', id: client.id });
    if (room.owner === client.id) {
      room.owner = room.players.keys().next().value;
      broadcast(room, { t: 'owner', id: room.owner });
    }
  }

  // ---------- Mesajlar ----------
  function handle(client, msg) {
    const room = client.room;
    switch (msg.t) {
      case 'create': {
        leave(client);
        const code = rooms.size < MAX_ROOMS ? newCode() : null;
        if (!code) {
          sendError(client, 'The server is busy right now. Please try again later.');
          return;
        }
        setProfile(client, msg);
        const created = {
          code,
          owner: client.id,
          players: new Map(),
          layout: msg.room ? Shared.sanitizeRoom(msg.room) : Shared.defaultRoom(),
          timer: newTimer(msg.settings),
        };
        rooms.set(code, created);
        join(client, created, true);
        return;
      }
      case 'join': {
        const target = rooms.get(Shared.sanitizeCode(msg.code));
        if (!target) {
          sendError(client, 'No room found with that code. Please check it.');
          return;
        }
        if (target === room) return;
        if (target.players.size >= Shared.MAX_PLAYERS) {
          sendError(client, `The room is full (up to ${Shared.MAX_PLAYERS} people).`);
          return;
        }
        leave(client);
        setProfile(client, msg);
        join(client, target, false);
        return;
      }
      case 'leave':
        leave(client);
        return;
      case 'state':
        if (!room) return;
        client.state = Shared.sanitizeState(msg.s);
        broadcast(room, { t: 'player', id: client.id, s: client.state }, client);
        return;
      case 'profile':
        setProfile(client, msg);
        if (room) broadcast(room, { t: 'profile', id: client.id, name: client.name, look: client.look }, client);
        return;
      case 'react': {
        if (!room) return;
        const r = Shared.sanitizeReaction(msg.r);
        const now = Date.now();
        // tepkiler sohbetten de seyrek gelsin: kişi başı 0,6 saniyede bir
        if (r < 0 || now - (client.lastReact || 0) < 600) return;
        client.lastReact = now;
        broadcast(room, { t: 'react', id: client.id, r });
        return;
      }
      case 'chat': {
        if (!room) return;
        const text = Shared.sanitizeChat(msg.text);
        if (text) broadcast(room, { t: 'chat', id: client.id, text });
        return;
      }
      case 'room':
        if (!room || room.owner !== client.id) return;
        room.layout = Shared.sanitizeRoom(msg.room);
        broadcast(room, { t: 'room', room: room.layout }, client);
        return;
      case 'timer': {
        if (!room) return;
        const t = room.timer;
        if (msg.action === 'start') timerStart(room);
        else if (msg.action === 'pause') timerPause(room);
        else if (msg.action === 'reset') timerSetMode(room, t.mode);
        else if (msg.action === 'skip') timerSetMode(room, t.mode === 'work' ? 'short' : 'work');
        else if (msg.action === 'mode' && Shared.MODES.includes(msg.mode)) timerSetMode(room, msg.mode);
        else return;
        broadcast(room, { t: 'timer', timer: timerView(t), action: msg.action, by: client.id });
        return;
      }
      case 'settings': {
        if (!room) return;
        const t = room.timer;
        const wasFresh = !t.running && t.remaining === duration(t.settings, t.mode);
        t.settings = sharedSettings(msg.settings);
        if (!t.running) t.remaining = wasFresh ? duration(t.settings, t.mode) : Math.min(t.remaining, duration(t.settings, t.mode));
        broadcast(room, { t: 'timer', timer: timerView(t), action: 'settings', by: client.id });
        return;
      }
      default:
    }
  }

  // Basit hız sınırı: 40 mesajlık kova, saniyede 30 mesaj dolum
  function allow(client) {
    const now = Date.now();
    client.tokens = Math.min(40, client.tokens + ((now - client.last) / 1000) * 30);
    client.last = now;
    if (client.tokens < 1) return false;
    client.tokens -= 1;
    return true;
  }

  wss.on('connection', (ws) => {
    const client = {
      ws,
      id: crypto.randomBytes(6).toString('hex'),
      room: null,
      name: 'Guest',
      look: Shared.sanitizeLook({}),
      state: Shared.sanitizeState({}),
      tokens: 40,
      last: Date.now(),
    };
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    ws.on('message', (data, isBinary) => {
      if (isBinary || !allow(client)) return;
      let msg;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return;
      }
      if (msg && typeof msg === 'object' && typeof msg.t === 'string') handle(client, msg);
    });
    ws.on('close', () => leave(client));
    ws.on('error', () => {});
  });

  // Kopmuş bağlantıları temizle
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.isAlive === false) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, 30000);
  heartbeat.unref();

  function close() {
    clearInterval(heartbeat);
    for (const room of rooms.values()) clearTimeout(room.timer.handle);
    rooms.clear();
    for (const ws of wss.clients) ws.terminate();
    wss.close();
    server.close();
  }

  return { server, wss, rooms, close };
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const app = createApp();
  app.server.listen(port, () => {
    console.log(`Pomodoro Room is running at http://localhost:${port}`);
  });
  const shutdown = () => {
    app.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = { createApp };
