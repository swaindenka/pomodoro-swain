'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const WebSocket = require('ws');
const { createApp } = require('../server.js');
const Shared = require('../public/js/shared.js');

// Testlerde bir "dakika" 40 ms sürer
const MINUTE_MS = 40;

function startApp() {
  const app = createApp({ minuteMs: MINUTE_MS });
  return new Promise((resolve) => {
    app.server.listen(0, '127.0.0.1', () => resolve({ app, port: app.server.address().port }));
  });
}

function get(port, path) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path, method: 'GET' }, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'], body }));
    });
    req.on('error', reject);
    req.end();
  });
}

// Gelen mesajları sıraya koyan küçük istemci
function client(port) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const queue = [];
    const waiters = [];
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      const i = waiters.findIndex((w) => w.match(msg));
      if (i >= 0) waiters.splice(i, 1)[0].resolve(msg);
      else queue.push(msg);
    });
    ws.on('open', () =>
      resolve({
        ws,
        send: (m) => ws.send(JSON.stringify(m)),
        next(match, timeout = 2000) {
          const pred = typeof match === 'string' ? (m) => m.t === match : match;
          const i = queue.findIndex(pred);
          if (i >= 0) return Promise.resolve(queue.splice(i, 1)[0]);
          return new Promise((res, rej) => {
            const w = { match: pred, resolve: res };
            waiters.push(w);
            setTimeout(() => {
              const k = waiters.indexOf(w);
              if (k >= 0) {
                waiters.splice(k, 1);
                rej(new Error(`Mesaj gelmedi: ${match}`));
              }
            }, timeout);
          });
        },
        queue,
        close: () => ws.close(),
      }),
    );
    ws.on('error', reject);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('statik dosyalar sunulur, klasör dışına çıkılamaz', async () => {
  const { app, port } = await startApp();
  try {
    const index = await get(port, '/');
    assert.equal(index.status, 200);
    assert.match(index.type, /text\/html/);
    assert.match(index.body, /Pomodoro/);
    const js = await get(port, '/js/shared.js');
    assert.equal(js.status, 200);
    assert.match(js.type, /javascript/);
    assert.equal((await get(port, '/healthz')).body, 'ok');
    assert.equal((await get(port, '/yok.html')).status, 404);
    assert.notEqual((await get(port, '/%2e%2e/server.js')).status, 200);
    assert.notEqual((await get(port, '/../package.json')).status, 200);
  } finally {
    app.close();
  }
});

test('oda oluşturma, katılma, konum, sohbet ve ayrılma', async () => {
  const { app, port } = await startApp();
  const a = await client(port);
  const b = await client(port);
  try {
    const room = Shared.defaultRoom();
    a.send({ t: 'create', name: 'Ayşe', look: { hair: 3 }, room, settings: { work: 2 } });
    const joinedA = await a.next('joined');
    assert.equal(joinedA.created, true);
    assert.match(joinedA.code, /^[A-Z2-9]{5}$/);
    assert.equal(joinedA.owner, joinedA.you);
    assert.deepEqual(joinedA.room, room);
    assert.equal(joinedA.timer.remaining, 2 * MINUTE_MS);

    b.send({ t: 'join', code: joinedA.code.toLowerCase(), name: '<b>Mehmet</b>', look: {} });
    const joinedB = await b.next('joined');
    assert.equal(joinedB.created, false);
    assert.equal(joinedB.owner, joinedA.you);
    assert.equal(joinedB.players.length, 1);
    assert.equal(joinedB.players[0].name, 'Ayşe');
    const peer = await a.next('peer-join');
    assert.equal(peer.player.name, '<b>Mehmet</b>'); // metin olarak iletilir, istemci textContent kullanır

    b.send({ t: 'state', s: { x: 3.5, y: 2.2, dir: 'left', pose: 'sit', moving: false, seat: { id: 'sofa1', i: 1 } } });
    const st = await a.next('player');
    assert.equal(st.id, joinedB.you);
    assert.deepEqual(st.s, { x: 3.5, y: 2.2, dir: 'left', pose: 'sit', moving: false, seat: { id: 'sofa1', i: 1 } });

    a.send({ t: 'chat', text: '  Merhaba!  ' });
    assert.equal((await b.next('chat')).text, 'Merhaba!');
    assert.equal((await a.next('chat')).id, joinedA.you);

    // arka plan sinyali sessizce kabul edilir, kimseye yayınlanmaz
    a.send({ t: 'hb' });
    await sleep(50);
    assert.equal(b.queue.filter((m) => m.t === 'hb').length, 0);

    // hızlı tepki herkese gider; geçersiz ve çok sık tepkiler yok sayılır
    a.send({ t: 'react', r: 4 });
    const reaction = await b.next('react');
    assert.deepEqual([reaction.id, reaction.r], [joinedA.you, 4]);
    assert.equal((await a.next('react')).r, 4);
    a.send({ t: 'react', r: 1 });
    a.send({ t: 'react', r: 99 });
    b.send({ t: 'react', r: 'x' });
    await sleep(100);
    a.send({ t: 'chat', text: 'after' });
    await b.next('chat');
    assert.equal(b.queue.filter((m) => m.t === 'react').length, 0);

    b.send({ t: 'join', code: 'ZZZZZ' });
    assert.match((await b.next('error')).message, /No room found/);

    b.send({ t: 'leave' });
    assert.equal((await a.next('peer-leave')).id, joinedB.you);
    assert.equal(app.rooms.size, 1);
    a.send({ t: 'leave' });
    await sleep(50);
    assert.equal(app.rooms.size, 0);
  } finally {
    a.close();
    b.close();
    app.close();
  }
});

