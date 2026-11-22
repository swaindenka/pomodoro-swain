'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Shared = require('../public/js/shared.js');

test('her mekanın varsayılan düzeni geçerli ve hiçbir eşyası çakışmıyor', () => {
  assert.deepEqual(Shared.VENUES, ['room', 'cafe', 'library', 'terrace', 'attic', 'studio', 'kitchen']);
  for (const venue of Shared.VENUES) {
    const room = Shared.defaultRoom(venue);
    assert.equal(room.venue, venue);
    assert.equal(room.items.length, Shared.defaultItemCount(venue), `${venue} düzeninde çakışan eşya var`);
    assert.deepEqual(Shared.sanitizeRoom(room), room);
    for (const it of room.items) assert.ok(Shared.CATALOG[it.type], it.type);
  }
  assert.equal(Shared.defaultRoom('bilinmeyen').venue, 'room');
});

test('mekan bilgisi doğrulanır, eski kayıtlar odaya düşer', () => {
  assert.equal(Shared.sanitizeRoom({ venue: 'cafe' }).venue, 'cafe');
  assert.equal(Shared.sanitizeRoom({ venue: 'uzay' }).venue, 'room');
  assert.equal(Shared.sanitizeRoom({ items: [] }).venue, 'room');
});

test('katalogdaki her eşyanın geçerli bir kaplama alanı ve renk sayısı var', () => {
  for (const [type, def] of Object.entries(Shared.CATALOG)) {
    assert.ok(['obj', 'floor', 'wall', 'top'].includes(def.layer), type);
    assert.ok(def.w >= 1 && def.w <= 3 && def.h >= 1 && def.h <= 3, type);
    assert.ok(Number.isInteger(def.colors) && def.colors >= 1, type);
  }
  assert.ok(Object.keys(Shared.CATALOG).length >= 156);
});

test('çakışan eşyalar ayıklanır, katmanlar birbirini engellemez', () => {
  const room = Shared.sanitizeRoom({
    items: [
      { id: 'a', type: 'sofa', x: 2, y: 2 },
      { id: 'b', type: 'armchair', x: 3, y: 2 }, // kanepeyle çakışır
      { id: 'c', type: 'rug', x: 2, y: 2 }, // halı ayrı katmanda
      { id: 'd', type: 'window', x: 2, y: 5 }, // duvar eşyası, y yok sayılır
    ],
  });
  assert.deepEqual(
    room.items.map((i) => i.id),
    ['a', 'c', 'd'],
  );
  assert.equal(room.items[2].y, 0);
});

test('kapı önü ve kapının bulunduğu duvar boş kalmalı', () => {
  const { DOOR_X } = Shared;
  assert.equal(Shared.canPlace([], { id: 'p', type: 'plant', x: DOOR_X, y: 0 }), false);
  assert.equal(Shared.canPlace([], { id: 'p', type: 'plant', x: DOOR_X, y: 1 }), true);
  assert.equal(Shared.canPlace([], { id: 'w', type: 'window', x: DOOR_X - 1, y: 0 }), false);
  assert.equal(Shared.canPlace([], { id: 'r', type: 'rug', x: DOOR_X - 1, y: 0 }), true);
});

test('oda sınırları dışındaki ve bilinmeyen eşyalar reddedilir', () => {
  const room = Shared.sanitizeRoom({
    style: { wall: 99, pattern: -3, floor: 'x' },
    items: [
      { id: 'a', type: 'bed', x: 11, y: 0 },
      { id: 'b', type: '__proto__', x: 0, y: 0 },
      { id: 'c', type: 'constructor', x: 0, y: 0 },
      { id: 'bad id!', type: 'plant', x: 0, y: 0 },
      { id: 'e', type: 'plant', x: 0, y: 7, c: 99 },
      { id: 'e', type: 'plant', x: 1, y: 7 },
    ],
  });
  assert.deepEqual(room.style, { wall: Shared.STYLE_COUNTS.wall - 1, pattern: 0, floor: 0 });
  assert.deepEqual(room.items, [{ id: 'e', type: 'plant', x: 0, y: 7, c: 4, r: 0 }]);
});

test('döndürme: izin verilen yönler, yana dönünce kaplama alanı değişir', () => {
  assert.deepEqual(Shared.rotsOf('sofa'), [0, 1, 2, 3]);
  assert.deepEqual(Shared.rotsOf('clock'), [0]);
  assert.equal(Shared.nextRotation('sofa', 3), 0);
  assert.equal(Shared.nextRotation('plant', 0), 2);
  const fp = Shared.footprint({ type: 'readingTable', x: 0, y: 0, r: 1 });
  assert.deepEqual([fp.w, fp.h], [3, 3]);
  const side = Shared.footprint({ type: 'cafeTable', x: 0, y: 0, r: 1 });
  assert.deepEqual([side.w, side.h], [3, 1]);
  // yana dönük kanepe 1x2 yer kaplar; dikeyde sınır dışına taşmamalı
  assert.equal(Shared.canPlace([], { id: 'a', type: 'sofa', x: 0, y: 7, r: 1 }), false);
  assert.equal(Shared.canPlace([], { id: 'a', type: 'sofa', x: 0, y: 6, r: 1 }), true);
  // izin verilmeyen yön reddedilir, temizlemede 0'a döner
  assert.equal(Shared.canPlace([], { id: 'a', type: 'clock', x: 0, y: 0, r: 1 }), false);
  const room = Shared.sanitizeRoom({ items: [{ id: 'a', type: 'bed', x: 0, y: 0, r: 2 }, { id: 'b', type: 'bed', x: 4, y: 0, r: 3 }] });
  assert.deepEqual(room.items.map((i) => i.r), [0, 3]);
});

