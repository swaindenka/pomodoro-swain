'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Shared = require('../public/js/shared.js');

test('varsayılan oda geçerli ve tüm eşyaları içeriyor', () => {
  const room = Shared.defaultRoom();
  assert.equal(room.items.length, 14);
  assert.deepEqual(Shared.sanitizeRoom(room), room);
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
  assert.deepEqual(room.style, { wall: 5, pattern: 0, floor: 0 });
  assert.deepEqual(room.items, [{ id: 'e', type: 'plant', x: 0, y: 7, c: 2 }]);
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
  assert.equal(Shared.sanitizeName(''), 'Misafir');
  assert.equal(Shared.sanitizeName('x'.repeat(50)).length, Shared.NAME_MAX);
  assert.deepEqual(Shared.sanitizeLook({ skin: 9, hair: -1, style: '1' }), { skin: 4, hair: 0, style: 1, shirt: 0, pants: 0 });
  const s = Shared.sanitizeState({ x: -5, y: 99, dir: 'north', pose: 'fly', moving: 1, seat: { id: 'desk1', i: 9 } });
  assert.deepEqual(s, { x: 0, y: Shared.ROOM_H, dir: 'down', pose: 'stand', moving: false, seat: { id: 'desk1', i: 3 } });
  assert.equal(Shared.sanitizeChat(`  merhaba\n${'a'.repeat(300)}`).length, Shared.CHAT_MAX);
  assert.equal(Shared.sanitizeCode(' k7m-2q '), 'K7M2Q');
});
