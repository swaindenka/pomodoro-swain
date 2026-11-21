/*
 * Ortak sabitler ve doğrulama fonksiyonları.
 * Hem tarayıcıda (window.Shared) hem de Node sunucusunda (require) kullanılır.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Shared = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const ROOM_W = 12;
  const ROOM_H = 8;
  const DOOR_X = 10; // arka duvarda kapının bulunduğu sütun
  const MAX_ITEMS = 80;
  const MAX_PLAYERS = 8;
  const NAME_MAX = 20;
  const CHAT_MAX = 200;

  // Çalışma mekanları: her birinin kendi düzeni ayrı saklanır
  const VENUES = ['room', 'cafe', 'library', 'terrace'];

  // layer: obj = zemindeki katı eşya, floor = halı gibi üzerine basılabilen, wall = duvar eşyası
  // colors: renk/çeşit sayısı (çizimleri public/js/items.js içinde)
  const CATALOG = Object.freeze({
    // oturma
    sofa: { w: 2, h: 1, layer: 'obj', colors: 8 },
    armchair: { w: 1, h: 1, layer: 'obj', colors: 8 },
    pouf: { w: 1, h: 1, layer: 'obj', colors: 8 },
    beanbag: { w: 1, h: 1, layer: 'obj', colors: 8 },
    bench: { w: 2, h: 1, layer: 'obj', colors: 5 },
    stool: { w: 1, h: 1, layer: 'obj', colors: 4 },
    // masalar
    desk: { w: 2, h: 2, layer: 'obj', colors: 5 },
    cafeTable: { w: 1, h: 3, layer: 'obj', colors: 3 },
    readingTable: { w: 3, h: 3, layer: 'obj', colors: 5 },
    counter: { w: 3, h: 2, layer: 'obj', colors: 3 },
    table: { w: 2, h: 1, layer: 'obj', colors: 5 },
    sideTable: { w: 1, h: 1, layer: 'obj', colors: 5 },
    // yatak ve depolama
    bed: { w: 2, h: 2, layer: 'obj', colors: 8 },
    bookshelf: { w: 2, h: 1, layer: 'obj', colors: 5 },
    narrowShelf: { w: 1, h: 1, layer: 'obj', colors: 5 },
    wardrobe: { w: 2, h: 1, layer: 'obj', colors: 5 },
    pastryCase: { w: 2, h: 1, layer: 'obj', colors: 3 },
    // dekor
    plant: { w: 1, h: 1, layer: 'obj', colors: 5 },
    bigPlant: { w: 1, h: 1, layer: 'obj', colors: 5 },
    cactus: { w: 1, h: 1, layer: 'obj', colors: 5 },
    flowers: { w: 1, h: 1, layer: 'obj', colors: 4 },
    lamp: { w: 1, h: 1, layer: 'obj', colors: 5 },
    lantern: { w: 1, h: 1, layer: 'obj', colors: 3 },
    fireplace: { w: 2, h: 1, layer: 'obj', colors: 3 },
    recordPlayer: { w: 1, h: 1, layer: 'obj', colors: 5 },
    globe: { w: 1, h: 1, layer: 'obj', colors: 3 },
    cat: { w: 1, h: 1, layer: 'obj', colors: 4 },
    rug: { w: 3, h: 2, layer: 'floor', colors: 8 },
    roundRug: { w: 2, h: 2, layer: 'floor', colors: 8 },
    // duvar
    window: { w: 2, h: 1, layer: 'wall', colors: 3 },
    archWindow: { w: 2, h: 1, layer: 'wall', colors: 3 },
    board: { w: 2, h: 1, layer: 'wall', colors: 1 },
    chalkboard: { w: 2, h: 1, layer: 'wall', colors: 2 },
    shelf: { w: 2, h: 1, layer: 'wall', colors: 5 },
    painting: { w: 1, h: 1, layer: 'wall', colors: 5 },
    poster: { w: 1, h: 1, layer: 'wall', colors: 4 },
    clock: { w: 1, h: 1, layer: 'wall', colors: 3 },
    sconce: { w: 1, h: 1, layer: 'wall', colors: 3 },
    stringLights: { w: 3, h: 1, layer: 'wall', colors: 3 },
    neon: { w: 2, h: 1, layer: 'wall', colors: 3 },
    hangingPlant: { w: 1, h: 1, layer: 'wall', colors: 3 },
  });

  const STYLE_COUNTS = Object.freeze({ wall: 9, pattern: 6, floor: 9 });
  const LOOK_COUNTS = Object.freeze({ skin: 5, hair: 7, style: 3, shirt: 7, pants: 4 });
  const POSES = ['stand', 'sit', 'lie', 'work', 'study'];
  const DIRS = ['down', 'up', 'left', 'right'];
  const MODES = ['work', 'short', 'long'];

  const has = (obj, key) => typeof key === 'string' && Object.prototype.hasOwnProperty.call(obj, key);

  function clampInt(value, min, max, fallback) {
    if (value === null || value === undefined || value === '') return fallback;
    const n = Math.round(Number(value));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  }

  function clampNum(value, min, max, fallback) {
    if (value === null || value === undefined || value === '') return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  }

  function cleanText(value, max) {
    if (typeof value !== 'string') return '';
    return value
      .replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max);
  }

  // ---------- Oda ----------

  function footprint(item) {
    const def = CATALOG[item.type];
    const wall = def.layer === 'wall';
    return { x: item.x, y: wall ? 0 : item.y, w: def.w, h: wall ? 1 : def.h, layer: def.layer };
  }

  function inBounds(item) {
    const f = footprint(item);
    if (f.x < 0 || f.x + f.w > ROOM_W) return false;
    const coversDoorColumn = f.x <= DOOR_X && DOOR_X < f.x + f.w;
    if (f.layer === 'wall') return !coversDoorColumn;
    if (f.y < 0 || f.y + f.h > ROOM_H) return false;
    // Kapının önündeki kare boş kalmalı (oyuncular buradan girer)
    if (f.layer === 'obj' && coversDoorColumn && f.y === 0) return false;
    return true;
  }

  function overlaps(a, b) {
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  }

  function canPlace(items, item, ignoreId) {
    if (!item || !has(CATALOG, item.type)) return false;
    if (!Number.isInteger(item.x) || !Number.isInteger(item.y)) return false;
    if (!inBounds(item)) return false;
    const f = footprint(item);
    for (const other of items) {
      if (ignoreId !== undefined && other.id === ignoreId) continue;
      const g = footprint(other);
      if (g.layer === f.layer && overlaps(f, g)) return false;
    }
    return true;
  }

  function sanitizeRoom(input) {
    const src = input && typeof input === 'object' ? input : {};
    const venue = VENUES.includes(src.venue) ? src.venue : 'room';
    const st = src.style && typeof src.style === 'object' ? src.style : {};
    const style = {
      wall: clampInt(st.wall, 0, STYLE_COUNTS.wall - 1, 0),
      pattern: clampInt(st.pattern, 0, STYLE_COUNTS.pattern - 1, 0),
      floor: clampInt(st.floor, 0, STYLE_COUNTS.floor - 1, 0),
    };
    const items = [];
    const ids = new Set();
    const list = Array.isArray(src.items) ? src.items.slice(0, MAX_ITEMS * 2) : [];
    for (const raw of list) {
      if (items.length >= MAX_ITEMS) break;
      if (!raw || typeof raw !== 'object' || !has(CATALOG, raw.type)) continue;
      if (typeof raw.id !== 'string' || !/^[A-Za-z0-9_-]{1,24}$/.test(raw.id) || ids.has(raw.id)) continue;
      const def = CATALOG[raw.type];
      const item = {
        id: raw.id,
        type: raw.type,
        x: clampInt(raw.x, -99, 99, NaN),
        y: def.layer === 'wall' ? 0 : clampInt(raw.y, -99, 99, NaN),
        c: clampInt(raw.c, 0, def.colors - 1, 0),
      };
      if (!canPlace(items, item)) continue;
      ids.add(item.id);
      items.push(item);
    }
    return { venue, style, items };
  }

  // Mekanların varsayılan düzenleri: [tür, x, y, renk]
  const DEFAULT_LAYOUTS = {
    room: {
      style: { wall: 0, pattern: 1, floor: 0 },
      items: [
        ['desk', 1, 0, 0], ['bookshelf', 3, 0, 1], ['plant', 5, 0, 0], ['wardrobe', 8, 0, 4],
        ['bigPlant', 11, 0, 2], ['recordPlayer', 0, 3, 1], ['rug', 3, 4, 1], ['sofa', 4, 3, 0],
        ['table', 4, 5, 0], ['lamp', 6, 3, 0], ['beanbag', 2, 5, 3], ['bed', 9, 5, 2],
        ['sideTable', 11, 5, 0], ['cat', 8, 6, 0], ['plant', 11, 7, 1],
        ['board', 1, 0, 0], ['window', 5, 0, 0], ['clock', 7, 0, 0], ['painting', 11, 0, 3],
      ],
    },
    cafe: {
      style: { wall: 6, pattern: 3, floor: 4 },
      items: [
        ['counter', 0, 0, 0], ['pastryCase', 3, 0, 0], ['bigPlant', 5, 0, 3], ['plant', 7, 0, 1],
        ['cafeTable', 1, 3, 0], ['cafeTable', 3, 3, 0], ['cafeTable', 5, 3, 0],
        ['roundRug', 8, 4, 3], ['sofa', 8, 3, 6], ['table', 8, 5, 1], ['armchair', 10, 4, 5],
        ['lamp', 11, 3, 1], ['plant', 0, 7, 0], ['plant', 11, 7, 3], ['flowers', 6, 7, 0],
        ['bench', 2, 7, 1], ['cat', 9, 7, 1],
        ['stringLights', 0, 0, 0], ['chalkboard', 3, 0, 0], ['sconce', 5, 0, 1], ['neon', 6, 0, 0],
        ['window', 8, 0, 2], ['clock', 11, 0, 2],
      ],
    },
    library: {
      style: { wall: 7, pattern: 4, floor: 5 },
      items: [
        ['bookshelf', 0, 0, 1], ['bookshelf', 2, 0, 1], ['globe', 4, 0, 0], ['plant', 5, 0, 2],
        ['fireplace', 6, 0, 0], ['narrowShelf', 8, 0, 1], ['narrowShelf', 9, 0, 1], ['bigPlant', 11, 0, 3],
        ['readingTable', 1, 3, 1], ['readingTable', 5, 3, 1], ['rug', 8, 5, 6],
        ['armchair', 9, 4, 6], ['sideTable', 10, 4, 1], ['armchair', 11, 4, 1],
        ['plant', 0, 7, 0], ['plant', 11, 7, 2], ['cat', 8, 7, 2],
        ['archWindow', 4, 0, 1], ['painting', 6, 0, 0], ['clock', 7, 0, 1], ['sconce', 11, 0, 1],
      ],
    },
    terrace: {
      style: { wall: 0, pattern: 5, floor: 8 },
      items: [
        ['flowers', 0, 0, 0], ['flowers', 1, 0, 1], ['flowers', 2, 0, 2], ['bench', 4, 0, 0],
        ['bigPlant', 6, 0, 0], ['lantern', 7, 0, 0], ['flowers', 8, 0, 3], ['bigPlant', 9, 0, 4],
        ['bigPlant', 11, 0, 1], ['cafeTable', 2, 3, 1], ['cafeTable', 4, 3, 1], ['roundRug', 7, 4, 3],
        ['beanbag', 7, 5, 0], ['beanbag', 8, 5, 5], ['lantern', 10, 4, 0], ['bench', 1, 7, 0],
        ['cactus', 0, 7, 0], ['flowers', 11, 7, 0],
        ['stringLights', 0, 0, 0], ['stringLights', 3, 0, 1], ['stringLights', 6, 0, 0], ['hangingPlant', 11, 0, 0],
      ],
    },
  };

  function defaultRoom(venue) {
    const id = VENUES.includes(venue) ? venue : 'room';
    const layout = DEFAULT_LAYOUTS[id];
    return sanitizeRoom({
      venue: id,
      style: layout.style,
      items: layout.items.map(([type, x, y, c], i) => ({ id: `${type}${i}`, type, x, y, c })),
    });
  }

  function defaultItemCount(venue) {
    return DEFAULT_LAYOUTS[venue].items.length;
  }

  // ---------- Zamanlayıcı ----------

  const DEFAULT_SETTINGS = Object.freeze({
    work: 25,
    short: 5,
    long: 15,
    interval: 4,
    autoStart: false,
    sound: true,
    autoDesk: true,
  });

  const SETTING_LIMITS = Object.freeze({
    work: [1, 180],
    short: [1, 60],
    long: [1, 90],
    interval: [1, 12],
  });

  function sanitizeSettings(input) {
    const src = input && typeof input === 'object' ? input : {};
    const out = {};
    for (const key of Object.keys(SETTING_LIMITS)) {
      const [min, max] = SETTING_LIMITS[key];
      out[key] = clampInt(src[key], min, max, DEFAULT_SETTINGS[key]);
    }
    for (const key of ['autoStart', 'sound', 'autoDesk']) {
      out[key] = typeof src[key] === 'boolean' ? src[key] : DEFAULT_SETTINGS[key];
    }
    return out;
  }

  function durationMs(settings, mode, minuteMs) {
    return settings[mode] * (minuteMs || 60000);
  }

  // completedCount: bu oturum dahil tamamlanan pomodoro sayısı
  function nextMode(mode, completedCount, interval) {
    if (mode !== 'work') return 'work';
    return completedCount > 0 && completedCount % interval === 0 ? 'long' : 'short';
  }

  // ---------- Oyuncu ----------

  function sanitizeName(value) {
    return cleanText(value, NAME_MAX) || 'Guest';
  }

  function sanitizeLook(input) {
    const src = input && typeof input === 'object' ? input : {};
    const out = {};
    for (const key of Object.keys(LOOK_COUNTS)) out[key] = clampInt(src[key], 0, LOOK_COUNTS[key] - 1, 0);
    return out;
  }

  function sanitizeState(input) {
    const src = input && typeof input === 'object' ? input : {};
    let seat = null;
    if (src.seat && typeof src.seat === 'object' && typeof src.seat.id === 'string' && /^[A-Za-z0-9_-]{1,24}$/.test(src.seat.id)) {
      seat = { id: src.seat.id, i: clampInt(src.seat.i, 0, 3, 0) };
    }
    return {
      x: Math.round(clampNum(src.x, 0, ROOM_W, DOOR_X + 0.5) * 100) / 100,
      y: Math.round(clampNum(src.y, 0, ROOM_H, 0.6) * 100) / 100,
      dir: DIRS.includes(src.dir) ? src.dir : 'down',
      pose: POSES.includes(src.pose) ? src.pose : 'stand',
      moving: src.moving === true,
      seat,
    };
  }

  function sanitizeChat(value) {
    return cleanText(value, CHAT_MAX);
  }

  function sanitizeCode(value) {
    return typeof value === 'string' ? value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) : '';
  }

  return {
    ROOM_W,
    ROOM_H,
    DOOR_X,
    MAX_ITEMS,
    MAX_PLAYERS,
    VENUES,
    NAME_MAX,
    CHAT_MAX,
    CATALOG,
    STYLE_COUNTS,
    LOOK_COUNTS,
    POSES,
    DIRS,
    MODES,
    DEFAULT_SETTINGS,
    SETTING_LIMITS,
    clampInt,
    clampNum,
    footprint,
    inBounds,
    canPlace,
    sanitizeRoom,
    defaultRoom,
    defaultItemCount,
    sanitizeSettings,
    durationMs,
    nextMode,
    sanitizeName,
    sanitizeLook,
    sanitizeState,
    sanitizeChat,
    sanitizeCode,
  };
});
