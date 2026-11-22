/*
 * Piksel sanat çekirdeği: renk yardımcıları, duvar/zemin/kapı çizimi, karakter ve sprite önbelleği.
 * Eşya çizimleri items.js içindedir. Harici görsel kullanılmaz; her şey kodla çizilir.
 */
(() => {
  'use strict';

  const App = window.App;
  const Sh = window.Shared;
  const { ROOM_W, ROOM_H, DOOR_X } = Sh;

  const T = 16; // kare boyutu (mantıksal piksel)
  // Diorama: oda, etrafında boşluk olan, kaidenin üstünde duran bir blok gibi çizilir
  const MX = 6; // yan boşluk
  const MT = 6; // üst boşluk
  const SW = 8; // yan duvar kalınlığı
  const WH = 48; // arka duvar yüksekliği
  const BASE = 10; // kaide yüksekliği
  const OX = MX + SW;
  const OY = MT + WH;
  const LW = ROOM_W * T + OX * 2;
  const LH = OY + ROOM_H * T + BASE + 8;
  const OUTLINE = '#3a2c35';

  // ---------- Renk yardımcıları ----------
  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgbToHex(rgb) {
    return `#${rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
  }

  // amt > 0 açar, amt < 0 koyulaştırır
  function shade(hex, amt) {
    const target = amt < 0 ? 0 : 255;
    const k = Math.abs(amt);
    return rgbToHex(hexToRgb(hex).map((v) => v + (target - v) * k));
  }

  function mix(a, b, t) {
    const x = hexToRgb(a);
    const y = hexToRgb(b);
    return rgbToHex(x.map((v, i) => v + (y[i] - v) * t));
  }

  function rgba(hex, alpha) {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => {
      s = (Math.imul(s, 1103515245) + 12345) >>> 0;
      return (s >>> 8) / 16777216;
    };
  }

  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  function painter(g) {
    return (x, y, w, h, color) => {
      g.fillStyle = color;
      g.fillRect(x, y, w, h);
    };
  }

  // Piksel merkezli dolu elips
  function ellipse(p, cx, cy, rx, ry, color) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) p(x, y, 1, 1, color);
      }
    }
  }

  // Sprite'ın çevresine 1px kontur ekler (çıktı 2px daha büyüktür)
  function outline(src, color) {
    const out = makeCanvas(src.width + 2, src.height + 2);
    const g = out.getContext('2d');
    for (const [dx, dy] of [
      [0, 1],
      [2, 1],
      [1, 0],
      [1, 2],
    ]) {
      g.drawImage(src, dx, dy);
    }
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color || OUTLINE;
    g.fillRect(0, 0, out.width, out.height);
    g.globalCompositeOperation = 'source-over';
    g.drawImage(src, 1, 1);
    return out;
  }

  function padded(src) {
    const out = makeCanvas(src.width + 2, src.height + 2);
    out.getContext('2d').drawImage(src, 1, 1);
    return out;
  }

  function mirror(src) {
    const out = makeCanvas(src.width, src.height);
    const g = out.getContext('2d');
    g.translate(src.width, 0);
    g.scale(-1, 1);
    g.drawImage(src, 0, 0);
    return out;
  }

  // ---------- Paletler ----------
  const FABRIC = ['#d9785f', '#6f9a7d', '#5b7fa8', '#e3b766', '#9b7bb5', '#e59aa6', '#3f7f7a', '#6b6f78', '#f0e6d2', '#3f6b4f', '#8c3b4a', '#2f4a6b'];
  const FABRIC_NAMES = ['Terracotta', 'Sage', 'Blue', 'Mustard', 'Lavender', 'Pink', 'Teal', 'Charcoal', 'Cream', 'Forest', 'Burgundy', 'Navy'];
  const WOOD = ['#b9875a', '#7a5236', '#e9e2d4', '#3d3a3f', '#d8b98c', '#9b4a3a', '#a7a19a'];
  const WOOD_NAMES = ['Oak', 'Walnut', 'White', 'Black', 'Birch', 'Cherry', 'Gray wash'];
  const POTS = ['#c87b55', '#ece6da', '#5f7c8a', '#3d3a3f', '#e3b766'];
  const POT_NAMES = ['Terracotta', 'Cream', 'Gray', 'Black', 'Mustard'];
  const SHADES = ['#f1e4c4', '#e3b766', '#d9785f', '#6f9a7d', '#5b7fa8'];
  const SHADE_NAMES = ['Cream', 'Mustard', 'Terracotta', 'Sage', 'Blue'];
  const METAL = ['#3d424b', '#c9a24b', '#e9e2d4', '#b9875a'];
  const METAL_NAMES = ['Black', 'Brass', 'White', 'Wood'];
  const BOOKS = ['#d9785f', '#5b7fa8', '#e3b766', '#6f9a7d', '#9b7bb5', '#ece6da', '#c4553f', '#7a8fa6'];
  const LEAF = ['#4f7f4c', '#6fa268', '#8cc07f'];

  const WALLS = ['#eadfc8', '#cbd6bf', '#cddae6', '#e8cbc4', '#d8cee4', '#4a5470', '#c9826b', '#4f6b58', '#3b3d45', '#f0dfae', '#c5e3d6'];
  const WALL_NAMES = ['Cream', 'Sage', 'Sky', 'Rose', 'Lavender', 'Night', 'Terracotta', 'Forest', 'Coal', 'Butter', 'Mint'];
  const PATTERN_NAMES = ['Plain', 'Stripes', 'Polka dots', 'Brick', 'Wood paneling', 'Fence and sky', 'Tiles', 'Floral wallpaper'];
  const FLOORS = [
    { kind: 'planks', base: '#c99c6b' },
    { kind: 'planks', base: '#7f5639' },
    { kind: 'tiles', a: '#ebe5da', b: '#d3cab9' },
    { kind: 'carpet', base: '#8e9db0' },
    { kind: 'tiles', a: '#ece6da', b: '#3f3b45', grout: false },
    { kind: 'basket', base: '#b98a5c' },
    { kind: 'stone', base: '#b8b2a7' },
    { kind: 'grass', base: '#7fae6a' },
    { kind: 'deck', base: '#a98262' },
    { kind: 'tiles', a: '#c8735a', b: '#b8654e' },
    { kind: 'herring', base: '#c08f5e' },
  ];
  const FLOOR_NAMES = ['Oak planks', 'Walnut planks', 'Tiles', 'Carpet', 'Checkerboard', 'Basketweave parquet', 'Stone', 'Grass', 'Wooden deck', 'Terracotta tiles', 'Herringbone'];
  const FLOOR_SWATCH = ['#c99c6b', '#7f5639', '#ebe5da', '#8e9db0', '#3f3b45', '#b98a5c', '#b8b2a7', '#7fae6a', '#a98262', '#c8735a', '#c08f5e'];

  const VENUE_NAMES = { room: 'My room', cafe: 'Café', library: 'Library', terrace: 'Terrace', attic: 'Attic', studio: 'Art studio', kitchen: 'Kitchen' };

  // ---------- Işık (gün / gece) ----------
  function lighting(date) {
    let h = date.getHours() + date.getMinutes() / 60;
    if (Number.isFinite(Art.forcedHour)) h = Art.forcedHour;
    let night;
    if (h < 5.5 || h >= 20.5) night = 1;
    else if (h < 7.5) night = 1 - (h - 5.5) / 2;
    else if (h < 18) night = 0;
    else night = (h - 18) / 2.5;
    let warm = 0;
    if (h >= 5.5 && h < 8) warm = 1 - Math.abs(h - 6.75) / 1.25;
    else if (h >= 17.5 && h < 20.5) warm = 1 - Math.abs(h - 19) / 1.5;
    return { hour: h, night: clamp01(night), warm: clamp01(warm) };
  }

  function skyColors(light) {
    let top = mix('#8fcbea', '#1b2240', light.night);
    let bot = mix('#d6eef8', '#36416c', light.night);
    top = mix(top, '#f0a27a', light.warm * 0.7);
    bot = mix(bot, '#f8d59c', light.warm * 0.8);
    return { top, bot };
  }

  // Pencere camının arkasındaki gökyüzü (gerçek saate göre)
  function drawSky(ctx, x, y, w, h, env, plain) {
    const light = env.light;
    let { top, bot } = skyColors(light);
    const wx = env.weather || {};
    if (wx.rain || wx.snow) {
      top = mix(top, wx.rain ? '#7d8896' : '#c9d2dc', 0.6);
      bot = mix(bot, wx.rain ? '#9aa4b0' : '#e6ebf0', 0.6);
    }
    const gr = ctx.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, top);
    gr.addColorStop(1, bot);
    ctx.fillStyle = gr;
    ctx.fillRect(x, y, w, h);
    if (plain) {
      // dar camlarda güneş ve ay çizilmez (yanındaki büyük camda zaten görünür)
    } else if (light.night > 0.55) {
      ctx.fillStyle = '#f4f1d0';
      const r = rng(Math.round(x * 7 + y));
      for (let i = 0; i < Math.round((w * h) / 70); i++) {
        ctx.fillRect(x + Math.floor(r() * w), y + Math.floor(r() * h * 0.8), 1, 1);
      }
      ctx.fillStyle = '#f6efc6';
      ctx.fillRect(x + w - 8, y + 3, 3, 4);
      ctx.fillRect(x + w - 9, y + 4, 1, 2);
      ctx.fillStyle = top;
      ctx.fillRect(x + w - 6, y + 3, 1, 3);
    } else if (!wx.rain && !wx.snow) {
      const t = clamp01((light.hour - 6) / 13);
      ctx.fillStyle = light.warm > 0.3 ? '#f7b267' : '#fff2b0';
      ctx.fillRect(x + 1 + Math.round(t * (w - 6)), y + 1 + Math.round(Math.abs(t - 0.5) * (h - 6)), 4, 4);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      const span = w + 16;
      const drift = (env.t / 900) % span;
      for (const [cx, cy, cw] of [[0, 0.35, 8], [span / 2, 0.7, 7]]) {
        const px = x + ((cx + drift) % span) - 8;
        const py = y + Math.round(h * cy);
        ctx.fillRect(px, py, cw, 2);
        ctx.fillRect(px + 2, py - 1, cw - 4, 1);
      }
    }
    drawWeather(ctx, x, y, w, h, env);
  }

  // Yağmur / kar parçacıkları (ortam sesi açıkken pencerelerde ve açık havada)
  function drawWeather(ctx, x, y, w, h, env, strength = 1) {
    const wx = env.weather || {};
    if (!wx.rain && !wx.snow) return;
    const t = env.t / 1000;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    if (wx.rain) {
      ctx.fillStyle = `rgba(200, 220, 240, ${0.55 * strength})`;
      const n = Math.max(4, Math.round((w * h) / 90));
      for (let i = 0; i < n; i++) {
        const sx = (i * 53.7) % w;
        const speed = 140 + (i % 5) * 20;
        const sy = (i * 37.1 + t * speed) % (h + 8);
        const px = Math.round(x + ((sx - (sy * 0.25)) % w + w) % w);
        ctx.fillRect(px, Math.round(y + sy - 6), 1, 3);
      }
    }
    if (wx.snow) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * strength})`;
      const n = Math.max(3, Math.round((w * h) / 140));
      for (let i = 0; i < n; i++) {
        const speed = 10 + (i % 4) * 4;
        const sy = (i * 29.3 + t * speed) % (h + 4);
        const sx = (i * 47.9 + Math.sin(t * 1.3 + i) * 3 + w) % w;
        const size = i % 3 === 0 ? 2 : 1;
        ctx.fillRect(Math.round(x + sx), Math.round(y + sy - 2), size, size);
      }
    }
    ctx.restore();
  }

  // ---------- Kitap rafı yardımcısı ----------
  function books(p, x0, x1, yBottom, maxH, seed) {
    const r = rng(seed);
    let x = x0;
    while (x < x1 - 1) {
      if (r() < 0.12) {
        x += 2;
        continue;
      }
      const w = r() < 0.3 ? 3 : 2;
      if (x + w > x1) break;
      const h = Math.max(4, Math.round(maxH - r() * 4));
      const col = BOOKS[Math.floor(r() * BOOKS.length)];
      p(x, yBottom - h, w, h, col);
      p(x, yBottom - h, w, 1, shade(col, 0.22));
      p(x, yBottom - h + 2, w, 1, shade(col, -0.2));
      x += w;
    }
  }

  // ---------- Eşyalar (items.js doldurur) ----------
  const ITEMS = {};
  const spriteCache = new Map();
  const viewCache = new Map();

  const FLIP_DIR = { left: 'right', right: 'left', up: 'up', down: 'down' };

  // Aynalanmış çizimlerde dinamik katmanı (ateş, buhar…) da aynala
  function mirroredFn(fn, sw) {
    if (!fn) return undefined;
    return (ctx, r, item, env) => {
      ctx.save();
      ctx.translate(2 * r.x + sw, 0);
      ctx.scale(-1, 1);
      fn(ctx, r, item, env);
      ctx.restore();
    };
  }

  function mirrorView(type, src, srcR, r) {
    const W = Sh.footprint({ type, x: 0, y: 0, r }).w;
    return {
      ...src,
      r,
      mirrorOf: srcR,
      ox: W * T - src.sw - (src.ox || 0),
      solid: src.solid ? (cx, cy) => src.solid(W - 1 - cx, cy) : undefined,
      seats: src.seats
        ? src.seats.map((st) => ({ ...st, x: W - st.x, dir: FLIP_DIR[st.dir], cells: st.cells.map(([cx, cy]) => [W - 1 - cx, cy]) }))
        : undefined,
      glows: src.glows ? src.glows.map((gl) => ({ ...gl, x: src.sw - gl.x })) : undefined,
      under: mirroredFn(src.under, src.sw),
      over: mirroredFn(src.over, src.sw),
    };
  }

  // Eşyanın yönüne göre çizim tanımı. views[r] varsa onu kullanır; 3 = 1'in aynası,
  // dekor eşyalarında 2 = ayna. rotateOf: kaynak çizimi 90° döndürür (halı gibi düz eşyalar).
  function viewOf(type, r) {
    const rr = r | 0;
    const key = `${type}:${rr}`;
    let v = viewCache.get(key);
    if (v) return v;
    const base = ITEMS[type];
    const views = base.views || {};
    if (rr === 0) v = { ...base, r: 0 };
    else if (views[rr]) v = { ...base, cuts: undefined, overBand: undefined, over: undefined, under: undefined, ...views[rr], r: rr };
    else if (rr === 3 && views[1]) v = mirrorView(type, viewOf(type, 1), 1, 3);
    else if (rr === 2) v = mirrorView(type, viewOf(type, 0), 0, 2);
    else v = { ...base, r: rr };
    viewCache.set(key, v);
    return v;
  }

  const view = (item) => viewOf(item.type, item.r);

  function rotateCanvas(src, clockwise) {
    const out = makeCanvas(src.height, src.width);
    const g = out.getContext('2d');
    if (clockwise) {
      g.translate(src.height, 0);
      g.rotate(Math.PI / 2);
    } else {
      g.translate(0, src.width);
      g.rotate(-Math.PI / 2);
    }
    g.drawImage(src, 0, 0);
    return out;
  }

  function buildSprite(type, c, r, part) {
    const v = viewOf(type, r);
    if (v.mirrorOf !== undefined) return mirror(spriteFor(type, c, v.mirrorOf, part).img);
    if (v.rotateOf !== undefined) {
      const src = spriteFor(type, c, v.rotateOf, part).img;
      const raw = makeCanvas(src.width - 2, src.height - 2);
      raw.getContext('2d').drawImage(src, -1, -1);
      const rot = rotateCanvas(raw, true);
      return padded(rot);
    }
    const fn = part === 'cover' ? v.cover : v.draw;
    const raw = makeCanvas(v.sw, v.sh);
    const g = raw.getContext('2d');
    fn.call(v, painter(g), c, g);
    return v.noOutline ? padded(raw) : outline(raw, v.outlineColor ? v.outlineColor(c) : OUTLINE);
  }

  function spriteFor(type, c, r, part = 'main') {
    const key = `${type}:${c}:${r | 0}:${part}`;
    let s = spriteCache.get(key);
    if (!s) {
      const img = buildSprite(type, c, r | 0, part);
      const alpha = img.getContext('2d').getImageData(0, 0, img.width, img.height).data;
      s = { img, alpha };
      spriteCache.set(key, s);
    }
    return s;
  }

  const itemSprite = (type, c, r) => spriteFor(type, c, r);

  // Sprite'ın sol üst köşesinin (kontursuz) mantıksal konumu
  function itemRect(item) {
    const v = view(item);
    const cat = Sh.CATALOG[item.type];
    const fp = Sh.footprint(item);
    const x = OX + item.x * T + (v.ox || 0);
    let y;
    if (cat.layer === 'wall') y = MT + v.wy;
    else if (cat.layer === 'top') y = Art.topBottom(item) - v.sh;
    else y = OY + (item.y + fp.h) * T - v.sh;
    return { x, y, w: v.sw, h: v.sh };
  }

  function hitsItem(item, lx, ly) {
    const r = itemRect(item);
    const sx = Math.floor(lx - r.x + 1);
    const sy = Math.floor(ly - r.y + 1);
    const { img, alpha } = spriteFor(item.type, item.c, item.r);
    if (sx < 0 || sy < 0 || sx >= img.width || sy >= img.height) return false;
    return alpha[(sy * img.width + sx) * 4 + 3] > 0;
  }

  function drawItem(ctx, item, env, alpha) {
    const v = view(item);
    const r = itemRect(item);
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    if (v.under) v.under(ctx, r, item, env);
    ctx.drawImage(spriteFor(item.type, item.c, item.r).img, r.x - 1, r.y - 1);
    if (v.over) v.over(ctx, r, item, env);
    if (alpha !== undefined) ctx.globalAlpha = 1;
  }

  // Sprite'ın [y0, y1) satırlarını çizer (oturan karakterleri katmanlar arasına yerleştirmek için)
  function drawItemSlice(ctx, item, y0, y1) {
    const r = itemRect(item);
    const { img } = spriteFor(item.type, item.c, item.r);
    const s = y0 === null ? 0 : y0 + 1;
    const e = y1 === null ? img.height : y1 + 1;
    if (e <= s) return;
    ctx.drawImage(img, 0, s, img.width, e - s, r.x - 1, r.y - 1 + s, img.width, e - s);
  }

  function drawItemOver(ctx, item, env) {
    const v = view(item);
    if (v.over) v.over(ctx, itemRect(item), item, env);
  }

  // Oturanın üstüne çizilen örtü (ör. yana dönük yatağın yorganı)
  function drawItemCover(ctx, item) {
    if (!view(item).cover && view(item).mirrorOf === undefined) return;
    const src = view(item).mirrorOf !== undefined ? viewOf(item.type, view(item).mirrorOf) : view(item);
    if (!src.cover) return;
    const r = itemRect(item);
    ctx.drawImage(spriteFor(item.type, item.c, item.r, 'cover').img, r.x - 1, r.y - 1);
  }

  const THUMB_ENV = {
    light: { hour: 13, night: 0, warm: 0 },
    t: 0,
    date: new Date(2024, 0, 1, 10, 10),
    todosLeft: 3,
    activeItems: new Set(),
    thumb: true,
  };

  function thumb(type, c, size) {
    const def = ITEMS[type];
    const { img } = spriteFor(type, c, 0);
    const k = Math.max(1, Math.floor(Math.min(size / img.width, size / img.height)));
    const out = makeCanvas(size, size);
    const g = out.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.setTransform(k, 0, 0, k, Math.floor((size - img.width * k) / 2), Math.floor((size - img.height * k) / 2));
    const r = { x: 1, y: 1, w: def.sw, h: def.sh };
    if (def.under) def.under(g, r, { id: 'thumb', c }, THUMB_ENV);
    g.drawImage(img, 0, 0);
    if (def.over) def.over(g, r, { id: 'thumb', c }, THUMB_ENV);
    return out;
  }

  // ---------- Arka plan: duvar, zemin, kapı ----------
  const bgCache = new Map();

  function drawFloor(p, idx) {
    const f = FLOORS[idx];
    const W = ROOM_W * T;
    const H = ROOM_H * T;
    if (f.kind === 'planks' || f.kind === 'deck') {
      const deck = f.kind === 'deck';
      const r = rng(7 + idx * 31);
      for (let row = 0; row < H / 8; row++) {
        const y = OY + row * 8;
        let x = -Math.floor(r() * 30);
        while (x < W) {
          const len = deck ? 48 + Math.floor(r() * 40) : 22 + Math.floor(r() * 22);
          const tone = shade(f.base, (r() - 0.5) * 0.12);
          const x0 = Math.max(0, x);
          const x1 = Math.min(W, x + len);
          p(OX + x0, y, x1 - x0, 7, tone);
          p(OX + x0, y + 7, x1 - x0, 1, shade(f.base, deck ? -0.4 : -0.22));
          if (x + len < W) p(OX + x + len - 1, y, 1, 7, shade(f.base, -0.16));
          if (deck) {
            if (x0 === x) p(OX + x0 + 2, y + 3, 1, 1, shade(f.base, -0.35));
            if (x + len < W) p(OX + x + len - 3, y + 3, 1, 1, shade(f.base, -0.35));
          } else if (x1 - x0 > 10 && r() < 0.7) {
            p(OX + x0 + 3 + Math.floor(r() * (x1 - x0 - 9)), y + 2 + Math.floor(r() * 3), 4, 1, shade(tone, -0.07));
          }
          x += len;
        }
      }
    } else if (f.kind === 'tiles') {
      for (let ty = 0; ty < ROOM_H; ty++) {
        for (let tx = 0; tx < ROOM_W; tx++) {
          const x = OX + tx * T;
          const y = OY + ty * T;
          p(x, y, T, T, (tx + ty) % 2 ? f.b : f.a);
          if (f.grout !== false) {
            p(x, y + T - 1, T, 1, shade(f.b, -0.1));
            p(x + T - 1, y, 1, T, shade(f.b, -0.1));
          }
        }
      }
    } else if (f.kind === 'basket') {
      const r = rng(13);
      for (let ty = 0; ty < ROOM_H; ty++) {
        for (let tx = 0; tx < ROOM_W; tx++) {
          const x = OX + tx * T;
          const y = OY + ty * T;
          const horiz = (tx + ty) % 2 === 0;
          for (let k = 0; k < 4; k++) {
            const tone = shade(f.base, (r() - 0.5) * 0.14);
            if (horiz) {
              p(x, y + k * 4, T, 4, tone);
              p(x, y + k * 4 + 3, T, 1, shade(f.base, -0.2));
            } else {
              p(x + k * 4, y, 4, T, tone);
              p(x + k * 4 + 3, y, 1, T, shade(f.base, -0.2));
            }
          }
        }
      }
    } else if (f.kind === 'herring') {
      // balıksırtı parke: çapraz kısa tahtalar
      p(OX, OY, W, H, shade(f.base, -0.25));
      const r = rng(61);
      for (let ty = 0; ty < H; ty += 4) {
        for (let tx = 0; tx < W; tx += 8) {
          const flip = ((tx / 8) + (ty / 4)) % 2;
          const tone = shade(f.base, (r() - 0.5) * 0.16);
          for (let k = 0; k < 8; k++) {
            const yy = ty + (flip ? 3 - Math.floor(k / 2) : Math.floor(k / 2));
            if (yy < H) p(OX + tx + k, OY + yy, 1, 1, tone);
          }
          p(OX + tx, OY + ty + 3, 8, 1, shade(tone, -0.12));
        }
      }
    } else if (f.kind === 'stone') {
      p(OX, OY, W, H, shade(f.base, -0.28));
      const r = rng(29);
      for (let row = 0; row < H / 8; row++) {
        const y = OY + row * 8;
        let x = -Math.floor(r() * 12);
        while (x < W) {
          const len = 10 + Math.floor(r() * 12);
          const x0 = Math.max(0, x + 1);
          const x1 = Math.min(W, x + len);
          const tone = shade(f.base, (r() - 0.5) * 0.16);
          if (x1 > x0) {
            p(OX + x0, y + 1, x1 - x0, 6, tone);
            p(OX + x0, y + 1, x1 - x0, 1, shade(tone, 0.14));
          }
          x += len;
        }
      }
    } else if (f.kind === 'grass') {
      p(OX, OY, W, H, f.base);
      const r = rng(55);
      for (let i = 0; i < 1100; i++) {
        p(OX + Math.floor(r() * W), OY + Math.floor(r() * H), 1, 2, shade(f.base, r() < 0.5 ? 0.12 : -0.12));
      }
      for (let i = 0; i < 26; i++) {
        p(OX + Math.floor(r() * W), OY + Math.floor(r() * H), 1, 1, r() < 0.5 ? '#f7f1de' : '#f2d36b');
      }
    } else {
      p(OX, OY, W, H, f.base);
      const r = rng(99);
      for (let i = 0; i < 900; i++) {
        p(OX + Math.floor(r() * W), OY + Math.floor(r() * H), 1, 1, shade(f.base, r() < 0.5 ? 0.07 : -0.07));
      }
    }
  }

  function inset(p, x, y, w, h, dark, light) {
    p(x, y, w, 1, dark);
    p(x, y, 1, h, dark);
    p(x, y + h - 1, w, 1, light);
    p(x + w - 1, y, 1, h, light);
  }

  function drawBackWall(p, g, style) {
    const W = ROOM_W * T;
    const wall = WALLS[style.wall];
    const pat = style.pattern;

    if (pat === 5) {
      // Teras: gökyüzü, uzakta çalılar ve çit (çit rengi = duvar rengi)
      // gökyüzü her karede gerçek saate göre arkadan çizilir (skyHoles)
      const r = rng(77);
      for (let x = 0; x < W; x += 6) {
        const h = 8 + Math.floor(r() * 7);
        p(OX + x, WH - 14 - h, 7, h + 2, x % 12 ? '#6f9a63' : '#628d58');
        p(OX + x + 2, WH - 13 - h, 3, 1, '#86b178');
      }
      p(OX, WH - 16, W, 4, '#5a8450');
      const fc = wall;
      const fd = shade(wall, -0.2);
      p(OX, WH - 13, W, 2, fd);
      p(OX, WH - 6, W, 2, fd);
      for (let x = 1; x < W; x += 6) {
        p(OX + x, WH - 18, 4, 17, fc);
        p(OX + x + 1, WH - 19, 2, 1, fc);
        p(OX + x + 3, WH - 18, 1, 17, shade(fc, -0.12));
      }
      p(OX, WH - 2, W, 2, '#6c9a5a');
      return;
    }

    p(OX, 0, W, WH, wall);
    if (pat === 1) {
      for (let x = OX + 3; x < OX + W; x += 8) p(x, 2, 2, WH - 16, shade(wall, 0.12));
    } else if (pat === 2) {
      let row = 0;
      for (let y = 6; y < WH - 16; y += 7, row++) {
        for (let x = OX + 3 + (row % 2) * 4; x < OX + W; x += 8) p(x, y, 1, 1, shade(wall, -0.14));
      }
    } else if (pat === 3) {
      p(OX, 2, W, WH - 16, shade(wall, 0.24));
      const r = rng(41);
      let row = 0;
      for (let y = 2; y < WH - 14; y += 6, row++) {
        for (let x = -(row % 2) * 6; x < W; x += 12) {
          const x0 = Math.max(0, x);
          const x1 = Math.min(W, x + 11);
          const h = Math.min(5, WH - 14 - y);
          if (x1 > x0 && h > 0) p(OX + x0, y, x1 - x0, h, shade(wall, (r() - 0.5) * 0.16));
        }
      }
    } else if (pat === 6) {
      // metro fayans: alt üçte iki
      const tile = shade(wall, 0.55);
      const grout = shade(wall, 0.2);
      p(OX, 14, W, WH - 14, grout);
      let row = 0;
      for (let y = 15; y < WH - 3; y += 5, row++) {
        for (let x = -(row % 2) * 5; x < W; x += 10) {
          const x0 = Math.max(0, x);
          const x1 = Math.min(W, x + 9);
          if (x1 > x0) {
            p(OX + x0, y, x1 - x0, 4, tile);
            p(OX + x0, y, x1 - x0, 1, shade(tile, 0.3));
          }
        }
      }
      p(OX, 13, W, 2, shade(wall, -0.15));
    } else if (pat === 7) {
      // çiçekli duvar kağıdı
      let row = 0;
      for (let y = 5; y < WH - 16; y += 8, row++) {
        for (let x = OX + 4 + (row % 2) * 8; x < OX + W - 2; x += 16) {
          const pet = shade(wall, -0.22);
          p(x, y - 1, 1, 1, pet);
          p(x - 1, y, 1, 1, pet);
          p(x + 1, y, 1, 1, pet);
          p(x, y + 1, 1, 1, pet);
          p(x, y, 1, 1, '#f2d36b');
          p(x + 2, y + 2, 1, 1, shade(wall, -0.12));
        }
      }
    } else if (pat === 4) {
      const dark = shade(wall, -0.18);
      const light = shade(wall, 0.14);
      p(OX, 21, W, 2, dark);
      p(OX, 21, W, 1, light);
      for (let x = 0; x < W; x += 24) {
        p(OX + x, 2, 1, WH - 5, dark);
        inset(p, OX + x + 3, 5, 18, 13, dark, light);
        inset(p, OX + x + 3, 26, 18, WH - 32, dark, light);
      }
    }
    p(OX, 0, W, 2, shade(wall, -0.2));
    if (pat !== 4 && pat !== 6) {
      p(OX, WH - 13, W, 10, shade(wall, -0.08));
      p(OX, WH - 14, W, 1, shade(wall, 0.2));
      for (let x = OX + 15; x < OX + W; x += 16) p(x, WH - 12, 1, 8, shade(wall, -0.16));
    }
    p(OX, WH - 3, W, 3, '#ede6d8');
    p(OX, WH - 1, W, 1, '#cfc6b6');
  }

  let g_clear = () => {};
  function drawDoor(p, x, y, venue) {
    if (venue !== 'terrace') p(x - 1, y - 1, 18, 33, OUTLINE);
    if (venue === 'cafe') {
      p(x, y, 16, 32, '#3d3a3f');
      p(x + 2, y + 2, 12, 30, '#bcdbe6');
      p(x + 3, y + 3, 1, 10, '#e8f4f8');
      p(x + 5, y + 3, 1, 5, '#e8f4f8');
      p(x + 3, y + 9, 10, 5, '#f2efe9');
      p(x + 4, y + 10, 8, 1, '#d9665b');
      p(x + 4, y + 12, 5, 1, '#3d3a3f');
      p(x + 11, y + 17, 1, 7, '#c9a24b');
      p(x + 2, y + 27, 12, 1, '#3d3a3f');
    } else if (venue === 'library') {
      const wood = '#6e4a32';
      p(x, y, 16, 32, '#4a3022');
      p(x + 2, y + 4, 12, 28, wood);
      p(x + 3, y + 2, 10, 2, wood);
      p(x + 5, y + 1, 6, 1, wood);
      p(x + 7, y + 3, 2, 29, '#4a3022');
      p(x + 3, y + 7, 3, 10, shade(wood, -0.15));
      p(x + 10, y + 7, 3, 10, shade(wood, -0.15));
      p(x + 3, y + 20, 3, 9, shade(wood, -0.15));
      p(x + 10, y + 20, 3, 9, shade(wood, -0.15));
      p(x + 6, y + 17, 1, 2, '#e8c46a');
      p(x + 9, y + 17, 1, 2, '#e8c46a');
    } else if (venue === 'studio') {
      // cam kapı
      p(x, y, 16, 32, '#3a3238');
      g_clear(x + 2, y + 2, 12, 13);
      p(x + 2, y + 2, 12, 13, '#bcdbe6');
      p(x + 3, y + 3, 1, 8, '#e8f4f8');
      p(x + 2, y + 17, 12, 13, '#bcdbe6');
      p(x + 3, y + 18, 1, 6, '#e8f4f8');
      p(x + 12, y + 15, 2, 4, '#c9a24b');
    } else if (venue === 'attic') {
      // tahta kapı, demir menteşeler
      const wood = '#8a6040';
      p(x, y, 16, 32, '#5a3d2b');
      p(x + 2, y + 2, 12, 30, wood);
      for (const k of [5, 8, 11]) p(x + k, y + 2, 1, 30, shade(wood, -0.2));
      p(x + 2, y + 8, 12, 2, '#3d3a3f');
      p(x + 2, y + 23, 12, 2, '#3d3a3f');
      p(x + 11, y + 16, 2, 2, '#c9a24b');
    } else if (venue === 'kitchen') {
      // boyalı kapı, dört camlı
      const paint = '#7fa3c4';
      p(x, y, 16, 32, shade(paint, -0.3));
      p(x + 2, y + 2, 12, 30, paint);
      p(x + 4, y + 4, 8, 10, '#d8ecf5');
      p(x + 7, y + 4, 2, 10, paint);
      p(x + 4, y + 8, 8, 1, paint);
      p(x + 5, y + 5, 1, 2, '#ffffff');
      p(x + 4, y + 18, 8, 9, shade(paint, -0.1));
      p(x + 4, y + 18, 8, 1, shade(paint, -0.25));
      p(x + 11, y + 15, 2, 2, '#e3e6ea');
    } else if (venue === 'terrace') {
      p(x - 1, y + 2, 18, 4, '#5a8450');
      p(x + 1, y, 14, 3, '#6f9a63');
      p(x + 2, y + 1, 1, 1, '#e59aa6');
      p(x + 7, y, 1, 1, '#f2efe9');
      p(x + 12, y + 2, 1, 1, '#e59aa6');
      p(x, y + 5, 2, 27, '#8a5a3c');
      p(x + 14, y + 5, 2, 27, '#8a5a3c');
      for (let i = 0; i < 4; i++) {
        p(x + 3 + i * 3, y + 15, 2, 16, '#ece6da');
        p(x + 3 + i * 3, y + 14, 1, 1, '#ece6da');
      }
      p(x + 2, y + 19, 12, 1, '#d6cfc3');
      p(x + 2, y + 26, 12, 1, '#d6cfc3');
    } else {
      const wood = '#b07b52';
      p(x, y, 16, 32, '#8a5a3c');
      p(x + 2, y + 2, 12, 30, wood);
      p(x + 4, y + 5, 8, 9, shade(wood, -0.12));
      p(x + 4, y + 5, 8, 1, shade(wood, -0.25));
      p(x + 4, y + 17, 8, 11, shade(wood, -0.12));
      p(x + 4, y + 17, 8, 1, shade(wood, -0.25));
      p(x + 11, y + 18, 2, 2, '#e8c46a');
      p(x, y, 16, 1, '#a56f4a');
    }
  }

  // ---------- Mekan mimarisi ----------
  // plinth: kaide rengi, cap: duvar kesit rengi, crown: tavan pervazı, slope: çatı katı eğimi, glass: cam duvar
  const ARCH = {
    room: { plinth: '#8a5a3c', cap: '#f4ede0', crown: '#f4ede0' },
    cafe: { plinth: '#4a3022', cap: '#efe6d6', crown: '#3d2a20', beam: true },
    library: { plinth: '#3f2a1e', cap: '#e8dcc4', crown: '#4a3022', gold: true },
    terrace: { plinth: '#a39a8e', cap: '#e8e2d6', stone: true },
    attic: { plinth: '#6e4a32', cap: '#efe4d0', slope: true },
    studio: { plinth: '#a07850', cap: '#f4efe6', glass: true },
    kitchen: { plinth: '#7a5236', cap: '#f4ede0', crown: '#f4ede0' },
  };
  const archOf = (venue) => ARCH[venue] || ARCH.room;

  // Çatı katı eğimleri: sol geniş (çatı penceresi içinde), sağ dar
  const SLOPE_L = { w: 66, h: 40, band: 12 };
  const SLOPE_R = { w: 28, h: 18, band: 7 };
  const slopeLeftY = (x) => MT + SLOPE_L.h * (1 - (x - MX) / SLOPE_L.w);
  const slopeRightY = (x) => MT + SLOPE_R.h * ((x - (LW - MX - SLOPE_R.w)) / SLOPE_R.w);

  // Stüdyo cam duvarı: arka duvarın sağ yarısı ve sağ yan duvar (köşe cam)
  const GLASS_X0 = OX + 6 * T;
  const GLASS_TOP = MT + 4;
  const GLASS_BOT = OY - 14;

  // Dioramanın dış hatları (gece karartması, hava durumu ve ışıklar bu alanla sınırlanır)
  function dioramaPath(ctx, venue) {
    const bottom = OY + ROOM_H * T + BASE;
    ctx.beginPath();
    if (archOf(venue).slope) {
      ctx.moveTo(MX, slopeLeftY(MX));
      ctx.lineTo(MX + SLOPE_L.w, MT);
      ctx.lineTo(LW - MX - SLOPE_R.w, MT);
      ctx.lineTo(LW - MX, slopeRightY(LW - MX));
    } else {
      ctx.moveTo(MX, MT);
      ctx.lineTo(LW - MX, MT);
    }
    ctx.lineTo(LW - MX, bottom);
    ctx.lineTo(MX, bottom);
    ctx.closePath();
  }

  // Arkadan gerçek zamanlı gökyüzü görünen alanlar: [[x, y], ...] çokgenleri
  function skyHoles(style, venue) {
    const holes = [];
    const rect = (x, y, w, h) => holes.push([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
    if (style.pattern === 5) rect(OX, MT, ROOM_W * T, WH - 10);
    const a = archOf(venue);
    if (a.slope) {
      // eğimli tavandaki çatı penceresi
      const x0 = MX + 20;
      const x1 = MX + 46;
      holes.push([[x0, slopeLeftY(x0) + 2], [x1, slopeLeftY(x1) + 2], [x1, slopeLeftY(x1) + SLOPE_L.band - 2], [x0, slopeLeftY(x0) + SLOPE_L.band - 2]]);
    }
    if (a.glass && style.pattern !== 5) {
      rect(GLASS_X0, GLASS_TOP, OX + ROOM_W * T - GLASS_X0, GLASS_BOT - GLASS_TOP);
      rect(LW - OX, GLASS_TOP, SW - 2, OY + ROOM_H * T - 20 - GLASS_TOP);
      holes[holes.length - 1].plain = true;
    }
    return holes;
  }

  function drawDiorama(p, g, style, venue) {
    const a = archOf(venue);
    const W = ROOM_W * T;
    const H = ROOM_H * T;
    const wall = WALLS[style.wall];
    const fence = style.pattern === 5;
    const bottom = OY + H;

    // yumuşak gölge
    for (let i = 0; i < 7; i++) {
      g.fillStyle = `rgba(10, 6, 12, ${0.07 + i * 0.015})`;
      g.fillRect(MX + 6 - i, bottom + BASE - 1 + (7 - i), LW - 2 * MX - 12 + i * 2, 1);
    }
    g.fillStyle = 'rgba(10, 6, 12, 0.22)';
    g.fillRect(MX - 1, bottom + BASE, LW - 2 * MX + 2, 2);

    // yan duvarlar (iç yüz + kesit)
    if (fence) {
      const r = rng(17);
      for (const sx of [MX, LW - OX]) {
        p(sx, MT, SW, bottom - MT, '#5a8450');
        for (let i = 0; i < 70; i++) p(sx + Math.floor(r() * (SW - 1)), MT + Math.floor(r() * (bottom - MT - 1)), 2, 2, r() < 0.5 ? '#6f9a63' : '#4c7344');
      }
    } else {
      const inner = shade(wall, -0.24);
      for (const [sx, cut] of [[MX, MX], [LW - OX, LW - MX - 2]]) {
        p(sx, MT, SW, bottom - MT, inner);
        p(cut, MT, 2, bottom - MT, a.cap);
      }
      p(OX - 1, MT, 1, bottom - MT, shade(wall, -0.36));
      p(LW - OX, MT, 1, bottom - MT, shade(wall, -0.36));
    }

    // arka duvar
    g.save();
    g.translate(0, MT);
    drawBackWall(p, g, style);
    g.restore();
    drawFloor(p, style.floor);
    g.fillStyle = 'rgba(40, 28, 30, 0.18)';
    g.fillRect(OX, OY, W, 2);
    g.fillRect(OX, OY, 2, H);
    g.fillRect(LW - OX - 2, OY, 2, H);

    // tavan pervazı / kiriş
    if (!fence && a.crown) {
      p(OX, MT, W, 3, a.crown);
      p(OX, MT + 3, W, 1, shade(a.crown, -0.18));
      if (a.gold) p(OX, MT + 2, W, 1, '#c9a24b');
      if (a.beam) for (let x = OX + 4; x < OX + W; x += 12) p(x, MT + 3, 3, 2, shade(a.crown, 0.12));
    }
    // duvarların üst kesiti
    if (!fence) {
      p(MX, MT, LW - 2 * MX, 2, a.cap);
      p(MX, MT + 2, LW - 2 * MX, 1, shade(a.cap, -0.18));
    }

    // stüdyo: cam duvar ve köşe cam
    if (a.glass && !fence) {
      const fr = '#3a3238';
      const x1 = OX + W;
      g.clearRect(GLASS_X0, GLASS_TOP, x1 - GLASS_X0, GLASS_BOT - GLASS_TOP);
      p(GLASS_X0 - 2, GLASS_TOP - 2, x1 - GLASS_X0 + 2, 2, fr);
      p(GLASS_X0 - 2, GLASS_BOT, x1 - GLASS_X0 + 2, 3, fr);
      p(GLASS_X0 - 2, GLASS_TOP, 2, GLASS_BOT - GLASS_TOP, fr);
      for (let x = GLASS_X0 + 15; x < x1; x += 16) p(x, GLASS_TOP, 2, GLASS_BOT - GLASS_TOP, fr);
      p(GLASS_X0, GLASS_TOP + 11, x1 - GLASS_X0, 1, fr);
      const sideBot = bottom - 20;
      g.clearRect(LW - OX, GLASS_TOP, SW - 2, sideBot - GLASS_TOP);
      p(LW - OX, GLASS_TOP - 2, SW, 2, fr);
      p(LW - OX, sideBot, SW, 2, fr);
      for (let y = GLASS_TOP + 18; y < sideBot; y += 20) p(LW - OX, y, SW - 2, 1, fr);
      p(LW - OX - 1, GLASS_TOP, 1, sideBot - GLASS_TOP, fr);
      p(GLASS_X0, GLASS_BOT + 3, x1 - GLASS_X0, 1, shade(wall, 0.3));
    }

    // çatı katı: eğik tavan, kirişler ve çatı penceresi
    if (a.slope) {
      const wood = '#8a6040';
      for (let x = MX; x < MX + SLOPE_L.w; x++) {
        const y = Math.round(slopeLeftY(x));
        g.clearRect(x, 0, 1, y);
        p(x, y, 1, SLOPE_L.band, (x - MX) % 11 < 2 ? shade(wood, -0.25) : shade(wood, ((x - MX) % 11) / 60));
        p(x, y, 1, 1, a.cap);
        p(x, y + SLOPE_L.band, 1, 1, shade(wood, -0.4));
      }
      for (let x = LW - MX - SLOPE_R.w; x < LW - MX; x++) {
        const y = Math.round(slopeRightY(x));
        g.clearRect(x, 0, 1, y);
        p(x, y, 1, SLOPE_R.band, (x - LW) % 9 === 0 ? shade(wood, -0.25) : wood);
        p(x, y, 1, 1, a.cap);
        p(x, y + SLOPE_R.band, 1, 1, shade(wood, -0.4));
      }
      // çatı penceresi çerçevesi (cam kısmı arkadan gökyüzü)
      const x0 = MX + 20;
      const x1 = MX + 46;
      for (let x = x0; x < x1; x++) {
        const y = Math.round(slopeLeftY(x));
        g.clearRect(x, y + 2, 1, SLOPE_L.band - 4);
        if (x === x0 || x === x1 - 1 || x === Math.round((x0 + x1) / 2)) p(x, y + 1, 1, SLOPE_L.band - 2, '#3a3238');
        p(x, y + 1, 1, 1, '#3a3238');
        p(x, y + SLOPE_L.band - 2, 1, 1, '#3a3238');
      }
      // çapraz kiriş
      p(MX, MT + 40, SW, 3, shade(wood, -0.1));
    }

    // kaide: zemin kesiti + malzeme
    const fs = FLOOR_SWATCH[style.floor];
    p(MX, bottom, LW - 2 * MX, 2, shade(fs, -0.05));
    p(MX, bottom, LW - 2 * MX, 1, shade(fs, 0.18));
    const pl = a.plinth;
    p(MX, bottom + 2, LW - 2 * MX, BASE - 2, pl);
    if (a.stone) {
      const r = rng(5);
      for (let x = MX; x < LW - MX; x += 9 + Math.floor(r() * 6)) {
        p(x, bottom + 2, 1, 4, shade(pl, -0.2));
        if (x + 4 < LW - MX - 1) p(x + 4, bottom + 6, 1, BASE - 6, shade(pl, -0.2));
      }
      p(MX, bottom + 5, LW - 2 * MX, 1, shade(pl, -0.15));
      for (let x = MX + 3; x < LW - MX - 3; x += 7 + Math.floor(r() * 9)) p(x, bottom - 1, 2, 2, r() < 0.5 ? '#6f9a63' : '#86b178');
    } else {
      p(MX, bottom + 2, LW - 2 * MX, 1, shade(pl, 0.2));
      p(MX, bottom + 6, LW - 2 * MX, 1, shade(pl, -0.12));
      const r = rng(9);
      for (let x = MX + 10; x < LW - MX; x += 18 + Math.floor(r() * 16)) p(x, bottom + 3 + (x % 2) * 4, 1, 3, shade(pl, -0.15));
    }
    p(MX, bottom + BASE - 1, LW - 2 * MX, 1, shade(pl, -0.35));
    p(MX, bottom, 1, BASE, shade(pl, -0.2));
    p(LW - MX - 1, bottom, 1, BASE, shade(pl, -0.3));
  }

  function background(style, venue) {
    const key = `${venue}-${style.wall}-${style.pattern}-${style.floor}`;
    let c = bgCache.get(key);
    if (c) return c;
    c = makeCanvas(LW, LH);
    const g = c.getContext('2d');
    const p = painter(g);
    drawDiorama(p, g, style, venue);
    g_clear = (x, y, w, h) => g.clearRect(x, y, w, h);
    drawDoor(p, OX + DOOR_X * T, OY - 32, venue);

    if (bgCache.size > 24) bgCache.clear();
    bgCache.set(key, c);
    return c;
  }

  // ---------- Karakter ----------
  const SKIN = ['#f6d5b8', '#e9b892', '#c98f66', '#94603f', '#5e3b28', '#fde7d6', '#d9a27c', '#3d2a20'];
  const HAIR = ['#2e2421', '#5b3a26', '#a8693a', '#e2b866', '#c4553f', '#8c97a8', '#7c5aa6', '#f3eee6', '#e889a8', '#5b8fd8', '#5fa37a', '#e07b39', '#d9dde3', '#3fa3a0', '#b9a3e0', '#a3223a'];
  const SHIRT = ['#d9665b', '#5f9a78', '#5b7fa8', '#e3b766', '#9b7bb5', '#f2efe9', '#3d424b', '#e59aa6', '#3f7f7a', '#6b8f3a', '#2f3550', '#c9826b', '#a6c94f', '#f08a6c', '#8fc4e8', '#1f1d22'];
  const PANTS = ['#3d424b', '#4c5d80', '#7a5a42', '#d8d1c4', '#6b6f78', '#b7614f', '#2f4a6b', '#556b2f', '#1f1d22', '#c2a878'];
  const EYES = ['#2b2230', '#6b4226', '#3f6fa8', '#4f8a5a', '#8a6a3a', '#7d8591', '#7c5aa6', '#c98a2c'];
  const SKIN_NAMES = ['Light', 'Wheat', 'Tan', 'Brown', 'Deep', 'Pale', 'Honey', 'Espresso'];
  const HAIR_NAMES = ['Black', 'Brown', 'Chestnut', 'Blonde', 'Auburn', 'Gray', 'Purple', 'Platinum', 'Pink', 'Blue', 'Green', 'Ginger', 'Silver', 'Teal', 'Lavender', 'Cherry'];
  const SHIRT_NAMES = ['Red', 'Green', 'Blue', 'Mustard', 'Purple', 'White', 'Anthracite', 'Pink', 'Teal', 'Olive', 'Navy', 'Terracotta', 'Lime', 'Coral', 'Sky', 'Black'];
  const PANTS_NAMES = ['Anthracite', 'Navy', 'Brown', 'Beige', 'Gray', 'Rust', 'Denim', 'Olive', 'Black', 'Khaki'];
  const EYE_NAMES = ['Dark', 'Brown', 'Blue', 'Green', 'Hazel', 'Gray', 'Violet', 'Amber'];
  const FACE_NAMES = ['None', 'Freckles', 'Mustache', 'Beard', 'Rosy cheeks', 'Goatee', 'Stubble', 'Beauty mark', 'Bandage', 'Star sticker'];
  const BODY_NAMES = ['Boy', 'Girl'];
  const STYLE_NAMES = ['Short', 'Long', 'Bun', 'Ponytail', 'Curly', 'Pigtails', 'Bob', 'Afro', 'Spiky', 'Side part', 'Braid', 'Space buns', 'Wavy', 'Buzz cut', 'Mohawk', 'Pixie', 'Locs', 'Twin braids', 'Messy bun', 'Hime cut', 'Undercut', 'Curtain bangs'];
  const TOP_NAMES = ['T-shirt', 'Hoodie', 'Sweater', 'Shirt', 'Dress', 'Jacket', 'Overalls', 'Tank top', 'Kimono', 'Striped tee', 'Graphic tee', 'Cardigan', 'Varsity jacket'];
  const BOTTOM_NAMES = ['Pants', 'Shorts', 'Skirt', 'Long skirt', 'Jeans', 'Track pants'];
  const ACC_NAMES = ['None', 'Glasses', 'Beanie', 'Headphones', 'Cap', 'Bow', 'Scarf', 'Cat ears', 'Headband', 'Flower', 'Sunglasses', 'Bandana', 'Crown', 'Earrings', 'Witch hat', 'Party hat'];
  const ACC2_NAMES = ['None', 'Backpack', 'Necklace', 'Bow tie', 'Tie', 'Scarf'];
  const SHOES = ['#3a2f2a', '#f2efe9', '#d9665b', '#7a5236', '#e3b766', '#5b7fa8'];
  const SHOE_NAMES = ['Dark', 'White sneakers', 'Red', 'Brown boots', 'Yellow boots', 'Blue'];
  const EYE = '#2b2230';
  const BLUSH = '#f0a3a0';
  const GOLD = '#f2c14e';
  const BAG = '#c4553f';
  const WITCH = '#3b2f4a';
  const BANDANA = '#d9665b';
  const RIBBON = '#e05d6f';
  const GEAR = '#3d424b';
  const LENS = '#d8ecf5';
  const CW = 14;
  const CH = 23;

  const charCache = new Map();

  // pose: stand | sit | work (arkadan, masada) | study (önden, masa arkasında) | lie | lap (oturduğu yerde laptopla)
  function buildChar(look, dir, pose, frame, blink) {
    const cv = makeCanvas(CW, CH);
    const p = painter(cv.getContext('2d'));
    const skin = SKIN[look.skin];
    const hair = HAIR[look.hair];
    const hairL = shade(hair, 0.2);
    const top = SHIRT[look.shirt];
    const topD = shade(top, -0.16);
    const topL = shade(top, 0.24);
    const bot = PANTS[look.pants];
    const botD = shade(bot, -0.18);
    const girl = look.body === 1;
    const hs = look.style;
    const ts = look.top;
    const dress = ts === 4;
    const overalls = ts === 6;
    const bs = dress ? 'dress' : overalls ? 'pants' : ['pants', 'shorts', 'skirt', 'long', 'jeans', 'track'][look.bottom] || 'pants';
    const pantsLike = bs === 'pants' || bs === 'jeans' || bs === 'track';
    const shoe = SHOES[look.shoes] || SHOES[0];
    const boots = look.shoes === 3 || look.shoes === 4;
    const acc2 = look.acc2 | 0;
    const shortSleeve = ts === 0 || ts === 6 || ts === 9 || ts === 10;
    const buzzCut = hs === 13 || hs === 14 || hs === 20;
    const stripe = look.shirt === 5 ? '#5b7fa8' : '#f2efe9';
    const tieCol = look.shirt === 10 ? '#d9665b' : '#2f3550';
    const bowCol = look.shirt === 0 ? '#2f3550' : '#d9665b';
    const eyeCol = EYES[look.eyes] || EYE;
    const face = look.face;
    const buzz = mix(hair, skin, 0.45);
    const scarfCol = bot === top ? shade(bot, -0.3) : bot;
    const acc = look.acc;
    const closed = blink || pose === 'lie';
    const side = dir === 'left' || dir === 'right';
    const seated = pose === 'sit' || pose === 'work' || pose === 'study' || pose === 'lap';
    const skirtLike = bs === 'skirt' || bs === 'dress' || bs === 'long';
    const hipColor = bs === 'dress' ? top : bot;
    const hatColor = shade(top, -0.05);

    // Kol: tişörtte dirsekten aşağısı çıplak
    const sleeve = (x, y, h) => {
      if (ts === 7) p(x, y, 1, h, skin);
      else if (shortSleeve) {
        p(x, y, 1, Math.min(2, h), topD);
        if (h > 2) p(x, y + 2, 1, h - 2, skin);
      } else {
        p(x, y, 1, h, ts === 12 ? '#f2efe9' : topD);
        if (ts === 2 && h > 1) p(x, y + 1, 1, 1, topL);
      }
    };

    // ----- bacaklar -----
    const legsStandFront = () => {
      const up = [frame === 1, frame === 3];
      if (bs === 'long') {
        p(3, 19, 8, 3, hipColor);
        p(3, 21, 8, 1, shade(hipColor, -0.12));
      } else if (skirtLike) {
        p(3, 19, 8, 2, hipColor);
        p(3, 20, 8, 1, shade(hipColor, -0.12));
      } else p(4, 19, 6, 1, hipColor);
      [4, 8].forEach((x, i) => {
        if (pantsLike) {
          p(x, 20, 2, up[i] ? 1 : 2, bot);
          if (bs === 'jeans' && !up[i]) p(x, 21, 2, 1, shade(bot, 0.22));
          if (bs === 'track') p(i ? x + 1 : x, 19, 1, up[i] ? 2 : 3, '#f2efe9');
        } else if (bs === 'shorts') {
          p(x, 20, 2, 1, bot);
          if (!up[i]) p(x, 21, 2, 1, skin);
        } else if (bs !== 'long' && !up[i]) p(x, 21, 2, 1, skin);
        p(x, up[i] ? 21 : 22, 2, 1, shoe);
        if (boots && !up[i] && bs !== 'long') p(x, 21, 2, 1, shade(shoe, -0.1));
      });
    };

    const legsSitFront = () => {
      p(3, 19, 8, 2, hipColor);
      p(3, 19, 8, 1, shade(hipColor, 0.14));
      if (bs === 'shorts') p(3, 20, 8, 1, skin);
      else if (bs === 'track') {
        p(3, 19, 1, 2, '#f2efe9');
        p(10, 19, 1, 2, '#f2efe9');
      }
      p(4, 21, 2, 1, shoe);
      p(8, 21, 2, 1, shoe);
    };

    const legsStandSide = () => {
      const stride = frame === 1 || frame === 3;
      if (bs === 'long') {
        p(3, 19, 8, 3, hipColor);
        p(3, 21, 8, 1, shade(hipColor, -0.12));
      } else if (skirtLike) {
        p(3, 19, 8, 2, hipColor);
        p(3, 20, 8, 1, shade(hipColor, -0.12));
      } else p(4, 19, 6, 1, hipColor);
      const legs = stride ? [[3, bot], [8, botD]] : [[5, bot], [7, botD]];
      for (const [x, col] of legs) {
        if (pantsLike) {
          p(x, 20, 2, 2, col);
          if (bs === 'jeans') p(x, 21, 2, 1, shade(col, 0.22));
          if (bs === 'track') p(x, 20, 1, 2, '#f2efe9');
        } else if (bs === 'shorts') {
          p(x, 20, 2, 1, col);
          p(x, 21, 2, 1, skin);
        } else if (bs !== 'long') p(x, 21, 2, 1, skin);
        if (boots && bs !== 'long') p(x, 21, 2, 1, shade(shoe, -0.1));
      }
      if (stride) {
        p(2, 22, 3, 1, shoe);
        p(8, 22, 3, 1, shoe);
      } else p(4, 22, 5, 1, shoe);
    };

    const legsSitSide = () => {
      p(1, 19, 8, 2, hipColor);
      p(1, 19, 8, 1, shade(hipColor, 0.14));
      p(1, 21, 2, 1, pantsLike ? bot : bs === 'long' ? hipColor : skin);
      p(0, 22, 3, 1, shoe);
    };

    // ----- gövde -----
    const torsoFront = () => {
      p(4, 13, 6, 1, top);
      p(3, 14, 8, 5, top);
      if (ts === 1) {
        p(4, 13, 6, 1, topD);
        p(5, 14, 1, 2, '#f2efe9');
        p(8, 14, 1, 2, '#f2efe9');
        p(5, 17, 4, 1, topD);
      } else if (ts === 2) {
        p(3, 15, 8, 1, topL);
        p(3, 17, 8, 1, topL);
      } else if (ts === 3) {
        p(5, 13, 1, 1, '#ffffff');
        p(8, 13, 1, 1, '#ffffff');
        p(6, 15, 1, 1, topD);
        p(6, 17, 1, 1, topD);
      } else if (ts === 4) {
        p(3, 17, 8, 1, topD);
      } else if (ts === 5) {
        p(6, 14, 2, 5, '#f2efe9');
        p(5, 13, 1, 2, topD);
        p(8, 13, 1, 2, topD);
        p(4, 17, 1, 1, topD);
      } else if (ts === 6) {
        p(4, 15, 6, 4, bot);
        p(4, 13, 1, 2, bot);
        p(9, 13, 1, 2, bot);
        p(4, 15, 1, 1, '#e3c48a');
        p(9, 15, 1, 1, '#e3c48a');
        p(6, 16, 2, 1, shade(bot, -0.2));
      } else if (ts === 7) {
        p(4, 13, 6, 1, skin);
        p(4, 13, 1, 1, top);
        p(9, 13, 1, 1, top);
      } else if (ts === 8) {
        p(6, 13, 2, 1, skin);
        p(5, 13, 1, 1, '#f2efe9');
        p(8, 13, 1, 1, '#f2efe9');
        p(6, 14, 1, 1, '#f2efe9');
        p(7, 15, 1, 1, '#f2efe9');
        p(3, 17, 8, 1, shade(top, -0.35));
      } else if (ts === 11) {
        p(6, 13, 2, 1, skin);
        p(6, 14, 2, 5, '#f2efe9');
        p(5, 15, 1, 1, topD);
        p(5, 17, 1, 1, topD);
        p(3, 18, 8, 1, topD);
      } else if (ts === 12) {
        p(5, 13, 4, 1, '#f2efe9');
        p(7, 14, 1, 5, topD);
        p(6, 15, 1, 1, '#f2efe9');
        p(6, 17, 1, 1, '#f2efe9');
        p(4, 15, 2, 2, '#f2efe9');
        p(3, 18, 8, 1, '#f2efe9');
      } else {
        p(6, 13, 2, 1, skin);
        if (ts === 9) {
          p(3, 15, 8, 1, stripe);
          p(3, 17, 8, 1, stripe);
        } else if (ts === 10) {
          const gc = look.shirt === 5 ? '#e05d6f' : '#f2efe9';
          p(5, 15, 1, 1, gc);
          p(8, 15, 1, 1, gc);
          p(4, 16, 1, 1, gc);
          p(9, 16, 1, 1, gc);
          p(5, 17, 4, 1, gc);
        }
      }
      neckFront();
    };

    // Boyun ve sırt aksesuarı (baş aksesuarıyla birlikte takılır)
    function neckFront() {
      if (acc2 === 1) {
        p(4, 13, 1, 5, shade(BAG, -0.15));
        p(9, 13, 1, 5, shade(BAG, -0.15));
      } else if (acc2 === 2) {
        p(5, 13, 1, 1, GOLD);
        p(8, 13, 1, 1, GOLD);
        p(6, 14, 2, 1, GOLD);
        p(6, 15, 2, 1, '#5fb0c8');
      } else if (acc2 === 3) {
        p(5, 13, 1, 2, bowCol);
        p(8, 13, 1, 2, bowCol);
        p(6, 13, 2, 1, shade(bowCol, -0.2));
      } else if (acc2 === 4) {
        p(6, 13, 2, 5, tieCol);
        p(6, 15, 2, 1, shade(tieCol, 0.3));
        p(6, 18, 1, 1, tieCol);
      } else if (acc2 === 5) {
        p(3, 13, 8, 2, scarfCol);
        p(8, 15, 2, 3, scarfCol);
        p(8, 17, 2, 1, shade(scarfCol, 0.2));
      }
    }

    function neckBack() {
      if (acc2 === 1) {
        p(4, 13, 6, 6, BAG);
        p(4, 13, 6, 2, shade(BAG, 0.15));
        p(5, 16, 4, 2, shade(BAG, -0.15));
        p(6, 15, 2, 1, '#e3c48a');
      } else if (acc2 === 2) p(5, 13, 4, 1, GOLD);
      else if (acc2 === 5) p(3, 13, 8, 2, scarfCol);
    }

    function neckSide() {
      if (acc2 === 1) {
        p(9, 14, 3, 5, BAG);
        p(9, 14, 3, 1, shade(BAG, 0.15));
        p(6, 13, 1, 4, shade(BAG, -0.15));
      } else if (acc2 === 2) {
        p(4, 13, 2, 1, GOLD);
        p(4, 14, 1, 1, '#5fb0c8');
      } else if (acc2 === 3) p(3, 13, 2, 2, bowCol);
      else if (acc2 === 4) p(4, 13, 1, 5, tieCol);
      else if (acc2 === 5) {
        p(4, 13, 6, 2, scarfCol);
        p(9, 14, 2, 3, scarfCol);
      }
    }

    const torsoBack = () => {
      p(4, 13, 6, 1, top);
      p(3, 14, 8, 5, top);
      if (ts === 1) p(4, 12, 6, 2, topD);
      else if (ts === 2) {
        p(3, 15, 8, 1, topL);
        p(3, 17, 8, 1, topL);
      } else if (ts === 4) p(3, 17, 8, 1, topD);
      else if (ts === 6) {
        p(4, 15, 6, 4, bot);
        p(4, 13, 1, 2, bot);
        p(9, 13, 1, 2, bot);
      } else if (ts === 7) p(5, 13, 4, 1, skin);
      else if (ts === 8) p(3, 17, 8, 1, shade(top, -0.35));
      else if (ts === 9) {
        p(3, 15, 8, 1, stripe);
        p(3, 17, 8, 1, stripe);
      } else if (ts === 11) p(3, 18, 8, 1, topD);
      else if (ts === 12) {
        p(4, 13, 6, 1, '#f2efe9');
        p(3, 18, 8, 1, '#f2efe9');
      }
      neckBack();
    };

    const torsoSide = () => {
      p(5, 13, 4, 1, top);
      p(4, 14, 6, 5, top);
      if (ts === 1) p(8, 12, 2, 2, topD);
      else if (ts === 2) {
        p(4, 15, 6, 1, topL);
        p(4, 17, 6, 1, topL);
      } else if (ts === 4) p(4, 17, 6, 1, topD);
      else if (ts === 5) p(4, 14, 1, 5, '#f2efe9');
      else if (ts === 6) {
        p(4, 15, 6, 4, bot);
        p(6, 13, 1, 2, bot);
      } else if (ts === 7) p(5, 13, 3, 1, skin);
      else if (ts === 8) {
        p(4, 17, 6, 1, shade(top, -0.35));
        p(4, 13, 1, 2, '#f2efe9');
      } else if (ts === 9) {
        p(4, 15, 6, 1, stripe);
        p(4, 17, 6, 1, stripe);
      } else if (ts === 11) p(4, 14, 1, 5, '#f2efe9');
      else if (ts === 12) p(4, 18, 6, 1, '#f2efe9');
      neckSide();
    };

    const laptopFront = () => {
      p(4, 14, 6, 4, '#8a929c');
      p(6, 15, 2, 1, '#c0c6cc');
      p(3, 18, 8, 1, '#b4bac1');
    };

    // ----- saç (arka katman, yüz, ön katman) -----
    const headFront = () => {
      if (hs === 7) {
        p(1, 1, 12, 9, hair);
        p(0, 3, 14, 6, hair);
        p(2, 0, 10, 1, hair);
        p(1, 10, 2, 2, hair);
        p(11, 10, 2, 2, hair);
      } else if (hs === 10) {
        p(10, 9, 2, 7, hair);
        p(10, 11, 2, 1, hairL);
        p(10, 14, 2, 1, hairL);
        p(10, 16, 2, 1, RIBBON);
      } else if (hs === 12) {
        p(1, 6, 2, 9, hair);
        p(11, 6, 2, 9, hair);
        p(0, 8, 1, 2, hair);
        p(13, 10, 1, 2, hair);
        p(0, 12, 1, 2, hair);
        p(13, 6, 1, 2, hair);
      } else if (hs === 6) {
        p(2, 6, 1, 6, hair);
        p(11, 6, 1, 6, hair);
      }
      if (hs === 1) {
        p(2, 6, 1, 8, hair);
        p(11, 6, 1, 8, hair);
      } else if (hs === 5) {
        p(0, 6, 2, 7, hair);
        p(12, 6, 2, 7, hair);
        p(1, 5, 1, 1, RIBBON);
        p(12, 5, 1, 1, RIBBON);
      } else if (hs === 3) {
        p(11, 8, 2, 4, hair);
      } else if (hs === 16) {
        for (const x of [1, 11]) {
          p(x, 6, 2, 10, hair);
          p(x, 9, 2, 1, hairL);
          p(x, 13, 2, 1, hairL);
        }
      } else if (hs === 17) {
        for (const x of [2, 10]) {
          p(x, 9, 2, 8, hair);
          p(x, 11, 2, 1, hairL);
          p(x, 14, 2, 1, hairL);
          p(x, 17, 2, 1, RIBBON);
        }
      } else if (hs === 19) {
        p(2, 6, 1, 9, hair);
        p(11, 6, 1, 9, hair);
      } else if (hs === 21) {
        p(2, 6, 1, 7, hair);
        p(11, 6, 1, 7, hair);
      }
      p(3, 6, 8, 6, skin);
      p(4, 12, 6, 1, skin);
      if (buzzCut) {
        p(3, 3, 8, 1, buzz);
        p(3, 4, 8, 2, buzz);
        p(2, 5, 1, 2, buzz);
        p(11, 5, 1, 2, buzz);
      } else {
        p(4, 2, 6, 1, hair);
        p(3, 3, 8, 1, hair);
        p(2, 4, 10, 2, hair);
        p(2, 6, 1, 3, hair);
        p(11, 6, 1, 3, hair);
      }
      if (buzzCut || hs === 7) {
        if (hs === 7) {
          p(3, 6, 1, 1, hair);
          p(10, 6, 1, 1, hair);
        }
      } else if (hs === 6) {
        p(3, 6, 8, 1, hair);
      } else if (hs === 8) {
        p(3, 1, 1, 1, hair);
        p(5, 0, 1, 2, hair);
        p(7, 0, 1, 2, hair);
        p(9, 0, 1, 2, hair);
        p(11, 1, 1, 2, hair);
        p(3, 6, 1, 2, hair);
        p(6, 6, 1, 1, hair);
        p(9, 6, 2, 1, hair);
      } else if (hs === 9) {
        p(3, 6, 5, 1, hair);
        p(3, 7, 2, 1, hair);
        p(10, 6, 1, 1, hair);
      } else if (hs === 4) {
        p(1, 4, 1, 5, hair);
        p(12, 4, 1, 5, hair);
        p(3, 1, 2, 1, hair);
        p(7, 1, 3, 1, hair);
        p(2, 2, 1, 2, hair);
        p(11, 2, 1, 2, hair);
        p(3, 6, 1, 1, hair);
        p(5, 6, 2, 1, hair);
        p(8, 6, 1, 1, hair);
        p(10, 6, 1, 1, hair);
      } else if (hs === 15) {
        p(5, 6, 6, 1, hair);
        p(8, 7, 3, 1, hair);
        p(3, 6, 1, 1, hair);
        p(10, 1, 2, 2, hair);
      } else if (hs === 19) {
        p(3, 6, 8, 1, hair);
        p(3, 10, 1, 3, hair);
        p(10, 10, 1, 3, hair);
      } else if (hs === 21) {
        p(3, 6, 3, 1, hair);
        p(8, 6, 3, 1, hair);
        p(3, 7, 1, 2, hair);
        p(10, 7, 1, 2, hair);
      } else {
        p(3, 6, 2, 1, hair);
        p(9, 6, 2, 1, hair);
        if (hs === 18) p(3, 7, 1, 2, hair);
      }
      if (!buzzCut) p(5, 3, 3, 1, hairL);
      if (hs === 14) {
        p(6, 0, 2, 5, hair);
        p(6, 0, 1, 2, hairL);
      } else if (hs === 20) {
        p(4, 2, 6, 1, hair);
        p(3, 3, 8, 2, hair);
        p(3, 5, 5, 1, hair);
        p(5, 3, 3, 1, hairL);
      } else if (hs === 18) {
        p(5, 0, 5, 2, hair);
        p(4, 1, 1, 1, hair);
        p(10, 0, 1, 1, hair);
        p(6, 0, 2, 1, hairL);
      }
      if (hs === 2) {
        p(5, 0, 4, 2, hair);
        p(6, 0, 2, 1, hairL);
      } else if (hs === 11) {
        p(1, 0, 3, 3, hair);
        p(10, 0, 3, 3, hair);
        p(2, 0, 1, 1, hairL);
        p(11, 0, 1, 1, hairL);
      }
      // yüz
      if (closed) {
        p(4, 9, 2, 1, EYE);
        p(8, 9, 2, 1, EYE);
      } else if (pose === 'study') {
        p(5, 9, 1, 1, EYE);
        p(8, 9, 1, 1, EYE);
      } else {
        p(5, 8, 1, 2, eyeCol);
        p(8, 8, 1, 2, eyeCol);
        if (girl && acc !== 1 && acc !== 10) {
          p(4, 7, 1, 1, EYE);
          p(9, 7, 1, 1, EYE);
        }
      }
      p(4, 10, 1, 1, BLUSH);
      p(9, 10, 1, 1, BLUSH);
      faceFront();
      // aksesuar
      if (acc === 1) {
        p(4, 8, 3, 2, LENS);
        p(7, 8, 3, 2, LENS);
        p(4, 7, 3, 1, GEAR);
        p(7, 7, 3, 1, GEAR);
        if (closed) {
          p(4, 9, 2, 1, EYE);
          p(8, 9, 2, 1, EYE);
        } else {
          p(5, 8, 1, 2, eyeCol);
          p(8, 8, 1, 2, eyeCol);
        }
      } else if (acc === 2) {
        p(3, 1, 8, 4, hatColor);
        p(2, 4, 10, 2, shade(hatColor, -0.18));
        p(6, 0, 2, 1, '#f2efe9');
      } else if (acc === 3) {
        p(3, 1, 8, 1, GEAR);
        p(2, 2, 1, 3, GEAR);
        p(11, 2, 1, 3, GEAR);
        p(1, 6, 2, 4, GEAR);
        p(11, 6, 2, 4, GEAR);
        p(1, 7, 1, 2, '#6b7586');
      } else if (acc === 6) {
        p(3, 13, 8, 2, scarfCol);
        p(8, 15, 2, 3, scarfCol);
        p(8, 17, 2, 1, shade(scarfCol, 0.2));
      } else if (acc === 10) {
        p(4, 8, 3, 2, '#1f1d22');
        p(7, 8, 3, 2, '#1f1d22');
        p(4, 8, 1, 1, '#6b7586');
        p(7, 8, 1, 1, '#6b7586');
        p(3, 8, 1, 1, GEAR);
        p(10, 8, 1, 1, GEAR);
      } else if (acc >= 7) {
        headTopAcc(0);
      } else if (acc === 4) {
        p(3, 1, 8, 4, hatColor);
        p(4, 1, 6, 1, shade(hatColor, 0.2));
        p(2, 5, 10, 1, shade(hatColor, -0.25));
        p(6, 0, 2, 1, hatColor);
      } else if (acc === 5) {
        p(9, 2, 3, 2, RIBBON);
        p(10, 2, 1, 2, '#b8434f');
      }
    };

    const headBack = () => {
      p(5, 12, 4, 1, skin);
      const hc = buzzCut ? buzz : hair;
      if (hs === 7) {
        p(1, 1, 12, 10, hair);
        p(0, 3, 14, 7, hair);
        p(2, 0, 10, 1, hair);
      }
      p(4, 2, 6, 1, hc);
      p(3, 3, 8, 1, hc);
      p(2, 4, 10, buzzCut ? 6 : 7, hc);
      if (!buzzCut) p(3, 11, 8, 1, hair);
      if (!buzzCut) p(4, 3, 4, 1, hairL);
      if (hs === 6) p(2, 11, 10, 2, hair);
      else if (hs === 8) {
        p(3, 1, 1, 1, hair);
        p(5, 0, 1, 2, hair);
        p(7, 0, 1, 2, hair);
        p(9, 0, 1, 2, hair);
        p(11, 1, 1, 2, hair);
      } else if (hs === 10) {
        p(6, 11, 2, 7, hair);
        p(6, 13, 2, 1, hairL);
        p(6, 16, 2, 1, hairL);
        p(6, 18, 2, 1, RIBBON);
      } else if (hs === 11) {
        p(1, 0, 3, 3, hair);
        p(10, 0, 3, 3, hair);
      } else if (hs === 12) {
        p(2, 11, 10, 5, hair);
        p(1, 12, 1, 3, hair);
        p(12, 12, 1, 3, hair);
        p(3, 16, 8, 1, hair);
      }
      if (hs === 1) {
        p(3, 12, 8, 4, hair);
        p(4, 16, 6, 1, hair);
      } else if (hs === 2) {
        p(5, 0, 4, 2, hair);
        p(6, 0, 2, 1, hairL);
      } else if (hs === 3) {
        p(6, 11, 2, 6, hair);
        p(6, 10, 2, 1, RIBBON);
      } else if (hs === 4) {
        p(1, 4, 1, 6, hair);
        p(12, 4, 1, 6, hair);
        p(3, 1, 2, 1, hair);
        p(7, 1, 3, 1, hair);
      } else if (hs === 5) {
        p(0, 6, 2, 7, hair);
        p(12, 6, 2, 7, hair);
        p(1, 5, 1, 1, RIBBON);
        p(12, 5, 1, 1, RIBBON);
      } else if (hs === 14) {
        p(6, 0, 2, 11, hair);
        p(6, 0, 1, 3, hairL);
      } else if (hs === 16) {
        p(2, 11, 10, 6, hair);
        for (const x of [3, 6, 9]) p(x, 11, 1, 6, hairL);
      } else if (hs === 17) {
        for (const x of [3, 9]) {
          p(x, 11, 2, 7, hair);
          p(x, 13, 2, 1, hairL);
          p(x, 16, 2, 1, hairL);
          p(x, 18, 2, 1, RIBBON);
        }
      } else if (hs === 18) {
        p(5, 0, 5, 2, hair);
        p(4, 1, 1, 1, hair);
        p(10, 0, 1, 1, hair);
        p(6, 0, 2, 1, hairL);
      } else if (hs === 19) {
        p(2, 11, 10, 6, hair);
        p(3, 17, 8, 1, hair);
      } else if (hs === 20) {
        p(4, 2, 6, 1, hair);
        p(3, 3, 8, 2, hair);
        p(4, 3, 4, 1, hairL);
      } else if (hs === 21) {
        p(2, 11, 10, 3, hair);
      }
      if (acc === 1 || acc === 10) {
        p(2, 8, 1, 1, GEAR);
        p(11, 8, 1, 1, GEAR);
      } else if (acc === 2) {
        p(3, 1, 8, 4, hatColor);
        p(2, 4, 10, 2, shade(hatColor, -0.18));
        p(6, 0, 2, 1, '#f2efe9');
      } else if (acc === 3) {
        p(3, 1, 8, 1, GEAR);
        p(2, 2, 1, 3, GEAR);
        p(11, 2, 1, 3, GEAR);
        p(1, 6, 2, 4, GEAR);
        p(11, 6, 2, 4, GEAR);
      } else if (acc === 4) {
        p(3, 1, 8, 4, hatColor);
        p(4, 1, 6, 1, shade(hatColor, 0.2));
        p(5, 5, 4, 1, shade(hatColor, -0.25));
      } else if (acc === 5) {
        p(9, 2, 3, 2, RIBBON);
        p(10, 2, 1, 2, '#b8434f');
      } else if (acc === 6) {
        p(3, 13, 8, 2, scarfCol);
      } else if (acc >= 7) {
        headTopAcc(0);
      }
    };

    // Kedi kulağı, saç bandı, çiçek (önden ve arkadan aynı)
    function headTopAcc(dx) {
      if (acc === 7) {
        const ear = '#3d3a3f';
        p(2 + dx, 1, 2, 2, ear);
        p(2 + dx, 0, 1, 1, ear);
        p(10 + dx, 1, 2, 2, ear);
        p(11 + dx, 0, 1, 1, ear);
        p(3 + dx, 1, 1, 1, '#f0a3a0');
        p(10 + dx, 1, 1, 1, '#f0a3a0');
      } else if (acc === 8) {
        p(2 + dx, 4, 10, 1, '#5b7fa8');
        p(2 + dx, 5, 1, 1, '#5b7fa8');
        p(11 + dx, 5, 1, 1, '#5b7fa8');
      } else if (acc === 9) {
        p(9 + dx, 2, 3, 3, '#f7a8c0');
        p(10 + dx, 3, 1, 1, '#f2c14e');
        p(12 + dx, 4, 1, 1, '#6fa268');
      } else if (acc === 11) {
        p(2 + dx, 4, 10, 2, BANDANA);
        p(4 + dx, 4, 1, 1, '#f2efe9');
        p(8 + dx, 5, 1, 1, '#f2efe9');
        p(10 + dx, 4, 1, 1, '#f2efe9');
      } else if (acc === 12) {
        p(3 + dx, 2, 8, 2, GOLD);
        p(3 + dx, 0, 1, 2, GOLD);
        p(6 + dx, 0, 2, 2, GOLD);
        p(10 + dx, 0, 1, 2, GOLD);
        p(5 + dx, 2, 1, 1, '#e05d6f');
        p(8 + dx, 2, 1, 1, '#5b7fa8');
      } else if (acc === 13) {
        p(2, 10, 1, 1, GOLD);
        p(11, 10, 1, 1, GOLD);
      } else if (acc === 14) {
        p(1 + dx, 4, 12, 1, WITCH);
        p(0 + dx, 5, 14, 1, shade(WITCH, -0.15));
        p(4 + dx, 2, 6, 2, WITCH);
        p(5 + dx, 1, 4, 1, WITCH);
        p(6 + dx, 0, 3, 1, WITCH);
        p(9 + dx, 0, 2, 1, WITCH);
        p(4 + dx, 3, 6, 1, '#9b7bb5');
      } else if (acc === 15) {
        p(6 + dx, 0, 2, 1, GOLD);
        p(6 + dx, 1, 2, 1, '#5b7fa8');
        p(5 + dx, 2, 4, 1, '#e05d6f');
        p(4 + dx, 3, 6, 1, '#5b7fa8');
        p(5 + dx, 2, 1, 1, '#f2efe9');
      }
    }

    function faceFront() {
      if (face === 1) {
        const fr = shade(skin, -0.3);
        p(4, 10, 1, 1, fr);
        p(5, 11, 1, 1, fr);
        p(8, 11, 1, 1, fr);
        p(9, 10, 1, 1, fr);
      } else if (face === 2) {
        p(5, 11, 4, 1, hair);
      } else if (face === 3) {
        p(3, 9, 1, 3, hair);
        p(10, 9, 1, 3, hair);
        p(4, 11, 6, 2, hair);
        p(6, 11, 2, 1, shade(skin, -0.15));
      } else if (face === 4) {
        p(3, 10, 2, 1, BLUSH);
        p(9, 10, 2, 1, BLUSH);
      } else if (face === 5) {
        p(6, 11, 2, 2, hair);
      } else if (face === 6) {
        const st = mix(skin, hair, 0.35);
        p(3, 10, 1, 2, st);
        p(10, 10, 1, 2, st);
        p(4, 11, 6, 1, st);
        p(5, 12, 4, 1, st);
      } else if (face === 7) {
        p(9, 11, 1, 1, '#4a3530');
      } else if (face === 8) {
        p(8, 10, 3, 1, '#f3dcc0');
        p(9, 10, 1, 1, '#d9b48f');
      } else if (face === 9) {
        p(10, 10, 1, 3, GOLD);
        p(9, 11, 3, 1, GOLD);
      }
    }

    // sola bakan yandan baş (sağ için tüm sprite aynalanır)
    const headSide = () => {
      if (hs === 7) {
        p(2, 0, 11, 11, hair);
        p(1, 3, 13, 6, hair);
      } else if (hs === 10) {
        p(10, 9, 2, 8, hair);
        p(10, 12, 2, 1, hairL);
        p(10, 16, 2, 1, RIBBON);
      } else if (hs === 12) {
        p(9, 11, 3, 5, hair);
        p(12, 12, 1, 3, hair);
      } else if (hs === 6) {
        p(8, 11, 4, 2, hair);
      }
      if (hs === 1) p(9, 11, 3, 5, hair);
      else if (hs === 3) {
        p(11, 7, 2, 7, hair);
        p(10, 7, 1, 1, RIBBON);
      } else if (hs === 5) {
        p(10, 7, 2, 6, hair);
        p(10, 6, 1, 1, RIBBON);
      } else if (hs === 16) {
        p(8, 11, 4, 6, hair);
        p(9, 11, 1, 6, hairL);
        p(11, 12, 1, 5, hairL);
      } else if (hs === 17) {
        p(9, 11, 2, 7, hair);
        p(9, 13, 2, 1, hairL);
        p(9, 16, 2, 1, hairL);
        p(9, 18, 2, 1, RIBBON);
      } else if (hs === 19) {
        p(8, 11, 4, 6, hair);
      } else if (hs === 21) {
        p(8, 11, 4, 3, hair);
      }
      p(3, 6, 5, 6, skin);
      p(4, 12, 4, 1, skin);
      p(2, 9, 1, 1, skin);
      const hc = buzzCut ? buzz : hair;
      p(4, 2, 6, 1, hc);
      p(3, 3, 8, 1, hc);
      p(3, 4, 9, 2, hc);
      p(8, 6, 4, buzzCut ? 4 : 5, hc);
      if (!buzzCut) {
        p(8, 11, 3, 1, hair);
        p(3, 6, 2, 1, hair);
        p(5, 3, 3, 1, hairL);
      }
      if (hs === 8) {
        p(5, 1, 1, 1, hair);
        p(7, 0, 1, 2, hair);
        p(9, 0, 1, 2, hair);
        p(11, 1, 1, 2, hair);
      } else if (hs === 9) {
        p(3, 6, 3, 1, hair);
        p(3, 7, 1, 1, hair);
      } else if (hs === 11) {
        p(9, 0, 3, 3, hair);
        p(3, 0, 3, 2, hair);
      } else if (hs === 6 || hs === 19) {
        p(3, 6, 4, 1, hair);
      } else if (hs === 14) {
        p(4, 1, 7, 2, hair);
        p(5, 0, 5, 1, hair);
        p(5, 0, 3, 1, hairL);
      } else if (hs === 15) {
        p(3, 6, 3, 1, hair);
        p(3, 7, 1, 1, hair);
      } else if (hs === 18) {
        p(8, 0, 4, 3, hair);
        p(9, 0, 2, 1, hairL);
        p(3, 7, 1, 2, hair);
      } else if (hs === 20) {
        p(4, 1, 7, 1, hair);
        p(3, 2, 8, 2, hair);
        p(2, 4, 3, 1, hair);
        p(5, 2, 3, 1, hairL);
      } else if (hs === 21) {
        p(3, 6, 2, 2, hair);
      }
      if (hs === 4) {
        p(12, 4, 1, 6, hair);
        p(4, 1, 2, 1, hair);
        p(8, 1, 2, 1, hair);
      } else if (hs === 2) {
        p(9, 1, 3, 3, hair);
        p(10, 1, 1, 1, hairL);
      }
      if (closed) p(3, 9, 2, 1, EYE);
      else {
        p(4, 8, 1, 2, eyeCol);
        if (girl && acc !== 1 && acc !== 10) p(3, 7, 1, 1, EYE);
      }
      p(5, 10, 1, 1, BLUSH);
      if (face === 1) {
        p(4, 10, 1, 1, shade(skin, -0.3));
        p(5, 11, 1, 1, shade(skin, -0.3));
      } else if (face === 2) p(2, 11, 3, 1, hair);
      else if (face === 3) {
        p(3, 10, 5, 3, hair);
        p(3, 11, 2, 1, shade(skin, -0.15));
      } else if (face === 4) p(4, 10, 2, 1, BLUSH);
      else if (face === 5) p(3, 12, 2, 1, hair);
      else if (face === 6) {
        const st = mix(skin, hair, 0.35);
        p(3, 11, 5, 1, st);
        p(4, 12, 4, 1, st);
      } else if (face === 7) p(5, 11, 1, 1, '#4a3530');
      else if (face === 8) p(5, 10, 2, 1, '#f3dcc0');
      else if (face === 9) {
        p(6, 10, 1, 1, GOLD);
        p(5, 11, 3, 1, GOLD);
        p(6, 12, 1, 1, GOLD);
      }
      if (acc === 1) {
        p(2, 8, 3, 2, LENS);
        p(2, 7, 3, 1, GEAR);
        p(5, 8, 3, 1, GEAR);
        if (closed) p(3, 9, 2, 1, EYE);
        else p(4, 8, 1, 2, eyeCol);
      } else if (acc === 2) {
        p(3, 1, 9, 4, hatColor);
        p(3, 4, 9, 2, shade(hatColor, -0.18));
        p(7, 0, 2, 1, '#f2efe9');
      } else if (acc === 3) {
        p(6, 1, 2, 6, GEAR);
        p(6, 7, 3, 4, GEAR);
        p(7, 8, 1, 2, '#6b7586');
      } else if (acc === 4) {
        p(3, 1, 8, 4, hatColor);
        p(4, 1, 6, 1, shade(hatColor, 0.2));
        p(0, 5, 5, 1, shade(hatColor, -0.25));
      } else if (acc === 5) {
        p(9, 2, 3, 2, RIBBON);
        p(10, 2, 1, 2, '#b8434f');
      } else if (acc === 6) {
        p(4, 13, 6, 2, scarfCol);
        p(9, 14, 2, 3, scarfCol);
      } else if (acc === 7) {
        p(5, 1, 2, 2, '#3d3a3f');
        p(9, 1, 2, 2, '#3d3a3f');
        p(5, 0, 1, 1, '#3d3a3f');
        p(10, 0, 1, 1, '#3d3a3f');
      } else if (acc === 8) {
        p(3, 4, 9, 1, '#5b7fa8');
      } else if (acc === 9) {
        p(9, 2, 3, 3, '#f7a8c0');
        p(10, 3, 1, 1, '#f2c14e');
      } else if (acc === 10) {
        p(2, 8, 3, 2, '#1f1d22');
        p(2, 8, 1, 1, '#6b7586');
        p(5, 8, 3, 1, GEAR);
      } else if (acc === 13) {
        p(8, 10, 1, 1, GOLD);
      } else if (acc === 11) {
        headTopAcc(1);
        p(12, 5, 1, 3, BANDANA);
      } else if (acc >= 12) {
        headTopAcc(1);
      }
    };

    if (side) {
      if (seated) {
        torsoSide();
        legsSitSide();
        if (pose === 'sit') {
          sleeve(6, 14, 4);
          p(6, 18, 2, 1, skin);
        } else {
          if (pose === 'lap') {
            p(1, 18, 5, 1, '#b4bac1');
            p(1, 14, 1, 4, '#8a929c');
          }
          p(3, 15, 5, 2, shortSleeve || ts === 7 ? skin : topD);
          p(6, 15, 2, 1, topD);
          p(2 - (frame % 2), 16, 1, 1, skin);
        }
      } else if (pose !== 'lie') {
        torsoSide();
        legsStandSide();
        const swing = frame === 1 ? -1 : frame === 3 ? 1 : 0;
        sleeve(6 + swing, 14, 4);
        sleeve(7 + swing, 14, 4);
        p(6 + swing, 18, 2, 1, skin);
      }
      headSide();
    } else if (dir === 'up') {
      if (pose === 'lie') {
        p(3, 13, 8, 3, top);
      } else {
        torsoBack();
        if (pose === 'work' || pose === 'lap') {
          const a = frame % 2;
          p(2, 13 + a, 1, 3, topD);
          p(11, 14 - a, 1, 3, topD);
        } else {
          sleeve(2, 14, 4);
          sleeve(11, 14, 4);
          p(2, 18, 1, 1, skin);
          p(11, 18, 1, 1, skin);
        }
        if (seated) legsSitFront();
        else legsStandFront();
      }
      headBack();
    } else {
      if (pose === 'lie') {
        p(3, 13, 8, 3, top);
      } else if (pose === 'study') {
        torsoFront();
        p(2, 14, 1, 3, topD);
        p(11, 14, 1, 3, topD);
        p(3, 17, 2, 1, topD);
        p(9, 17, 2, 1, topD);
        p(5, 17, 1, 1, skin);
        p(8 + (frame % 2), 17 - (frame % 2), 1, 1, skin);
      } else if (pose === 'lap') {
        torsoFront();
        legsSitFront();
        sleeve(2, 14, 3);
        sleeve(11, 14, 3);
        laptopFront();
        p(3, 17, 1, 1, skin);
        p(10, 17 - (frame % 2), 1, 1, skin);
      } else {
        torsoFront();
        sleeve(2, 14, 4);
        sleeve(11, 14, 4);
        p(2, 18, 1, 1, skin);
        p(11, 18, 1, 1, skin);
        if (seated) legsSitFront();
        else legsStandFront();
      }
      headFront();
    }

    const out = outline(cv);
    return dir === 'right' ? mirror(out) : out;
  }

  function lookKey(look) {
    return Object.keys(Sh.LOOK_COUNTS)
      .map((k) => look[k] | 0)
      .join('.');
  }

  function charSprite(look, dir, pose, frame, blink) {
    const key = `${lookKey(look)}|${dir}|${pose}|${frame}|${blink ? 1 : 0}`;
    let img = charCache.get(key);
    if (!img) {
      if (charCache.size > 1200) charCache.clear();
      if (pose === 'lie' && (dir === 'left' || dir === 'right')) {
        // yana dönük yatakta: önden uzanma görüntüsünü yatır (baş yastık tarafında)
        img = rotateCanvas(charSprite(look, 'down', 'lie', frame, blink), dir === 'right');
      } else {
        img = buildChar(look, dir, pose, frame, blink);
      }
      charCache.set(key, img);
    }
    return img;
  }

  const Art = {
    T,
    MX,
    MT,
    WH,
    BASE,
    OX,
    OY,
    LW,
    LH,
    dioramaPath,
    skyHoles,
    CW,
    CH,
    OUTLINE,
    ITEMS,
    FABRIC,
    FABRIC_NAMES,
    WOOD,
    WOOD_NAMES,
    POTS,
    POT_NAMES,
    SHADES,
    SHADE_NAMES,
    METAL,
    METAL_NAMES,
    BOOKS,
    LEAF,
    WALLS,
    WALL_NAMES,
    PATTERN_NAMES,
    FLOOR_NAMES,
    FLOOR_SWATCH,
    VENUE_NAMES,
    SKIN,
    HAIR,
    SHIRT,
    PANTS,
    SKIN_NAMES,
    HAIR_NAMES,
    SHIRT_NAMES,
    PANTS_NAMES,
    STYLE_NAMES,
    BODY_NAMES,
    EYES,
    EYE_NAMES,
    FACE_NAMES,
    TOP_NAMES,
    BOTTOM_NAMES,
    ACC_NAMES,
    ACC2_NAMES,
    SHOES,
    SHOE_NAMES,
    forcedHour: NaN,
    // küçük eşyanın alt kenarı (game.js üstünde durduğu eşyaya göre değiştirir)
    topBottom: (item) => OY + (item.y + 1) * T - 3,
    shade,
    mix,
    rgba,
    rng,
    ellipse,
    books,
    lighting,
    drawSky,
    drawWeather,
    background,
    itemSprite,
    view,
    viewOf,
    itemRect,
    hitsItem,
    drawItem,
    drawItemSlice,
    drawItemOver,
    drawItemCover,
    thumb,
    charSprite,
    makeCanvas,
  };

  App.Art = Art;
})();
