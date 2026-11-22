/*
 * Mevsimler: kış ve sonbahar eşya paketleri, tarihe göre mevsim ve pencerelerde kar / düşen yapraklar.
 * Mevsim tarayıcının saatine göre bulunur; güney yarımküre saat dilimlerinde mevsimler ters çevrilir.
 * Denemek için adrese ?mevsim=winter (ya da autumn, spring, summer) eklenebilir.
 */
(() => {
  'use strict';

  const App = window.App;
  const Art = App.Art;
  const { shade, ellipse } = Art;
  const I = Art.ITEMS;

  // ---------- Mevsim ----------
  const SOUTH = /^(Australia\/|Antarctica\/|Pacific\/(Auckland|Chatham)|America\/(Argentina\/|Sao_Paulo|Santiago|Montevideo|Asuncion|Punta_Arenas)|Africa\/(Johannesburg|Windhoek|Maputo|Maseru|Mbabane|Gaborone)|Indian\/(Mauritius|Reunion))/;
  let south = false;
  try {
    south = SOUTH.test(Intl.DateTimeFormat().resolvedOptions().timeZone || '');
  } catch {
    /* saat dilimi bilinmiyor: kuzey yarımküre */
  }

  const SEASON_ALIASES = { winter: 'winter', kis: 'winter', kış: 'winter', autumn: 'autumn', fall: 'autumn', sonbahar: 'autumn', spring: 'spring', ilkbahar: 'spring', summer: 'summer', yaz: 'summer' };
  const params = new URLSearchParams(location.search);
  const forced = SEASON_ALIASES[(params.get('mevsim') || params.get('season') || '').toLowerCase()];

  function season(date) {
    if (forced) return forced;
    let m = date.getMonth();
    if (south) m = (m + 6) % 12;
    if (m === 11 || m <= 1) return 'winter';
    if (m <= 4) return 'spring';
    if (m <= 7) return 'summer';
    return 'autumn';
  }

  const LEAF_COLS = ['#c4553f', '#e8853a', '#e3b766', '#a8673a', '#d9665b'];

  // Pencere camında ya da açık havada: kışın hafif kar, sonbaharda süzülen yapraklar.
  // ground: camın altına karlı bir zemin şeridi çizer.
  function drawSeason(ctx, x, y, w, h, env, strength = 1, ground = false) {
    const s = env.season;
    if (s !== 'winter' && s !== 'autumn') return;
    const t = env.t / 1000;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    if (s === 'winter') {
      // kar sesi açıkken yoğun kar zaten yağıyor; yalnızca zemin eklenir
      if (!(env.weather && env.weather.snow)) {
        ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * strength})`;
        const n = Math.min(44, Math.max(3, Math.round((w * h) / 130)));
        for (let i = 0; i < n; i++) {
          const speed = 6 + (i % 4) * 3;
          const sy = (i * 31.7 + t * speed) % (h + 4);
          const sx = (i * 43.3 + Math.sin(t * 0.9 + i) * 3 + w * 4) % w;
          ctx.fillRect(Math.round(x + sx), Math.round(y + sy - 2), 1, 1);
        }
      }
      if (ground) {
        const gy = y + h - 3;
        ctx.fillStyle = '#eef3f8';
        ctx.fillRect(x, gy, w, 3);
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < w; i += 5) ctx.fillRect(x + i, gy - ((i * 7) % 3 === 0 ? 1 : 0), 3, 1);
        ctx.fillStyle = 'rgba(160, 180, 205, 0.5)';
        ctx.fillRect(x, gy + 2, w, 1);
      }
    } else {
      // geniş alanlarda (açık hava) yapraklar seyrek ve biraz daha büyük
      const big = w * h > 20000;
      const n = big ? 22 : Math.max(2, Math.round((w * h) / 160));
      for (let i = 0; i < n; i++) {
        const speed = (big ? 10 : 7) + (i % 3) * 3;
        const sy = (i * 41.9 + t * speed) % (h + 6);
        const sway = Math.sin(t * (0.8 + (i % 3) * 0.2) + i * 1.7) * (big ? 9 : 5);
        const sx = (((i * 57.1 + t * 4 + sway) % w) + w) % w;
        const tumble = Math.sin(t * 2.4 + i) > 0;
        const px = Math.round(x + sx);
        const py = Math.round(y + sy - 3);
        const col = LEAF_COLS[i % LEAF_COLS.length];
        ctx.globalAlpha = strength;
        ctx.fillStyle = col;
        if (big) {
          // küçük yaprak: dönerken eğimi değişir
          ctx.fillRect(px, py, 2, 1);
          ctx.fillRect(tumble ? px + 1 : px, py + 1, 2, 1);
          ctx.fillStyle = shade(col, -0.25);
          ctx.fillRect(tumble ? px : px + 2, tumble ? py : py + 1, 1, 1);
        } else {
          ctx.fillRect(px, py, tumble ? 2 : 1, tumble ? 1 : 2);
        }
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  Art.season = season;
  Art.drawSeason = drawSeason;

  // =====================================================================
  // KIŞ
  // =====================================================================
  const PINE = ['#2f6644', '#3f7a4f', '#4f9461'];
  const RIBBONS = ['#d9665b', '#e3b766', '#5b7fa8'];

  // Ortası boş halka biçiminde çelenk (yapraklı)
  function ring(p, g, cols, seed) {
    ellipse(p, 7, 7, 7, 7, cols[0]);
    ellipse(p, 7, 7, 6, 6, cols[1]);
    for (let yy = 0; yy < 14; yy++) {
      for (let xx = 0; xx < 14; xx++) if (Math.hypot(xx + 0.5 - 7, yy + 0.5 - 7) < 3.3) g.clearRect(xx, yy, 1, 1);
    }
    const r = Art.rng(seed);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const rr = 4.6 + r() * 1.4;
      p(Math.round(7 + Math.cos(a) * rr - 0.5), Math.round(7 + Math.sin(a) * rr - 0.5), 1, 1, cols[2]);
    }
  }

  I.wreath = {
    name: 'Wreath',
    sw: 14,
    sh: 16,
    ox: 1,
    wy: 9,
    colors: RIBBONS,
    colorNames: ['Red bow', 'Gold bow', 'Blue bow'],
    draw(p, c, g) {
      ring(p, g, PINE, 7);
      for (const [x, y] of [[3, 3], [10, 4], [2, 8], [11, 9], [6, 1]]) p(x, y, 1, 1, '#e05d6f');
      const rib = RIBBONS[c];
      p(3, 10, 3, 3, rib);
      p(8, 10, 3, 3, rib);
      p(6, 11, 2, 2, shade(rib, -0.25));
      p(5, 13, 1, 3, rib);
      p(8, 13, 1, 3, rib);
      p(3, 10, 1, 1, shade(rib, 0.3));
    },
  };

  const STOCKING_SETS = [
    ['#d9665b', '#4f9461', '#d9665b'],
    ['#e59aa6', '#9fd8ff', '#f2c14e'],
    ['#5b7fa8', '#f2efe9', '#8c3b4a'],
  ];

  I.stockings = {
    name: 'Stockings',
    sw: 30,
    sh: 17,
    ox: 1,
    wy: 8,
    colors: STOCKING_SETS.map((s) => s[0]),
    colorNames: ['Classic', 'Candy', 'Nordic'],
    draw(p, c) {
      const ropeY = (x) => Math.round(1 + Math.sin((x / 29) * Math.PI) * 2);
      for (let x = 0; x < 30; x++) p(x, ropeY(x), 1, 1, '#8a6a4a');
      p(0, 0, 2, 2, '#c9a24b');
      p(28, 0, 2, 2, '#c9a24b');
      STOCKING_SETS[c].forEach((col, i) => {
        const x = 3 + i * 9;
        const y = ropeY(x + 2) + 1;
        const d = shade(col, -0.22);
        p(x + 2, y - 1, 1, 2, '#8a6a4a');
        p(x, y + 1, 6, 3, '#f7f4ee');
        p(x, y + 1, 6, 1, '#ffffff');
        p(x + 1, y + 4, 4, 7, col);
        p(x + 1, y + 9, 7, 3, col);
        p(x + 7, y + 10, 1, 2, d);
        p(x + 1, y + 11, 7, 1, d);
        p(x + 1, y + 6, 4, 1, i === 1 ? '#f2efe9' : shade(col, 0.25));
        p(x + 4, y + 4, 1, 5, d);
      });
    },
  };

  const GLOBE_BASES = ['#7a5236', '#c9a24b', '#d9665b'];

  I.snowGlobe = {
    name: 'Snow globe',
    sw: 16,
    sh: 16,
    colors: GLOBE_BASES,
    colorNames: ['Wood', 'Gold', 'Red'],
    use: 'shake',
    petSfx: 'jingle',
    useGlyph: '❄',
    useColor: '#9fd8ff',
    draw(p, c) {
      const b = GLOBE_BASES[c];
      ellipse(p, 8, 7, 6, 6, '#cfe9f5');
      ellipse(p, 8, 7, 5, 5, '#dff1f9');
      p(4, 9, 8, 3, '#f4f6fa');
      p(7, 4, 2, 1, PINE[2]);
      p(6, 5, 4, 2, PINE[1]);
      p(5, 7, 6, 2, PINE[0]);
      p(7, 9, 2, 1, '#7a5236');
      p(7, 3, 2, 1, '#f2c14e');
      p(4, 3, 2, 1, '#ffffff');
      p(3, 12, 10, 4, b);
      p(3, 12, 10, 1, shade(b, 0.25));
      p(3, 15, 10, 1, shade(b, -0.25));
    },
    over(ctx, r, item, env) {
      if (env.thumb) return;
      const shaken = env.used && env.used.get(item.id);
      const age = shaken ? (env.t - shaken) / 1000 : 99;
      const n = age < 6 ? 9 : 3;
      const t = env.t / 1000;
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < n; i++) {
        const swirl = age < 6 ? Math.max(0, 1 - age / 6) : 0;
        const ph = t * (0.25 + swirl * 1.5) + i * 0.37;
        const fy = ((ph + i * 0.13) % 1 + 1) % 1;
        const fx = Math.sin(i * 2.3 + t * (0.6 + swirl * 3)) * (3.5 - fy);
        ctx.fillRect(Math.round(r.x + 8 + fx), Math.round(r.y + 2 + fy * 8), 1, 1);
      }
    },
  };

  const GIFTS = ['#d9665b', '#5b7fa8', '#6f9a7d'];

  I.giftPile = {
    name: 'Gift pile',
    sw: 16,
    sh: 18,
    colors: GIFTS,
    colorNames: ['Red', 'Blue', 'Green'],
    draw(p, c) {
      const a = GIFTS[c];
      const b = GIFTS[(c + 1) % 3];
      const box = (x, y, w, h, col, rib) => {
        p(x, y, w, h, col);
        p(x, y, w, 1, shade(col, 0.22));
        p(x, y + h - 1, w, 1, shade(col, -0.25));
        const rx = x + Math.floor(w / 2);
        p(rx, y, 1, h, rib);
        p(x, y + Math.floor(h / 2), w, 1, rib);
        p(rx - 2, y - 2, 2, 2, rib);
        p(rx + 1, y - 2, 2, 2, rib);
      };
      box(1, 10, 9, 8, a, '#f2c14e');
      box(9, 12, 6, 6, '#e3b766', '#d9665b');
      box(3, 5, 7, 5, b, '#f2efe9');
    },
  };

  const SLEDS = ['#d9665b', '#b9875a', '#5b7fa8'];

  I.sled = {
    name: 'Sled',
    sw: 30,
    sh: 14,
    ox: 1,
    colors: SLEDS,
    colorNames: ['Red', 'Wood', 'Blue'],
    draw(p, c) {
      const col = SLEDS[c];
      const run = '#3d424b';
      // kızak tabanı ve öne kıvrılan raylar
      p(3, 11, 25, 1, run);
      p(1, 8, 1, 3, run);
      p(2, 10, 1, 1, run);
      p(2, 7, 2, 1, run);
      for (const x of [6, 13, 20, 26]) p(x, 8, 1, 3, run);
      p(3, 5, 25, 3, col);
      p(3, 5, 25, 1, shade(col, 0.25));
      for (const x of [9, 16, 23]) p(x, 5, 1, 3, shade(col, -0.2));
      p(3, 3, 3, 2, col);
      p(1, 2, 3, 2, shade(col, -0.1));
      // ip
      p(0, 3, 1, 1, '#e3c26b');
      p(1, 1, 1, 1, '#e3c26b');
      // ekose battaniye
      p(16, 3, 10, 2, '#f2efe9');
      p(18, 3, 1, 2, '#d9665b');
      p(22, 3, 1, 2, '#d9665b');
    },
  };

  // =====================================================================
  // SONBAHAR
  // =====================================================================
  const MAPLE = [
    ['#a83c2c', '#c4553f', '#e07a5f'],
    ['#c96a28', '#e8853a', '#f0a24f'],
    ['#c99a3c', '#e3b766', '#f2cf7a'],
  ];

  I.autumnWreath = {
    name: 'Autumn wreath',
    sw: 14,
    sh: 15,
    ox: 1,
    wy: 9,
    colors: MAPLE.map((m) => m[1]),
    colorNames: ['Maple', 'Orange', 'Golden'],
    draw(p, c, g) {
      const m = MAPLE[c];
      const other = MAPLE[(c + 1) % 3];
      ring(p, g, ['#8a6a4a', m[1], m[2]], 11);
      for (const [x, y] of [[2, 4], [11, 6], [4, 11], [9, 1]]) p(x, y, 2, 1, other[1]);
      for (const [x, y] of [[1, 7], [12, 3], [7, 12]]) p(x, y, 1, 1, '#6f9a7d');
      // küçük bal kabağı ve palamutlar
      p(5, 11, 4, 3, '#e8853a');
      p(6, 11, 2, 3, '#f0a24f');
      p(6, 10, 1, 1, '#6b8f3a');
      p(10, 11, 2, 2, '#a8673a');
      p(10, 10, 2, 1, '#6b4226');
      p(2, 11, 2, 2, '#a8673a');
      p(2, 10, 2, 1, '#6b4226');
    },
  };

  I.leafPile = {
    name: 'Leaf pile',
    sw: 32,
    sh: 14,
    colors: MAPLE.map((m) => m[1]),
    colorNames: ['Maple', 'Orange', 'Golden'],
    noOutline: true,
    draw(p, c) {
      const r = Art.rng(31 + c);
      ellipse(p, 16, 10, 14, 4.2, shade(MAPLE[c][0], -0.15));
      ellipse(p, 16, 9.5, 12, 3.6, MAPLE[c][0]);
      const cols = [...MAPLE[c], ...MAPLE[(c + 1) % 3].slice(1), '#a8673a'];
      for (let i = 0; i < 70; i++) {
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r());
        const x = Math.round(16 + Math.cos(a) * d * 13);
        const y = Math.round(9.5 + Math.sin(a) * d * 3.8 - (1 - d) * 2.5);
        p(x, y, r() < 0.5 ? 2 : 1, 1, cols[Math.floor(r() * cols.length)]);
      }
      // dağılmış tek tük yapraklar
      for (const [x, y, k] of [[1, 12, 0], [29, 11, 1], [5, 13, 2], [25, 13, 0]]) p(x, y, 2, 1, cols[k]);
    },
  };

  const HAY = ['#e3c26b', '#c9a55a'];

  I.hayBale = {
    name: 'Hay bale',
    sw: 32,
    sh: 18,
    colors: HAY,
    colorNames: ['Golden', 'Straw'],
    seats: [
      { x: 0.6, y: 0.82, pose: 'sit', dir: 'down', cells: [[0, 0]], act: 'sit' },
      { x: 1.4, y: 0.82, pose: 'sit', dir: 'down', cells: [[1, 0]], act: 'sit' },
    ],
    draw(p, c) {
      const h = HAY[c];
      const d = shade(h, -0.2);
      const l = shade(h, 0.2);
      p(1, 3, 30, 15, h);
      p(2, 2, 28, 1, h);
      p(2, 2, 28, 2, l);
      p(1, 7, 30, 1, d);
      const r = Art.rng(5 + c);
      for (let i = 0; i < 40; i++) p(1 + Math.floor(r() * 28), 8 + Math.floor(r() * 9), 2 + Math.floor(r() * 3), 1, r() < 0.5 ? d : l);
      for (const x of [8, 23]) {
        p(x, 2, 1, 16, '#8a6a4a');
        p(x + 1, 2, 1, 16, shade('#8a6a4a', 0.2));
      }
      p(1, 17, 30, 1, shade(h, -0.35));
      // kenardan sarkan saman telleri
      p(0, 9, 1, 2, l);
      p(31, 12, 1, 2, l);
      p(12, 1, 2, 1, l);
    },
  };

  I.mapleTree = {
    name: 'Maple tree',
    sw: 16,
    sh: 36,
    colors: MAPLE.map((m) => m[1]),
    colorNames: ['Red', 'Orange', 'Golden'],
    draw(p, c) {
      const [d, m, l] = MAPLE[c];
      p(7, 16, 2, 13, '#6b4226');
      p(5, 19, 2, 1, '#6b4226');
      p(9, 17, 2, 1, '#6b4226');
      ellipse(p, 8, 9, 7.5, 6.5, d);
      ellipse(p, 7, 8, 6, 5.2, m);
      ellipse(p, 5, 6, 3, 2.6, l);
      ellipse(p, 11, 10, 3, 2.4, shade(m, 0.08));
      for (const [x, y] of [[3, 11], [12, 5], [9, 13], [2, 7]]) p(x, y, 1, 1, l);
      p(3, 28, 10, 2, '#d98a62');
      p(4, 30, 8, 6, '#c87b55');
      p(4, 34, 8, 2, shade('#c87b55', -0.18));
      // dibine düşmüş yapraklar
      p(1, 34, 2, 1, m);
      p(13, 35, 2, 1, l);
    },
    over(ctx, r, item, env) {
      if (env.thumb) return;
      // arada bir dallardan bir yaprak süzülür
      const cycle = 7;
      const ph = (env.t / 1000 + (item.x * 1.3 + item.y * 0.7)) % cycle;
      if (ph > 3) return;
      const k = ph / 3;
      const [, m] = MAPLE[item.c] || MAPLE[0];
      ctx.globalAlpha = k < 0.85 ? 1 : (1 - k) / 0.15;
      ctx.fillStyle = m;
      ctx.fillRect(Math.round(r.x + 11 + Math.sin(ph * 3) * 3), Math.round(r.y + 12 + k * 22), 2, 1);
      ctx.globalAlpha = 1;
    },
  };

  const APPLES = ['#d9473f', '#8cc04f', '#e3b766'];

  I.appleCrate = {
    name: 'Apple crate',
    sw: 16,
    sh: 16,
    colors: APPLES,
    colorNames: ['Red', 'Green', 'Golden'],
    draw(p, c) {
      const a = APPLES[c];
      for (const [x, y] of [[2, 3], [6, 2], [10, 3], [4, 5], [8, 5]]) {
        ellipse(p, x + 1.5, y + 1.5, 2, 2, a);
        p(x + 1, y, 1, 1, shade(a, 0.35));
        p(x + 2, y - 1, 1, 1, '#6b4226');
      }
      p(12, 1, 2, 1, '#6f9a7d');
      const w = '#b9875a';
      p(1, 7, 14, 9, w);
      p(1, 7, 14, 1, shade(w, 0.22));
      p(1, 11, 14, 1, shade(w, -0.2));
      p(1, 15, 14, 1, shade(w, -0.3));
      p(1, 7, 1, 9, shade(w, -0.15));
      p(14, 7, 1, 9, shade(w, -0.15));
      p(6, 9, 4, 1, shade(w, -0.35));
    },
  };

  // ---------- Paketler: tek tıkla odaya eklenen hazır eşya grupları ----------
  // [tür, renk, yön]
  Art.PACKS = {
    winter: {
      name: 'Winter pack',
      icon: '❄️',
      items: [['christmasTree', 0], ['giftPile', 0], ['wreath', 0], ['stockings', 0], ['snowGlobe', 0], ['sled', 0], ['snowman', 0, 'outdoor']],
    },
    autumn: {
      name: 'Autumn pack',
      icon: '\u{1F342}',
      items: [['mapleTree', 1], ['pumpkin', 0], ['hayBale', 0], ['appleCrate', 0], ['autumnWreath', 0], ['leafPile', 0], ['pumpkin', 1]],
    },
  };
})();
