/*
 * Piksel sanat: tüm grafikler kodla çizilir (harici görsel yok).
 * Sprite'lar bir kez çizilip önbelleğe alınır, otomatik kontur eklenir.
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

  function mirror(src) {
    const out = makeCanvas(src.width, src.height);
    const g = out.getContext('2d');
    g.translate(src.width, 0);
    g.scale(-1, 1);
    g.drawImage(src, 0, 0);
    return out;
  }

  // ---------- Paletler ----------
  const FABRIC = ['#d9785f', '#6f9a7d', '#5b7fa8', '#e3b766', '#9b7bb5'];
  const FABRIC_NAMES = ['Kiremit', 'Adaçayı', 'Mavi', 'Hardal', 'Lavanta'];
  const WOOD = ['#b9875a', '#7a5236', '#e9e2d4'];
  const WOOD_NAMES = ['Meşe', 'Ceviz', 'Beyaz'];
  const POTS = ['#c87b55', '#ece6da', '#5f7c8a'];
  const POT_NAMES = ['Toprak', 'Krem', 'Gri'];
  const SHADES = ['#f1e4c4', '#e3b766', '#d9785f'];
  const SHADE_NAMES = ['Krem', 'Hardal', 'Kiremit'];
  const BOOKS = ['#d9785f', '#5b7fa8', '#e3b766', '#6f9a7d', '#9b7bb5', '#ece6da', '#c4553f', '#7a8fa6'];
  const LEAF = ['#4f7f4c', '#6fa268', '#8cc07f'];
  const BED_WOOD = '#a87650';

  const WALLS = ['#eadfc8', '#cbd6bf', '#cddae6', '#e8cbc4', '#d8cee4', '#4a5470'];
  const WALL_NAMES = ['Krem', 'Adaçayı', 'Gök', 'Gül', 'Lavanta', 'Gece'];
  const PATTERN_NAMES = ['Düz', 'Çizgili', 'Puantiyeli'];
  const FLOORS = [
    { kind: 'planks', base: '#c99c6b' },
    { kind: 'planks', base: '#7f5639' },
    { kind: 'tiles', a: '#ebe5da', b: '#d3cab9' },
    { kind: 'carpet', base: '#8e9db0' },
  ];
  const FLOOR_NAMES = ['Meşe parke', 'Ceviz parke', 'Fayans', 'Halıfleks'];
  const FLOOR_SWATCH = ['#c99c6b', '#7f5639', '#ebe5da', '#8e9db0'];

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

  // ---------- Kitaplık yardımcı ----------
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
      const h = Math.max(5, Math.round(maxH - r() * 4));
      const col = BOOKS[Math.floor(r() * BOOKS.length)];
      p(x, yBottom - h, w, h, col);
      p(x, yBottom - h, w, 1, shade(col, 0.22));
      p(x, yBottom - h + 2, w, 1, shade(col, -0.2));
      x += w;
    }
  }

  function circle(p, size, cx, cy, radius, color) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (Math.hypot(x - cx, y - cy) <= radius) p(x, y, 1, 1, color);
      }
    }
  }

  // ---------- Eşya tanımları ----------
  // sw/sh: sprite boyutu. Zemin eşyalarında sprite alt kenarı, kaplama alanının alt kenarına hizalanır.
  // Duvar eşyalarında wy: duvardaki üst konum. seats: oturulabilen/uzanılabilen yerler.
  const ITEMS = {
    desk: {
      name: 'Çalışma masası',
      sw: 32,
      sh: 40,
      colors: WOOD,
      colorNames: WOOD_NAMES,
      sortY: 1,
      frontY: 30,
      solid: (cx, cy) => cy === 0,
      seats: [{ x: 1, y: 1.75, pose: 'work', dir: 'up', cells: [[0, 1], [1, 1]] }],
      glow: { x: 27, y: 7, r: 26, when: 'occupied' },
      draw(p, c) {
        const w = WOOD[c];
        const wl = shade(w, 0.18);
        const wd = shade(w, -0.22);
        // masa
        p(0, 8, 32, 7, wl);
        p(0, 14, 32, 1, shade(w, 0.06));
        p(0, 15, 32, 8, w);
        p(18, 17, 11, 4, wd);
        p(22, 18, 3, 1, '#f0e6cc');
        p(3, 17, 11, 4, wd);
        p(7, 18, 3, 1, '#f0e6cc');
        p(1, 23, 3, 5, wd);
        p(28, 23, 3, 5, wd);
        // dizüstü bilgisayar
        p(11, 4, 10, 9, '#8a929c');
        p(12, 5, 8, 7, '#2c3440');
        p(10, 13, 12, 2, '#b4bac1');
        // kitaplar ve kupa
        p(2, 11, 7, 2, '#d9785f');
        p(3, 9, 6, 2, '#5b7fa8');
        p(3, 9, 6, 1, shade('#5b7fa8', 0.2));
        p(24, 11, 3, 3, '#ece6da');
        p(27, 12, 1, 1, '#ece6da');
        // masa lambası
        p(28, 4, 1, 8, '#3d424b');
        p(26, 12, 5, 2, '#3d424b');
        p(25, 2, 6, 3, '#e3b766');
        p(25, 2, 6, 1, shade('#e3b766', 0.25));
        // sandalye
        p(10, 27, 12, 3, '#6b7586');
        p(9, 30, 14, 7, '#4b5361');
        p(9, 30, 14, 1, '#6b7586');
        p(10, 37, 2, 3, '#3d424b');
        p(20, 37, 2, 3, '#3d424b');
      },
      over(ctx, r, item, env) {
        if (!env.activeDesks || !env.activeDesks.has(item.id)) return;
        const focusing = env.focusing;
        ctx.fillStyle = '#b9e0ef';
        ctx.fillRect(r.x + 12, r.y + 5, 8, 7);
        ctx.fillStyle = '#5b7fa8';
        const shift = focusing ? Math.floor(env.t / 400) % 3 : 0;
        for (let i = 0; i < 3; i++) {
          const len = [6, 4, 5][(i + shift) % 3];
          ctx.fillRect(r.x + 13, r.y + 6 + i * 2, len, 1);
        }
      },
    },

    sofa: {
      name: 'Kanepe',
      sw: 32,
      sh: 24,
      colors: FABRIC,
      colorNames: FABRIC_NAMES,
      seats: [
        { x: 0.6, y: 0.875, pose: 'sit', dir: 'down', cells: [[0, 0]] },
        { x: 1.4, y: 0.875, pose: 'sit', dir: 'down', cells: [[1, 0]] },
      ],
      draw(p, c) {
        const f = FABRIC[c];
        const fl = shade(f, 0.16);
        const fd = shade(f, -0.16);
        p(2, 3, 28, 11, fd);
        p(2, 3, 28, 1, f);
        p(4, 5, 11, 7, f);
        p(17, 5, 11, 7, f);
        p(4, 5, 11, 1, fl);
        p(17, 5, 11, 1, fl);
        p(4, 13, 11, 6, fl);
        p(17, 13, 11, 6, fl);
        p(15, 13, 2, 6, f);
        p(4, 19, 24, 3, fd);
        p(0, 9, 5, 13, f);
        p(27, 9, 5, 13, f);
        p(0, 9, 5, 2, fl);
        p(27, 9, 5, 2, fl);
        p(1, 21, 30, 1, shade(f, -0.32));
        p(3, 22, 2, 2, '#5a3d2b');
        p(27, 22, 2, 2, '#5a3d2b');
      },
    },

    armchair: {
      name: 'Koltuk',
      sw: 16,
      sh: 24,
      colors: FABRIC,
      colorNames: FABRIC_NAMES,
      seats: [{ x: 0.5, y: 0.875, pose: 'sit', dir: 'down', cells: [[0, 0]] }],
      draw(p, c) {
        const f = FABRIC[c];
        const fl = shade(f, 0.16);
        const fd = shade(f, -0.16);
        p(2, 3, 12, 11, fd);
        p(2, 3, 12, 1, f);
        p(4, 5, 8, 7, f);
        p(4, 5, 8, 1, fl);
        p(3, 13, 10, 6, fl);
        p(3, 19, 10, 3, fd);
        p(0, 9, 3, 13, f);
        p(13, 9, 3, 13, f);
        p(0, 9, 3, 2, fl);
        p(13, 9, 3, 2, fl);
        p(1, 21, 14, 1, shade(f, -0.32));
        p(2, 22, 2, 2, '#5a3d2b');
        p(12, 22, 2, 2, '#5a3d2b');
      },
    },

    pouf: {
      name: 'Minder',
      sw: 16,
      sh: 14,
      colors: FABRIC,
      colorNames: FABRIC_NAMES,
      seats: [{ x: 0.5, y: 0.72, pose: 'sit', dir: 'down', cells: [[0, 0]] }],
      draw(p, c) {
        const f = FABRIC[c];
        p(3, 1, 10, 1, shade(f, 0.22));
        p(1, 2, 14, 5, shade(f, 0.14));
        p(1, 7, 14, 5, f);
        p(2, 12, 12, 2, shade(f, -0.2));
        p(7, 4, 2, 1, shade(f, -0.12));
        p(1, 7, 14, 1, shade(f, -0.06));
      },
    },

    bed: {
      name: 'Yatak',
      sw: 32,
      sh: 40,
      colors: FABRIC,
      colorNames: FABRIC_NAMES,
      frontY: 19,
      seats: [{ x: 1, y: 1.25, pose: 'lie', dir: 'down', cells: [[0, 1], [1, 1], [0, 0], [1, 0]] }],
      draw(p, c) {
        const f = FABRIC[c];
        const w = BED_WOOD;
        p(0, 2, 32, 10, w);
        p(0, 0, 32, 3, shade(w, 0.18));
        p(3, 5, 26, 5, shade(w, -0.12));
        p(2, 11, 28, 27, '#f3eee6');
        p(0, 11, 2, 27, shade(w, -0.12));
        p(30, 11, 2, 27, shade(w, -0.12));
        p(5, 12, 22, 6, '#ffffff');
        p(5, 17, 22, 1, '#ddd6cb');
        p(5, 12, 1, 6, '#e9e3d9');
        p(26, 12, 1, 6, '#e9e3d9');
        p(2, 19, 28, 17, f);
        p(2, 19, 28, 3, shade(f, 0.28));
        p(2, 26, 28, 1, shade(f, -0.08));
        p(2, 33, 28, 3, shade(f, -0.18));
        p(0, 36, 32, 4, w);
        p(0, 36, 32, 1, shade(w, 0.18));
      },
    },

    bookshelf: {
      name: 'Kitaplık',
      sw: 32,
      sh: 44,
      colors: WOOD,
      colorNames: WOOD_NAMES,
      draw(p, c) {
        const w = WOOD[c];
        const inner = shade(w, -0.4);
        p(0, 0, 32, 44, w);
        p(0, 0, 32, 2, shade(w, 0.18));
        p(2, 2, 28, 38, inner);
        p(2, 2, 28, 1, shade(inner, -0.25));
        p(2, 14, 28, 2, w);
        p(2, 28, 28, 2, w);
        p(2, 16, 28, 1, shade(inner, -0.25));
        p(2, 30, 28, 1, shade(inner, -0.25));
        p(0, 40, 32, 4, shade(w, -0.18));
        books(p, 3, 29, 14, 10, 11);
        books(p, 3, 29, 28, 10, 23);
        books(p, 3, 21, 40, 8, 37);
        p(24, 36, 4, 4, '#c87b55');
        p(23, 32, 3, 4, LEAF[1]);
        p(26, 31, 3, 5, LEAF[2]);
        p(25, 33, 2, 3, LEAF[0]);
      },
    },

    table: {
      name: 'Sehpa',
      sw: 32,
      sh: 16,
      colors: WOOD,
      colorNames: WOOD_NAMES,
      draw(p, c) {
        const w = WOOD[c];
        p(1, 3, 30, 6, shade(w, 0.18));
        p(1, 9, 30, 2, w);
        p(2, 11, 3, 5, shade(w, -0.2));
        p(27, 11, 3, 5, shade(w, -0.2));
        p(5, 13, 22, 1, shade(w, -0.2));
        p(6, 1, 3, 4, '#ece6da');
        p(9, 2, 1, 2, '#ece6da');
        p(6, 1, 3, 1, '#8a5a3c');
        p(14, 5, 9, 2, '#5b7fa8');
        p(14, 7, 9, 1, '#f2efe9');
        p(25, 4, 4, 3, '#c87b55');
        p(24, 1, 3, 3, LEAF[1]);
        p(26, 0, 3, 3, LEAF[2]);
      },
    },

    lamp: {
      name: 'Lambader',
      sw: 16,
      sh: 36,
      colors: SHADES,
      colorNames: SHADE_NAMES,
      glow: { x: 8, y: 11, r: 46, when: 'night' },
      draw(p, c) {
        const s = SHADES[c];
        p(4, 33, 8, 3, '#3d424b');
        p(5, 32, 6, 1, '#596273');
        p(7, 12, 2, 21, '#3d424b');
        p(4, 2, 8, 2, s);
        p(3, 4, 10, 4, s);
        p(2, 8, 12, 4, s);
        p(2, 11, 12, 1, shade(s, -0.2));
        p(4, 3, 3, 7, shade(s, 0.3));
      },
    },

    plant: {
      name: 'Bitki',
      sw: 16,
      sh: 24,
      colors: POTS,
      colorNames: POT_NAMES,
      draw(p, c) {
        const pot = POTS[c];
        p(7, 6, 2, 10, LEAF[0]);
        p(2, 8, 5, 3, LEAF[1]);
        p(1, 10, 3, 2, LEAF[0]);
        p(9, 6, 5, 3, LEAF[1]);
        p(12, 5, 3, 2, LEAF[2]);
        p(3, 3, 4, 3, LEAF[1]);
        p(4, 2, 2, 1, LEAF[2]);
        p(8, 1, 4, 4, LEAF[2]);
        p(9, 0, 2, 1, LEAF[2]);
        p(4, 11, 4, 3, LEAF[0]);
        p(9, 10, 5, 3, LEAF[1]);
        p(10, 10, 3, 1, LEAF[2]);
        p(3, 15, 10, 2, shade(pot, 0.15));
        p(4, 17, 8, 7, pot);
        p(4, 22, 8, 2, shade(pot, -0.18));
      },
    },

    rug: {
      name: 'Halı',
      sw: 48,
      sh: 32,
      colors: FABRIC,
      colorNames: FABRIC_NAMES,
      outlineColor: (c) => shade(FABRIC[c], -0.42),
      draw(p, c) {
        const f = FABRIC[c];
        const light = shade(f, 0.32);
        p(1, 0, 46, 32, f);
        p(3, 2, 42, 28, light);
        p(5, 4, 38, 24, f);
        for (let i = 0; i < 8; i++) {
          p(24 - i - 1, 8 + i, (i + 1) * 2, 1, light);
          p(24 - i - 1, 23 - i, (i + 1) * 2, 1, light);
        }
        for (let i = 0; i < 5; i++) {
          p(24 - i - 1, 11 + i, (i + 1) * 2, 1, f);
          p(24 - i - 1, 20 - i, (i + 1) * 2, 1, f);
        }
        p(23, 15, 2, 2, shade(f, -0.2));
        for (let y = 1; y < 32; y += 2) {
          p(0, y, 1, 1, '#efe6d6');
          p(47, y, 1, 1, '#efe6d6');
        }
      },
    },

    window: {
      name: 'Pencere',
      sw: 32,
      sh: 27,
      wy: 6,
      colors: ['#f3efe6', '#a87650'],
      colorNames: ['Beyaz', 'Ahşap'],
      draw(p, c, g) {
        const fc = this.colors[c];
        p(0, 0, 32, 23, fc);
        p(0, 0, 32, 1, shade(fc, 0.15));
        g.clearRect(2, 2, 13, 19);
        g.clearRect(17, 2, 13, 19);
        p(2, 11, 13, 1, fc);
        p(17, 11, 13, 1, fc);
        p(0, 22, 32, 3, shade(fc, -0.08));
        p(0, 22, 32, 1, shade(fc, 0.12));
        p(1, 25, 30, 2, shade(fc, -0.25));
      },
      under(ctx, r, env) {
        const light = env.light;
        const { top, bot } = skyColors(light);
        const gr = ctx.createLinearGradient(0, r.y + 2, 0, r.y + 21);
        gr.addColorStop(0, top);
        gr.addColorStop(1, bot);
        ctx.fillStyle = gr;
        ctx.fillRect(r.x + 2, r.y + 2, 28, 19);
        ctx.save();
        ctx.beginPath();
        ctx.rect(r.x + 2, r.y + 2, 28, 19);
        ctx.clip();
        if (light.night > 0.55) {
          ctx.fillStyle = '#f4f1d0';
          for (const [sx, sy] of [[4, 4], [9, 8], [13, 3], [19, 6], [25, 9], [6, 13], [16, 15], [27, 4]]) {
            ctx.fillRect(r.x + sx, r.y + sy, 1, 1);
          }
          ctx.fillStyle = '#f6efc6';
          ctx.fillRect(r.x + 22, r.y + 4, 3, 4);
          ctx.fillRect(r.x + 21, r.y + 5, 1, 2);
          ctx.fillStyle = top;
          ctx.fillRect(r.x + 24, r.y + 4, 1, 3);
        } else {
          const h = light.hour;
          const t = clamp01((h - 6) / 13);
          const sx = r.x + 3 + Math.round(t * 22);
          const sy = r.y + 3 + Math.round(Math.abs(t - 0.5) * 18);
          ctx.fillStyle = light.warm > 0.3 ? '#f7b267' : '#fff2b0';
          ctx.fillRect(sx, sy, 4, 4);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          const drift = (env.t / 900) % 44;
          for (const [cx, cy, cw] of [[0, 8, 8], [20, 14, 7]]) {
            const x = r.x + 2 + ((cx + drift) % 44) - 8;
            ctx.fillRect(x, r.y + cy, cw, 2);
            ctx.fillRect(x + 2, r.y + cy - 1, cw - 4, 1);
          }
        }
        ctx.restore();
      },
    },

    board: {
      name: 'Mantar pano',
      sw: 30,
      sh: 19,
      ox: 1,
      wy: 9,
      colors: ['#cfa673'],
      colorNames: ['Mantar'],
      draw(p) {
        p(0, 0, 30, 19, '#9a6a46');
        p(0, 0, 30, 1, '#b4825a');
        p(2, 2, 26, 15, '#cfa673');
        const r = rng(5);
        for (let i = 0; i < 26; i++) p(2 + Math.floor(r() * 26), 2 + Math.floor(r() * 15), 1, 1, '#bf9461');
      },
      over(ctx, r, item, env) {
        const notes = Math.min(6, env.todosLeft || 0);
        const spots = [[4, 4], [12, 3], [20, 5], [5, 10], [13, 10], [21, 11]];
        const colors = ['#f4e28a', '#f2b8b0', '#b9d7ea', '#c8e3b8'];
        for (let i = 0; i < notes; i++) {
          const [nx, ny] = spots[i];
          const col = colors[i % colors.length];
          ctx.fillStyle = col;
          ctx.fillRect(r.x + nx, r.y + ny, 6, 5);
          ctx.fillStyle = shade(col, -0.22);
          ctx.fillRect(r.x + nx + 1, r.y + ny + 2, 4, 1);
          ctx.fillRect(r.x + nx + 1, r.y + ny + 3, 3, 1);
          ctx.fillStyle = '#d9665b';
          ctx.fillRect(r.x + nx + 2, r.y + ny, 2, 1);
        }
      },
    },

    shelf: {
      name: 'Duvar rafı',
      sw: 32,
      sh: 16,
      wy: 16,
      colors: WOOD,
      colorNames: WOOD_NAMES,
      draw(p, c) {
        const w = WOOD[c];
        p(0, 10, 32, 3, w);
        p(0, 10, 32, 1, shade(w, 0.18));
        p(4, 13, 2, 3, shade(w, -0.22));
        p(26, 13, 2, 3, shade(w, -0.22));
        p(3, 3, 2, 7, '#d9785f');
        p(5, 4, 2, 6, '#5b7fa8');
        p(7, 2, 2, 8, '#e3b766');
        p(9, 5, 2, 5, '#6f9a7d');
        p(15, 6, 3, 4, '#ece6da');
        p(16, 5, 1, 1, '#3d424b');
        p(22, 6, 5, 4, '#c87b55');
        p(21, 2, 3, 4, LEAF[1]);
        p(24, 1, 3, 5, LEAF[2]);
        p(26, 3, 2, 3, LEAF[0]);
      },
    },

    painting: {
      name: 'Tablo',
      sw: 14,
      sh: 12,
      ox: 1,
      wy: 12,
      colors: ['#7fae73', '#e98a5b', '#4f78a3'],
      colorNames: ['Dağ', 'Gün batımı', 'Deniz'],
      draw(p, c) {
        p(0, 0, 14, 12, '#a87650');
        p(0, 0, 14, 1, '#c08d63');
        if (c === 0) {
          p(1, 1, 12, 10, '#cfe3ef');
          for (let i = 0; i < 5; i++) p(5 - i, 3 + i, 2 + 2 * i, 1, '#7d8fa3');
          for (let i = 0; i < 4; i++) p(9 - i, 4 + i, 2 + 2 * i, 1, '#9aaabb');
          p(5, 3, 2, 1, '#ffffff');
          p(1, 8, 12, 3, '#7fae73');
        } else if (c === 1) {
          p(1, 1, 12, 10, '#f6dcb4');
          p(5, 3, 4, 1, '#e98a5b');
          p(4, 4, 6, 2, '#e98a5b');
          p(5, 6, 4, 1, '#e98a5b');
          p(1, 7, 12, 1, '#d9785f');
          p(1, 8, 12, 3, '#9b5f6e');
        } else {
          p(1, 1, 12, 5, '#d8ecf5');
          p(1, 6, 12, 5, '#4f78a3');
          p(2, 7, 3, 1, '#8fb7dc');
          p(8, 8, 3, 1, '#8fb7dc');
          p(4, 9, 2, 1, '#8fb7dc');
          p(8, 2, 1, 4, '#ffffff');
          p(9, 3, 1, 3, '#ffffff');
          p(7, 6, 4, 1, '#7a5236');
        }
      },
    },

    clock: {
      name: 'Duvar saati',
      sw: 11,
      sh: 11,
      ox: 2,
      wy: 11,
      colors: ['#3d424b', '#a87650'],
      colorNames: ['Siyah', 'Ahşap'],
      draw(p, c) {
        circle(p, 11, 5, 5, 5.4, this.colors[c]);
        circle(p, 11, 5, 5, 4.2, '#f6f2ea');
        p(5, 1, 1, 1, '#8a8f97');
        p(9, 5, 1, 1, '#8a8f97');
        p(5, 9, 1, 1, '#8a8f97');
        p(1, 5, 1, 1, '#8a8f97');
      },
      over(ctx, r, item, env) {
        const now = env.date;
        const min = now.getMinutes() + now.getSeconds() / 60;
        const hr = (now.getHours() % 12) + min / 60;
        const hand = (angle, len, color) => {
          ctx.fillStyle = color;
          for (let s = 0; s <= len; s += 0.5) {
            const x = Math.round(5 + Math.sin(angle) * s);
            const y = Math.round(5 - Math.cos(angle) * s);
            ctx.fillRect(r.x + x, r.y + y, 1, 1);
          }
        };
        hand((min / 60) * Math.PI * 2, 3.6, '#3d424b');
        hand((hr / 12) * Math.PI * 2, 2.4, '#d9665b');
      },
    },
  };

  const FURNITURE = ['desk', 'sofa', 'armchair', 'pouf', 'bed', 'bookshelf', 'table', 'lamp', 'plant', 'rug'];
  const WALL_ITEMS = ['window', 'board', 'shelf', 'painting', 'clock'];

  // ---------- Sprite önbelleği ----------
  const spriteCache = new Map();

  function itemSprite(type, c) {
    const key = `${type}:${c}`;
    let s = spriteCache.get(key);
    if (!s) {
      const def = ITEMS[type];
      const raw = makeCanvas(def.sw, def.sh);
      const g = raw.getContext('2d');
      def.draw(painter(g), c, g);
      const img = outline(raw, def.outlineColor ? def.outlineColor(c) : OUTLINE);
      const alpha = img.getContext('2d').getImageData(0, 0, img.width, img.height).data;
      s = { img, alpha };
      spriteCache.set(key, s);
    }
    return s;
  }

  // Sprite'ın sol üst köşesinin (kontursuz) mantıksal konumu
  function itemRect(item) {
    const def = ITEMS[item.type];
    const cat = Sh.CATALOG[item.type];
    const x = OX + item.x * T + (def.ox || 0);
    const y = cat.layer === 'wall' ? def.wy : OY + (item.y + cat.h) * T - def.sh;
    return { x, y, w: def.sw, h: def.sh };
  }

  // Mantıksal (lx, ly) noktası sprite'ın dolu bir pikseline denk geliyor mu?
  function hitsItem(item, lx, ly) {
    const r = itemRect(item);
    const sx = Math.floor(lx - r.x + 1);
    const sy = Math.floor(ly - r.y + 1);
    const { img, alpha } = itemSprite(item.type, item.c);
    if (sx < 0 || sy < 0 || sx >= img.width || sy >= img.height) return false;
    return alpha[(sy * img.width + sx) * 4 + 3] > 0;
  }

  function drawItem(ctx, item, env, alpha) {
    const def = ITEMS[item.type];
    const r = itemRect(item);
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    if (def.under) def.under(ctx, r, env);
    ctx.drawImage(itemSprite(item.type, item.c).img, r.x - 1, r.y - 1);
    if (def.over) def.over(ctx, r, item, env);
    if (alpha !== undefined) ctx.globalAlpha = 1;
  }

  // Oturan karakterin önüne çizilecek kısım (sandalye arkalığı, yorgan)
  function drawItemFront(ctx, item) {
    const def = ITEMS[item.type];
    if (def.frontY === undefined) return;
    const r = itemRect(item);
    const { img } = itemSprite(item.type, item.c);
    const sy = def.frontY;
    ctx.drawImage(img, 0, sy, img.width, img.height - sy, r.x - 1, r.y - 1 + sy, img.width, img.height - sy);
  }

  const THUMB_ENV = { light: { hour: 13, night: 0, warm: 0 }, t: 0, date: new Date(2024, 0, 1, 10, 10), todosLeft: 3 };

  function thumb(type, c, size) {
    const def = ITEMS[type];
    const { img } = itemSprite(type, c);
    const k = Math.max(1, Math.floor(Math.min(size / img.width, size / img.height)));
    const out = makeCanvas(size, size);
    const g = out.getContext('2d');
    g.imageSmoothingEnabled = false;
    const ox = Math.floor((size - img.width * k) / 2);
    const oy = Math.floor((size - img.height * k) / 2);
    g.setTransform(k, 0, 0, k, ox, oy);
    const r = { x: 1, y: 1, w: def.sw, h: def.sh };
    if (def.under) def.under(g, r, THUMB_ENV);
    g.drawImage(img, 0, 0);
    if (def.over) def.over(g, r, { id: 'thumb', c }, THUMB_ENV);
    return out;
  }

  // ---------- Arka plan (duvar + zemin) ----------
  const bgCache = new Map();

  function drawFloor(p, idx) {
    const f = FLOORS[idx];
    const W = ROOM_W * T;
    const H = ROOM_H * T;
    if (f.kind === 'planks') {
      const r = rng(7 + idx * 31);
      for (let row = 0; row < H / 8; row++) {
        const y = OY + row * 8;
        let x = -Math.floor(r() * 30);
        while (x < W) {
          const len = 22 + Math.floor(r() * 22);
          const tone = shade(f.base, (r() - 0.5) * 0.12);
          const x0 = Math.max(0, x);
          const x1 = Math.min(W, x + len);
          p(OX + x0, y, x1 - x0, 7, tone);
          p(OX + x0, y + 7, x1 - x0, 1, shade(f.base, -0.22));
          if (x + len < W) p(OX + x + len - 1, y, 1, 7, shade(f.base, -0.16));
          if (x1 - x0 > 10 && r() < 0.7) {
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
          p(x, y + T - 1, T, 1, shade(f.b, -0.1));
          p(x + T - 1, y, 1, T, shade(f.b, -0.1));
        }
      }
    } else {
      p(OX, OY, W, H, f.base);
      const r = rng(99);
      for (let i = 0; i < 900; i++) {
        p(OX + Math.floor(r() * W), OY + Math.floor(r() * H), 1, 1, shade(f.base, r() < 0.5 ? 0.07 : -0.07));
      }
    }
  }

  function drawDoor(p, x, y) {
    const wood = '#b07b52';
    p(x - 1, y - 1, 18, 33, OUTLINE);
    p(x, y, 16, 32, '#8a5a3c');
    p(x + 2, y + 2, 12, 30, wood);
    p(x + 4, y + 5, 8, 9, shade(wood, -0.12));
    p(x + 4, y + 5, 8, 1, shade(wood, -0.25));
    p(x + 4, y + 17, 8, 11, shade(wood, -0.12));
    p(x + 4, y + 17, 8, 1, shade(wood, -0.25));
    p(x + 11, y + 18, 2, 2, '#e8c46a');
    p(x, y, 16, 1, '#a56f4a');
  }

  function background(style) {
    const key = `${style.wall}-${style.pattern}-${style.floor}`;
    let c = bgCache.get(key);
    if (c) return c;
    c = makeCanvas(LW, LH);
    const g = c.getContext('2d');
    const p = painter(g);
    const W = ROOM_W * T;
    const H = ROOM_H * T;
    const wall = WALLS[style.wall];

    p(0, 0, LW, LH, '#2a2329');
    // yan duvarlar
    p(0, 0, OX, LH - 8, shade(wall, -0.24));
    p(LW - OX, 0, OX, LH - 8, shade(wall, -0.24));
    p(OX - 1, 0, 1, LH - 8, shade(wall, -0.36));
    p(LW - OX, 0, 1, LH - 8, shade(wall, -0.36));
    // arka duvar
    p(OX, 0, W, OY, wall);
    if (style.pattern === 1) {
      for (let x = OX + 3; x < OX + W; x += 8) p(x, 2, 2, OY - 16, shade(wall, 0.12));
    } else if (style.pattern === 2) {
      let row = 0;
      for (let y = 6; y < OY - 16; y += 7, row++) {
        for (let x = OX + 3 + (row % 2) * 4; x < OX + W; x += 8) p(x, y, 1, 1, shade(wall, -0.14));
      }
    }
    p(OX, 0, W, 2, shade(wall, -0.2));
    // lambri ve süpürgelik
    p(OX, OY - 13, W, 10, shade(wall, -0.08));
    p(OX, OY - 14, W, 1, shade(wall, 0.2));
    for (let x = OX + 15; x < OX + W; x += 16) p(x, OY - 12, 1, 8, shade(wall, -0.16));
    p(OX, OY - 3, W, 3, '#ede6d8');
    p(OX, OY - 1, W, 1, '#cfc6b6');
    // zemin
    drawFloor(p, style.floor);
    g.fillStyle = 'rgba(40, 28, 30, 0.18)';
    g.fillRect(OX, OY, W, 2);
    g.fillRect(OX, OY, 2, H);
    g.fillRect(LW - OX - 2, OY, 2, H);
    // ön kenar
    p(0, LH - 8, LW, 8, '#3a2c35');
    p(OX, LH - 8, W, 1, '#2a2026');
    // kapı
    drawDoor(p, OX + DOOR_X * T, OY - 32);

    bgCache.set(key, c);
    return c;
  }

  // ---------- Karakter ----------
  const SKIN = ['#f6d5b8', '#e9b892', '#c98f66', '#94603f', '#5e3b28'];
  const HAIR = ['#2e2421', '#5b3a26', '#a8693a', '#e2b866', '#c4553f', '#8c97a8', '#7c5aa6'];
  const SHIRT = ['#d9665b', '#5f9a78', '#5b7fa8', '#e3b766', '#9b7bb5', '#f2efe9', '#3d424b'];
  const PANTS = ['#3d424b', '#4c5d80', '#7a5a42', '#d8d1c4'];
  const SKIN_NAMES = ['Açık', 'Buğday', 'Esmer', 'Kahve', 'Koyu'];
  const HAIR_NAMES = ['Siyah', 'Kahve', 'Kestane', 'Sarı', 'Kızıl', 'Gri', 'Mor'];
  const SHIRT_NAMES = ['Kırmızı', 'Yeşil', 'Mavi', 'Hardal', 'Mor', 'Beyaz', 'Antrasit'];
  const PANTS_NAMES = ['Antrasit', 'Lacivert', 'Kahve', 'Bej'];
  const STYLE_NAMES = ['Kısa', 'Uzun', 'Topuz'];
  const EYE = '#2b2230';
  const BLUSH = '#f0a3a0';
  const SHOE = '#3a2f2a';
  const CW = 14;
  const CH = 23;

  const charCache = new Map();

  function buildChar(look, dir, pose, frame, blink) {
    const cv = makeCanvas(CW, CH);
    const p = painter(cv.getContext('2d'));
    const skin = SKIN[look.skin];
    const hair = HAIR[look.hair];
    const hairL = shade(hair, 0.2);
    const shirt = SHIRT[look.shirt];
    const shirtD = shade(shirt, -0.16);
    const pants = PANTS[look.pants];
    const pantsD = shade(pants, -0.18);
    const long = look.style === 1;
    const bun = look.style === 2;
    const closed = blink || pose === 'lie';

    const legsFront = () => {
      if (pose === 'sit' || pose === 'work') {
        p(3, 19, 8, 2, pants);
        p(3, 19, 8, 1, shade(pants, 0.14));
        p(4, 21, 2, 1, SHOE);
        p(8, 21, 2, 1, SHOE);
        return;
      }
      const lUp = frame === 1;
      const rUp = frame === 3;
      p(4, 19, 6, 1, pants);
      p(4, 20, 2, lUp ? 1 : 2, pants);
      p(4, lUp ? 21 : 22, 2, 1, SHOE);
      p(8, 20, 2, rUp ? 1 : 2, pants);
      p(8, rUp ? 21 : 22, 2, 1, SHOE);
    };

    const torso = () => {
      p(4, 13, 6, 1, shirt);
      p(3, 14, 8, 5, shirt);
    };

    if (dir === 'left' || dir === 'right') {
      // yandan görünüm (sola bakar, sağ için aynalanır)
      if (pose !== 'lie') {
        p(5, 13, 4, 1, shirt);
        p(4, 14, 6, 5, shirt);
        p(4, 19, 6, 1, pants);
        if (frame === 1 || frame === 3) {
          p(8, 20, 2, 2, pantsD);
          p(8, 22, 3, 1, SHOE);
          p(3, 20, 2, 2, pants);
          p(2, 22, 3, 1, SHOE);
        } else {
          p(7, 20, 2, 2, pantsD);
          p(5, 20, 2, 2, pants);
          p(4, 22, 5, 1, SHOE);
        }
        const swing = frame === 1 ? -1 : frame === 3 ? 1 : 0;
        p(6 + swing, 14, 2, 4, shirtD);
        p(6 + swing, 18, 2, 1, skin);
      }
      if (long) p(9, 11, 3, 5, hair);
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
      if (bun) {
        p(9, 1, 3, 3, hair);
        p(10, 1, 1, 1, hairL);
      }
      if (closed) p(3, 9, 2, 1, EYE);
      else p(4, 8, 1, 2, EYE);
      p(5, 10, 1, 1, BLUSH);
    } else if (dir === 'up') {
      // arkadan görünüm
      if (pose === 'lie') {
        p(3, 13, 8, 3, shirt);
      } else {
        torso();
        if (pose === 'work') {
          const a = frame % 2;
          p(2, 13 + a, 1, 3, shirtD);
          p(11, 14 - a, 1, 3, shirtD);
        } else {
          p(2, 14, 1, 4, shirtD);
          p(11, 14, 1, 4, shirtD);
          p(2, 18, 1, 1, skin);
          p(11, 18, 1, 1, skin);
        }
        legsFront();
      }
      p(5, 12, 4, 1, skin);
      p(4, 2, 6, 1, hair);
      p(3, 3, 8, 1, hair);
      p(2, 4, 10, 7, hair);
      p(3, 11, 8, 1, hair);
      p(4, 3, 4, 1, hairL);
      if (long) {
        p(3, 12, 8, 4, hair);
        p(4, 16, 6, 1, hair);
      }
      if (bun) {
        p(5, 0, 4, 2, hair);
        p(6, 0, 2, 1, hairL);
      }
    } else {
      // önden görünüm
      if (pose === 'lie') {
        p(3, 13, 8, 3, shirt);
      } else {
        torso();
        p(2, 14, 1, 4, shirtD);
        p(11, 14, 1, 4, shirtD);
        p(2, 18, 1, 1, skin);
        p(11, 18, 1, 1, skin);
        legsFront();
      }
      p(3, 6, 8, 6, skin);
      p(4, 12, 6, 1, skin);
      p(4, 2, 6, 1, hair);
      p(3, 3, 8, 1, hair);
      p(2, 4, 10, 2, hair);
      p(2, 6, 1, 3, hair);
      p(11, 6, 1, 3, hair);
      p(3, 6, 2, 1, hair);
      p(9, 6, 2, 1, hair);
      p(5, 3, 3, 1, hairL);
      if (long) {
        p(2, 6, 1, 8, hair);
        p(11, 6, 1, 8, hair);
      }
      if (bun) {
        p(5, 0, 4, 2, hair);
        p(6, 0, 2, 1, hairL);
      }
      if (closed) {
        p(4, 9, 2, 1, EYE);
        p(8, 9, 2, 1, EYE);
      } else {
        p(5, 8, 1, 2, EYE);
        p(8, 8, 1, 2, EYE);
      }
      p(4, 10, 1, 1, BLUSH);
      p(9, 10, 1, 1, BLUSH);
    }

    const out = outline(cv);
    return dir === 'right' ? mirror(out) : out;
  }

  function charSprite(look, dir, pose, frame, blink) {
    const key = `${look.skin}${look.hair}${look.style}${look.shirt}${look.pants}|${dir}|${pose}|${frame}|${blink ? 1 : 0}`;
    let img = charCache.get(key);
    if (!img) {
      if (charCache.size > 800) charCache.clear();
      img = buildChar(look, dir, pose, frame, blink);
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
    ITEMS,
    FURNITURE,
    WALL_ITEMS,
    WALLS,
    WALL_NAMES,
    PATTERN_NAMES,
    FLOOR_NAMES,
    FLOOR_SWATCH,
    SKIN,
    HAIR,
    SHIRT,
    PANTS,
    SKIN_NAMES,
    HAIR_NAMES,
    SHIRT_NAMES,
    PANTS_NAMES,
    STYLE_NAMES,
    forcedHour: NaN,
    shade,
    rgba,
    lighting,
    background,
    itemSprite,
    itemRect,
    hitsItem,
    drawItem,
    drawItemFront,
    thumb,
    charSprite,
    makeCanvas,
  };

  App.Art = Art;
})();
