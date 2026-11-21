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
  const OX = 8; // yan duvar kalınlığı
  const OY = 48; // arka duvar yüksekliği
  const LW = ROOM_W * T + OX * 2;
  const LH = OY + ROOM_H * T + 8;
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
  const FABRIC = ['#d9785f', '#6f9a7d', '#5b7fa8', '#e3b766', '#9b7bb5', '#e59aa6', '#3f7f7a', '#6b6f78'];
  const FABRIC_NAMES = ['Terracotta', 'Sage', 'Blue', 'Mustard', 'Lavender', 'Pink', 'Teal', 'Charcoal'];
  const WOOD = ['#b9875a', '#7a5236', '#e9e2d4', '#3d3a3f', '#d8b98c'];
  const WOOD_NAMES = ['Oak', 'Walnut', 'White', 'Black', 'Birch'];
  const POTS = ['#c87b55', '#ece6da', '#5f7c8a', '#3d3a3f', '#e3b766'];
  const POT_NAMES = ['Terracotta', 'Cream', 'Gray', 'Black', 'Mustard'];
  const SHADES = ['#f1e4c4', '#e3b766', '#d9785f', '#6f9a7d', '#5b7fa8'];
  const SHADE_NAMES = ['Cream', 'Mustard', 'Terracotta', 'Sage', 'Blue'];
  const METAL = ['#3d424b', '#c9a24b', '#e9e2d4', '#b9875a'];
  const METAL_NAMES = ['Black', 'Brass', 'White', 'Wood'];
  const BOOKS = ['#d9785f', '#5b7fa8', '#e3b766', '#6f9a7d', '#9b7bb5', '#ece6da', '#c4553f', '#7a8fa6'];
  const LEAF = ['#4f7f4c', '#6fa268', '#8cc07f'];

  const WALLS = ['#eadfc8', '#cbd6bf', '#cddae6', '#e8cbc4', '#d8cee4', '#4a5470', '#c9826b', '#4f6b58', '#3b3d45'];
  const WALL_NAMES = ['Cream', 'Sage', 'Sky', 'Rose', 'Lavender', 'Night', 'Terracotta', 'Forest', 'Coal'];
  const PATTERN_NAMES = ['Plain', 'Stripes', 'Polka dots', 'Brick', 'Wood paneling', 'Fence and sky'];
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
  ];
  const FLOOR_NAMES = ['Oak planks', 'Walnut planks', 'Tiles', 'Carpet', 'Checkerboard', 'Basketweave parquet', 'Stone', 'Grass', 'Wooden deck'];
  const FLOOR_SWATCH = ['#c99c6b', '#7f5639', '#ebe5da', '#8e9db0', '#3f3b45', '#b98a5c', '#b8b2a7', '#7fae6a', '#a98262'];

  const VENUE_NAMES = { room: 'My room', cafe: 'Café', library: 'Library', terrace: 'Terrace' };

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
  function drawSky(ctx, x, y, w, h, env) {
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
    if (light.night > 0.55) {
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
    const y = cat.layer === 'wall' ? v.wy : OY + (item.y + fp.h) * T - v.sh;
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
      const gr = g.createLinearGradient(0, 0, 0, OY);
      gr.addColorStop(0, '#9fd3f0');
      gr.addColorStop(1, '#e2f2f8');
      g.fillStyle = gr;
      g.fillRect(OX, 0, W, OY);
      p(OX + 18, 7, 14, 3, '#ffffff');
      p(OX + 22, 5, 8, 2, '#ffffff');
      p(OX + 118, 10, 18, 3, '#ffffff');
      p(OX + 123, 8, 9, 2, '#ffffff');
      const r = rng(77);
      for (let x = 0; x < W; x += 6) {
        const h = 8 + Math.floor(r() * 7);
        p(OX + x, OY - 14 - h, 7, h + 2, x % 12 ? '#6f9a63' : '#628d58');
        p(OX + x + 2, OY - 13 - h, 3, 1, '#86b178');
      }
      p(OX, OY - 16, W, 4, '#5a8450');
      const fc = wall;
      const fd = shade(wall, -0.2);
      p(OX, OY - 13, W, 2, fd);
      p(OX, OY - 6, W, 2, fd);
      for (let x = 1; x < W; x += 6) {
        p(OX + x, OY - 18, 4, 17, fc);
        p(OX + x + 1, OY - 19, 2, 1, fc);
        p(OX + x + 3, OY - 18, 1, 17, shade(fc, -0.12));
      }
      p(OX, OY - 2, W, 2, '#6c9a5a');
      return;
    }

    p(OX, 0, W, OY, wall);
    if (pat === 1) {
      for (let x = OX + 3; x < OX + W; x += 8) p(x, 2, 2, OY - 16, shade(wall, 0.12));
    } else if (pat === 2) {
      let row = 0;
      for (let y = 6; y < OY - 16; y += 7, row++) {
        for (let x = OX + 3 + (row % 2) * 4; x < OX + W; x += 8) p(x, y, 1, 1, shade(wall, -0.14));
      }
    } else if (pat === 3) {
      p(OX, 2, W, OY - 16, shade(wall, 0.24));
      const r = rng(41);
      let row = 0;
      for (let y = 2; y < OY - 14; y += 6, row++) {
        for (let x = -(row % 2) * 6; x < W; x += 12) {
          const x0 = Math.max(0, x);
          const x1 = Math.min(W, x + 11);
          const h = Math.min(5, OY - 14 - y);
          if (x1 > x0 && h > 0) p(OX + x0, y, x1 - x0, h, shade(wall, (r() - 0.5) * 0.16));
        }
      }
    } else if (pat === 4) {
      const dark = shade(wall, -0.18);
      const light = shade(wall, 0.14);
      p(OX, 21, W, 2, dark);
      p(OX, 21, W, 1, light);
      for (let x = 0; x < W; x += 24) {
        p(OX + x, 2, 1, OY - 5, dark);
        inset(p, OX + x + 3, 5, 18, 13, dark, light);
        inset(p, OX + x + 3, 26, 18, OY - 32, dark, light);
      }
    }
    p(OX, 0, W, 2, shade(wall, -0.2));
    if (pat !== 4) {
      p(OX, OY - 13, W, 10, shade(wall, -0.08));
      p(OX, OY - 14, W, 1, shade(wall, 0.2));
      for (let x = OX + 15; x < OX + W; x += 16) p(x, OY - 12, 1, 8, shade(wall, -0.16));
    }
    p(OX, OY - 3, W, 3, '#ede6d8');
    p(OX, OY - 1, W, 1, '#cfc6b6');
  }

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

  function background(style, venue) {
    const key = `${venue}-${style.wall}-${style.pattern}-${style.floor}`;
    let c = bgCache.get(key);
    if (c) return c;
    c = makeCanvas(LW, LH);
    const g = c.getContext('2d');
    const p = painter(g);
    const W = ROOM_W * T;
    const H = ROOM_H * T;
    const wall = WALLS[style.wall];

    p(0, 0, LW, LH, '#2a2329');
    if (style.pattern === 5) {
      const r = rng(17);
      for (const sx of [0, LW - OX]) {
        p(sx, 0, OX, LH - 8, '#5a8450');
        for (let i = 0; i < 60; i++) p(sx + Math.floor(r() * OX), Math.floor(r() * (LH - 8)), 2, 2, r() < 0.5 ? '#6f9a63' : '#4c7344');
      }
    } else {
      p(0, 0, OX, LH - 8, shade(wall, -0.24));
      p(LW - OX, 0, OX, LH - 8, shade(wall, -0.24));
      p(OX - 1, 0, 1, LH - 8, shade(wall, -0.36));
      p(LW - OX, 0, 1, LH - 8, shade(wall, -0.36));
    }
    drawBackWall(p, g, style);
    drawFloor(p, style.floor);
    g.fillStyle = 'rgba(40, 28, 30, 0.18)';
    g.fillRect(OX, OY, W, 2);
    g.fillRect(OX, OY, 2, H);
    g.fillRect(LW - OX - 2, OY, 2, H);
    p(0, LH - 8, LW, 8, '#3a2c35');
    p(OX, LH - 8, W, 1, '#2a2026');
    drawDoor(p, OX + DOOR_X * T, OY - 32, venue);

    if (bgCache.size > 24) bgCache.clear();
    bgCache.set(key, c);
    return c;
  }

  // ---------- Karakter ----------
  const SKIN = ['#f6d5b8', '#e9b892', '#c98f66', '#94603f', '#5e3b28'];
  const HAIR = ['#2e2421', '#5b3a26', '#a8693a', '#e2b866', '#c4553f', '#8c97a8', '#7c5aa6'];
  const SHIRT = ['#d9665b', '#5f9a78', '#5b7fa8', '#e3b766', '#9b7bb5', '#f2efe9', '#3d424b', '#e59aa6', '#3f7f7a'];
  const PANTS = ['#3d424b', '#4c5d80', '#7a5a42', '#d8d1c4', '#6b6f78', '#b7614f'];
  const SKIN_NAMES = ['Light', 'Wheat', 'Tan', 'Brown', 'Deep'];
  const HAIR_NAMES = ['Black', 'Brown', 'Chestnut', 'Blonde', 'Auburn', 'Gray', 'Purple'];
  const SHIRT_NAMES = ['Red', 'Green', 'Blue', 'Mustard', 'Purple', 'White', 'Anthracite', 'Pink', 'Teal'];
  const PANTS_NAMES = ['Anthracite', 'Navy', 'Brown', 'Beige', 'Gray', 'Rust'];
  const BODY_NAMES = ['Boy', 'Girl'];
  const STYLE_NAMES = ['Short', 'Long', 'Bun', 'Ponytail', 'Curly', 'Pigtails'];
  const TOP_NAMES = ['T-shirt', 'Hoodie', 'Sweater', 'Shirt', 'Dress'];
  const BOTTOM_NAMES = ['Pants', 'Shorts', 'Skirt'];
  const ACC_NAMES = ['None', 'Glasses', 'Beanie', 'Headphones', 'Cap', 'Bow'];
  const EYE = '#2b2230';
  const BLUSH = '#f0a3a0';
  const SHOE = '#3a2f2a';
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
    const bs = dress ? 'dress' : ['pants', 'shorts', 'skirt'][look.bottom] || 'pants';
    const acc = look.acc;
    const closed = blink || pose === 'lie';
    const side = dir === 'left' || dir === 'right';
    const seated = pose === 'sit' || pose === 'work' || pose === 'study' || pose === 'lap';
    const skirtLike = bs === 'skirt' || bs === 'dress';
    const hipColor = bs === 'dress' ? top : bot;
    const hatColor = shade(top, -0.05);

    // Kol: tişörtte dirsekten aşağısı çıplak
    const sleeve = (x, y, h) => {
      if (ts === 0) {
        p(x, y, 1, Math.min(2, h), topD);
        if (h > 2) p(x, y + 2, 1, h - 2, skin);
      } else {
        p(x, y, 1, h, topD);
        if (ts === 2 && h > 1) p(x, y + 1, 1, 1, topL);
      }
    };

    // ----- bacaklar -----
    const legsStandFront = () => {
      const up = [frame === 1, frame === 3];
      if (skirtLike) {
        p(3, 19, 8, 2, hipColor);
        p(3, 20, 8, 1, shade(hipColor, -0.12));
      } else p(4, 19, 6, 1, hipColor);
      [4, 8].forEach((x, i) => {
        if (bs === 'pants') p(x, 20, 2, up[i] ? 1 : 2, bot);
        else if (bs === 'shorts') {
          p(x, 20, 2, 1, bot);
          if (!up[i]) p(x, 21, 2, 1, skin);
        } else if (!up[i]) p(x, 21, 2, 1, skin);
        p(x, up[i] ? 21 : 22, 2, 1, SHOE);
      });
    };

    const legsSitFront = () => {
      p(3, 19, 8, 2, hipColor);
      p(3, 19, 8, 1, shade(hipColor, 0.14));
      if (bs === 'shorts') p(3, 20, 8, 1, skin);
      p(4, 21, 2, 1, SHOE);
      p(8, 21, 2, 1, SHOE);
    };

    const legsStandSide = () => {
      const stride = frame === 1 || frame === 3;
      if (skirtLike) {
        p(3, 19, 8, 2, hipColor);
        p(3, 20, 8, 1, shade(hipColor, -0.12));
      } else p(4, 19, 6, 1, hipColor);
      const legs = stride ? [[3, pantsOr(bot)], [8, pantsOr(botD)]] : [[5, pantsOr(bot)], [7, pantsOr(botD)]];
      for (const [x, col] of legs) {
        if (bs === 'pants') p(x, 20, 2, 2, col);
        else if (bs === 'shorts') {
          p(x, 20, 2, 1, col);
          p(x, 21, 2, 1, skin);
        } else p(x, 21, 2, 1, skin);
      }
      if (stride) {
        p(2, 22, 3, 1, SHOE);
        p(8, 22, 3, 1, SHOE);
      } else p(4, 22, 5, 1, SHOE);
    };
    function pantsOr(c) {
      return c;
    }

    const legsSitSide = () => {
      p(1, 19, 8, 2, hipColor);
      p(1, 19, 8, 1, shade(hipColor, 0.14));
      p(1, 21, 2, 1, bs === 'pants' ? bot : skin);
      p(0, 22, 3, 1, SHOE);
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
      } else {
        p(6, 13, 2, 1, skin);
      }
    };

    const torsoBack = () => {
      p(4, 13, 6, 1, top);
      p(3, 14, 8, 5, top);
      if (ts === 1) p(4, 12, 6, 2, topD);
      else if (ts === 2) {
        p(3, 15, 8, 1, topL);
        p(3, 17, 8, 1, topL);
      } else if (ts === 4) p(3, 17, 8, 1, topD);
    };

    const torsoSide = () => {
      p(5, 13, 4, 1, top);
      p(4, 14, 6, 5, top);
      if (ts === 1) p(8, 12, 2, 2, topD);
      else if (ts === 2) {
        p(4, 15, 6, 1, topL);
        p(4, 17, 6, 1, topL);
      } else if (ts === 4) p(4, 17, 6, 1, topD);
    };

    const laptopFront = () => {
      p(4, 14, 6, 4, '#8a929c');
      p(6, 15, 2, 1, '#c0c6cc');
      p(3, 18, 8, 1, '#b4bac1');
    };

    // ----- saç (arka katman, yüz, ön katman) -----
    const headFront = () => {
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
      }
      p(3, 6, 8, 6, skin);
      p(4, 12, 6, 1, skin);
      p(4, 2, 6, 1, hair);
      p(3, 3, 8, 1, hair);
      p(2, 4, 10, 2, hair);
      p(2, 6, 1, 3, hair);
      p(11, 6, 1, 3, hair);
      if (hs === 4) {
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
      } else {
        p(3, 6, 2, 1, hair);
        p(9, 6, 2, 1, hair);
      }
      p(5, 3, 3, 1, hairL);
      if (hs === 2) {
        p(5, 0, 4, 2, hair);
        p(6, 0, 2, 1, hairL);
      }
      // yüz
      if (closed) {
        p(4, 9, 2, 1, EYE);
        p(8, 9, 2, 1, EYE);
      } else if (pose === 'study') {
        p(5, 9, 1, 1, EYE);
        p(8, 9, 1, 1, EYE);
      } else {
        p(5, 8, 1, 2, EYE);
        p(8, 8, 1, 2, EYE);
        if (girl && acc !== 1) {
          p(4, 7, 1, 1, EYE);
          p(9, 7, 1, 1, EYE);
        }
      }
      p(4, 10, 1, 1, BLUSH);
      p(9, 10, 1, 1, BLUSH);
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
          p(5, 8, 1, 2, EYE);
          p(8, 8, 1, 2, EYE);
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
      p(4, 2, 6, 1, hair);
      p(3, 3, 8, 1, hair);
      p(2, 4, 10, 7, hair);
      p(3, 11, 8, 1, hair);
      p(4, 3, 4, 1, hairL);
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
      }
      if (acc === 1) {
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
      }
    };

    // sola bakan yandan baş (sağ için tüm sprite aynalanır)
    const headSide = () => {
      if (hs === 1) p(9, 11, 3, 5, hair);
      else if (hs === 3) {
        p(11, 7, 2, 7, hair);
        p(10, 7, 1, 1, RIBBON);
      } else if (hs === 5) {
        p(10, 7, 2, 6, hair);
        p(10, 6, 1, 1, RIBBON);
      }
      p(3, 6, 5, 6, skin);
      p(4, 12, 4, 1, skin);
      p(2, 9, 1, 1, skin);
      p(4, 2, 6, 1, hair);
      p(3, 3, 8, 1, hair);
      p(3, 4, 9, 2, hair);
      p(8, 6, 4, 5, hair);
      p(8, 11, 3, 1, hair);
      p(3, 6, 2, 1, hair);
      p(5, 3, 3, 1, hairL);
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
        p(4, 8, 1, 2, EYE);
        if (girl && acc !== 1) p(3, 7, 1, 1, EYE);
      }
      p(5, 10, 1, 1, BLUSH);
      if (acc === 1) {
        p(2, 8, 3, 2, LENS);
        p(2, 7, 3, 1, GEAR);
        p(5, 8, 3, 1, GEAR);
        if (closed) p(3, 9, 2, 1, EYE);
        else p(4, 8, 1, 2, EYE);
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
          p(3, 15, 5, 2, ts === 0 ? skin : topD);
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
    OX,
    OY,
    LW,
    LH,
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
    TOP_NAMES,
    BOTTOM_NAMES,
    ACC_NAMES,
    forcedHour: NaN,
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