test('odayı sadece sahibi düzenler; sahip ayrılınca sahiplik devredilir', async () => {
  const { app, port } = await startApp();
  const a = await client(port);
  const b = await client(port);
  try {
    a.send({ t: 'create', name: 'A', room: Shared.defaultRoom() });
    const ja = await a.next('joined');
    b.send({ t: 'join', code: ja.code, name: 'B' });
    const jb = await b.next('joined');
    await a.next('peer-join');

    b.send({ t: 'room', room: { items: [] } });
    await sleep(80);
    assert.equal(a.queue.filter((m) => m.t === 'room').length, 0);
    assert.equal(app.rooms.get(ja.code).layout.items.length, Shared.defaultRoom().items.length);

    const edited = { venue: 'cafe', style: { wall: 2, pattern: 3, floor: 4 }, items: [{ id: 'x', type: 'cafeTable', x: 0, y: 0, c: 1, r: 1 }] };
    a.send({ t: 'room', room: edited });
    const upd = await b.next('room');
    assert.deepEqual(upd.room, edited);

    a.close();
    const owner = await b.next('owner');
    assert.equal(owner.id, jb.you);
    assert.equal((await b.next('peer-leave')).id, ja.you);

    b.send({ t: 'room', room: { items: [] } });
    await sleep(80);
    assert.equal(app.rooms.get(ja.code).layout.items.length, 0);
  } finally {
    b.close();
    app.close();
  }
});

test('ortak zamanlayıcı herkese yayınlanır ve süre bitince sonraki moda geçer', async () => {
  const { app, port } = await startApp();
  const a = await client(port);
  const b = await client(port);
  try {
    a.send({ t: 'create', name: 'A', settings: { work: 2, short: 1, long: 3, interval: 2 } });
    const ja = await a.next('joined');
    b.send({ t: 'join', code: ja.code, name: 'B' });
    await b.next('joined');

    b.send({ t: 'timer', action: 'start' });
    const started = await a.next((m) => m.t === 'timer' && m.action === 'start');
    assert.equal(started.by, (await a.next('peer-join')).player.id);
    assert.equal(started.timer.running, true);
    assert.equal(started.timer.mode, 'work');

    const fin1 = await b.next((m) => m.t === 'timer' && m.event === 'finished');
    assert.equal(fin1.finished, 'work');
    assert.equal(fin1.timer.mode, 'short');
    assert.equal(fin1.timer.count, 1);
    assert.equal(fin1.timer.running, false);

    a.send({ t: 'timer', action: 'skip' });
    const skipped = await b.next((m) => m.t === 'timer' && m.action === 'skip');
    assert.equal(skipped.timer.mode, 'work');

    a.send({ t: 'timer', action: 'start' });
    const fin2 = await b.next((m) => m.t === 'timer' && m.event === 'finished');
    assert.equal(fin2.timer.mode, 'long'); // aralık 2 → ikinci pomodorodan sonra uzun mola
    assert.equal(fin2.timer.count, 2);

    a.send({ t: 'timer', action: 'start' });
    await b.next((m) => m.t === 'timer' && m.action === 'start');
    a.send({ t: 'timer', action: 'pause' });
    const paused = await b.next((m) => m.t === 'timer' && m.action === 'pause');
    assert.equal(paused.timer.running, false);
    assert.ok(paused.timer.remaining > 0 && paused.timer.remaining <= 3 * MINUTE_MS);

    b.send({ t: 'settings', settings: { work: 5, short: 1, long: 3, interval: 4, autoStart: true } });
    const changed = await a.next((m) => m.t === 'timer' && m.action === 'settings');
    assert.equal(changed.timer.settings.work, 5);
    assert.equal(changed.timer.settings.autoStart, true);

    a.send({ t: 'timer', action: 'mode', mode: 'nope' });
    a.send({ t: 'timer', action: 'mode', mode: 'work' });
    const moded = await b.next((m) => m.t === 'timer' && m.action === 'mode');
    assert.equal(moded.timer.mode, 'work');
    assert.equal(moded.timer.remaining, 5 * MINUTE_MS);
  } finally {
    a.close();
    b.close();
    app.close();
  }
});

