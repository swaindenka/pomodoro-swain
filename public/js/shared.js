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
  const MAX_ITEMS = 140;
  const MAX_PLAYERS = 8;
  const NAME_MAX = 20;
  const CHAT_MAX = 200;

  // Çalışma mekanları: her birinin kendi düzeni ayrı saklanır
  const VENUES = ['room', 'cafe', 'library', 'terrace', 'attic', 'studio', 'kitchen'];

  // layer: obj = zemindeki katı eşya, floor = halı gibi üzerine basılabilen, wall = duvar eşyası,
  //        top = masa, raf ve tezgah gibi host: true eşyaların üstüne konan küçük eşya
  // colors: renk/çeşit sayısı (çizimleri public/js/items.js içinde)
  // rots: izin verilen yönler. 0 = öne bakar, 1 = sola, 2 = arkaya (dekor eşyalarında ayna), 3 = sağa.
  //       1 ve 3 kaplama alanının enini ve boyunu yer değiştirir.
  const CATALOG = Object.freeze({
    // oturma
    sofa: { w: 2, h: 1, layer: 'obj', colors: 12, rots: [0, 1, 2, 3] },
    armchair: { w: 1, h: 1, layer: 'obj', colors: 12, rots: [0, 1, 2, 3] },
    pouf: { w: 1, h: 1, layer: 'obj', colors: 12, rots: [0, 1, 2, 3] },
    beanbag: { w: 1, h: 1, layer: 'obj', colors: 12, rots: [0, 1, 2, 3] },
    bench: { w: 2, h: 1, layer: 'obj', colors: 7, rots: [0, 1, 2, 3] },
    stool: { w: 1, h: 1, layer: 'obj', colors: 4, rots: [0, 1, 2, 3] },
    // masalar
    desk: { w: 2, h: 2, layer: 'obj', colors: 7, rots: [0, 1, 2, 3], host: true},
    cafeTable: { w: 1, h: 3, layer: 'obj', colors: 3, rots: [0, 1], host: true},
    readingTable: { w: 3, h: 3, layer: 'obj', colors: 7, rots: [0, 1], host: true},
    counter: { w: 3, h: 2, layer: 'obj', colors: 3, host: true},
    table: { w: 2, h: 1, layer: 'obj', colors: 7, rots: [0, 1], host: true},
    sideTable: { w: 1, h: 1, layer: 'obj', colors: 7, rots: [0, 2] },
    // yatak ve depolama
    bed: { w: 2, h: 2, layer: 'obj', colors: 12, rots: [0, 1, 3] },
    bookshelf: { w: 2, h: 1, layer: 'obj', colors: 7, rots: [0, 2], host: true},
    narrowShelf: { w: 1, h: 1, layer: 'obj', colors: 7, rots: [0, 2], host: true},
    wardrobe: { w: 2, h: 1, layer: 'obj', colors: 7, host: true},
    pastryCase: { w: 2, h: 1, layer: 'obj', colors: 3, rots: [0, 2], host: true},
    // dekor
    plant: { w: 1, h: 1, layer: 'obj', colors: 5, rots: [0, 2] },
    bigPlant: { w: 1, h: 1, layer: 'obj', colors: 5, rots: [0, 2] },
    cactus: { w: 1, h: 1, layer: 'obj', colors: 5, rots: [0, 2] },
    flowers: { w: 1, h: 1, layer: 'obj', colors: 4, rots: [0, 2] },
    lamp: { w: 1, h: 1, layer: 'obj', colors: 5, rots: [0, 2] },
    lantern: { w: 1, h: 1, layer: 'obj', colors: 3 },
    fireplace: { w: 2, h: 1, layer: 'obj', colors: 3 },
    recordPlayer: { w: 1, h: 1, layer: 'obj', colors: 7, rots: [0, 2] },
    globe: { w: 1, h: 1, layer: 'obj', colors: 3 },
    cat: { w: 1, h: 1, layer: 'obj', colors: 4, rots: [0, 2] },
    rug: { w: 3, h: 2, layer: 'floor', colors: 12, rots: [0, 1] },
    roundRug: { w: 2, h: 2, layer: 'floor', colors: 12 },
    // duvar
    window: { w: 2, h: 1, layer: 'wall', colors: 3 },
    archWindow: { w: 2, h: 1, layer: 'wall', colors: 3 },
    board: { w: 2, h: 1, layer: 'wall', colors: 1 },
    chalkboard: { w: 2, h: 1, layer: 'wall', colors: 2 },
    shelf: { w: 2, h: 1, layer: 'wall', colors: 7 },
    painting: { w: 1, h: 1, layer: 'wall', colors: 9 },
    poster: { w: 1, h: 1, layer: 'wall', colors: 8 },
    clock: { w: 1, h: 1, layer: 'wall', colors: 3 },
    sconce: { w: 1, h: 1, layer: 'wall', colors: 3 },
    stringLights: { w: 3, h: 1, layer: 'wall', colors: 3 },
    neon: { w: 2, h: 1, layer: 'wall', colors: 3 },
    hangingPlant: { w: 1, h: 1, layer: 'wall', colors: 3, rots: [0, 2] },
    // ek oturma
    rockingChair: { w: 1, h: 1, layer: 'obj', colors: 7, rots: [0, 1, 2, 3] },
    eggChair: { w: 1, h: 1, layer: 'obj', colors: 12, rots: [0, 1, 2, 3] },
    floorCushion: { w: 1, h: 1, layer: 'obj', colors: 12, rots: [0, 1, 2, 3] },
    hammock: { w: 2, h: 1, layer: 'obj', colors: 12, rots: [0, 1] },
    // ek masa ve çalışma
    gamingDesk: { w: 2, h: 2, layer: 'obj', colors: 3, rots: [0, 1, 2, 3], host: true},
    piano: { w: 2, h: 2, layer: 'obj', colors: 3, rots: [0, 1, 2, 3], host: true},
    easel: { w: 1, h: 1, layer: 'obj', colors: 3, rots: [0, 2] },
    // ek depolama ve eşya
    dresser: { w: 2, h: 1, layer: 'obj', colors: 7, rots: [0, 2], host: true},
    tvStand: { w: 2, h: 1, layer: 'obj', colors: 7, rots: [0, 1, 2, 3] },
    aquarium: { w: 2, h: 1, layer: 'obj', colors: 3, rots: [0, 1] },
    fridge: { w: 1, h: 1, layer: 'obj', colors: 4, rots: [0, 2], host: true},
    coatRack: { w: 1, h: 1, layer: 'obj', colors: 3, rots: [0, 2] },
    // ek dekor
    dogBed: { w: 1, h: 1, layer: 'obj', colors: 4, rots: [0, 2] },
    guitar: { w: 1, h: 1, layer: 'obj', colors: 4, rots: [0, 2] },
    floorMirror: { w: 1, h: 1, layer: 'obj', colors: 3 },
    telescope: { w: 1, h: 1, layer: 'obj', colors: 3, rots: [0, 2] },
    ficus: { w: 1, h: 1, layer: 'obj', colors: 5, rots: [0, 2] },
    bookStack: { w: 1, h: 1, layer: 'obj', colors: 3, rots: [0, 2] },
    candles: { w: 1, h: 1, layer: 'obj', colors: 3, rots: [0, 2] },
    runner: { w: 1, h: 3, layer: 'floor', colors: 12, rots: [0, 1] },
    // ek duvar
    curtainWindow: { w: 2, h: 1, layer: 'wall', colors: 12 },
    mirror: { w: 1, h: 1, layer: 'wall', colors: 3 },
    calendar: { w: 1, h: 1, layer: 'wall', colors: 3 },
    worldMap: { w: 2, h: 1, layer: 'wall', colors: 2 },
    photoGarland: { w: 3, h: 1, layer: 'wall', colors: 2 },
    pegboard: { w: 2, h: 1, layer: 'wall', colors: 3 },
    // referanslardan: mutfak, çalışma odası, büyü köşesi, atölye, spor
    cabinet: { w: 1, h: 1, layer: 'obj', colors: 4, host: true },
    wallCabinet: { w: 2, h: 1, layer: 'wall', colors: 4 },
    rangeHood: { w: 2, h: 1, layer: 'wall', colors: 3 },
    panRail: { w: 2, h: 1, layer: 'wall', colors: 2 },
    spiceRack: { w: 1, h: 1, layer: 'wall', colors: 3 },
    diningTable: { w: 1, h: 3, layer: 'obj', colors: 4, rots: [0, 1], host: true },
    trashBin: { w: 1, h: 1, layer: 'obj', colors: 3 },
    filingCabinet: { w: 2, h: 1, layer: 'obj', colors: 7, host: true },
    clockTrio: { w: 2, h: 1, layer: 'wall', colors: 2 },
    digitalClock: { w: 1, h: 1, layer: 'wall', colors: 2 },
    pendantLamp: { w: 1, h: 1, layer: 'wall', colors: 3 },
    ivy: { w: 3, h: 1, layer: 'wall', colors: 2 },
    windowBench: { w: 2, h: 1, layer: 'obj', colors: 12, rots: [0, 1, 2, 3] },
    potionShelf: { w: 2, h: 1, layer: 'obj', colors: 7, rots: [0, 2], host: true },
    cauldron: { w: 1, h: 1, layer: 'obj', colors: 3 },
    candelabra: { w: 1, h: 1, layer: 'obj', colors: 3 },
    canvasStack: { w: 1, h: 1, layer: 'obj', colors: 3, rots: [0, 2] },
    floorCanvas: { w: 1, h: 1, layer: 'floor', colors: 4, rots: [0, 2] },
    artTable: { w: 2, h: 1, layer: 'obj', colors: 7, rots: [0, 2], host: true },
    treadmill: { w: 2, h: 1, layer: 'obj', colors: 2, rots: [0, 2] },
    exerciseBike: { w: 1, h: 1, layer: 'obj', colors: 3, rots: [0, 2] },
    dumbbellRack: { w: 2, h: 1, layer: 'obj', colors: 2 },
    punchingBag: { w: 1, h: 1, layer: 'obj', colors: 3 },
    exerciseBall: { w: 1, h: 1, layer: 'obj', colors: 4 },
    // masa ve raf üstü küçük eşyalar
    mug: { w: 1, h: 1, layer: 'top', colors: 4 },
    teapot: { w: 1, h: 1, layer: 'top', colors: 3, rots: [0, 2] },
    tableLamp: { w: 1, h: 1, layer: 'top', colors: 3, rots: [0, 2] },
    bookPile: { w: 1, h: 1, layer: 'top', colors: 3 },
    succulent: { w: 1, h: 1, layer: 'top', colors: 5 },
    vase: { w: 1, h: 1, layer: 'top', colors: 3 },
    candle: { w: 1, h: 1, layer: 'top', colors: 3 },
    laptop: { w: 1, h: 1, layer: 'top', colors: 2, rots: [0, 2] },
    typewriter: { w: 1, h: 1, layer: 'top', colors: 3 },
    deskClock: { w: 1, h: 1, layer: 'top', colors: 3 },
    photoFrame: { w: 1, h: 1, layer: 'top', colors: 3, rots: [0, 2] },
    cake: { w: 1, h: 1, layer: 'top', colors: 3 },
    fruitBowl: { w: 1, h: 1, layer: 'top', colors: 2 },
    breadBasket: { w: 1, h: 1, layer: 'top', colors: 2 },
    jars: { w: 1, h: 1, layer: 'top', colors: 3, rots: [0, 2] },
    pencilCup: { w: 1, h: 1, layer: 'top', colors: 3 },
    crystals: { w: 1, h: 1, layer: 'top', colors: 3, rots: [0, 2] },
    potions: { w: 1, h: 1, layer: 'top', colors: 3, rots: [0, 2] },
    radio: { w: 1, h: 1, layer: 'top', colors: 3, rots: [0, 2] },
    hourglass: { w: 1, h: 1, layer: 'top', colors: 2 },
    paintJars: { w: 1, h: 1, layer: 'top', colors: 2, rots: [0, 2] },
    coffeeMaker: { w: 1, h: 1, layer: 'top', colors: 3, rots: [0, 2] },
    miniGlobe: { w: 1, h: 1, layer: 'top', colors: 3 },
    gramophone: { w: 1, h: 1, layer: 'top', colors: 2, rots: [0, 2] },
    // büyük genişleme: oturma
    chesterfield: { w: 2, h: 1, layer: 'obj', colors: 12, rots: [0, 1, 2, 3] },
    loungeChair: { w: 1, h: 1, layer: 'obj', colors: 12, rots: [0, 1, 2, 3] },
    officeChair: { w: 1, h: 1, layer: 'obj', colors: 4, rots: [0, 1, 2, 3] },
    daybed: { w: 2, h: 1, layer: 'obj', colors: 12, rots: [0, 2] },
    deckChair: { w: 1, h: 2, layer: 'obj', colors: 12, rots: [0, 1, 3] },
    swingBench: { w: 2, h: 1, layer: 'obj', colors: 7, rots: [0, 2] },
    // mutfak ve kafe
    stove: { w: 2, h: 1, layer: 'obj', colors: 4, rots: [0, 2], host: true},
    sink: { w: 2, h: 1, layer: 'obj', colors: 4, rots: [0, 2], host: true},
    coffeeCart: { w: 1, h: 1, layer: 'obj', colors: 3, rots: [0, 2] },
    vendingMachine: { w: 1, h: 1, layer: 'obj', colors: 4, rots: [0, 1, 2, 3] },
    // depolama
    cubeShelf: { w: 2, h: 1, layer: 'obj', colors: 7, rots: [0, 2], host: true},
    ladderShelf: { w: 1, h: 1, layer: 'obj', colors: 7, rots: [0, 2] },
    displayCabinet: { w: 2, h: 1, layer: 'obj', colors: 7, host: true},
    toyChest: { w: 1, h: 1, layer: 'obj', colors: 4, rots: [0, 2] },
    // eğlence ve dekor
    arcade: { w: 1, h: 1, layer: 'obj', colors: 3, rots: [0, 1, 2, 3] },
    drumKit: { w: 2, h: 1, layer: 'obj', colors: 3, rots: [0, 2] },
    teddyBear: { w: 1, h: 1, layer: 'obj', colors: 4 },
    lavaLamp: { w: 1, h: 1, layer: 'obj', colors: 4 },
    floorFan: { w: 1, h: 1, layer: 'obj', colors: 3, rots: [0, 1, 3] },
    christmasTree: { w: 1, h: 1, layer: 'obj', colors: 3 },
    pumpkin: { w: 1, h: 1, layer: 'obj', colors: 3, rots: [0, 2] },
    // bitkiler
    palm: { w: 1, h: 1, layer: 'obj', colors: 5, rots: [0, 2] },
    bonsai: { w: 1, h: 1, layer: 'obj', colors: 3, rots: [0, 2] },
    pampasVase: { w: 1, h: 1, layer: 'obj', colors: 5, rots: [0, 2] },
    // açık hava
    campfire: { w: 1, h: 1, layer: 'obj', colors: 2 },
    lampPost: { w: 1, h: 1, layer: 'obj', colors: 3 },
    planterBox: { w: 2, h: 1, layer: 'obj', colors: 4, rots: [0, 1] },
    fountain: { w: 2, h: 2, layer: 'obj', colors: 2 },
    snowman: { w: 1, h: 1, layer: 'obj', colors: 3, rots: [0, 2] },
    bicycle: { w: 2, h: 1, layer: 'obj', colors: 4, rots: [0, 1, 2, 3] },
    // halılar
    shagRug: { w: 2, h: 2, layer: 'floor', colors: 12 },
    checkerRug: { w: 3, h: 2, layer: 'floor', colors: 12, rots: [0, 1] },
    yogaMat: { w: 1, h: 2, layer: 'floor', colors: 4, rots: [0, 1] },
    // duvar
    wallTV: { w: 2, h: 1, layer: 'wall', colors: 2 },
    whiteboard: { w: 2, h: 1, layer: 'wall', colors: 2 },
    dartboard: { w: 1, h: 1, layer: 'wall', colors: 2 },
    gallery: { w: 3, h: 1, layer: 'wall', colors: 3 },
    tapestry: { w: 2, h: 1, layer: 'wall', colors: 12 },
    bunting: { w: 3, h: 1, layer: 'wall', colors: 2 },
    portholeWindow: { w: 1, h: 1, layer: 'wall', colors: 3 },
    neonArt: { w: 2, h: 1, layer: 'wall', colors: 4 },
  });

  const STYLE_COUNTS = Object.freeze({ wall: 11, pattern: 8, floor: 11 });
  // body: 0 erkek, 1 kız · style: saç modeli · eyes: göz rengi · face: yüz detayı
  // top/bottom: kıyafet biçimi · acc: aksesuar. Yeni seçenekler hep sona eklenir (eski kayıtlar bozulmasın).
  // shoes: ayakkabı · acc2: boyun/sırt aksesuarı (baş aksesuarıyla birlikte takılabilir)
  const LOOK_COUNTS = Object.freeze({ body: 2, skin: 8, hair: 16, style: 22, eyes: 8, face: 10, shirt: 16, pants: 10, top: 13, bottom: 6, shoes: 6, acc: 16, acc2: 6 });
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

  const rotsOf = (type) => CATALOG[type].rots || [0];

  function footprint(item) {
    const def = CATALOG[item.type];
    const wall = def.layer === 'wall';
    const side = (item.r | 0) % 2 === 1;
    const w = side ? def.h : def.w;
    const h = side ? def.w : def.h;
    return { x: item.x, y: wall ? 0 : item.y, w, h: wall ? 1 : h, layer: def.layer };
  }

  // Sıradaki izin verilen yön
  function nextRotation(type, r) {
    const rots = rotsOf(type);
    const i = rots.indexOf(r);
    return rots[(i + 1) % rots.length];
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

  const covers = (f, x, y) => x >= f.x && x < f.x + f.w && y >= f.y && y < f.y + f.h;

  // Küçük eşyanın üstünde durduğu eşya (masa, raf, tezgah…)
  function hostAt(items, x, y, ignoreId) {
    for (const other of items) {
      if (other.id === ignoreId || !CATALOG[other.type] || !CATALOG[other.type].host) continue;
      if (covers(footprint(other), x, y)) return other;
    }
    return null;
  }

  function canPlace(items, item, ignoreId) {
    if (!item || !has(CATALOG, item.type)) return false;
    if (!Number.isInteger(item.x) || !Number.isInteger(item.y)) return false;
    if (item.r !== undefined && !rotsOf(item.type).includes(item.r)) return false;
    if (!inBounds(item)) return false;
    const f = footprint(item);
    if (f.layer === 'top' && !hostAt(items, item.x, item.y, ignoreId)) return false;
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
    // önce büyük eşyalar, sonra üstlerine konan küçük eşyalar
    const isTop = (raw) => raw && has(CATALOG, raw.type) && CATALOG[raw.type].layer === 'top';
    const ordered = list.filter((raw) => !isTop(raw)).concat(list.filter(isTop));
    for (const raw of ordered) {
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
        r: rotsOf(raw.type).includes(raw.r) ? raw.r : 0,
      };
      if (!canPlace(items, item)) continue;
      ids.add(item.id);
      items.push(item);
    }
    return { venue, style, items };
  }

  // Mekanların varsayılan düzenleri: [tür, x, y, renk, yön]
  const DEFAULT_LAYOUTS = {
    room: {
      style: { wall: 0, pattern: 7, floor: 10 },
      items: [
        ['desk', 0, 0, 1], ['bookshelf', 2, 0, 1], ['bigPlant', 4, 0, 2], ['dresser', 5, 0, 0], ['lamp', 7, 0, 0],
        ['wardrobe', 8, 0, 4], ['ficus', 11, 0, 1],
        ['recordPlayer', 0, 3, 1], ['rug', 3, 4, 3], ['chesterfield', 3, 3, 0], ['table', 3, 5, 0], ['armchair', 5, 4, 1, 1],
        ['lamp', 6, 3, 2], ['beanbag', 1, 5, 3], ['bed', 9, 4, 2], ['sideTable', 11, 4, 0], ['teddyBear', 11, 6, 0],
        ['cat', 8, 6, 0], ['plant', 0, 7, 1], ['toyChest', 6, 7, 1],
        ['board', 0, 0, 0], ['window', 5, 0, 0], ['painting', 7, 0, 6], ['mirror', 11, 0, 0],
        ['succulent', 2, 0, 0], ['miniGlobe', 3, 0, 1], ['vase', 5, 0, 0], ['tableLamp', 6, 0, 1], ['bookPile', 9, 0, 0],
      ],
    },
    cafe: {
      style: { wall: 6, pattern: 3, floor: 4 },
      items: [
        ['counter', 0, 0, 0], ['pastryCase', 3, 0, 0], ['cubeShelf', 6, 0, 1], ['bigPlant', 8, 0, 3], ['coffeeCart', 9, 0, 1],
        ['ficus', 11, 0, 0],
        ['cafeTable', 1, 3, 0], ['cafeTable', 3, 3, 0], ['diningTable', 5, 3, 0],
        ['roundRug', 8, 4, 3], ['sofa', 8, 3, 6], ['table', 8, 5, 1], ['armchair', 10, 4, 5, 1], ['lamp', 11, 3, 1],
        ['plant', 0, 7, 0], ['windowBench', 1, 7, 3], ['flowers', 6, 7, 0], ['cat', 9, 7, 1], ['plant', 11, 7, 3],
        ['stringLights', 0, 0, 0], ['chalkboard', 3, 0, 0], ['pendantLamp', 5, 0, 1], ['window', 6, 0, 2],
        ['pendantLamp', 8, 0, 1], ['clock', 9, 0, 2], ['hangingPlant', 11, 0, 0],
        ['cake', 3, 0, 1], ['breadBasket', 4, 0, 0], ['jars', 6, 0, 0], ['succulent', 7, 0, 2], ['vase', 5, 4, 0],
      ],
    },
    library: {
      style: { wall: 7, pattern: 4, floor: 5 },
      items: [
        ['bookshelf', 0, 0, 1], ['bookshelf', 2, 0, 1], ['narrowShelf', 4, 0, 1], ['fireplace', 5, 0, 0], ['narrowShelf', 7, 0, 1],
        ['bookshelf', 8, 0, 1], ['bigPlant', 11, 0, 3],
        ['readingTable', 1, 3, 1], ['readingTable', 5, 3, 1],
        ['rug', 8, 5, 10], ['armchair', 8, 4, 10], ['sideTable', 9, 4, 1], ['armchair', 10, 4, 10], ['lamp', 11, 4, 1],
        ['filingCabinet', 0, 7, 1], ['globe', 3, 7, 0], ['candelabra', 5, 7, 1], ['cat', 8, 7, 2], ['plant', 11, 7, 2],
        ['sconce', 4, 0, 1], ['clockTrio', 5, 0, 0], ['sconce', 7, 0, 1], ['painting', 11, 0, 0],
        ['candle', 0, 0, 0], ['miniGlobe', 1, 0, 0], ['hourglass', 3, 0, 0], ['bookPile', 8, 0, 2], ['succulent', 9, 0, 1],
        ['typewriter', 0, 7, 0], ['deskClock', 1, 7, 0],
      ],
    },
    terrace: {
      style: { wall: 0, pattern: 5, floor: 8 },
      items: [
        ['planterBox', 0, 0, 0], ['planterBox', 2, 0, 1], ['swingBench', 4, 0, 0], ['bigPlant', 6, 0, 0], ['lantern', 7, 0, 0],
        ['palm', 8, 0, 0], ['flowers', 9, 0, 3], ['bigPlant', 11, 0, 1],
        ['diningTable', 1, 3, 1], ['cafeTable', 3, 3, 1],
        ['campfire', 6, 4, 0], ['beanbag', 5, 4, 0, 3], ['beanbag', 7, 4, 5, 1], ['bench', 5, 5, 0, 2],
        ['hammock', 9, 3, 2], ['lampPost', 11, 3, 0], ['deckChair', 10, 5, 3], ['deckChair', 11, 5, 9],
        ['cactus', 0, 7, 0], ['bicycle', 1, 7, 1], ['flowers', 8, 7, 0], ['snowman', 4, 7, 0],
        ['stringLights', 0, 0, 0], ['stringLights', 3, 0, 1], ['bunting', 6, 0, 0], ['hangingPlant', 11, 0, 0],
        ['fruitBowl', 1, 4, 0], ['teapot', 3, 4, 0],
      ],
    },
    attic: {
      style: { wall: 9, pattern: 4, floor: 1 },
      items: [
        ['telescope', 0, 0, 0], ['filingCabinet', 2, 0, 1], ['bookshelf', 4, 0, 1], ['globe', 6, 0, 1], ['pampasVase', 7, 0, 0],
        ['ladderShelf', 8, 0, 1], ['coatRack', 11, 0, 0],
        ['desk', 0, 3, 1], ['rug', 3, 4, 10], ['rockingChair', 4, 4, 1], ['table', 4, 5, 1], ['lamp', 6, 4, 2],
        ['daybed', 8, 3, 9], ['sideTable', 10, 3, 1], ['potionShelf', 10, 5, 1, 2],
        ['cat', 7, 6, 1], ['toyChest', 0, 6, 1], ['windowBench', 2, 7, 9], ['plant', 11, 7, 1], ['candelabra', 9, 7, 1],
        ['worldMap', 6, 0, 0], ['clock', 9, 0, 1], ['painting', 11, 0, 7],
        ['typewriter', 2, 0, 0], ['deskClock', 3, 0, 0], ['bookPile', 4, 0, 2], ['hourglass', 5, 0, 0],
        ['candle', 4, 5, 0], ['potions', 10, 5, 0], ['crystals', 11, 5, 0],
      ],
    },
    studio: {
      style: { wall: 0, pattern: 0, floor: 0 },
      items: [
        ['canvasStack', 0, 0, 0], ['artTable', 1, 0, 1], ['cubeShelf', 3, 0, 4], ['plant', 5, 0, 2], ['windowBench', 6, 0, 8],
        ['bigPlant', 8, 0, 1], ['easel', 9, 0, 0], ['ficus', 11, 0, 3],
        ['easel', 2, 3, 0], ['stool', 2, 4, 0, 2], ['easel', 5, 3, 0], ['stool', 5, 4, 3, 2],
        ['floorCanvas', 0, 5, 0], ['floorCanvas', 3, 6, 1], ['floorCanvas', 7, 5, 3],
        ['shagRug', 8, 4, 8], ['beanbag', 8, 4, 3], ['floorCushion', 9, 5, 5, 1], ['lavaLamp', 11, 4, 0],
        ['canvasStack', 0, 7, 1], ['paintJars', 1, 0, 0], ['vase', 2, 0, 1], ['jars', 3, 0, 1], ['succulent', 4, 0, 1],
        ['plant', 11, 7, 0], ['cat', 10, 6, 3],
        ['gallery', 0, 0, 0], ['poster', 3, 0, 6], ['clock', 4, 0, 1], ['pendantLamp', 7, 0, 1], ['pendantLamp', 9, 0, 1],
      ],
    },
    kitchen: {
      style: { wall: 9, pattern: 6, floor: 9 },
      items: [
        ['cabinet', 0, 0, 0], ['sink', 1, 0, 0], ['stove', 3, 0, 0], ['cabinet', 5, 0, 0], ['cabinet', 6, 0, 0],
        ['fridge', 7, 0, 0], ['cabinet', 8, 0, 0], ['trashBin', 9, 0, 0], ['plant', 11, 0, 0],
        ['cabinet', 1, 3, 0], ['cabinet', 2, 3, 0], ['stool', 1, 4, 3, 2], ['stool', 2, 4, 3, 2],
        ['runner', 4, 3, 0], ['diningTable', 6, 3, 0], ['windowBench', 9, 4, 1], ['cat', 10, 5, 1],
        ['flowers', 0, 7, 0], ['plant', 11, 7, 1], ['dogBed', 8, 7, 0],
        ['spiceRack', 0, 0, 0], ['curtainWindow', 1, 0, 3], ['rangeHood', 3, 0, 2], ['wallCabinet', 5, 0, 0],
        ['clock', 7, 0, 2], ['panRail', 8, 0, 0], ['calendar', 11, 0, 0],
        ['breadBasket', 0, 0, 0], ['coffeeMaker', 5, 0, 0], ['jars', 6, 0, 1], ['teapot', 8, 0, 1], ['fruitBowl', 7, 0, 0],
        ['cake', 1, 3, 1], ['mug', 2, 3, 1], ['vase', 6, 4, 0],
      ],
    },
  };

  function defaultRoom(venue) {
    const id = VENUES.includes(venue) ? venue : 'room';
    const layout = DEFAULT_LAYOUTS[id];
    return sanitizeRoom({
      venue: id,
      style: layout.style,
      items: layout.items.map(([type, x, y, c, r], i) => ({ id: `${type}${i}`, type, x, y, c, r: r || 0 })),
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
    hostAt,
    rotsOf,
    nextRotation,
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
