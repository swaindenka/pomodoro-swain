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
  const MAX_ITEMS = 60;
  const MAX_PLAYERS = 8;
  const NAME_MAX = 20;
  const CHAT_MAX = 200;

  // layer: obj = zemindeki katı eşya, floor = halı gibi üzerine basılabilen, wall = duvar eşyası
  const CATALOG = Object.freeze({
    desk: { w: 2, h: 2, layer: 'obj', colors: 3 },
    sofa: { w: 2, h: 1, layer: 'obj', colors: 5 },
    armchair: { w: 1, h: 1, layer: 'obj', colors: 5 },
    pouf: { w: 1, h: 1, layer: 'obj', colors: 5 },
    bed: { w: 2, h: 2, layer: 'obj', colors: 5 },
    bookshelf: { w: 2, h: 1, layer: 'obj', colors: 3 },
    table: { w: 2, h: 1, layer: 'obj', colors: 3 },
    lamp: { w: 1, h: 1, layer: 'obj', colors: 3 },
    plant: { w: 1, h: 1, layer: 'obj', colors: 3 },
    rug: { w: 3, h: 2, layer: 'floor', colors: 5 },
    window: { w: 2, h: 1, layer: 'wall', colors: 2 },
    board: { w: 2, h: 1, layer: 'wall', colors: 1 },
    shelf: { w: 2, h: 1, layer: 'wall', colors: 3 },
    painting: { w: 1, h: 1, layer: 'wall', colors: 3 },
    clock: { w: 1, h: 1, layer: 'wall', colors: 2 },
  });

  const STYLE_COUNTS = Object.freeze({ wall: 6, pattern: 3, floor: 4 });
  const LOOK_COUNTS = Object.freeze({ skin: 5, hair: 7, style: 3, shirt: 7, pants: 4 });
  const POSES = ['stand', 'sit', 'lie', 'work'];
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
    return { style, items };
  }

  function defaultRoom() {
    return sanitizeRoom({
      style: { wall: 0, pattern: 1, floor: 0 },
      items: [
        { id: 'desk1', type: 'desk', x: 1, y: 0, c: 0 },
        { id: 'books1', type: 'bookshelf', x: 3, y: 0, c: 1 },
        { id: 'plant1', type: 'plant', x: 5, y: 0, c: 0 },
        { id: 'plant2', type: 'plant', x: 11, y: 0, c: 2 },
        { id: 'rug1', type: 'rug', x: 3, y: 4, c: 1 },
        { id: 'sofa1', type: 'sofa', x: 4, y: 3, c: 0 },
        { id: 'table1', type: 'table', x: 4, y: 5, c: 0 },
        { id: 'lamp1', type: 'lamp', x: 6, y: 3, c: 0 },
        { id: 'pouf1', type: 'pouf', x: 2, y: 5, c: 3 },
        { id: 'bed1', type: 'bed', x: 9, y: 5, c: 2 },
        { id: 'plant3', type: 'plant', x: 11, y: 7, c: 1 },
        { id: 'board1', type: 'board', x: 1, y: 0, c: 0 },
        { id: 'win1', type: 'window', x: 6, y: 0, c: 0 },
        { id: 'clock1', type: 'clock', x: 8, y: 0, c: 0 },
      ],
    });
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
    return cleanText(value, NAME_MAX) || 'Misafir';
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
