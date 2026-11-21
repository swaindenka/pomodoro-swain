/*
 * Oyun: oda modeli, karakter hareketi, etkileşim, düzenleme modu ve çizim döngüsü.
 */
(() => {
  'use strict';

  const App = window.App;
  const Sh = window.Shared;
  const Art = App.Art;
  const { ROOM_W, ROOM_H, DOOR_X, CATALOG } = Sh;
  const { T, OX, OY, LW, LH, CW, CH } = Art;

  const SPEED = 3.4; // kare / saniye
  const HW = 0.28; // ayak kutusu yarı genişliği
  const HH = 0.22; // ayak kutusu yüksekliği
  const SPAWN = { x: DOOR_X + 0.5, y: 0.7 };
  const N4 = [[0, 1], [-1, 0], [1, 0], [0, -1]];
  const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

  const canvasEl = document.getElementById('game');
  const ctx = canvasEl.getContext('2d');
  const Game = (App.Game = {});

  // ---------- Mekanlar ----------
  // Her mekanın (oda, kafe, kütüphane, teras) düzeni ayrı saklanır
  function loadVenues() {
    const saved = App.storage.get(App.KEYS.venues, null) || {};
    if (!saved.room) {
      const legacy = App.storage.get(App.KEYS.room, null);
      if (legacy) saved.room = legacy;
    }
    const out = {};
    for (const id of Sh.VENUES) {
      out[id] = saved[id] && typeof saved[id] === 'object' ? Sh.sanitizeRoom({ ...saved[id], venue: id }) : Sh.defaultRoom(id);
    }
    return out;
  }

  const venues = loadVenues();
  let venueId = App.storage.get(App.KEYS.venue, 'room');
  if (!Sh.VENUES.includes(venueId)) venueId = 'room';

  let room = venues[venueId];
  let session = { role: 'solo', mine: true }; // role: solo | owner | guest
  let solid = [];
  const itemById = new Map();

  function rebuild() {
    itemById.clear();
    for (const it of room.items) itemById.set(it.id, it);
    solid = Array.from({ length: ROOM_H }, () => new Array(ROOM_W).fill(false));
    for (const it of room.items) {
      const cat = CATALOG[it.type];
      if (cat.layer !== 'obj') continue;
      const def = Art.ITEMS[it.type];
      for (let cy = 0; cy < cat.h; cy++) {
        for (let cx = 0; cx < cat.w; cx++) {
          if (!def.solid || def.solid(cx, cy)) solid[it.y + cy][it.x + cx] = true;
        }
      }
    }
  }

  const walkable = (x, y) => x >= 0 && y >= 0 && x < ROOM_W && y < ROOM_H && !solid[y][x];

  function setRoom(next, persist) {
    room = next;
    rebuild();
    fixCharacters();
    if (persist) {
      venues[room.venue] = room;
      App.storage.set(App.KEYS.venues, venues);
    }
    App.emit('room:changed', room);
  }

  function commitRoom(next) {
    if (session.role === 'guest') return false;
    setRoom(Sh.sanitizeRoom({ venue: room.venue, ...next }), session.mine);
    App.emit('room:edited', room);
    return true;
  }

  function respawn() {
    me.seat = null;
    me.pose = 'stand';
    me.path = [];
    me.pending = null;
    me.tween = null;
    me.x = SPAWN.x;
    me.y = SPAWN.y;
  }

  // Mekan değiştir: tek başınayken ya da oda sahibiyken
  function setVenue(id) {
    if (!Sh.VENUES.includes(id) || session.role === 'guest') return false;
    if (id === room.venue) return true;
    venueId = id;
    App.storage.set(App.KEYS.venue, id);
    if (edit.on) {
      edit.placing = null;
      edit.selected = null;
    }
    respawn();
    setRoom(venues[id], false);
    if (session.role === 'owner') App.emit('room:edited', room);
    App.emit('edit:changed');
    return true;
  }

  // ---------- Karakterler ----------
  function randomLook() {
    const look = {};
    for (const [key, count] of Object.entries(Sh.LOOK_COUNTS)) look[key] = Math.floor(Math.random() * count);
    return look;
  }

  function loadProfile() {
    const saved = App.storage.get(App.KEYS.player, null);
    if (!saved) {
      const fresh = { name: 'Misafir', look: randomLook() };
      App.storage.set(App.KEYS.player, fresh);
      return fresh;
    }
    return { name: Sh.sanitizeName(saved.name), look: Sh.sanitizeLook(saved.look) };
  }

  function makeChar(id, name, look) {
    return {
      id,
      name,
      look,
      x: SPAWN.x,
      y: SPAWN.y,
      tx: SPAWN.x,
      ty: SPAWN.y,
      dir: 'down',
      pose: 'stand',
      seat: null,
      moving: false,
      frame: 0,
      walkT: 0,
      blinkT: 1 + Math.random() * 3,
      blink: false,
      bubble: null,
      path: [],
      pending: null,
      tween: null,
      standAt: null,
    };
  }

  const profile = loadProfile();
  const me = makeChar('me', profile.name, profile.look);
  me.local = true;
  const others = new Map();
  const allChars = () => [me, ...others.values()];

  function seatInfo(seat) {
    if (!seat) return null;
    const item = itemById.get(seat.id);
    if (!item) return null;
    const def = Art.ITEMS[item.type];
    const s = def.seats && def.seats[seat.i];
    if (!s) return null;
    return { item, def, s, x: item.x + s.x, y: item.y + s.y };
  }

  function seatTaken(id, i, exceptId) {
    for (const ch of allChars()) {
      if (ch.id === exceptId) continue;
      if (ch.seat && ch.seat.id === id && ch.seat.i === i) return true;
    }
    return false;
  }

  function isBlocked(x, y) {
    if (x - HW < 0 || x + HW > ROOM_W || y - HH < 0.12 || y > ROOM_H - 0.02) return true;
    const x0 = Math.floor(x - HW);
    const x1 = Math.floor(x + HW - 1e-6);
    const y0 = Math.floor(y - HH);
    const y1 = Math.floor(y - 1e-6);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) if (!walkable(tx, ty)) return true;
    }
    return false;
  }

  function nearestFreeTile(x, y) {
    let best = null;
    for (let ty = 0; ty < ROOM_H; ty++) {
      for (let tx = 0; tx < ROOM_W; tx++) {
        if (!walkable(tx, ty)) continue;
        const d = Math.hypot(tx + 0.5 - x, ty + 0.55 - y);
        if (!best || d < best.d) best = { tx, ty, d };
      }
    }
    return best ? [best.tx, best.ty] : null;
  }

  const tileCenter = (tx, ty) => [tx + 0.5, ty + 0.55];

  function fixCharacters() {
    for (const ch of allChars()) {
      if (ch.seat && !seatInfo(ch.seat)) {
        ch.seat = null;
        ch.pose = 'stand';
      }
    }
    if (me.pending && !itemById.has(me.pending.id)) {
      me.pending = null;
      me.path = [];
    }
    if (me.path.some(([tx, ty]) => !walkable(tx, ty))) me.path = [];
    if (!me.seat && !me.tween && isBlocked(me.x, me.y)) {
      const t = nearestFreeTile(me.x, me.y);
      if (t) [me.x, me.y] = tileCenter(t[0], t[1]);
    }
  }

  // ---------- Yol bulma (8 yön, köşe kesmeden Dijkstra) ----------
  function distances(sx, sy) {
    const n = ROOM_W * ROOM_H;
    const dist = new Float64Array(n).fill(Infinity);
    const prev = new Int32Array(n).fill(-1);
    const done = new Uint8Array(n);
    const clampX = Math.max(0, Math.min(ROOM_W - 1, sx));
    const clampY = Math.max(0, Math.min(ROOM_H - 1, sy));
    dist[clampY * ROOM_W + clampX] = 0;
    for (;;) {
      let u = -1;
      let best = Infinity;
      for (let i = 0; i < n; i++) {
        if (!done[i] && dist[i] < best) {
          best = dist[i];
          u = i;
        }
      }
      if (u < 0) break;
      done[u] = 1;
      const ux = u % ROOM_W;
      const uy = (u / ROOM_W) | 0;
      for (const [dx, dy] of N8) {
        const vx = ux + dx;
        const vy = uy + dy;
        if (!walkable(vx, vy)) continue;
        if (dx && dy && (!walkable(ux + dx, uy) || !walkable(ux, uy + dy))) continue;
        const v = vy * ROOM_W + vx;
        const nd = best + (dx && dy ? Math.SQRT2 : 1);
        if (nd < dist[v]) {
          dist[v] = nd;
          prev[v] = u;
        }
      }
    }
    return { dist, prev };
  }

  function routeTo(graph, tx, ty) {
    let v = ty * ROOM_W + tx;
    if (graph.dist[v] === Infinity) return null;
    const list = [];
    while (graph.prev[v] !== -1) {
      list.push([v % ROOM_W, (v / ROOM_W) | 0]);
      v = graph.prev[v];
    }
    return list.reverse();
  }

  const myTile = () => [Math.floor(me.x), Math.floor(me.y)];

  // ---------- Hareket ve etkileşim ----------
  function walkTo(tx, ty) {
    const go = () => {
      const [sx, sy] = myTile();
      const path = routeTo(distances(sx, sy), tx, ty);
      if (!path) return;
      me.pending = null;
      me.path = path.length ? path : [[tx, ty]];
    };
    if (me.seat) standUp(go);
    else go();
  }

  function approachTiles(item, seat) {
    const out = [];
    const seen = new Set();
    const add = (x, y, penalty) => {
      const k = y * ROOM_W + x;
      if (seen.has(k) || !walkable(x, y)) return;
      seen.add(k);
      out.push({ x, y, penalty });
    };
    for (const [cx, cy] of seat.cells) {
      const x = item.x + cx;
      const y = item.y + cy;
      if (walkable(x, y)) add(x, y, 0);
      else for (const [dx, dy] of N4) add(x + dx, y + dy, dy < 0 ? 2.5 : 0);
    }
    return out;
  }

  // Kedi sevmek gibi oturma dışı etkileşimler: yanına yürü, sonra kullan
  function useItem(item) {
    const def = Art.ITEMS[item.type];
    const cat = CATALOG[item.type];
    const go = () => {
      const [sx, sy] = myTile();
      const graph = distances(sx, sy);
      let choice = null;
      for (let cy = 0; cy < cat.h; cy++) {
        for (let cx = 0; cx < cat.w; cx++) {
          for (const [dx, dy] of N4) {
            const x = item.x + cx + dx;
            const y = item.y + cy + dy;
            if (!walkable(x, y)) continue;
            const d = graph.dist[y * ROOM_W + x];
            if (d !== Infinity && (!choice || d < choice.d)) choice = { x, y, d };
          }
        }
      }
      if (!choice) {
        App.toast('Oraya ulaşılamıyor.');
        return;
      }
      me.path = routeTo(graph, choice.x, choice.y) || [];
      me.pending = { id: item.id, use: def.use };
      if (!me.path.length) arrive();
    };
    if (me.seat) standUp(go);
    else go();
  }

  const particles = [];

  // Çok kişilik eşyalarda tıklanan noktaya en yakın boş koltuk (yoksa undefined: en yakın boş koltuk seçilir)
  function seatNearPoint(item, fx, fy) {
    const seats = Art.ITEMS[item.type].seats;
    if (!seats || seats.length < 2) return undefined;
    let best;
    let bestD = Infinity;
    seats.forEach((s, i) => {
      if (seatTaken(item.id, i, me.id)) return;
      const [cx, cy] = s.cells[0];
      const d = Math.hypot(item.x + cx + 0.5 - fx, item.y + cy + 0.5 - fy);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }

  function interact(item, seatIndex) {
    const def = Art.ITEMS[item.type];
    if (def.use) {
      useItem(item);
      return;
    }
    if (!def.seats) return;
    let best = null;
    def.seats.forEach((s, i) => {
      if (seatIndex !== undefined && i !== seatIndex) return;
      if (seatTaken(item.id, i, me.id)) return;
      const d = Math.hypot(item.x + s.x - me.x, item.y + s.y - me.y);
      if (!best || d < best.d) best = { i, d };
    });
    if (!best) {
      App.toast('Burası dolu.');
      return;
    }
    if (me.seat && me.seat.id === item.id && me.seat.i === best.i) return;
    const go = () => {
      const [sx, sy] = myTile();
      const graph = distances(sx, sy);
      let choice = null;
      for (const t of approachTiles(item, def.seats[best.i])) {
        const d = graph.dist[t.y * ROOM_W + t.x] + t.penalty;
        if (d !== Infinity && (!choice || d < choice.d)) choice = { ...t, d };
      }
      if (!choice) {
        App.toast('Oraya ulaşılamıyor.');
        return;
      }
      me.path = routeTo(graph, choice.x, choice.y) || [];
      me.pending = { id: item.id, i: best.i };
      if (!me.path.length) arrive();
    };
    if (me.seat) standUp(go);
    else go();
  }

  function arrive() {
    const pend = me.pending;
    me.pending = null;
    if (!pend) return;
    if (pend.use) {
      const item = itemById.get(pend.id);
      if (!item) return;
      const cat = CATALOG[item.type];
      const cx = item.x + cat.w / 2;
      const cy = item.y + cat.h / 2;
      me.dir = dirFrom(cx - me.x, cy - me.y);
      if (pend.use === 'pet') {
        for (let i = 0; i < 3; i++) particles.push({ x: cx + (i - 1) * 0.25, y: item.y + 0.2, t: -i * 0.25 });
        App.emit('item:used', { type: item.type, use: pend.use });
      }
      return;
    }
    if (seatTaken(pend.id, pend.i, me.id)) {
      App.toast('Burası dolu.');
      return;
    }
    const info = seatInfo(pend);
    if (!info) return;
    me.standAt = [me.x, me.y];
    me.tween = {
      fx: me.x,
      fy: me.y,
      tx: info.x,
      ty: info.y,
      t: 0,
      dur: 0.22,
      done: () => {
        me.seat = pend;
        me.pose = info.s.pose;
        me.dir = info.s.dir;
        App.emit('player:seated', { type: info.item.type, pose: info.s.pose });
      },
    };
  }

  function standUp(then) {
    if (!me.seat) {
      if (then) then();
      return;
    }
    me.seat = null;
    me.pose = 'stand';
    me.dir = 'down';
    let target = me.standAt;
    if (!target || isBlocked(target[0], target[1])) {
      const t = nearestFreeTile(me.x, me.y);
      target = t ? tileCenter(t[0], t[1]) : [me.x, me.y];
    }
    me.tween = { fx: me.x, fy: me.y, tx: target[0], ty: target[1], t: 0, dur: 0.18, done: then };
    App.emit('player:stood');
  }

  function interactNearest() {
    if (me.seat) {
      standUp();
      return;
    }
    let best = null;
    for (const it of room.items) {
      const def = Art.ITEMS[it.type];
      if (!def.seats) continue;
      def.seats.forEach((s, i) => {
        if (seatTaken(it.id, i, me.id)) return;
        const d = Math.hypot(it.x + s.x - me.x, it.y + s.y - me.y);
        if (d < 2.3 && (!best || d < best.d)) best = { it, d };
      });
    }
    if (best) interact(best.it);
    else App.toast('Yakında oturacak bir yer yok.');
  }

  // Odak başlayınca en yakın boş çalışma yerine (masa, kafe masası, tezgah…) git
  function goToDesk() {
    const cur = seatInfo(me.seat);
    if (cur && cur.s.act === 'work') return;
    let best = null;
    let any = false;
    for (const it of room.items) {
      const def = Art.ITEMS[it.type];
      if (!def.seats) continue;
      def.seats.forEach((s, i) => {
        if (s.act !== 'work') return;
        any = true;
        if (seatTaken(it.id, i, me.id)) return;
        const d = Math.hypot(it.x + s.x - me.x, it.y + s.y - me.y);
        if (!best || d < best.d) best = { it, i, d };
      });
    }
    if (best) interact(best.it, best.i);
    else if (any) App.toast('Çalışma yerlerinin hepsi dolu.');
    else App.toast('Burada çalışma masası yok. Düzenle menüsünden ekleyebilirsin.');
  }

  // ---------- Girdi ----------
  const MOVE_KEYS = {
    ArrowUp: [0, -1],
    KeyW: [0, -1],
    ArrowDown: [0, 1],
    KeyS: [0, 1],
    ArrowLeft: [-1, 0],
    KeyA: [-1, 0],
    ArrowRight: [1, 0],
    KeyD: [1, 0],
  };
  const held = new Set();

  function inputVector() {
    let x = 0;
    let y = 0;
    for (const code of held) {
      x += MOVE_KEYS[code][0];
      y += MOVE_KEYS[code][1];
    }
    if (!x && !y) return null;
    const len = Math.hypot(x, y);
    return { x: x / len, y: y / len };
  }

  window.addEventListener('keydown', (e) => {
    if (App.modalOpen() || App.isFormField(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (edit.on) {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (edit.placing) Game.edit.cancel();
        else if (edit.selected) Game.edit.select(null);
        else Game.edit.setOn(false);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && edit.selected) {
        e.preventDefault();
        Game.edit.removeSelected();
      }
      return;
    }
    if (MOVE_KEYS[e.code]) {
      held.add(e.code);
      e.preventDefault();
    } else if (e.code === 'KeyE' && !e.repeat) {
      e.preventDefault();
      interactNearest();
    } else if (e.key === 'Escape' && me.seat) {
      standUp();
    }
  });

  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => held.clear());

  function toLogical(e) {
    const rect = canvasEl.getBoundingClientRect();
    return {
      lx: ((e.clientX - rect.left) / rect.width) * LW,
      ly: ((e.clientY - rect.top) / rect.height) * LH,
    };
  }

  function depthOf(it) {
    const cat = CATALOG[it.type];
    const def = Art.ITEMS[it.type];
    return it.y + (def.sortY !== undefined ? def.sortY : cat.h);
  }

  function hitTest(pt, opts = {}) {
    const rank = (it) => {
      const layer = CATALOG[it.type].layer;
      if (layer === 'obj') return 1000 + depthOf(it);
      if (layer === 'wall') return 500;
      return depthOf(it);
    };
    const list = room.items.filter((it) => {
      const layer = CATALOG[it.type].layer;
      return layer === 'obj' || (opts.wall && layer === 'wall') || (opts.rugs && layer === 'floor');
    });
    list.sort((a, b) => rank(b) - rank(a));
    return list.find((it) => Art.hitsItem(it, pt.lx, pt.ly)) || null;
  }

  let marker = null;

  function playPointerDown(pt) {
    const hit = hitTest(pt);
    if (hit && (Art.ITEMS[hit.type].seats || Art.ITEMS[hit.type].use)) {
      interact(hit, seatNearPoint(hit, (pt.lx - OX) / T, (pt.ly - OY) / T));
      return;
    }
    const tx = Math.floor((pt.lx - OX) / T);
    const ty = Math.floor((pt.ly - OY) / T);
    if (tx < 0 || ty < 0 || tx >= ROOM_W || ty >= ROOM_H) return;
    let target = [tx, ty];
    if (!walkable(tx, ty)) target = nearestFreeTile(tx + 0.5, ty + 0.5);
    if (!target) return;
    walkTo(target[0], target[1]);
    marker = { x: target[0], y: target[1], t: 0 };
  }

  canvasEl.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const pt = toLogical(e);
    if (edit.on) editPointerDown(pt, e.pointerType);
    else playPointerDown(pt);
  });

  canvasEl.addEventListener('pointermove', (e) => {
    const pt = toLogical(e);
    if (edit.on) {
      if (edit.placing && e.pointerType === 'mouse') positionGhost(pt);
      canvasEl.style.cursor = edit.placing ? 'copy' : hitTest(pt, { wall: true, rugs: true }) ? 'pointer' : 'default';
      return;
    }
    const hit = hitTest(pt);
    canvasEl.style.cursor = hit && (Art.ITEMS[hit.type].seats || Art.ITEMS[hit.type].use) ? 'pointer' : 'default';
  });

  // ---------- Düzenleme modu ----------
  const edit = { on: false, placing: null, selected: null };

  function positionGhost(pt) {
    const pl = edit.placing;
    const cat = CATALOG[pl.type];
    const wall = cat.layer === 'wall';
    pl.x = Math.max(0, Math.min(ROOM_W - cat.w, Math.round((pt.lx - OX) / T - cat.w / 2)));
    pl.y = wall ? 0 : Math.max(0, Math.min(ROOM_H - cat.h, Math.round((pt.ly - OY) / T - cat.h / 2)));
    pl.valid = Sh.canPlace(room.items, { id: '_ghost', type: pl.type, x: pl.x, y: pl.y, c: pl.c }, pl.id || undefined);
  }

  function editPointerDown(pt, pointerType) {
    if (edit.placing) {
      const pl = edit.placing;
      const before = `${pl.x},${pl.y}`;
      positionGhost(pt);
      if (pointerType !== 'mouse' && (!pl.armed || before !== `${pl.x},${pl.y}`)) {
        pl.armed = true;
        return;
      }
      commitPlacing();
      return;
    }
    const hit = hitTest(pt, { wall: true, rugs: true });
    Game.edit.select(hit ? hit.id : null);
  }

  function commitPlacing() {
    const pl = edit.placing;
    if (!pl.valid) {
      App.toast('Buraya sığmıyor. Başka bir yer dene.');
      return;
    }
    if (!pl.id && room.items.length >= Sh.MAX_ITEMS) {
      App.toast(`En fazla ${Sh.MAX_ITEMS} eşya koyabilirsin.`);
      return;
    }
    const id = pl.id || App.newId();
    const items = room.items.filter((it) => it.id !== pl.id);
    items.push({ id, type: pl.type, x: pl.x, y: pl.y, c: pl.c });
    edit.placing = null;
    commitRoom({ style: room.style, items });
    edit.selected = id;
    App.emit('edit:changed');
  }

  Game.edit = {
    state: () => edit,
    setOn(on) {
      if (on && session.role === 'guest') return;
      edit.on = Boolean(on);
      edit.placing = null;
      edit.selected = null;
      held.clear();
      canvasEl.style.cursor = 'default';
      App.emit('edit:changed');
    },
    startPlacing(type) {
      const cat = CATALOG[type];
      edit.selected = null;
      edit.placing = {
        type,
        c: 0,
        id: null,
        x: Math.floor((ROOM_W - cat.w) / 2),
        y: cat.layer === 'wall' ? 0 : Math.floor((ROOM_H - cat.h) / 2),
        armed: false,
      };
      edit.placing.valid = Sh.canPlace(room.items, { id: '_ghost', ...edit.placing }, undefined);
      App.emit('edit:changed');
    },
    startMove() {
      const it = itemById.get(edit.selected);
      if (!it) return;
      edit.placing = { type: it.type, c: it.c, id: it.id, x: it.x, y: it.y, valid: true, armed: false };
      edit.selected = null;
      App.emit('edit:changed');
    },
    cancel() {
      const movingId = edit.placing && edit.placing.id;
      edit.placing = null;
      edit.selected = movingId || null;
      App.emit('edit:changed');
    },
    select(id) {
      edit.selected = id && itemById.has(id) ? id : null;
      App.emit('edit:changed');
    },
    selectedItem: () => itemById.get(edit.selected) || null,
    setColor(c) {
      if (edit.placing) {
        edit.placing.c = c;
        App.emit('edit:changed');
        return;
      }
      const it = itemById.get(edit.selected);
      if (!it) return;
      commitRoom({ style: room.style, items: room.items.map((x) => (x.id === it.id ? { ...x, c } : x)) });
      App.emit('edit:changed');
    },
    duplicate() {
      const it = itemById.get(edit.selected);
      if (!it) return;
      Game.edit.startPlacing(it.type);
      edit.placing.c = it.c;
      App.emit('edit:changed');
    },
    removeSelected() {
      const id = edit.selected;
      if (!id) return;
      edit.selected = null;
      commitRoom({ style: room.style, items: room.items.filter((x) => x.id !== id) });
      App.emit('edit:changed');
    },
    setStyle(key, value) {
      commitRoom({ style: { ...room.style, [key]: value }, items: room.items });
      App.emit('edit:changed');
    },
    resetRoom() {
      edit.placing = null;
      edit.selected = null;
      commitRoom(Sh.defaultRoom(room.venue));
      App.emit('edit:changed');
    },
  };

  // ---------- Güncelleme ----------
  function updateBlink(ch, dt) {
    ch.blinkT -= dt;
    if (ch.blinkT <= 0) {
      ch.blink = true;
      if (ch.blinkT <= -0.13) {
        ch.blink = false;
        ch.blinkT = 2.5 + Math.random() * 3;
      }
    }
  }

  function dirFrom(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
    return dy < 0 ? 'up' : 'down';
  }

  function updateMe(dt) {
    if (me.tween) {
      const tw = me.tween;
      tw.t = Math.min(1, tw.t + dt / tw.dur);
      const e = tw.t * tw.t * (3 - 2 * tw.t);
      me.x = tw.fx + (tw.tx - tw.fx) * e;
      me.y = tw.fy + (tw.ty - tw.fy) * e;
      me.moving = false;
      if (tw.t >= 1) {
        me.tween = null;
        if (tw.done) tw.done();
      }
      return;
    }
    const v = !edit.on && inputVector();
    if (v) {
      if (me.seat) {
        standUp();
        return;
      }
      me.path = [];
      me.pending = null;
      const nx = me.x + v.x * SPEED * dt;
      const ny = me.y + v.y * SPEED * dt;
      const before = [me.x, me.y];
      if (!isBlocked(nx, me.y)) me.x = nx;
      if (!isBlocked(me.x, ny)) me.y = ny;
      me.dir = dirFrom(v.x, v.y);
      me.moving = me.x !== before[0] || me.y !== before[1];
    } else if (me.path.length) {
      const [tx, ty] = tileCenter(me.path[0][0], me.path[0][1]);
      const dx = tx - me.x;
      const dy = ty - me.y;
      const dist = Math.hypot(dx, dy);
      const step = SPEED * dt;
      if (dist <= step) {
        me.x = tx;
        me.y = ty;
        me.path.shift();
        if (!me.path.length) {
          me.moving = false;
          arrive();
        }
      } else {
        me.x += (dx / dist) * step;
        me.y += (dy / dist) * step;
        me.dir = dirFrom(dx, dy);
        me.moving = true;
      }
    } else {
      me.moving = false;
    }
  }

  function updateOther(o, dt) {
    const info = seatInfo(o.seat);
    if (info) {
      o.x = info.x;
      o.y = info.y;
      o.pose = info.s.pose;
      o.dir = info.s.dir;
    } else {
      if (o.pose !== 'stand') o.pose = 'stand';
      const k = 1 - Math.exp(-dt * 12);
      o.x += (o.tx - o.x) * k;
      o.y += (o.ty - o.y) * k;
      if (Math.hypot(o.tx - o.x, o.ty - o.y) < 0.01) {
        o.x = o.tx;
        o.y = o.ty;
      }
    }
  }

  function update(dt, now) {
    updateMe(dt);
    for (const o of others.values()) updateOther(o, dt);
    const focusing = App.Timer && App.Timer.isFocusRunning();
    for (const ch of allChars()) {
      updateBlink(ch, dt);
      if (ch.pose === 'work') {
        ch.frame = focusing ? Math.floor(now / 160) % 2 : 0;
      } else if (ch.pose === 'study') {
        ch.frame = focusing ? Math.floor(now / 260) % 2 : 0;
      } else if (ch.moving) {
        ch.walkT += dt * 8;
        ch.frame = Math.floor(ch.walkT) % 4;
      } else {
        ch.walkT = 0;
        ch.frame = 0;
      }
      if (ch.bubble && now > ch.bubble.until) ch.bubble = null;
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].t += dt;
      if (particles[i].t > 1.4) particles.splice(i, 1);
    }
    if (marker) {
      marker.t += dt;
      if (marker.t > 0.6 || !me.path.length) marker = null;
    }
  }

  // ---------- Çizim ----------
  let scale = 4;

  const column = canvasEl.closest('.stage-col') || canvasEl.parentElement;

  function resize() {
    const avail = column.clientWidth;
    if (!avail) return;
    const dpr = window.devicePixelRatio || 1;
    // Geniş ekranda düzenlerken katalog paneli de ekrana sığsın diye sahneyi kısalt;
    // dar ekranda panel zaten aşağıda, odanın yarım ekrandan küçülmemesi yeterli
    const editor = document.getElementById('editor');
    const narrow = window.innerWidth < 960;
    let maxH;
    if (!edit.on) maxH = window.innerHeight - 120;
    else if (narrow) maxH = window.innerHeight * 0.5;
    else maxH = window.innerHeight - 120 - (editor && !editor.hidden ? editor.offsetHeight + 12 : 0);
    maxH = Math.max(240, maxH);
    const s = Math.max(2, Math.floor(Math.min((avail * dpr) / LW, (maxH * dpr) / LH)));
    const cssW = Math.min(avail, (LW * s) / dpr);
    if (s !== scale || canvasEl.width !== LW * s) {
      scale = s;
      canvasEl.width = LW * s;
      canvasEl.height = LH * s;
    }
    canvasEl.style.width = `${cssW}px`;
    canvasEl.style.height = `${(cssW * LH) / LW}px`;
  }

  function drawChar(ch) {
    const img = Art.charSprite(ch.look, ch.dir, ch.pose, ch.frame, ch.blink);
    ctx.drawImage(img, Math.round(OX + ch.x * T - CW / 2) - 1, Math.round(OY + ch.y * T - CH) - 1);
  }

  function drawShadow(ch) {
    const x = Math.round(OX + ch.x * T);
    const y = Math.round(OY + ch.y * T);
    ctx.fillStyle = 'rgba(40, 28, 36, 0.22)';
    ctx.fillRect(x - 4, y - 1, 8, 2);
    ctx.fillRect(x - 3, y - 2, 6, 4);
  }

  function drawLightShafts(env) {
    const k = (1 - env.light.night) * 0.14;
    if (k < 0.01) return;
    for (const it of room.items) {
      if (it.type !== 'window') continue;
      const r = Art.itemRect(it);
      const g = ctx.createLinearGradient(0, OY, 0, OY + 48);
      g.addColorStop(0, `rgba(255, 244, 214, ${k})`);
      g.addColorStop(1, 'rgba(255, 244, 214, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(r.x + 2, OY);
      ctx.lineTo(r.x + 30, OY);
      ctx.lineTo(r.x + 44, OY + 48);
      ctx.lineTo(r.x + 16, OY + 48);
      ctx.closePath();
      ctx.fill();
    }
  }

  function hexRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function drawLighting(env) {
    const { night, warm } = env.light;
    if (warm > 0.02) {
      ctx.fillStyle = `rgba(255, 150, 90, ${0.07 * warm})`;
      ctx.fillRect(0, 0, LW, LH);
    }
    if (night > 0.02) {
      ctx.fillStyle = `rgba(16, 20, 46, ${0.44 * night})`;
      ctx.fillRect(0, 0, LW, LH);
    }
    ctx.globalCompositeOperation = 'lighter';
    const flicker = 0.92 + 0.08 * Math.sin(env.t / 110);
    for (const it of room.items) {
      const def = Art.ITEMS[it.type];
      if (!def.glows || it.id === (edit.placing && edit.placing.id)) continue;
      const r = Art.itemRect(it);
      for (const gl of def.glows) {
        let k;
        if (gl.when === 'always') k = (0.45 + 0.55 * night) * flicker;
        else if (gl.when === 'occupied') k = env.activeItems.has(it.id) ? night : 0;
        else k = night;
        const a = (gl.strength || 0.34) * k;
        if (a < 0.01) continue;
        const [cr, cg, cb] = gl.tint ? hexRgb(def.colors[it.c]) : [255, 196, 120];
        const cx = r.x + gl.x;
        const cy = r.y + gl.y;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, gl.r);
        g.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${a})`);
        g.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(cx - gl.r, cy - gl.r, gl.r * 2, gl.r * 2);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawGhost(env) {
    const pl = edit.placing;
    if (!pl) return;
    const cat = CATALOG[pl.type];
    const item = { id: '_ghost', type: pl.type, x: pl.x, y: pl.y, c: pl.c };
    ctx.fillStyle = pl.valid ? 'rgba(80, 190, 120, 0.35)' : 'rgba(220, 80, 70, 0.4)';
    if (cat.layer === 'wall') {
      const r = Art.itemRect(item);
      ctx.fillRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
    } else {
      ctx.fillRect(OX + pl.x * T, OY + pl.y * T, cat.w * T, cat.h * T);
    }
    Art.drawItem(ctx, item, env, 0.8);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function wrapText(text, maxW) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width <= maxW || !line) line = test;
      else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    for (let i = 0; i < lines.length; i++) {
      while (ctx.measureText(lines[i]).width > maxW && lines[i].length > 1) lines[i] = lines[i].slice(0, -2) + '…';
    }
    if (lines.length > 3) {
      lines.length = 3;
      lines[2] = `${lines[2].replace(/…$/, '').slice(0, -1)}…`;
    }
    return lines;
  }

  function drawUI(env, now) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const rect = canvasEl.getBoundingClientRect();
    const u = rect.width ? canvasEl.width / rect.width : 1;
    const S = scale;

    if (edit.on) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = Math.max(1, u);
      ctx.beginPath();
      for (let x = 0; x <= ROOM_W; x++) {
        ctx.moveTo((OX + x * T) * S, OY * S);
        ctx.lineTo((OX + x * T) * S, (OY + ROOM_H * T) * S);
      }
      for (let y = 0; y <= ROOM_H; y++) {
        ctx.moveTo(OX * S, (OY + y * T) * S);
        ctx.lineTo((OX + ROOM_W * T) * S, (OY + y * T) * S);
      }
      ctx.stroke();
      const sel = itemById.get(edit.selected);
      if (sel) {
        const r = Art.itemRect(sel);
        ctx.lineWidth = 2 * u;
        ctx.strokeStyle = '#ffffff';
        ctx.setLineDash([5 * u, 4 * u]);
        ctx.strokeRect((r.x - 2) * S, (r.y - 2) * S, (r.w + 4) * S, (r.h + 4) * S);
        ctx.setLineDash([]);
      }
    }

    const multi = session.role !== 'solo';
    for (const ch of allChars()) {
      const hx = (OX + ch.x * T) * S;
      let top = (OY + ch.y * T - CH + (ch.look.style === 2 ? 0 : 2)) * S - 4 * u;

      if (ch.pose === 'lie') {
        ctx.textAlign = 'center';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 3 * u;
        ctx.strokeStyle = '#ffffff';
        ctx.fillStyle = '#3f5f8a';
        for (let i = 0; i < 3; i++) {
          const phase = ((now / 1000 + i * 0.6) % 1.8) / 1.8;
          ctx.globalAlpha = Math.min(1, (1 - phase) * 1.6);
          ctx.font = `italic 800 ${(11 + phase * 6) * u}px system-ui, sans-serif`;
          const zx = hx + (10 + phase * 12) * u;
          const zy = top + 6 * u - phase * 26 * u;
          ctx.strokeText('z', zx, zy);
          ctx.fillText('z', zx, zy);
        }
        ctx.globalAlpha = 1;
      }

      if (multi) {
        const label = ch.local ? `${ch.name} (sen)` : ch.name;
        ctx.font = `600 ${11 * u}px system-ui, sans-serif`;
        const tw = ctx.measureText(label).width;
        const h = 17 * u;
        const w = tw + 12 * u;
        roundRect(hx - w / 2, top - h, w, h, 6 * u);
        ctx.fillStyle = ch.local ? 'rgba(31, 35, 40, 0.82)' : 'rgba(31, 35, 40, 0.62)';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, hx, top - h / 2 + 0.5 * u);
        ctx.textBaseline = 'alphabetic';
        top -= h + 4 * u;
      }

      if (ch.bubble) {
        ctx.font = `${12 * u}px system-ui, sans-serif`;
        const lines = wrapText(ch.bubble.text, 150 * u);
        const lh = 15 * u;
        const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16 * u;
        const h = lines.length * lh + 10 * u;
        const left = Math.max(2 * u, Math.min(canvasEl.width - w - 2 * u, hx - w / 2));
        const y = top - h - 6 * u;
        roundRect(left, y, w, h, 8 * u);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = u;
        ctx.strokeStyle = 'rgba(58, 44, 53, 0.35)';
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(hx - 5 * u, y + h - 0.5 * u);
        ctx.lineTo(hx + 5 * u, y + h - 0.5 * u);
        ctx.lineTo(hx, y + h + 6 * u);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.fillStyle = '#1f2328';
        ctx.textAlign = 'left';
        lines.forEach((l, i) => ctx.fillText(l, left + 8 * u, y + 5 * u + (i + 0.78) * lh));
      }
    }
    ctx.font = `700 ${12 * u}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 3 * u;
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#e05d6f';
    for (const pt of particles) {
      if (pt.t < 0) continue;
      ctx.globalAlpha = Math.max(0, 1 - pt.t / 1.4);
      const hx = (OX + pt.x * T) * S + Math.sin(pt.t * 5) * 3 * u;
      const hy = (OY + pt.y * T) * S - pt.t * 26 * u;
      ctx.strokeText('\u2665', hx, hy);
      ctx.fillText('\u2665', hx, hy);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  // Oturanları eşyanın katmanları arasına çiz (ör. masanın arkasındaki sandalye, önündeki sandalye arkalığı)
  function drawItemWithOccupants(e, env) {
    const it = e.item;
    const def = Art.ITEMS[it.type];
    const cuts = def.cuts;
    if (!e.seated.length || !cuts) {
      Art.drawItem(ctx, it, env);
      e.seated.forEach(drawChar);
      return;
    }
    const overBand = def.overBand !== undefined ? def.overBand : cuts.length;
    for (let b = 0; b <= cuts.length; b++) {
      Art.drawItemSlice(ctx, it, b === 0 ? null : cuts[b - 1], b < cuts.length ? cuts[b] : null);
      if (b === overBand) Art.drawItemOver(ctx, it, env);
      for (const ch of e.seated) {
        const info = seatInfo(ch.seat);
        if (info && (info.s.band || 0) === b) drawChar(ch);
      }
    }
  }

  function render(now) {
    const date = new Date();
    const activeItems = new Set();
    for (const ch of allChars()) {
      const info = seatInfo(ch.seat);
      if (info && info.s.act === 'work') activeItems.add(ch.seat.id);
    }
    const env = {
      t: now,
      date,
      light: Art.lighting(date),
      activeItems,
      focusing: App.Timer ? App.Timer.isFocusRunning() : false,
      todosLeft: App.Todos ? App.Todos.leftCount() : 0,
    };
    const movingId = edit.placing && edit.placing.id;

    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(Art.background(room.style, room.venue), 0, 0);
    drawLightShafts(env);

    const floorItems = [];
    const wallItems = [];
    const list = [];
    for (const it of room.items) {
      if (it.id === movingId) continue;
      const layer = CATALOG[it.type].layer;
      if (layer === 'floor') floorItems.push(it);
      else if (layer === 'wall') wallItems.push(it);
      else list.push({ depth: depthOf(it), item: it, seated: [] });
    }
    floorItems.sort((a, b) => a.y - b.y).forEach((it) => Art.drawItem(ctx, it, env));
    wallItems.forEach((it) => Art.drawItem(ctx, it, env));

    if (marker) {
      const a = 1 - marker.t / 0.6;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.55 * a})`;
      const cx = OX + marker.x * T + 8;
      const cy = OY + marker.y * T + 9;
      ctx.fillRect(cx - 3, cy, 7, 1);
      ctx.fillRect(cx, cy - 2, 1, 5);
    }

    const byItem = new Map(list.map((e) => [e.item.id, e]));
    for (const ch of allChars()) {
      const entry = ch.seat && byItem.get(ch.seat.id);
      if (entry && seatInfo(ch.seat)) entry.seated.push(ch);
      else list.push({ depth: ch.y, ch });
    }
    list.sort((a, b) => a.depth - b.depth);
    for (const e of list) {
      if (e.item) {
        drawItemWithOccupants(e, env);
      } else {
        drawShadow(e.ch);
        drawChar(e.ch);
      }
    }

    drawLighting(env);
    if (edit.on) drawGhost(env);
    drawUI(env, now);
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    update(dt, now);
    render(now);
    App.emit('frame', now);
    requestAnimationFrame(loop);
  }

  // ---------- Dışa açık API ----------
  Game.room = () => room;
  Game.localRoom = () => venues[venueId];
  Game.venue = () => room.venue;
  Game.setVenue = setVenue;
  Game.session = () => session;
  Game.canEdit = () => session.role !== 'guest';
  Game.me = () => me;
  Game.others = () => others;
  Game.interactNearest = interactNearest;
  Game.goToDesk = goToDesk;
  Game.standUp = () => standUp();

  Game.profile = () => ({ name: me.name, look: { ...me.look } });
  Game.setProfile = (name, look) => {
    me.name = Sh.sanitizeName(name);
    me.look = Sh.sanitizeLook(look);
    App.storage.set(App.KEYS.player, { name: me.name, look: me.look });
    App.emit('profile:changed', Game.profile());
  };

  Game.localState = () => {
    const s = {
      x: Math.round(me.x * 100) / 100,
      y: Math.round(me.y * 100) / 100,
      dir: me.dir,
      pose: me.pose,
      moving: me.moving,
      seat: me.seat ? { id: me.seat.id, i: me.seat.i } : null,
    };
    return s;
  };

  Game.activity = (ch) => {
    const info = seatInfo(ch.seat);
    if (info && info.s.act === 'work') return 'Çalışıyor';
    if (info && info.s.act === 'lie') return 'Dinleniyor';
    if (info) return 'Oturuyor';
    if (ch.moving) return 'Dolaşıyor';
    return 'Ayakta';
  };

  Game.enterSession = ({ role, mine, room: remoteRoom, players }) => {
    session = { role, mine };
    if (edit.on && role === 'guest') Game.edit.setOn(false);
    others.clear();
    respawn();
    setRoom(Sh.sanitizeRoom(remoteRoom), false);
    for (const p of players || []) Game.upsertOther(p);
    App.emit('session:changed', session);
  };

  Game.setRole = (role) => {
    session = { ...session, role };
    if (edit.on && role === 'guest') Game.edit.setOn(false);
    App.emit('session:changed', session);
  };

  Game.leaveSession = () => {
    session = { role: 'solo', mine: true };
    others.clear();
    respawn();
    setRoom(venues[venueId], false);
    App.emit('session:changed', session);
  };

  Game.setRemoteRoom = (remoteRoom) => {
    setRoom(Sh.sanitizeRoom(remoteRoom), false);
    if (edit.selected && !itemById.has(edit.selected)) edit.selected = null;
    App.emit('edit:changed');
  };

  Game.upsertOther = (p) => {
    let o = others.get(p.id);
    if (!o) {
      o = makeChar(p.id, Sh.sanitizeName(p.name), Sh.sanitizeLook(p.look));
      others.set(p.id, o);
    }
    if (p.name !== undefined) o.name = Sh.sanitizeName(p.name);
    if (p.look !== undefined) o.look = Sh.sanitizeLook(p.look);
    if (p.state) Game.updateOther(p.id, p.state, true);
    return o;
  };

  Game.updateOther = (id, state, snap) => {
    const o = others.get(id);
    if (!o) return;
    const s = Sh.sanitizeState(state);
    o.tx = s.x;
    o.ty = s.y;
    if (snap) {
      o.x = s.x;
      o.y = s.y;
    }
    o.dir = s.dir;
    o.moving = s.moving;
    o.seat = s.seat;
    o.pose = s.seat ? s.pose : 'stand';
  };

  Game.removeOther = (id) => others.delete(id);

  Game.say = (id, text) => {
    const ch = id === 'me' ? me : others.get(id);
    if (!ch) return;
    ch.bubble = { text, until: performance.now() + 6000 };
  };

  // ---------- Başlat ----------
  const params = new URLSearchParams(location.search);
  if (params.has('saat')) Art.forcedHour = Number(params.get('saat'));

  rebuild();
  resize();
  if (typeof ResizeObserver === 'function') new ResizeObserver(resize).observe(column);
  window.addEventListener('resize', resize);
  App.on('edit:changed', () => requestAnimationFrame(resize));
  requestAnimationFrame(loop);
})();