test('eşyayı taşırken kendisiyle çakışma sayılmaz', () => {
  const items = [{ id: 's', type: 'sofa', x: 2, y: 2, c: 0 }];
  assert.equal(Shared.canPlace(items, { id: '_', type: 'sofa', x: 3, y: 2 }, 's'), true);
  assert.equal(Shared.canPlace(items, { id: '_', type: 'sofa', x: 3, y: 2 }), false);
});

test('ayarlar sınırlanır ve varsayılanlar korunur', () => {
  assert.deepEqual(Shared.sanitizeSettings({ work: 999, short: '0', long: 'abc', interval: 2.6, sound: 'yes' }), {
    work: 180,
    short: 1,
    long: 15,
    interval: 3,
    autoStart: false,
    sound: true,
    autoDesk: true,
    focusMode: true,
  });
});

test('her N pomodoroda bir uzun mola gelir', () => {
  assert.equal(Shared.nextMode('work', 1, 4), 'short');
  assert.equal(Shared.nextMode('work', 4, 4), 'long');
  assert.equal(Shared.nextMode('work', 8, 4), 'long');
  assert.equal(Shared.nextMode('short', 3, 4), 'work');
  assert.equal(Shared.nextMode('long', 4, 4), 'work');
});

test('oyuncu verileri temizlenir', () => {
  assert.equal(Shared.sanitizeName('  Ay\u0000şe   Yılmaz  '), 'Ay şe Yılmaz');
  assert.equal(Shared.sanitizeName(''), 'Guest');
  assert.equal(Shared.sanitizeName('x'.repeat(50)).length, Shared.NAME_MAX);
  assert.deepEqual(Shared.sanitizeLook({ skin: 9, hair: -1, style: '1', body: 1, acc: 99 }), { body: 1, skin: 7, hair: 0, style: 1, eyes: 0, face: 0, shirt: 0, pants: 0, top: 0, bottom: 0, shoes: 0, acc: 15, acc2: 0 });
  const s = Shared.sanitizeState({ x: -5, y: 99, dir: 'north', pose: 'fly', moving: 1, seat: { id: 'desk1', i: 9 } });
  assert.deepEqual(s, { x: 0, y: Shared.ROOM_H, dir: 'down', pose: 'stand', moving: false, seat: { id: 'desk1', i: 3 } });
  assert.equal(Shared.sanitizeState({ pose: 'study' }).pose, 'study');
  assert.equal(Shared.sanitizeChat(`  merhaba\n${'a'.repeat(300)}`).length, Shared.CHAT_MAX);
  assert.equal(Shared.sanitizeCode(' k7m-2q '), 'K7M2Q');
});

test('küçük eşyalar yalnızca masa, raf ve tezgah gibi eşyaların üstüne konur', () => {
  const table = { id: 't', type: 'table', x: 2, y: 2, c: 0, r: 0 };
  assert.equal(Shared.canPlace([], { id: 'm', type: 'mug', x: 2, y: 2 }), false);
  assert.equal(Shared.canPlace([table], { id: 'm', type: 'mug', x: 2, y: 2 }), true);
  assert.equal(Shared.canPlace([table], { id: 'm', type: 'mug', x: 4, y: 2 }), false);
  // aynı karede iki küçük eşya olmaz, ama masa ile küçük eşya ayrı katmandadır
  const mug = { id: 'm', type: 'mug', x: 2, y: 2, c: 0, r: 0 };
  assert.equal(Shared.canPlace([table, mug], { id: 'v', type: 'vase', x: 2, y: 2 }), false);
  assert.equal(Shared.canPlace([table, mug], { id: 'v', type: 'vase', x: 3, y: 2 }), true);
  // küçük eşya listede önce gelse de korunur; altındaki eşya yoksa ayıklanır
  assert.deepEqual(Shared.sanitizeRoom({ items: [mug, table] }).items.map((i) => i.id), ['t', 'm']);
  assert.deepEqual(Shared.sanitizeRoom({ items: [mug] }).items, []);
  // halı gibi yüzeyi olmayan eşyalar taşıyıcı değildir
  assert.equal(Shared.canPlace([{ id: 'r', type: 'rug', x: 0, y: 0, c: 0, r: 0 }], { id: 'm', type: 'mug', x: 0, y: 0 }), false);
});

test('not kâğıdı yazısı temizlenir ve yalnızca yazı alabilen eşyalarda saklanır', () => {
  const room = Shared.sanitizeRoom({
    items: [
      { id: 'n', type: 'stickyNote', x: 0, y: 0, t: `  Study\u0000 ${'x'.repeat(200)}` },
      { id: 'p', type: 'painting', x: 2, y: 0, t: 'not allowed' },
      { id: 'e', type: 'stickyNote', x: 4, y: 0, t: '   ' },
    ],
  });
  assert.equal(room.items[0].t.length, Shared.NOTE_MAX);
  assert.ok(room.items[0].t.startsWith('Study x'));
  assert.equal(room.items[1].t, undefined);
  assert.equal(room.items[2].t, undefined);
});