test('oda en fazla 8 kişi alır ve bozuk mesajlar sunucuyu düşürmez', async () => {
  const { app, port } = await startApp();
  const clients = [];
  try {
    const owner = await client(port);
    clients.push(owner);
    owner.ws.send('{bozuk');
    owner.ws.send(Buffer.from([1, 2, 3]), { binary: true });
    owner.send({ t: 'create', name: 'O', room: { items: 'x' } });
    const jo = await owner.next('joined');
    assert.deepEqual(jo.room.items, []);
    for (let i = 1; i < Shared.MAX_PLAYERS; i++) {
      const c = await client(port);
      clients.push(c);
      c.send({ t: 'join', code: jo.code, name: `P${i}` });
      await c.next('joined');
    }
    const extra = await client(port);
    clients.push(extra);
    extra.send({ t: 'join', code: jo.code, name: 'Fazla' });
    assert.match((await extra.next('error')).message, /full/);
    assert.equal(app.rooms.get(jo.code).players.size, Shared.MAX_PLAYERS);
  } finally {
    clients.forEach((c) => c.close());
    app.close();
  }
});

test('çak yalnızca yan yana duran iki kişi arasında olur ve herkese yayınlanır', async () => {
  const { app, port } = await startApp();
  const a = await client(port);
  const b = await client(port);
  const c = await client(port);
  try {
    a.send({ t: 'create', name: 'Ayşe', look: {} });
    const ja = await a.next('joined');
    b.send({ t: 'join', code: ja.code, name: 'Mehmet', look: {} });
    const jb = await b.next('joined');
    c.send({ t: 'join', code: ja.code, name: 'Can', look: {} });
    const jc = await c.next('joined');
    const stand = (x, y, seat = null) => ({ x, y, dir: 'down', pose: seat ? 'sit' : 'stand', moving: false, seat });

    // uzaktayken çak yok
    a.send({ t: 'state', s: stand(2.5, 3.5) });
    b.send({ t: 'state', s: stand(8.5, 3.5) });
    await c.next((m) => m.t === 'player' && m.id === jb.you);
    a.send({ t: 'hi5', id: jb.you });
    await sleep(80);
    assert.equal(c.queue.filter((m) => m.t === 'hi5').length, 0);

    // yan yana: herkes görür
    b.send({ t: 'state', s: stand(3.5, 3.55) });
    await c.next((m) => m.t === 'player' && m.id === jb.you && m.s.x === 3.5);
    a.send({ t: 'hi5', id: jb.you });
    const seen = await c.next('hi5');
    assert.deepEqual([seen.a, seen.b], [ja.you, jb.you]);
    assert.equal((await b.next('hi5')).a, ja.you);
    assert.equal((await a.next('hi5')).b, jb.you);

    // iki taraf da aynı anda isterse tek çak sayılır; kendine, bilinmeyen birine ya da oturana çak yok
    b.send({ t: 'hi5', id: ja.you });
    a.send({ t: 'hi5', id: ja.you });
    a.send({ t: 'hi5', id: 'nobody' });
    c.send({ t: 'state', s: stand(4.5, 3.5, { id: 'sofa1', i: 0 }) });
    await b.next((m) => m.t === 'player' && m.id === jc.you);
    b.send({ t: 'hi5', id: jc.you });
    await sleep(100);
    assert.equal(c.queue.filter((m) => m.t === 'hi5').length, 0);
  } finally {
    a.close();
    b.close();
    c.close();
    app.close();
  }
});
