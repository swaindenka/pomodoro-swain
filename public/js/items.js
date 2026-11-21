/*
 * Eşya kataloğu: her eşyanın piksel çizimi, renk seçenekleri, oturma yerleri ve ışıkları.
 *
 * Alanlar:
 *  sw, sh      sprite boyutu. Zemin eşyalarında alt kenar kaplama alanının alt kenarına hizalanır.
 *  ox          yatay kaydırma, wy: duvar eşyalarının duvardaki üst konumu
 *  colors      renk/çeşit listesi (Shared.CATALOG'daki sayıyla aynı olmalı), colorNames: adları
 *  solid       (cx, cy) => bu kare yürünemez mi (varsayılan: hepsi)
 *  seats       { x, y, pose, dir, cells, band, act }: karakterin oturduğu nokta (kare cinsinden)
 *  cuts        oturanları sprite katmanları arasına yerleştirmek için y kesimleri; seat.band hangi katmandan sonra
 *  glows       { x, y, r, when: night | occupied | always, color, strength }
 *  under/over  dinamik çizimler (gökyüzü, ateş, buhar…)
 *  use         'pet': oturma yerine etkileşim
 */
(() => {
  'use strict';

  const App = window.App;
  const Art = App.Art;
  const Sh = window.Shared;
  const { shade, ellipse, books, rng, LEAF, FABRIC, FABRIC_NAMES, WOOD, WOOD_NAMES } = Art;
  const { POTS, POT_NAMES, SHADES, SHADE_NAMES, METAL, METAL_NAMES } = Art;
  const I = Art.ITEMS;

  const CHAIR = '#7a5236';
  const TABLE_TOPS = ['#f2efe9', '#b9875a', '#3d3a3f'];
  const TABLE_TOP_NAMES = ['Marble', 'Wood', 'Black'];
  const FRAME3 = ['#f3efe6', '#a87650', '#3d3a3f'];
  const FRAME3_NAMES = ['White', 'Wood', 'Black'];

  // ---------- Ortak parçalar ----------
  // Arkası bize dönük sandalye (karakter masaya bakarak oturur)
  function chairBack(p, x, y, color) {
    const light = shade(color, 0.2);
    p(x + 1, y, 10, 3, light);
    p(x, y + 2, 1, 10, color);
    p(x + 11, y + 2, 1, 10, color);
    p(x + 1, y + 3, 10, 6, color);
    p(x + 1, y + 3, 10, 1, light);
    p(x + 1, y + 6, 10, 1, shade(color, -0.15));
    p(x + 1, y + 11, 1, 3, color);
    p(x + 10, y + 11, 1, 3, color);
  }

  // Yüzü bize dönük sandalye (karakter arkasına oturur)
  function chairFront(p, x, y, color) {
    const light = shade(color, 0.2);
    p(x + 1, y, 10, 2, light);
    p(x, y + 1, 1, 12, color);
    p(x + 11, y + 1, 1, 12, color);
    p(x + 1, y + 3, 10, 1, color);
    p(x + 1, y + 6, 10, 1, color);
    p(x + 1, y + 10, 10, 3, light);
    p(x + 1, y + 13, 10, 1, shade(color, -0.2));
    p(x + 1, y + 14, 1, 3, color);
    p(x + 10, y + 14, 1, 3, color);
  }

  function steam(ctx, x, y, t, seed) {
    for (let i = 0; i < 2; i++) {
      const phase = ((t / 900 + seed * 0.37 + i * 0.5) % 1 + 1) % 1;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.75 * (1 - phase)})`;
      ctx.fillRect(x + Math.round(Math.sin((phase + i) * 6) * 1), y - Math.round(phase * 6), 1, 2);
    }
  }

  const occupiedGlow = (x, y, r) => ({ x, y, r, when: 'occupied' });
  const nightGlow = (x, y, r, extra) => ({ x, y, r, when: 'night', ...extra });

  // =====================================================================
  // OTURMA
  // =====================================================================
  I.sofa = {
    name: 'Sofa',
    sw: 32,
    sh: 24,
    colors: FABRIC,
    colorNames: FABRIC_NAMES,
    seats: [
      { x: 0.6, y: 0.875, pose: 'sit', dir: 'down', cells: [[0, 0]], act: 'sit' },
      { x: 1.4, y: 0.875, pose: 'sit', dir: 'down', cells: [[1, 0]], act: 'sit' },
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
  };

  I.armchair = {
    name: 'Armchair',
    sw: 16,
    sh: 24,
    colors: FABRIC,
    colorNames: FABRIC_NAMES,
    seats: [{ x: 0.5, y: 0.875, pose: 'sit', dir: 'down', cells: [[0, 0]], act: 'sit' }],
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
  };

  I.pouf = {
    name: 'Pouf',
    sw: 16,
    sh: 14,
    colors: FABRIC,
    colorNames: FABRIC_NAMES,
    seats: [{ x: 0.5, y: 0.72, pose: 'sit', dir: 'down', cells: [[0, 0]], act: 'sit' }],
    draw(p, c) {
      const f = FABRIC[c];
      p(3, 1, 10, 1, shade(f, 0.22));
      p(1, 2, 14, 5, shade(f, 0.14));
      p(1, 7, 14, 5, f);
      p(2, 12, 12, 2, shade(f, -0.2));
      p(7, 4, 2, 1, shade(f, -0.12));
      p(1, 7, 14, 1, shade(f, -0.06));
    },
  };

  I.beanbag = {
    name: 'Beanbag',
    sw: 16,
    sh: 15,
    colors: FABRIC,
    colorNames: FABRIC_NAMES,
    seats: [{ x: 0.5, y: 0.82, pose: 'sit', dir: 'down', cells: [[0, 0]], act: 'sit' }],
    draw(p, c) {
      const f = FABRIC[c];
      ellipse(p, 8, 9.5, 8, 5.5, shade(f, -0.2));
      ellipse(p, 8, 8.5, 7.5, 5.2, f);
      ellipse(p, 8, 5, 5.5, 3.2, shade(f, 0.14));
      ellipse(p, 8, 7, 3.5, 1.6, shade(f, 0.05));
      p(5, 3, 2, 1, shade(f, 0.3));
    },
  };

  I.bench = {
    name: 'Bench',
    sw: 32,
    sh: 15,
    colors: WOOD,
    colorNames: WOOD_NAMES,
    seats: [
      { x: 0.6, y: 0.9, pose: 'sit', dir: 'down', cells: [[0, 0]], act: 'sit' },
      { x: 1.4, y: 0.9, pose: 'sit', dir: 'down', cells: [[1, 0]], act: 'sit' },
    ],
    draw(p, c) {
      const w = WOOD[c];
      p(1, 3, 30, 5, shade(w, 0.16));
      p(1, 3, 30, 1, shade(w, 0.32));
      p(1, 5, 30, 1, shade(w, 0.06));
      p(1, 8, 30, 2, w);
      p(3, 10, 3, 5, shade(w, -0.22));
      p(26, 10, 3, 5, shade(w, -0.22));
      p(6, 11, 20, 1, shade(w, -0.28));
    },
  };

  I.stool = {
    name: 'Stool',
    sw: 16,
    sh: 17,
    colors: METAL,
    colorNames: METAL_NAMES,
    seats: [{ x: 0.5, y: 0.78, pose: 'sit', dir: 'down', cells: [[0, 0]], act: 'sit' }],
    draw(p, c) {
      const m = METAL[c];
      const seat = c === 3 ? shade(m, 0.1) : '#7a5236';
      ellipse(p, 8, 4.5, 6, 2.6, shade(seat, -0.2));
      ellipse(p, 8, 3.8, 6, 2.4, seat);
      p(5, 2, 4, 1, shade(seat, 0.25));
      p(4, 7, 1, 10, m);
      p(11, 7, 1, 10, m);
      p(7, 7, 2, 8, shade(m, -0.15));
      p(4, 12, 8, 1, m);
    },
  };

  // =====================================================================
  // MASALAR
  // =====================================================================
  I.desk = {
    name: 'Desk',
    sw: 32,
    sh: 40,
    colors: WOOD,
    colorNames: WOOD_NAMES,
    sortY: 1,
    cuts: [30],
    overBand: 0,
    solid: (cx, cy) => cy === 0,
    seats: [{ x: 1, y: 1.75, pose: 'work', dir: 'up', cells: [[0, 1], [1, 1]], band: 0, act: 'work' }],
    glows: [occupiedGlow(27, 7, 26)],
    draw(p, c) {
      const w = WOOD[c];
      const wd = shade(w, -0.22);
      p(0, 8, 32, 7, shade(w, 0.18));
      p(0, 14, 32, 1, shade(w, 0.06));
      p(0, 15, 32, 8, w);
      p(18, 17, 11, 4, wd);
      p(22, 18, 3, 1, '#f0e6cc');
      p(3, 17, 11, 4, wd);
      p(7, 18, 3, 1, '#f0e6cc');
      p(1, 23, 3, 5, wd);
      p(28, 23, 3, 5, wd);
      p(11, 4, 10, 9, '#8a929c');
      p(12, 5, 8, 7, '#2c3440');
      p(10, 13, 12, 2, '#b4bac1');
      p(2, 11, 7, 2, '#d9785f');
      p(3, 9, 6, 2, '#5b7fa8');
      p(3, 9, 6, 1, shade('#5b7fa8', 0.2));
      p(24, 11, 3, 3, '#ece6da');
      p(27, 12, 1, 1, '#ece6da');
      p(28, 4, 1, 8, '#3d424b');
      p(26, 12, 5, 2, '#3d424b');
      p(25, 2, 6, 3, '#e3b766');
      p(25, 2, 6, 1, shade('#e3b766', 0.25));
      p(10, 27, 12, 3, '#6b7586');
      p(9, 30, 14, 7, '#4b5361');
      p(9, 30, 14, 1, '#6b7586');
      p(10, 37, 2, 3, '#3d424b');
      p(20, 37, 2, 3, '#3d424b');
    },
    over(ctx, r, item, env) {
      if (!env.activeItems.has(item.id)) return;
      ctx.fillStyle = '#b9e0ef';
      ctx.fillRect(r.x + 12, r.y + 5, 8, 7);
      ctx.fillStyle = '#5b7fa8';
      const shift = env.focusing ? Math.floor(env.t / 400) % 3 : 0;
      for (let i = 0; i < 3; i++) ctx.fillRect(r.x + 13, r.y + 6 + i * 2, [6, 4, 5][(i + shift) % 3], 1);
    },
  };

  I.cafeTable = {
    name: 'Café table',
    sw: 16,
    sh: 52,
    colors: TABLE_TOPS,
    colorNames: TABLE_TOP_NAMES,
    cuts: [20, 38],
    overBand: 1,
    solid: (cx, cy) => cy === 1,
    seats: [
      { x: 0.5, y: 1.375, pose: 'study', dir: 'down', cells: [[0, 0]], band: 0, act: 'work' },
      { x: 0.5, y: 2.5, pose: 'work', dir: 'up', cells: [[0, 2]], band: 1, act: 'work' },
    ],
    draw(p, c) {
      const t = TABLE_TOPS[c];
      chairFront(p, 2, 1, CHAIR);
      ellipse(p, 8, 25.5, 7.5, 3.6, shade(t, -0.22));
      ellipse(p, 8, 24.3, 7.5, 3.6, t);
      p(5, 21, 4, 1, shade(t, 0.18));
      p(7, 28, 2, 8, '#3d424b');
      p(4, 36, 8, 2, '#3d424b');
      p(3, 23, 5, 1, '#d9d3c9');
      p(4, 21, 3, 2, '#ece6da');
      p(7, 21, 1, 1, '#ece6da');
      p(4, 21, 3, 1, '#8a5a3c');
      p(10, 22, 3, 2, '#e3a857');
      chairBack(p, 2, 38, CHAIR);
    },
    over(ctx, r, item, env) {
      steam(ctx, r.x + 5, r.y + 20, env.t, item.x * 3 + item.y);
    },
  };

  I.readingTable = {
    name: 'Reading table',
    sw: 48,
    sh: 52,
    colors: WOOD,
    colorNames: WOOD_NAMES,
    cuts: [20, 38],
    overBand: 1,
    solid: (cx, cy) => cy === 1,
    seats: [
      { x: 0.75, y: 1.375, pose: 'study', dir: 'down', cells: [[0, 0]], band: 0, act: 'work' },
      { x: 2.25, y: 1.375, pose: 'study', dir: 'down', cells: [[2, 0]], band: 0, act: 'work' },
      { x: 0.75, y: 2.5, pose: 'work', dir: 'up', cells: [[0, 2]], band: 1, act: 'work' },
      { x: 2.25, y: 2.5, pose: 'work', dir: 'up', cells: [[2, 2]], band: 1, act: 'work' },
    ],
    glows: [nightGlow(24, 19, 40)],
    draw(p, c) {
      const w = WOOD[c];
      chairFront(p, 6, 1, CHAIR);
      chairFront(p, 30, 1, CHAIR);
      p(0, 21, 48, 7, shade(w, 0.18));
      p(0, 21, 48, 1, shade(w, 0.3));
      p(0, 28, 48, 2, w);
      p(1, 30, 46, 3, shade(w, -0.22));
      p(1, 33, 3, 5, shade(w, -0.22));
      p(44, 33, 3, 5, shade(w, -0.22));
      // yeşil kütüphane lambası
      p(21, 24, 6, 1, '#c9a24b');
      p(23, 20, 2, 4, '#c9a24b');
      p(19, 17, 10, 3, '#3f7f5a');
      p(19, 17, 10, 1, '#5fa27a');
      // açık kitap ve kitap yığını
      p(8, 23, 8, 3, '#f2efe9');
      p(11, 23, 2, 3, '#d9d3c9');
      p(9, 24, 2, 1, '#b8b2a7');
      p(32, 23, 7, 2, '#5b7fa8');
      p(33, 21, 6, 2, '#d9785f');
      p(34, 19, 4, 2, '#e3b766');
      chairBack(p, 6, 38, CHAIR);
      chairBack(p, 30, 38, CHAIR);
    },
  };

  I.counter = {
    name: 'Bar counter',
    sw: 48,
    sh: 44,
    colors: ['#7a5236', '#e9e2d4', '#3d3a3f'],
    colorNames: ['Walnut', 'White', 'Black'],
    sortY: 1,
    solid: (cx, cy) => cy === 0,
    seats: [0, 1, 2].map((i) => ({
      x: i + 0.5,
      y: 1.4375,
      pose: 'work',
      dir: 'up',
      cells: [[i, 1]],
      act: 'work',
    })),
    draw(p, c) {
      const col = this.colors[c];
      // tezgah
      p(0, 10, 48, 6, '#efe9df');
      p(0, 10, 48, 1, '#ffffff');
      p(0, 15, 48, 1, '#d6cfc3');
      p(0, 16, 48, 12, col);
      p(0, 16, 48, 1, shade(col, 0.15));
      for (const x of [12, 24, 36]) p(x, 17, 1, 9, shade(col, -0.22));
      p(0, 26, 48, 2, shade(col, -0.28));
      // espresso makinesi
      p(3, 2, 12, 8, '#c0c6cc');
      p(3, 2, 12, 1, '#e2e6e9');
      p(5, 4, 3, 2, '#3d424b');
      p(10, 6, 3, 2, '#3d424b');
      p(10, 8, 3, 2, '#ece6da');
      // fincanlar, kurabiye kavanozu, kasa
      p(18, 6, 4, 4, '#ece6da');
      p(18, 6, 4, 1, '#ffffff');
      p(23, 7, 3, 3, '#ece6da');
      p(28, 3, 5, 7, '#d7ecf2');
      p(28, 2, 5, 1, '#8a929c');
      p(29, 6, 3, 2, '#b9875a');
      p(29, 8, 2, 1, '#8a5a3c');
      p(36, 3, 9, 7, '#3d424b');
      p(38, 4, 5, 2, '#9fd3c7');
      // tabureler
      for (const cx of [8, 24, 40]) {
        p(cx - 1, 33, 2, 8, '#8a929c');
        p(cx - 3, 38, 6, 1, '#8a929c');
        p(cx - 3, 42, 6, 2, '#3d424b');
        ellipse(p, cx, 31.5, 4.5, 2, '#3d424b');
        p(cx - 3, 30, 6, 1, '#596273');
      }
    },
    over(ctx, r, item, env) {
      steam(ctx, r.x + 11, r.y + 8, env.t, 1);
    },
  };

  I.table = {
    name: 'Coffee table',
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
  };

  I.sideTable = {
    name: 'Nightstand',
    sw: 16,
    sh: 24,
    colors: WOOD,
    colorNames: WOOD_NAMES,
    glows: [nightGlow(8, 5, 32)],
    draw(p, c) {
      const w = WOOD[c];
      p(1, 11, 14, 2, shade(w, 0.18));
      p(2, 13, 12, 9, w);
      p(3, 14, 10, 3, shade(w, -0.15));
      p(7, 15, 2, 1, '#f0e6cc');
      p(3, 18, 10, 3, shade(w, -0.15));
      p(7, 19, 2, 1, '#f0e6cc');
      p(2, 22, 2, 2, shade(w, -0.25));
      p(12, 22, 2, 2, shade(w, -0.25));
      p(6, 8, 4, 3, '#c9a24b');
      p(7, 6, 2, 2, '#c9a24b');
      p(4, 1, 8, 5, SHADES[0]);
      p(5, 1, 2, 4, '#fbf4e2');
      p(4, 5, 8, 1, shade(SHADES[0], -0.2));
    },
  };

  // =====================================================================
  // YATAK VE DEPOLAMA
  // =====================================================================
  I.bed = {
    name: 'Bed',
    sw: 32,
    sh: 40,
    colors: FABRIC,
    colorNames: FABRIC_NAMES,
    cuts: [19],
    seats: [{ x: 1, y: 1.25, pose: 'lie', dir: 'down', cells: [[0, 1], [1, 1], [0, 0], [1, 0]], band: 0, act: 'lie' }],
    draw(p, c) {
      const f = FABRIC[c];
      const w = '#a87650';
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
  };

  I.bookshelf = {
    name: 'Bookshelf',
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
  };

  I.narrowShelf = {
    name: 'Narrow bookshelf',
    sw: 16,
    sh: 44,
    colors: WOOD,
    colorNames: WOOD_NAMES,
    draw(p, c) {
      const w = WOOD[c];
      const inner = shade(w, -0.4);
      p(0, 0, 16, 44, w);
      p(0, 0, 16, 2, shade(w, 0.18));
      p(2, 2, 12, 38, inner);
      for (const y of [11, 20, 29]) p(2, y, 12, 2, w);
      p(0, 40, 16, 4, shade(w, -0.18));
      books(p, 3, 13, 11, 8, 3 + c);
      books(p, 3, 13, 20, 8, 9 + c);
      books(p, 3, 13, 29, 8, 15 + c);
      books(p, 3, 10, 40, 7, 21 + c);
      p(11, 37, 2, 3, '#c9a24b');
    },
  };

  I.wardrobe = {
    name: 'Wardrobe',
    sw: 32,
    sh: 44,
    colors: WOOD,
    colorNames: WOOD_NAMES,
    draw(p, c) {
      const w = WOOD[c];
      const dark = shade(w, -0.16);
      const light = shade(w, 0.1);
      p(0, 2, 32, 40, w);
      p(0, 0, 32, 3, shade(w, 0.18));
      p(0, 41, 32, 3, shade(w, -0.25));
      for (const x of [2, 17]) {
        p(x, 5, 13, 34, light);
        p(x + 2, 8, 9, 12, dark);
        p(x + 2, 23, 9, 13, dark);
        p(x + 2, 8, 9, 1, shade(dark, -0.15));
        p(x + 2, 23, 9, 1, shade(dark, -0.15));
      }
      p(15, 5, 2, 34, shade(w, -0.3));
      p(13, 19, 1, 5, '#c9a24b');
      p(18, 19, 1, 5, '#c9a24b');
    },
  };

  I.pastryCase = {
    name: 'Pastry case',
    sw: 32,
    sh: 28,
    colors: ['#7a5236', '#e9e2d4', '#3d3a3f'],
    colorNames: ['Walnut', 'White', 'Black'],
    draw(p, c) {
      const col = this.colors[c];
      p(0, 17, 32, 11, col);
      p(0, 17, 32, 1, shade(col, 0.15));
      p(2, 19, 28, 7, shade(col, -0.12));
      p(0, 1, 32, 16, '#9aa1a9');
      p(1, 2, 30, 15, '#dcecf1');
      p(1, 9, 30, 1, '#b8c6cc');
      p(4, 4, 6, 5, '#f2b8b0');
      p(4, 4, 6, 1, '#ffffff');
      p(6, 3, 2, 1, '#d9665b');
      p(13, 5, 5, 4, '#7a5236');
      p(13, 5, 5, 1, '#5a3d2b');
      p(21, 4, 6, 5, '#f4e28a');
      p(21, 4, 6, 1, '#e3b766');
      p(4, 13, 6, 3, '#e3a857');
      p(5, 12, 4, 1, '#f0c27b');
      p(13, 12, 6, 4, '#c4553f');
      p(14, 12, 4, 1, '#e98a8a');
      p(22, 14, 2, 2, '#e59aa6');
      p(25, 14, 2, 2, '#8cc07f');
      p(28, 14, 2, 2, '#f4e28a');
      p(3, 3, 1, 5, '#ffffff');
    },
  };

  // =====================================================================
  // DEKOR
  // =====================================================================
  I.plant = {
    name: 'Plant',
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
  };

  I.bigPlant = {
    name: 'Large plant',
    sw: 20,
    sh: 34,
    ox: -2,
    colors: POTS,
    colorNames: POT_NAMES,
    draw(p, c) {
      const pot = POTS[c];
      p(9, 12, 2, 14, LEAF[0]);
      p(6, 16, 1, 9, LEAF[0]);
      p(13, 15, 1, 10, LEAF[0]);
      ellipse(p, 5, 11, 5, 4, LEAF[1]);
      ellipse(p, 15, 9, 5, 4, LEAF[1]);
      ellipse(p, 10, 4.5, 4.5, 4, LEAF[2]);
      ellipse(p, 4, 19, 4, 3, LEAF[0]);
      ellipse(p, 16, 18, 4, 3, LEAF[1]);
      p(3, 11, 3, 1, LEAF[0]);
      p(14, 9, 3, 1, LEAF[0]);
      p(10, 3, 1, 3, LEAF[1]);
      p(16, 18, 2, 1, LEAF[0]);
      p(4, 25, 12, 2, shade(pot, 0.15));
      p(5, 27, 10, 7, pot);
      p(5, 32, 10, 2, shade(pot, -0.18));
    },
  };

  I.cactus = {
    name: 'Cactus',
    sw: 16,
    sh: 20,
    colors: POTS,
    colorNames: POT_NAMES,
    draw(p, c) {
      const pot = POTS[c];
      const g = '#5f8f5a';
      p(6, 3, 4, 11, g);
      p(7, 3, 1, 11, shade(g, 0.18));
      p(3, 6, 2, 5, g);
      p(3, 10, 3, 2, g);
      p(11, 5, 2, 5, g);
      p(10, 9, 2, 2, g);
      p(7, 2, 2, 1, '#e59aa6');
      for (const [x, y] of [[6, 6], [9, 9], [6, 11], [3, 8], [12, 7]]) p(x, y, 1, 1, '#cfe3b8');
      p(3, 13, 10, 2, shade(pot, 0.15));
      p(4, 15, 8, 5, pot);
      p(4, 18, 8, 2, shade(pot, -0.18));
    },
  };

  I.flowers = {
    name: 'Flower pot',
    sw: 16,
    sh: 20,
    colors: ['#e05d6f', '#f2c14e', '#9b7bb5', '#f2efe9'],
    colorNames: ['Red', 'Yellow', 'Purple', 'White'],
    draw(p, c) {
      const fl = this.colors[c];
      p(7, 6, 1, 8, LEAF[0]);
      p(4, 8, 1, 6, LEAF[0]);
      p(10, 7, 1, 7, LEAF[0]);
      p(2, 10, 4, 2, LEAF[1]);
      p(10, 11, 4, 2, LEAF[1]);
      for (const [x, y] of [[4, 6], [10, 5], [7, 3]]) {
        ellipse(p, x + 0.5, y + 0.5, 2.6, 2.4, fl);
        p(x, y, 1, 1, c === 1 ? '#c4553f' : '#e3b766');
      }
      p(3, 13, 10, 2, '#d98a62');
      p(4, 15, 8, 5, '#c87b55');
      p(4, 18, 8, 2, shade('#c87b55', -0.18));
    },
  };

  I.lamp = {
    name: 'Floor lamp',
    sw: 16,
    sh: 36,
    colors: SHADES,
    colorNames: SHADE_NAMES,
    glows: [nightGlow(8, 11, 46)],
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
  };

  I.lantern = {
    name: 'Lantern',
    sw: 16,
    sh: 21,
    colors: METAL.slice(0, 3),
    colorNames: METAL_NAMES.slice(0, 3),
    glows: [nightGlow(8, 11, 30)],
    draw(p, c) {
      const m = METAL[c];
      p(6, 0, 4, 1, m);
      p(5, 1, 1, 2, m);
      p(10, 1, 1, 2, m);
      p(4, 3, 8, 2, m);
      p(5, 5, 6, 1, shade(m, -0.15));
      p(4, 6, 8, 11, '#f4e6b8');
      p(4, 6, 1, 11, m);
      p(11, 6, 1, 11, m);
      p(7, 6, 2, 11, m);
      p(5, 12, 2, 4, '#ece6da');
      p(9, 12, 2, 4, '#ece6da');
      p(5, 10, 2, 2, '#f7b267');
      p(9, 10, 2, 2, '#f7b267');
      p(3, 17, 10, 2, m);
      p(4, 19, 8, 2, shade(m, -0.2));
    },
  };

  I.fireplace = {
    name: 'Fireplace',
    sw: 32,
    sh: 36,
    colors: ['#b5aca0', '#c9826b', '#e9e2d4'],
    colorNames: ['Stone', 'Brick', 'White'],
    glows: [{ x: 16, y: 24, r: 54, when: 'always', strength: 0.4 }],
    draw(p, c) {
      const s = this.colors[c];
      p(0, 5, 32, 31, s);
      const r = rng(5 + c);
      for (let y = 7; y < 34; y += 4) {
        for (let x = (y % 8) - 2; x < 32; x += 8) p(Math.max(0, x), y, Math.min(7, 32 - Math.max(0, x)), 1, shade(s, -0.12 - r() * 0.05));
      }
      p(0, 3, 32, 3, '#7a5236');
      p(0, 3, 32, 1, '#9a6a46');
      p(4, 0, 2, 3, '#ece6da');
      p(4, -1, 2, 1, '#f7b267');
      p(25, 0, 3, 3, '#5b7fa8');
      p(7, 14, 18, 18, '#2a2026');
      p(9, 12, 14, 2, '#2a2026');
      p(8, 15, 16, 16, '#3a2c35');
      p(9, 27, 14, 3, '#7a5236');
      p(11, 25, 10, 2, '#5a3d2b');
      p(4, 32, 24, 4, shade(s, -0.22));
      p(4, 32, 24, 1, shade(s, 0.1));
    },
    over(ctx, r, item, env) {
      const t = env.t / 1000;
      const cols = ['#d9502f', '#f08a3c', '#f7d154'];
      for (let i = 0; i < 6; i++) {
        const h = 4 + Math.round(4 * Math.abs(Math.sin(t * 3.1 + i * 1.7)));
        const x = r.x + 10 + i * 2;
        cols.forEach((col, k) => {
          const hh = Math.max(1, h - k * 2);
          ctx.fillStyle = col;
          ctx.fillRect(x + (k === 2 ? 0 : 0), r.y + 26 - hh, 2 - (k === 2 ? 1 : 0), hh);
        });
      }
    },
  };

  I.recordPlayer = {
    name: 'Record player',
    sw: 16,
    sh: 24,
    colors: WOOD,
    colorNames: WOOD_NAMES,
    draw(p, c) {
      const w = WOOD[c];
      p(0, 9, 16, 2, shade(w, 0.18));
      p(1, 11, 14, 11, w);
      p(3, 13, 10, 7, shade(w, -0.22));
      for (let y = 14; y < 20; y += 2) p(3, y, 10, 1, shade(w, -0.35));
      p(2, 22, 2, 2, shade(w, -0.3));
      p(12, 22, 2, 2, shade(w, -0.3));
      p(1, 3, 14, 6, '#3d424b');
      ellipse(p, 7, 6, 5, 2.3, '#1f1d22');
      p(6, 5, 2, 1, '#d9665b');
      p(13, 2, 1, 5, '#c0c6cc');
      p(11, 6, 2, 1, '#c0c6cc');
    },
    over(ctx, r, item, env) {
      const a = env.t / 300;
      ctx.fillStyle = '#6b6f78';
      ctx.fillRect(r.x + 7 + Math.round(Math.cos(a) * 3.5), r.y + 6 + Math.round(Math.sin(a) * 1.4), 1, 1);
      const phase = (env.t / 2600 + item.x * 0.13) % 1;
      if (phase < 0.6 && !env.thumb) {
        const k = phase / 0.6;
        ctx.fillStyle = `rgba(91, 127, 168, ${1 - k})`;
        const nx = r.x + 12 + Math.round(Math.sin(k * 6) * 2);
        const ny = r.y - 2 - Math.round(k * 12);
        ctx.fillRect(nx, ny, 1, 3);
        ctx.fillRect(nx - 1, ny + 2, 1, 1);
        ctx.fillRect(nx + 1, ny, 1, 1);
      }
    },
  };

  I.globe = {
    name: 'Globe',
    sw: 16,
    sh: 24,
    colors: WOOD.slice(0, 3),
    colorNames: WOOD_NAMES.slice(0, 3),
    draw(p, c) {
      const w = WOOD[c];
      p(4, 21, 8, 3, w);
      p(4, 21, 8, 1, shade(w, 0.18));
      p(7, 15, 2, 6, w);
      ellipse(p, 8, 8.5, 5.5, 5.5, '#5b9bc8');
      p(5, 5, 3, 2, '#7fae73');
      p(4, 7, 2, 2, '#7fae73');
      p(9, 8, 3, 3, '#7fae73');
      p(10, 11, 1, 2, '#7fae73');
      p(6, 11, 2, 2, '#7fae73');
      p(5, 4, 2, 1, '#a8d0ea');
      for (let y = 3; y <= 14; y++) p(y < 6 || y > 11 ? 2 : 1, y, 1, 1, '#c9a24b');
      p(3, 2, 2, 1, '#c9a24b');
      p(3, 15, 4, 1, '#c9a24b');
    },
  };

  I.cat = {
    name: 'Cat',
    sw: 16,
    sh: 13,
    colors: ['#e39a4f', '#3d3a3f', '#9aa1a9', '#f2efe9'],
    colorNames: ['Orange', 'Black', 'Gray', 'White'],
    use: 'pet',
    draw(p, c) {
      const col = this.colors[c];
      const dark = shade(col, c === 1 ? 0.25 : -0.22);
      ellipse(p, 8, 9, 8, 4, '#b4825a');
      ellipse(p, 8, 8.6, 6.4, 3, '#e8d8c3');
      ellipse(p, 9, 6.8, 5, 3, col);
      p(10, 9, 4, 1, dark);
      p(2, 4, 5, 4, col);
      p(2, 3, 1, 1, col);
      p(5, 3, 1, 1, col);
      p(3, 6, 1, 1, '#2b2230');
      p(5, 6, 1, 1, '#2b2230');
      p(4, 7, 1, 1, '#f0a3a0');
      if (c === 0) {
        p(8, 4, 1, 2, dark);
        p(10, 4, 1, 2, dark);
        p(12, 5, 1, 2, dark);
      }
      if (c === 3) p(9, 5, 3, 2, '#e3b766');
    },
    over(ctx, r, item, env) {
      if (env.thumb) return;
      const breathe = Math.floor(env.t / 1400) % 2;
      if (breathe) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.fillRect(r.x + 7, r.y + 4, 5, 1);
      }
    },
  };

  I.rug = {
    name: 'Rug',
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
  };

  I.roundRug = {
    name: 'Round rug',
    sw: 32,
    sh: 32,
    colors: FABRIC,
    colorNames: FABRIC_NAMES,
    outlineColor: (c) => shade(FABRIC[c], -0.42),
    draw(p, c) {
      const f = FABRIC[c];
      const light = shade(f, 0.3);
      ellipse(p, 16, 16, 16, 16, f);
      ellipse(p, 16, 16, 13, 13, light);
      ellipse(p, 16, 16, 11.5, 11.5, f);
      ellipse(p, 16, 16, 6, 6, light);
      ellipse(p, 16, 16, 3.5, 3.5, shade(f, -0.15));
      for (let a = 0; a < 12; a++) {
        const x = 16 + Math.cos((a / 12) * Math.PI * 2) * 9;
        const y = 16 + Math.sin((a / 12) * Math.PI * 2) * 9;
        p(Math.floor(x), Math.floor(y), 1, 1, light);
      }
    },
  };

  // =====================================================================
  // DUVAR
  // =====================================================================
  I.window = {
    name: 'Window',
    sw: 32,
    sh: 27,
    wy: 6,
    colors: FRAME3,
    colorNames: FRAME3_NAMES,
    draw(p, c, g) {
      const fc = FRAME3[c];
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
    under(ctx, r, item, env) {
      Art.drawSky(ctx, r.x + 2, r.y + 2, 28, 19, env);
    },
  };

  I.archWindow = {
    name: 'Arched window',
    sw: 30,
    sh: 39,
    ox: 1,
    wy: 3,
    colors: FRAME3,
    colorNames: FRAME3_NAMES,
    draw(p, c, g) {
      const fc = FRAME3[c];
      ellipse(p, 15, 15, 15, 15, fc);
      p(0, 15, 30, 20, fc);
      g.globalCompositeOperation = 'destination-out';
      ellipse(p, 15, 15, 12.5, 12.5, '#000000');
      p(3, 15, 24, 18, '#000000');
      g.globalCompositeOperation = 'source-over';
      p(14, 2, 2, 31, fc);
      p(3, 20, 24, 1, fc);
      p(3, 11, 24, 1, fc);
      p(0, 34, 30, 3, shade(fc, -0.08));
      p(0, 34, 30, 1, shade(fc, 0.12));
      p(1, 37, 28, 2, shade(fc, -0.25));
    },
    under(ctx, r, item, env) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(r.x + 15, r.y + 15, 13, Math.PI, 0);
      ctx.lineTo(r.x + 28, r.y + 34);
      ctx.lineTo(r.x + 2, r.y + 34);
      ctx.closePath();
      ctx.clip();
      Art.drawSky(ctx, r.x + 2, r.y + 2, 26, 32, env);
      ctx.restore();
    },
  };

  I.board = {
    name: 'Cork board',
    sw: 30,
    sh: 19,
    ox: 1,
    wy: 9,
    colors: ['#cfa673'],
    colorNames: ['Cork'],
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
  };

  I.chalkboard = {
    name: 'Menu board',
    sw: 30,
    sh: 21,
    ox: 1,
    wy: 8,
    colors: ['#7a5236', '#3d3a3f'],
    colorNames: ['Wood', 'Black'],
    draw(p, c) {
      const fc = this.colors[c];
      p(0, 0, 30, 20, fc);
      p(0, 0, 30, 1, shade(fc, 0.2));
      p(2, 2, 26, 16, '#2f3a35');
      p(5, 4, 9, 1, '#efece4');
      p(5, 7, 11, 1, '#d6d3cb');
      p(5, 10, 8, 1, '#d6d3cb');
      p(5, 13, 10, 1, '#d6d3cb');
      p(18, 7, 3, 1, '#f2c14e');
      p(18, 10, 3, 1, '#f2c14e');
      p(18, 13, 3, 1, '#f2c14e');
      p(22, 4, 4, 1, '#efece4');
      p(22, 5, 1, 2, '#efece4');
      p(25, 5, 1, 2, '#efece4');
      p(23, 7, 2, 1, '#efece4');
      p(26, 5, 1, 1, '#efece4');
      p(4, 18, 22, 2, shade(fc, -0.2));
      p(8, 17, 2, 1, '#ffffff');
    },
  };

  I.shelf = {
    name: 'Wall shelf',
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
  };

  I.painting = {
    name: 'Painting',
    sw: 14,
    sh: 12,
    ox: 1,
    wy: 12,
    colors: ['#7fae73', '#e98a5b', '#4f78a3', '#e59aa6', '#3d3a3f'],
    colorNames: ['Mountains', 'Sunset', 'Sea', 'Flowers', 'Abstract'],
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
      } else if (c === 2) {
        p(1, 1, 12, 5, '#d8ecf5');
        p(1, 6, 12, 5, '#4f78a3');
        p(2, 7, 3, 1, '#8fb7dc');
        p(8, 8, 3, 1, '#8fb7dc');
        p(4, 9, 2, 1, '#8fb7dc');
        p(8, 2, 1, 4, '#ffffff');
        p(9, 3, 1, 3, '#ffffff');
        p(7, 6, 4, 1, '#7a5236');
      } else if (c === 3) {
        p(1, 1, 12, 10, '#f3ece0');
        p(5, 7, 4, 4, '#5b7fa8');
        p(6, 4, 1, 3, LEAF[0]);
        p(8, 5, 1, 2, LEAF[0]);
        p(4, 2, 3, 3, '#e05d6f');
        p(8, 3, 3, 3, '#f2c14e');
        p(6, 1, 2, 2, '#e59aa6');
      } else {
        p(1, 1, 12, 10, '#efe9df');
        p(2, 2, 5, 5, '#d9785f');
        p(7, 5, 5, 5, '#5b7fa8');
        p(3, 7, 3, 3, '#e3b766');
        p(9, 2, 2, 2, '#3d3a3f');
      }
    },
  };

  I.poster = {
    name: 'Poster',
    sw: 12,
    sh: 16,
    ox: 2,
    wy: 9,
    colors: ['#d9665b', '#e3b766', '#5b7fa8', '#2f3550'],
    colorNames: ['Tomato', 'Coffee', 'Waves', 'Night'],
    draw(p, c) {
      if (c === 0) {
        p(0, 0, 12, 16, '#f3ece0');
        ellipse(p, 6, 8.5, 4.2, 3.8, '#d9665b');
        p(4, 6, 2, 1, '#e98a8a');
        p(5, 4, 3, 1, '#5f9a5a');
        p(6, 3, 1, 1, '#5f9a5a');
        p(2, 13, 8, 1, '#3d3a3f');
      } else if (c === 1) {
        p(0, 0, 12, 16, '#e3b766');
        p(3, 7, 6, 5, '#f2efe9');
        p(9, 8, 1, 2, '#f2efe9');
        p(4, 8, 4, 1, '#7a5236');
        p(4, 4, 1, 2, '#ffffff');
        p(6, 3, 1, 3, '#ffffff');
        p(2, 13, 8, 1, '#7a5236');
      } else if (c === 2) {
        p(0, 0, 12, 16, '#d8ecf5');
        p(0, 8, 12, 8, '#5b7fa8');
        p(1, 8, 4, 1, '#ffffff');
        p(6, 10, 5, 1, '#ffffff');
        p(2, 12, 4, 1, '#ffffff');
        ellipse(p, 8, 4, 2.2, 2.2, '#f2c14e');
      } else {
        p(0, 0, 12, 16, '#2f3550');
        p(6, 3, 3, 4, '#f6efc6');
        p(5, 4, 1, 2, '#f6efc6');
        p(8, 3, 1, 3, '#2f3550');
        for (const [x, y] of [[2, 2], [3, 9], [9, 10], [6, 12], [10, 6]]) p(x, y, 1, 1, '#f4f1d0');
      }
      p(0, 0, 2, 1, '#f4e6b8');
      p(10, 0, 2, 1, '#f4e6b8');
    },
  };

  I.clock = {
    name: 'Wall clock',
    sw: 11,
    sh: 11,
    ox: 2,
    wy: 11,
    colors: ['#3d424b', '#a87650', '#d9785f'],
    colorNames: ['Black', 'Wood', 'Terracotta'],
    draw(p, c) {
      ellipse(p, 5.5, 5.5, 5.5, 5.5, this.colors[c]);
      ellipse(p, 5.5, 5.5, 4.3, 4.3, '#f6f2ea');
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
          ctx.fillRect(r.x + Math.round(5 + Math.sin(angle) * s), r.y + Math.round(5 - Math.cos(angle) * s), 1, 1);
        }
      };
      hand((min / 60) * Math.PI * 2, 3.6, '#3d424b');
      hand((hr / 12) * Math.PI * 2, 2.4, '#d9665b');
    },
  };

  I.sconce = {
    name: 'Sconce',
    sw: 10,
    sh: 14,
    ox: 3,
    wy: 14,
    colors: METAL.slice(0, 3),
    colorNames: METAL_NAMES.slice(0, 3),
    glows: [nightGlow(5, 4, 26)],
    draw(p, c) {
      const m = METAL[c];
      p(4, 9, 2, 5, m);
      p(3, 12, 4, 2, m);
      p(5, 6, 1, 3, m);
      p(2, 0, 6, 1, '#f1e4c4');
      p(1, 1, 8, 3, '#f1e4c4');
      p(0, 4, 10, 2, '#f1e4c4');
      p(0, 5, 10, 1, shade('#f1e4c4', -0.2));
      p(2, 1, 2, 4, '#fbf4e2');
    },
  };

  const LIGHT_SCHEMES = [
    ['#f7d58a'],
    ['#e05d6f', '#f2c14e', '#6fa268', '#5b7fa8', '#9b7bb5'],
    ['#bfe3f5'],
  ];
  const BULBS = [3, 9, 15, 21, 27, 33, 39, 45];
  const wireY = (x) => 2 + Math.round(3 * Math.sin((Math.PI * (x % 16)) / 16));

  I.stringLights = {
    name: 'String lights',
    sw: 48,
    sh: 10,
    wy: 3,
    colors: ['#f7d58a', '#e05d6f', '#bfe3f5'],
    colorNames: ['Warm', 'Colorful', 'Ice blue'],
    noOutline: true,
    glows: BULBS.map((x) => ({ x, y: wireY(x) + 3, r: 12, when: 'night', strength: 0.22 })),
    draw(p, c) {
      for (let x = 0; x < 48; x++) p(x, wireY(x), 1, 1, '#3d3a3f');
      const scheme = LIGHT_SCHEMES[c];
      BULBS.forEach((x, i) => {
        const y = wireY(x) + 1;
        p(x, y, 1, 1, '#3d3a3f');
        p(x - 1, y + 1, 3, 3, shade(scheme[i % scheme.length], -0.12));
        p(x, y + 1, 1, 1, '#ffffff');
      });
    },
    over(ctx, r, item, env) {
      if (env.light.night < 0.3) return;
      const scheme = LIGHT_SCHEMES[item.c];
      BULBS.forEach((x, i) => {
        const tw = 0.7 + 0.3 * Math.sin(env.t / 400 + i * 1.3);
        ctx.globalAlpha = tw;
        ctx.fillStyle = shade(scheme[i % scheme.length], 0.35);
        ctx.fillRect(r.x + x - 1, r.y + wireY(x) + 2, 3, 3);
        ctx.globalAlpha = 1;
      });
    },
  };

  const NEON = ['#ff6fa8', '#4fe0d0', '#ffd257'];

  I.neon = {
    name: 'Neon sign',
    sw: 28,
    sh: 18,
    ox: 2,
    wy: 8,
    colors: NEON,
    colorNames: ['Pink', 'Turquoise', 'Yellow'],
    noOutline: true,
    glows: [{ x: 14, y: 9, r: 30, when: 'always', strength: 0.18, tint: true }],
    draw(p, c) {
      neonShape(p, shade(NEON[c], -0.35));
    },
    over(ctx, r, item, env) {
      const flicker = Math.sin(env.t / 90) > 0.97 ? 0.5 : 1;
      ctx.globalAlpha = flicker;
      neonShape((x, y, w, h, col) => {
        ctx.fillStyle = col;
        ctx.fillRect(r.x + x, r.y + y, w, h);
      }, NEON[item.c]);
      ctx.globalAlpha = 1;
    },
  };

  function neonShape(p, col) {
    p(6, 7, 13, 1, col);
    p(6, 7, 1, 7, col);
    p(18, 7, 1, 7, col);
    p(7, 14, 11, 1, col);
    p(19, 9, 3, 1, col);
    p(21, 9, 1, 3, col);
    p(19, 12, 3, 1, col);
    p(4, 16, 17, 1, col);
    p(9, 1, 1, 2, col);
    p(10, 3, 1, 2, col);
    p(14, 0, 1, 2, col);
    p(15, 2, 1, 2, col);
    p(14, 4, 1, 1, col);
  }

  I.hangingPlant = {
    name: 'Hanging planter',
    sw: 14,
    sh: 26,
    ox: 1,
    wy: 2,
    colors: POTS.slice(0, 3),
    colorNames: POT_NAMES.slice(0, 3),
    draw(p, c) {
      const pot = POTS[c];
      p(6, 0, 2, 2, '#8a8f97');
      p(6, 2, 1, 6, '#d9c7a5');
      p(4, 6, 1, 6, '#d9c7a5');
      p(9, 6, 1, 6, '#d9c7a5');
      p(5, 5, 4, 1, '#d9c7a5');
      p(4, 8, 6, 3, LEAF[2]);
      p(3, 9, 2, 2, LEAF[1]);
      p(9, 9, 2, 2, LEAF[1]);
      p(3, 11, 8, 6, pot);
      p(3, 11, 8, 1, shade(pot, 0.15));
      p(3, 16, 8, 1, shade(pot, -0.2));
      p(1, 13, 2, 7, LEAF[1]);
      p(0, 18, 2, 3, LEAF[0]);
      p(11, 14, 2, 9, LEAF[0]);
      p(12, 20, 2, 4, LEAF[1]);
      p(5, 17, 2, 6, LEAF[1]);
      p(6, 22, 1, 3, LEAF[2]);
    },
  };

  // =====================================================================
  // YÖNLER (views): 1 = sola bakar, 2 = arkası dönük; 3 otomatik olarak 1'in aynasıdır
  // =====================================================================

  // Yandan görünen sandalye; facingRight: oturan sağa bakar (arkalık solda)
  function sideChair(p, x, y, facingRight, color) {
    const light = shade(color, 0.2);
    const backX = facingRight ? x : x + 10;
    p(backX, y - 10, 2, 13, color);
    p(backX, y - 10, 2, 1, light);
    p(x + (facingRight ? 1 : 1), y, 11, 3, light);
    p(x + 1, y + 3, 11, 1, shade(color, -0.2));
    p(x + 2, y + 4, 1, 6, color);
    p(x + 10, y + 4, 1, 6, color);
  }

  // Kanepe: yandan (oturan sola bakar, arkalık sağda) ve arkadan
  I.sofa.views = {
    1: {
      sw: 16,
      sh: 40,
      seats: [
        { x: 0.5, y: 0.75, pose: 'sit', dir: 'left', cells: [[0, 0]], act: 'sit' },
        { x: 0.5, y: 1.6, pose: 'sit', dir: 'left', cells: [[0, 1]], act: 'sit' },
      ],
      draw(p, c) {
        const f = FABRIC[c];
        const fl = shade(f, 0.16);
        const fd = shade(f, -0.16);
        p(10, 3, 6, 33, fd);
        p(10, 3, 6, 2, f);
        p(1, 8, 10, 11, fl);
        p(1, 20, 10, 11, fl);
        p(1, 19, 10, 1, f);
        p(0, 8, 2, 23, fd);
        p(0, 2, 15, 7, f);
        p(0, 2, 15, 2, fl);
        p(0, 30, 15, 7, f);
        p(0, 30, 15, 2, fl);
        p(0, 36, 16, 1, shade(f, -0.32));
        p(1, 37, 2, 3, '#5a3d2b');
        p(12, 37, 2, 3, '#5a3d2b');
      },
    },
    2: {
      cuts: [10],
      seats: [
        { x: 0.6, y: 0.55, pose: 'sit', dir: 'up', cells: [[0, 0]], band: 0, act: 'sit' },
        { x: 1.4, y: 0.55, pose: 'sit', dir: 'up', cells: [[1, 0]], band: 0, act: 'sit' },
      ],
      draw(p, c) {
        const f = FABRIC[c];
        const fl = shade(f, 0.16);
        const fd = shade(f, -0.16);
        p(4, 2, 11, 8, fl);
        p(17, 2, 11, 8, fl);
        p(15, 2, 2, 8, f);
        p(0, 0, 5, 20, f);
        p(27, 0, 5, 20, f);
        p(0, 0, 5, 2, fl);
        p(27, 0, 5, 2, fl);
        p(2, 10, 28, 11, fd);
        p(2, 10, 28, 2, f);
        p(2, 15, 28, 1, shade(f, -0.25));
        p(1, 21, 30, 1, shade(f, -0.32));
        p(3, 22, 2, 2, '#5a3d2b');
        p(27, 22, 2, 2, '#5a3d2b');
      },
    },
  };

  I.armchair.views = {
    1: {
      seats: [{ x: 0.5, y: 0.8, pose: 'sit', dir: 'left', cells: [[0, 0]], act: 'sit' }],
      draw(p, c) {
        const f = FABRIC[c];
        const fl = shade(f, 0.16);
        const fd = shade(f, -0.16);
        p(10, 3, 6, 19, fd);
        p(10, 3, 6, 2, f);
        p(1, 9, 10, 10, fl);
        p(0, 9, 2, 10, fd);
        p(0, 4, 15, 6, f);
        p(0, 4, 15, 2, fl);
        p(0, 16, 15, 6, f);
        p(0, 16, 15, 2, fl);
        p(0, 21, 16, 1, shade(f, -0.32));
        p(1, 22, 2, 2, '#5a3d2b');
        p(12, 22, 2, 2, '#5a3d2b');
      },
    },
    2: {
      cuts: [10],
      seats: [{ x: 0.5, y: 0.55, pose: 'sit', dir: 'up', cells: [[0, 0]], band: 0, act: 'sit' }],
      draw(p, c) {
        const f = FABRIC[c];
        const fl = shade(f, 0.16);
        const fd = shade(f, -0.16);
        p(3, 2, 10, 8, fl);
        p(0, 0, 3, 20, f);
        p(13, 0, 3, 20, f);
        p(0, 0, 3, 2, fl);
        p(13, 0, 3, 2, fl);
        p(1, 10, 14, 11, fd);
        p(1, 10, 14, 2, f);
        p(1, 21, 14, 1, shade(f, -0.32));
        p(2, 22, 2, 2, '#5a3d2b');
        p(12, 22, 2, 2, '#5a3d2b');
      },
    },
  };

  I.bench.views = {
    1: {
      sw: 16,
      sh: 36,
      seats: [
        { x: 0.55, y: 0.6, pose: 'sit', dir: 'left', cells: [[0, 0]], act: 'sit' },
        { x: 0.55, y: 1.45, pose: 'sit', dir: 'left', cells: [[0, 1]], act: 'sit' },
      ],
      draw(p, c) {
        const w = WOOD[c];
        p(3, 4, 10, 28, shade(w, 0.16));
        p(3, 4, 10, 1, shade(w, 0.32));
        p(3, 13, 10, 1, shade(w, -0.08));
        p(3, 22, 10, 1, shade(w, -0.08));
        p(3, 32, 10, 2, w);
        p(4, 34, 2, 2, shade(w, -0.22));
        p(10, 34, 2, 2, shade(w, -0.22));
      },
    },
  };

  I.table.views = {
    1: {
      sw: 16,
      sh: 34,
      draw(p, c) {
        const w = WOOD[c];
        p(2, 2, 12, 26, shade(w, 0.18));
        p(2, 28, 12, 2, w);
        p(3, 30, 2, 4, shade(w, -0.2));
        p(11, 30, 2, 4, shade(w, -0.2));
        p(5, 5, 3, 3, '#ece6da');
        p(5, 5, 3, 1, '#8a5a3c');
        p(5, 12, 6, 7, '#5b7fa8');
        p(5, 18, 6, 1, '#f2efe9');
        p(6, 22, 4, 3, '#c87b55');
        p(5, 20, 3, 2, LEAF[1]);
        p(8, 19, 2, 3, LEAF[2]);
      },
    },
  };

  I.rug.views = { 1: { sw: 32, sh: 48, rotateOf: 0 } };

  I.desk.views = {
    // masa altta, sandalye arkasında: oturan bize bakar
    2: {
      cuts: [21],
      overBand: 1,
      sortY: 2,
      solid: (cx, cy) => cy === 1,
      seats: [{ x: 1, y: 1.15, pose: 'study', dir: 'down', cells: [[0, 0], [1, 0]], band: 0, act: 'work' }],
      glows: [{ x: 28, y: 21, r: 26, when: 'occupied' }],
      over: undefined,
      draw(p, c) {
        const w = WOOD[c];
        chairFront(p, 10, 4, '#4b5361');
        p(0, 24, 32, 7, shade(w, 0.18));
        p(0, 24, 32, 1, shade(w, 0.3));
        p(0, 31, 32, 6, w);
        p(1, 37, 3, 3, shade(w, -0.22));
        p(28, 37, 3, 3, shade(w, -0.22));
        p(11, 21, 10, 7, '#8a929c');
        p(11, 21, 10, 1, '#b4bac1');
        p(15, 24, 2, 2, '#c0c6cc');
        p(2, 27, 7, 2, '#d9785f');
        p(3, 25, 6, 2, '#5b7fa8');
        p(28, 22, 1, 6, '#3d424b');
        p(26, 28, 5, 2, '#3d424b');
        p(25, 19, 6, 3, '#e3b766');
      },
    },
    // masa solda, sandalye sağda: oturan sola bakar
    1: {
      sortY: 2,
      solid: (cx) => cx === 0,
      seats: [{ x: 1.4, y: 1.35, pose: 'work', dir: 'left', cells: [[1, 0], [1, 1]], act: 'work' }],
      glows: [{ x: 6, y: 11, r: 26, when: 'occupied' }],
      over(ctx, r, item, env) {
        if (!env.activeItems.has(item.id)) return;
        ctx.fillStyle = '#b9e0ef';
        ctx.fillRect(r.x + 4, r.y + 19, 1, 9);
      },
      draw(p, c) {
        const w = WOOD[c];
        p(0, 9, 15, 25, shade(w, 0.18));
        p(0, 9, 15, 1, shade(w, 0.3));
        p(0, 34, 15, 4, w);
        p(1, 38, 2, 2, shade(w, -0.22));
        p(12, 38, 2, 2, shade(w, -0.22));
        p(6, 19, 6, 9, '#b4bac1');
        p(4, 18, 2, 11, '#8a929c');
        p(3, 9, 5, 3, '#e3b766');
        p(5, 12, 1, 3, '#3d424b');
        p(4, 15, 3, 1, '#3d424b');
        p(3, 30, 7, 2, '#d9785f');
        p(4, 28, 6, 2, '#5b7fa8');
        sideChair(p, 17, 26, false, '#4b5361');
      },
    },
  };

  I.bed.views = {
    // baş solda
    1: {
      seats: [{ x: 0.85, y: 1.45, pose: 'lie', dir: 'left', cells: [[0, 0], [1, 0], [0, 1], [1, 1]], act: 'lie' }],
      draw(p, c) {
        const f = FABRIC[c];
        const w = '#a87650';
        p(0, 4, 4, 35, w);
        p(0, 4, 4, 2, shade(w, 0.18));
        p(29, 10, 3, 29, w);
        p(3, 10, 26, 27, '#f3eee6');
        p(5, 12, 10, 23, '#ffffff');
        p(14, 12, 1, 23, '#ddd6cb');
        this.cover(p, c);
        p(3, 37, 26, 3, shade(w, -0.12));
      },
      cover(p, c) {
        const f = FABRIC[c];
        p(16, 10, 13, 27, f);
        p(16, 10, 3, 27, shade(f, 0.28));
        p(23, 10, 1, 27, shade(f, -0.08));
        p(16, 34, 13, 3, shade(f, -0.18));
      },
    },
  };

  I.cafeTable.views = {
    1: {
      sw: 48,
      sh: 28,
      solid: (cx) => cx === 1,
      seats: [
        { x: 0.6, y: 0.62, pose: 'work', dir: 'right', cells: [[0, 0]], act: 'work' },
        { x: 2.4, y: 0.62, pose: 'work', dir: 'left', cells: [[2, 0]], act: 'work' },
      ],
      draw(p, c) {
        const t = TABLE_TOPS[c];
        sideChair(p, 2, 16, true, CHAIR);
        sideChair(p, 33, 16, false, CHAIR);
        ellipse(p, 24, 19.5, 7.5, 3.6, shade(t, -0.22));
        ellipse(p, 24, 18.3, 7.5, 3.6, t);
        p(21, 15, 4, 1, shade(t, 0.18));
        p(23, 22, 2, 5, '#3d424b');
        p(20, 26, 8, 2, '#3d424b');
        p(20, 17, 5, 1, '#d9d3c9');
        p(21, 15, 3, 2, '#ece6da');
        p(21, 15, 3, 1, '#8a5a3c');
        p(26, 16, 3, 2, '#e3a857');
      },
      over(ctx, r, item, env) {
        steam(ctx, r.x + 22, r.y + 14, env.t, item.x + item.y);
      },
    },
  };

  I.readingTable.views = {
    1: {
      solid: (cx) => cx === 1,
      seats: [
        { x: 0.6, y: 1.05, pose: 'work', dir: 'right', cells: [[0, 0]], act: 'work' },
        { x: 0.6, y: 2.55, pose: 'work', dir: 'right', cells: [[0, 2]], act: 'work' },
        { x: 2.4, y: 1.05, pose: 'work', dir: 'left', cells: [[2, 0]], act: 'work' },
        { x: 2.4, y: 2.55, pose: 'work', dir: 'left', cells: [[2, 2]], act: 'work' },
      ],
      glows: [{ x: 24, y: 24, r: 40, when: 'night' }],
      draw(p, c) {
        const w = WOOD[c];
        sideChair(p, 2, 16, true, CHAIR);
        sideChair(p, 2, 40, true, CHAIR);
        p(16, 5, 16, 41, shade(w, 0.18));
        p(16, 5, 16, 1, shade(w, 0.3));
        p(16, 46, 16, 3, w);
        p(17, 49, 2, 3, shade(w, -0.22));
        p(29, 49, 2, 3, shade(w, -0.22));
        sideChair(p, 33, 16, false, CHAIR);
        sideChair(p, 33, 40, false, CHAIR);
        p(21, 26, 6, 1, '#c9a24b');
        p(23, 22, 2, 4, '#c9a24b');
        p(19, 19, 10, 3, '#3f7f5a');
        p(19, 19, 10, 1, '#5fa27a');
        p(18, 10, 6, 7, '#f2efe9');
        p(18, 13, 6, 1, '#d9d3c9');
        p(25, 34, 5, 6, '#5b7fa8');
        p(25, 32, 5, 2, '#d9785f');
      },
    },
  };

  // =====================================================================
  // EK EŞYALAR
  // =====================================================================

  I.rockingChair = {
    name: 'Rocking chair',
    sw: 16,
    sh: 26,
    colors: WOOD,
    colorNames: WOOD_NAMES,
    seats: [{ x: 0.5, y: 0.82, pose: 'sit', dir: 'down', cells: [[0, 0]], act: 'sit' }],
    draw(p, c) {
      const w = WOOD[c];
      const wd = shade(w, -0.22);
      p(2, 1, 12, 2, shade(w, 0.18));
      for (const x of [3, 6, 9, 12]) p(x, 3, 1, 11, w);
      p(2, 3, 1, 15, wd);
      p(13, 3, 1, 15, wd);
      p(3, 13, 10, 3, '#d9785f');
      p(3, 13, 10, 1, shade('#d9785f', 0.2));
      p(2, 16, 12, 3, w);
      p(1, 11, 2, 2, w);
      p(13, 11, 2, 2, w);
      p(3, 19, 2, 4, wd);
      p(11, 19, 2, 4, wd);
      p(1, 23, 14, 1, wd);
      p(0, 22, 1, 1, wd);
      p(15, 22, 1, 1, wd);
    },
  };

  I.eggChair = {
    name: 'Egg chair',
    sw: 16,
    sh: 36,
    colors: FABRIC,
    colorNames: FABRIC_NAMES,
    seats: [{ x: 0.5, y: 0.62, pose: 'sit', dir: 'down', cells: [[0, 0]], act: 'sit' }],
    draw(p, c) {
      const wick = '#c9a46a';
      p(3, 0, 10, 2, '#3d424b');
      p(7, 2, 2, 5, '#8a8f97');
      ellipse(p, 8, 20, 7.8, 11, shade(wick, -0.15));
      ellipse(p, 8, 19.5, 7.3, 10.5, wick);
      const r = rng(9);
      for (let i = 0; i < 30; i++) p(1 + Math.floor(r() * 14), 10 + Math.floor(r() * 20), 1, 1, shade(wick, -0.2));
      ellipse(p, 8, 21, 5.2, 7.5, shade(FABRIC[c], -0.25));
      ellipse(p, 8, 22, 4.8, 6.5, FABRIC[c]);
      p(5, 18, 2, 1, shade(FABRIC[c], 0.25));
      p(5, 31, 6, 3, '#8a8f97');
      p(3, 34, 10, 2, '#3d424b');
    },
  };

  I.floorCushion = {
    name: 'Floor cushion',
    sw: 16,
    sh: 10,
    colors: FABRIC,
    colorNames: FABRIC_NAMES,
    seats: [{ x: 0.5, y: 0.95, pose: 'sit', dir: 'down', cells: [[0, 0]], act: 'sit' }],
    draw(p, c) {
      const f = FABRIC[c];
      p(1, 2, 14, 6, f);
      p(2, 1, 12, 1, shade(f, 0.2));
      p(1, 2, 14, 2, shade(f, 0.14));
      p(1, 7, 14, 2, shade(f, -0.2));
      p(7, 4, 2, 2, shade(f, -0.15));
      for (const [x, y] of [[0, 1], [15, 1], [0, 8], [15, 8]]) p(x, y, 1, 1, '#efe6d6');
    },
  };

  const hammockBand = (p, f, x0, x1) => {
    for (let x = x0; x <= x1; x++) {
      const sag = Math.round(4 * Math.sin((Math.PI * (x - 5)) / 21));
      p(x, 9 + sag, 1, 7, x % 4 < 2 ? f : shade(f, 0.22));
      p(x, 15 + sag, 1, 1, shade(f, -0.25));
    }
  };

  I.hammock = {
    name: 'Hammock',
    sw: 32,
    sh: 27,
    colors: FABRIC,
    colorNames: FABRIC_NAMES,
    seats: [{ x: 1.0, y: 0.7, pose: 'lie', dir: 'left', cells: [[0, 0], [1, 0]], act: 'lie' }],
    draw(p, c) {
      const wood = '#7a5236';
      p(0, 25, 32, 2, wood);
      p(0, 6, 2, 20, wood);
      p(30, 6, 2, 20, wood);
      p(0, 6, 2, 1, shade(wood, 0.2));
      p(30, 6, 2, 1, shade(wood, 0.2));
      p(2, 8, 4, 1, '#d9c7a5');
      p(26, 8, 4, 1, '#d9c7a5');
      hammockBand(p, FABRIC[c], 5, 26);
    },
    cover(p, c) {
      hammockBand(p, FABRIC[c], 13, 26);
    },
  };

  const GAMING = ['#2a2629', '#f2efe9', '#e59aa6'];

  I.gamingDesk = {
    name: 'Gaming desk',
    sw: 32,
    sh: 40,
    colors: GAMING,
    colorNames: ['Black', 'White', 'Pink'],
    sortY: 1,
    cuts: [29],
    overBand: 0,
    solid: (cx, cy) => cy === 0,
    seats: [{ x: 1, y: 1.75, pose: 'work', dir: 'up', cells: [[0, 1], [1, 1]], band: 0, act: 'work' }],
    glows: [{ x: 16, y: 21, r: 30, when: 'always', strength: 0.14, color: [170, 110, 255] }],
    draw(p, c) {
      const col = GAMING[c];
      const dark = shade(col, -0.25);
      p(0, 10, 32, 5, shade(col, 0.1));
      p(0, 15, 32, 6, col);
      p(0, 21, 32, 1, '#9b7bb5');
      p(1, 22, 2, 6, '#3d424b');
      p(29, 22, 2, 6, '#3d424b');
      p(3, 2, 12, 8, '#2a2629');
      p(4, 3, 10, 6, '#1b1f2a');
      p(17, 2, 12, 8, '#2a2629');
      p(18, 3, 10, 6, '#1b1f2a');
      p(8, 10, 2, 1, '#3d424b');
      p(22, 10, 2, 1, '#3d424b');
      p(9, 12, 14, 2, '#3d424b');
      p(25, 12, 3, 2, '#3d424b');
      p(10, 27, 12, 3, '#3d424b');
      p(9, 29, 14, 9, '#2a2629');
      p(11, 29, 2, 9, c === 2 ? '#f2efe9' : '#d9665b');
      p(19, 29, 2, 9, c === 2 ? '#f2efe9' : '#d9665b');
      p(10, 28, 12, 1, dark === '#000000' ? '#3d424b' : '#3d424b');
      p(12, 38, 8, 2, '#3d424b');
    },
    over(ctx, r, item, env) {
      const hue = (env.t / 25) % 360;
      ctx.fillStyle = `hsl(${hue}, 80%, 65%)`;
      ctx.fillRect(r.x, r.y + 21, 32, 1);
      if (env.activeItems && env.activeItems.has(item.id)) {
        ctx.fillStyle = '#7fd3e8';
        ctx.fillRect(r.x + 4, r.y + 3, 10, 6);
        ctx.fillStyle = `hsl(${(hue + 140) % 360}, 70%, 70%)`;
        ctx.fillRect(r.x + 18, r.y + 3, 10, 6);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillRect(r.x + 5, r.y + 4 + (Math.floor(env.t / 300) % 4), 6, 1);
      }
    },
  };

  const PIANO = ['#2a2629', '#f2efe9', '#7a5236'];

  I.piano = {
    name: 'Piano',
    sw: 32,
    sh: 40,
    colors: PIANO,
    colorNames: ['Black', 'White', 'Wood'],
    sortY: 1,
    solid: (cx, cy) => cy === 0,
    seats: [{ x: 1, y: 1.56, pose: 'work', dir: 'up', cells: [[0, 1], [1, 1]], act: 'play', anim: true }],
    draw(p, c) {
      const col = PIANO[c];
      const light = shade(col, c === 1 ? -0.06 : 0.18);
      p(1, 0, 30, 24, col);
      p(0, 0, 32, 3, light);
      p(3, 5, 26, 9, shade(col, c === 1 ? -0.08 : 0.08));
      p(10, 6, 12, 7, '#f2efe9');
      for (const y of [8, 10]) p(11, y, 10, 1, '#8a8f97');
      p(2, 15, 28, 5, '#f7f4ee');
      for (let x = 3; x < 30; x += 2) p(x, 15, 1, 5, '#c9c2b6');
      for (const x of [4, 6, 10, 12, 14, 18, 20, 24, 26]) p(x, 15, 1, 3, '#1f1d22');
      p(1, 20, 30, 6, col);
      p(2, 26, 3, 2, shade(col, -0.2));
      p(27, 26, 3, 2, shade(col, -0.2));
      p(8, 29, 16, 4, shade('#7a5236', -0.1));
      p(8, 29, 16, 1, '#9a6a46');
      p(9, 33, 2, 6, '#5a3d2b');
      p(21, 33, 2, 6, '#5a3d2b');
    },
  };

  I.easel = {
    name: 'Easel',
    sw: 16,
    sh: 30,
    colors: ['#f2c14e', '#5b7fa8', '#efe9df'],
    colorNames: ['Sunflower', 'Abstract', 'Sketch'],
    draw(p, c) {
      const w = '#9a6a46';
      p(7, 2, 2, 28, shade(w, -0.2));
      p(3, 10, 1, 20, w);
      p(12, 10, 1, 20, w);
      p(2, 3, 12, 12, '#f7f4ee');
      if (c === 0) {
        p(2, 3, 12, 12, '#bfe0ef');
        p(7, 9, 1, 6, LEAF[0]);
        ellipse(p, 7.5, 7.5, 3, 3, '#f2c14e');
        p(7, 7, 1, 1, '#7a5236');
      } else if (c === 1) {
        p(3, 4, 5, 5, '#d9785f');
        p(7, 8, 6, 6, '#5b7fa8');
        p(4, 10, 3, 3, '#e3b766');
      } else {
        p(4, 6, 8, 1, '#8a8f97');
        p(5, 8, 6, 1, '#b8b2a7');
        p(4, 11, 5, 1, '#b8b2a7');
      }
      p(1, 15, 14, 2, w);
      p(4, 14, 3, 1, '#d9665b');
      p(9, 14, 2, 1, '#5b7fa8');
    },
  };

  I.dresser = {
    name: 'Dresser',
    sw: 32,
    sh: 28,
    colors: WOOD,
    colorNames: WOOD_NAMES,
    draw(p, c) {
      const w = WOOD[c];
      p(0, 6, 32, 20, w);
      p(0, 4, 32, 3, shade(w, 0.18));
      for (const y of [8, 14, 20]) {
        p(2, y, 13, 5, shade(w, -0.1));
        p(17, y, 13, 5, shade(w, -0.1));
        p(7, y + 2, 3, 1, '#e3c48a');
        p(22, y + 2, 3, 1, '#e3c48a');
      }
      p(1, 26, 3, 2, shade(w, -0.3));
      p(28, 26, 3, 2, shade(w, -0.3));
      p(4, 0, 3, 4, '#ece6da');
      p(4, -1, 1, 1, LEAF[1]);
      p(5, 0, 2, 1, LEAF[2]);
      p(22, 1, 6, 3, '#5b7fa8');
      p(23, 0, 4, 1, '#d9785f');
    },
  };

  I.tvStand = {
    name: 'TV stand',
    sw: 32,
    sh: 34,
    colors: WOOD,
    colorNames: WOOD_NAMES,
    glows: [{ x: 16, y: 10, r: 36, when: 'night', strength: 0.18, color: [120, 170, 255] }],
    draw(p, c) {
      const w = WOOD[c];
      p(0, 22, 32, 10, w);
      p(0, 20, 32, 3, shade(w, 0.18));
      p(2, 24, 13, 6, shade(w, -0.1));
      p(17, 24, 13, 6, shade(w, -0.1));
      p(13, 26, 2, 1, '#e3c48a');
      p(17, 26, 2, 1, '#e3c48a');
      p(1, 32, 3, 2, shade(w, -0.3));
      p(28, 32, 3, 2, shade(w, -0.3));
      p(3, 1, 26, 17, '#1f1d22');
      p(4, 2, 24, 14, '#2a3344');
      p(14, 18, 4, 2, '#3d424b');
      p(26, 16, 1, 1, '#d9665b');
    },
    over(ctx, r, item, env) {
      if (env.thumb) return;
      const scene = Math.floor(env.t / 2500) % 3;
      const pals = [['#7fb8e0', '#8fd18a', '#f7f1de'], ['#f0a27a', '#f8d59c', '#5b7fa8'], ['#2f3550', '#9b7bb5', '#f6efc6']];
      const [a, b, d] = pals[scene];
      ctx.fillStyle = a;
      ctx.fillRect(r.x + 4, r.y + 2, 24, 9);
      ctx.fillStyle = b;
      ctx.fillRect(r.x + 4, r.y + 11, 24, 5);
      ctx.fillStyle = d;
      const x = Math.floor((env.t / 120) % 22);
      ctx.fillRect(r.x + 5 + x, r.y + 8, 3, 3);
    },
  };

  I.aquarium = {
    name: 'Aquarium',
    sw: 32,
    sh: 30,
    colors: WOOD.slice(0, 3),
    colorNames: WOOD_NAMES.slice(0, 3),
    glows: [{ x: 16, y: 10, r: 32, when: 'always', strength: 0.16, color: [90, 190, 230] }],
    draw(p, c) {
      const w = WOOD[c];
      p(1, 19, 30, 11, w);
      p(1, 19, 30, 1, shade(w, 0.18));
      p(3, 21, 12, 7, shade(w, -0.1));
      p(17, 21, 12, 7, shade(w, -0.1));
      p(0, 1, 32, 18, '#3d424b');
      p(1, 3, 30, 15, '#4fa3c7');
      p(1, 3, 30, 2, '#7fc2de');
      p(1, 15, 30, 3, '#d9c29a');
      p(4, 9, 2, 6, LEAF[0]);
      p(5, 7, 1, 2, LEAF[1]);
      p(25, 7, 2, 8, LEAF[1]);
      p(27, 10, 1, 5, LEAF[0]);
      p(14, 12, 4, 3, '#b8b2a7');
    },
    over(ctx, r, item, env) {
      const t = env.t / 1000;
      const fish = [['#f08a3c', 0], ['#f2c14e', 2.1], ['#e05d6f', 4.2]];
      fish.forEach(([col, ph], i) => {
        const x = Math.round(14 + Math.sin(t * 0.6 + ph) * 11);
        const y = 6 + i * 3 + Math.round(Math.sin(t * 1.3 + ph));
        const dirR = Math.cos(t * 0.6 + ph) > 0;
        ctx.fillStyle = col;
        ctx.fillRect(r.x + x, r.y + y, 3, 2);
        ctx.fillRect(r.x + x + (dirR ? -1 : 3), r.y + y, 1, 2);
      });
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = 0; i < 3; i++) {
        const ph = ((t * 0.5 + i * 0.33) % 1 + 1) % 1;
        ctx.fillRect(r.x + 22 + i, r.y + 14 - Math.round(ph * 10), 1, 1);
      }
    },
  };

  const FRIDGE = ['#f2efe9', '#a8d8c8', '#f2b8c6', '#3d424b'];

  I.fridge = {
    name: 'Fridge',
    sw: 16,
    sh: 36,
    colors: FRIDGE,
    colorNames: ['White', 'Mint', 'Pink', 'Black'],
    draw(p, c) {
      const col = FRIDGE[c];
      p(1, 1, 14, 35, col);
      p(2, 0, 12, 1, col);
      p(1, 1, 14, 1, shade(col, 0.2));
      p(1, 13, 14, 1, shade(col, -0.25));
      p(12, 4, 1, 6, '#c0c6cc');
      p(12, 16, 1, 8, '#c0c6cc');
      p(3, 5, 2, 2, '#d9665b');
      p(6, 7, 2, 2, '#f2c14e');
      p(4, 18, 4, 3, '#f7f4ee');
      p(1, 34, 14, 2, shade(col, -0.2));
    },
  };

  I.coatRack = {
    name: 'Coat rack',
    sw: 16,
    sh: 36,
    colors: WOOD.slice(0, 3),
    colorNames: WOOD_NAMES.slice(0, 3),
    draw(p, c) {
      const w = WOOD[c];
      p(7, 3, 2, 31, w);
      p(4, 33, 8, 3, shade(w, -0.2));
      p(4, 4, 8, 1, shade(w, -0.1));
      p(6, 1, 4, 2, w);
      p(2, 6, 5, 15, '#5b7fa8');
      p(2, 6, 5, 1, shade('#5b7fa8', 0.2));
      p(3, 21, 3, 1, shade('#5b7fa8', -0.2));
      p(9, 2, 5, 3, '#7a5236');
      p(8, 4, 7, 1, '#5a3d2b');
      p(10, 6, 3, 11, '#d9665b');
      p(10, 9, 3, 1, '#f2efe9');
      p(10, 13, 3, 1, '#f2efe9');
    },
  };

  const DOGS = ['#c99a66', '#3d3a3f', '#f2efe9', '#8a5a3c'];

  I.dogBed = {
    name: 'Dog',
    sw: 18,
    sh: 14,
    ox: -1,
    colors: DOGS,
    colorNames: ['Golden', 'Black', 'White', 'Brown'],
    use: 'pet',
    petSfx: 'bark',
    draw(p, c) {
      const col = DOGS[c];
      const dark = shade(col, c === 1 ? 0.25 : -0.25);
      ellipse(p, 9, 9.5, 9, 4.3, '#6f9a7d');
      ellipse(p, 9, 9, 7.2, 3.2, '#cfe0c8');
      ellipse(p, 10, 7, 5.6, 3.2, col);
      p(2, 4, 6, 5, col);
      p(1, 6, 2, 2, col);
      p(2, 4, 2, 4, dark);
      p(6, 4, 2, 3, dark);
      p(1, 7, 1, 1, '#2b2230');
      p(4, 6, 1, 1, '#2b2230');
      p(13, 9, 4, 1, dark);
      if (c === 2) p(10, 5, 3, 2, '#c99a66');
    },
  };

  const GUITARS = ['#c87b55', '#3d3a3f', '#d9665b', '#5b7fa8'];

  I.guitar = {
    name: 'Guitar',
    sw: 16,
    sh: 30,
    colors: GUITARS,
    colorNames: ['Natural', 'Black', 'Red', 'Blue'],
    draw(p, c) {
      const col = GUITARS[c];
      p(5, 27, 6, 3, '#3d424b');
      p(4, 22, 1, 6, '#3d424b');
      p(11, 22, 1, 6, '#3d424b');
      ellipse(p, 8, 21.5, 5.5, 5, col);
      ellipse(p, 8, 14.5, 4.2, 4, col);
      p(5, 13, 2, 3, shade(col, 0.2));
      ellipse(p, 8, 17.5, 1.3, 1.3, '#3a2c35');
      p(6, 24, 4, 1, '#3a2c35');
      p(7, 2, 2, 11, '#7a5236');
      p(6, 0, 4, 3, '#5a3d2b');
      p(8, 2, 1, 22, '#e8e2d0');
    },
  };

  const MIRROR_FRAMES = ['#c9a24b', '#e9e2d4', '#3d3a3f'];

  I.floorMirror = {
    name: 'Floor mirror',
    sw: 16,
    sh: 38,
    colors: MIRROR_FRAMES,
    colorNames: ['Brass', 'White', 'Black'],
    draw(p, c) {
      const f = MIRROR_FRAMES[c];
      p(2, 2, 12, 34, f);
      p(3, 1, 10, 1, f);
      p(4, 3, 8, 31, '#cfe3ef');
      p(4, 3, 8, 6, '#dcebf3');
      p(5, 5, 1, 10, '#ffffff');
      p(7, 7, 1, 5, '#eef6fa');
      p(4, 28, 8, 6, '#bcd3df');
      p(1, 35, 4, 3, shade(f, -0.2));
      p(11, 35, 4, 3, shade(f, -0.2));
    },
  };

  const SCOPE = ['#f2efe9', '#3d424b', '#c9a24b'];

  I.telescope = {
    name: 'Telescope',
    sw: 16,
    sh: 30,
    colors: SCOPE,
    colorNames: ['White', 'Black', 'Brass'],
    draw(p, c) {
      const col = SCOPE[c];
      p(4, 17, 1, 13, '#5a3d2b');
      p(11, 17, 1, 13, '#5a3d2b');
      p(7, 17, 2, 12, '#7a5236');
      p(6, 15, 4, 3, '#3d424b');
      for (let i = 0; i < 12; i++) p(2 + i, 15 - Math.floor(i / 1.4), 3, 3, col);
      p(12, 4, 3, 5, shade(col, -0.2));
      p(14, 5, 1, 3, '#9fd3f0');
      p(1, 15, 2, 3, '#3d424b');
    },
  };

  I.ficus = {
    name: 'Ficus tree',
    sw: 22,
    sh: 44,
    ox: -3,
    colors: POTS,
    colorNames: POT_NAMES,
    draw(p, c) {
      const pot = POTS[c];
      p(10, 20, 2, 15, '#7a5236');
      p(8, 24, 2, 1, '#7a5236');
      p(12, 22, 2, 1, '#7a5236');
      for (const [x, y, rx, ry, k] of [[11, 8, 7, 6, 1], [5, 14, 5, 5, 0], [17, 14, 5, 5, 0], [11, 18, 6, 4, 1], [11, 3, 4, 3, 2], [6, 7, 3, 3, 2], [16, 6, 3, 3, 2]]) {
        ellipse(p, x, y, rx, ry, LEAF[k]);
      }
      const r = rng(31);
      for (let i = 0; i < 18; i++) p(3 + Math.floor(r() * 16), 2 + Math.floor(r() * 18), 1, 1, LEAF[Math.floor(r() * 3)]);
      p(5, 34, 12, 2, shade(pot, 0.15));
      p(6, 36, 10, 8, pot);
      p(6, 42, 10, 2, shade(pot, -0.18));
    },
  };

  const BOOK_SETS = [
    ['#d9785f', '#5b7fa8', '#e3b766', '#6f9a7d'],
    ['#3d424b', '#9b7bb5', '#ece6da', '#c4553f'],
    ['#f2b8c6', '#a8d8c8', '#f4e28a', '#b9d7ea'],
  ];

  I.bookStack = {
    name: 'Book stack',
    sw: 16,
    sh: 18,
    colors: BOOK_SETS.map((s) => s[0]),
    colorNames: ['Classic', 'Moody', 'Pastel'],
    draw(p, c) {
      const set = BOOK_SETS[c];
      [[1, 14, 14], [2, 11, 12], [1, 8, 13], [3, 5, 10]].forEach(([x, y, w], i) => {
        p(x, y, w, 3, set[i]);
        p(x, y, w, 1, shade(set[i], 0.22));
        p(x + w - 2, y + 1, 2, 2, '#f2efe9');
      });
      p(6, 1, 4, 4, '#ece6da');
      p(10, 2, 1, 2, '#ece6da');
      p(6, 1, 4, 1, '#8a5a3c');
    },
  };

  const WAX = ['#f2efe9', '#e59aa6', '#e3b766'];

  I.candles = {
    name: 'Candles',
    sw: 16,
    sh: 16,
    colors: WAX,
    colorNames: ['White', 'Pink', 'Honey'],
    glows: [{ x: 8, y: 4, r: 22, when: 'always', strength: 0.16 }],
    draw(p, c) {
      const w = WAX[c];
      p(1, 13, 14, 3, '#c9a24b');
      p(1, 13, 14, 1, '#e0bf6a');
      p(2, 6, 4, 7, w);
      p(7, 3, 3, 10, w);
      p(11, 8, 3, 5, w);
      for (const [x, y] of [[3, 5], [8, 2], [12, 7]]) p(x, y, 1, 1, '#3d3a3f');
    },
    over(ctx, r, item, env) {
      const f = Math.floor(env.t / 140) % 2;
      for (const [x, y] of [[3, 3], [8, 0], [12, 5]]) {
        ctx.fillStyle = '#f7b267';
        ctx.fillRect(r.x + x, r.y + y + f, 1, 2 - f);
        ctx.fillStyle = '#fff2b0';
        ctx.fillRect(r.x + x, r.y + y + 1, 1, 1);
      }
    },
  };

  I.runner = {
    name: 'Runner rug',
    sw: 16,
    sh: 48,
    colors: FABRIC,
    colorNames: FABRIC_NAMES,
    outlineColor: (c) => shade(FABRIC[c], -0.42),
    draw(p, c) {
      const f = FABRIC[c];
      const light = shade(f, 0.32);
      p(0, 1, 16, 46, f);
      p(2, 3, 12, 42, light);
      p(3, 4, 10, 40, f);
      for (let y = 8; y < 42; y += 8) {
        p(7, y, 2, 1, light);
        p(6, y + 1, 4, 1, light);
        p(7, y + 2, 2, 1, light);
      }
      for (let x = 1; x < 16; x += 2) {
        p(x, 0, 1, 1, '#efe6d6');
        p(x, 47, 1, 1, '#efe6d6');
      }
    },
    views: { 1: { sw: 48, sh: 16, rotateOf: 0 } },
  };

  // ---------- Ek duvar eşyaları ----------
  I.curtainWindow = {
    name: 'Curtained window',
    sw: 32,
    sh: 31,
    wy: 3,
    colors: FABRIC,
    colorNames: FABRIC_NAMES,
    draw(p, c, g) {
      const f = FABRIC[c];
      const fc = '#f3efe6';
      p(3, 3, 26, 23, fc);
      g.clearRect(5, 5, 10, 19);
      g.clearRect(17, 5, 10, 19);
      p(5, 14, 10, 1, fc);
      p(17, 14, 10, 1, fc);
      p(2, 26, 28, 3, shade(fc, -0.08));
      p(2, 26, 28, 1, shade(fc, 0.12));
      p(0, 0, 32, 2, '#7a5236');
      p(0, 2, 7, 25, f);
      p(25, 2, 7, 25, f);
      for (const x of [2, 5, 27, 30]) p(x, 2, 1, 25, shade(f, -0.14));
      p(0, 15, 7, 2, shade(f, -0.25));
      p(25, 15, 7, 2, shade(f, -0.25));
    },
    under(ctx, r, item, env) {
      Art.drawSky(ctx, r.x + 5, r.y + 5, 22, 19, env);
    },
  };

  I.mirror = {
    name: 'Mirror',
    sw: 12,
    sh: 16,
    ox: 2,
    wy: 8,
    colors: MIRROR_FRAMES,
    colorNames: ['Brass', 'White', 'Black'],
    draw(p, c) {
      ellipse(p, 6, 8, 6, 8, MIRROR_FRAMES[c]);
      ellipse(p, 6, 8, 4.6, 6.6, '#cfe3ef');
      p(4, 4, 1, 5, '#ffffff');
      p(6, 3, 1, 3, '#eef6fa');
    },
  };

  const CAL = ['#d9665b', '#5b7fa8', '#6f9a7d'];

  I.calendar = {
    name: 'Calendar',
    sw: 12,
    sh: 14,
    ox: 2,
    wy: 12,
    colors: CAL,
    colorNames: ['Red', 'Blue', 'Green'],
    draw(p, c) {
      p(0, 1, 12, 3, CAL[c]);
      p(0, 4, 12, 10, '#f7f4ee');
      p(3, 0, 1, 2, '#3d424b');
      p(8, 0, 1, 2, '#3d424b');
      for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) p(1 + col * 3, 6 + row * 3, 1, 1, '#8a8f97');
    },
    over(ctx, r, item, env) {
      const d = env.date.getDate() % 12;
      ctx.fillStyle = '#d9665b';
      ctx.fillRect(r.x + (d % 4) * 3, r.y + 5 + Math.floor(d / 4) * 3, 3, 3);
    },
  };

  I.worldMap = {
    name: 'World map',
    sw: 30,
    sh: 18,
    ox: 1,
    wy: 8,
    colors: ['#9fc6e0', '#e8dcc0'],
    colorNames: ['Ocean', 'Vintage'],
    draw(p, c) {
      const sea = c === 0 ? '#9fc6e0' : '#e8dcc0';
      const land = c === 0 ? '#7fae73' : '#b8955f';
      p(0, 0, 30, 18, '#7a5236');
      p(1, 1, 28, 16, sea);
      for (const [x, y, w, h] of [[3, 3, 6, 4], [5, 7, 3, 5], [12, 3, 4, 3], [13, 6, 4, 6], [18, 3, 8, 5], [21, 8, 3, 2], [23, 12, 4, 3]]) p(x, y, w, h, land);
      p(1, 9, 28, 1, shade(sea, -0.08));
    },
  };

  const PHOTOS = ['#e3b766', '#9fc6e0', '#e59aa6', '#8cc07f', '#9b7bb5', '#f08a3c'];
  const PHOTO_X = [2, 11, 20, 29, 38];
  const garlandY = (x) => 1 + Math.round(3 * Math.sin((Math.PI * (x % 24)) / 24));

  I.photoGarland = {
    name: 'Photo garland',
    sw: 48,
    sh: 18,
    wy: 5,
    colors: ['#c9a24b', '#3d3a3f'],
    colorNames: ['Gold string', 'Dark string'],
    noOutline: true,
    draw(p, c) {
      const str = c === 0 ? '#c9a24b' : '#3d3a3f';
      for (let x = 0; x < 48; x++) p(x, garlandY(x), 1, 1, str);
      PHOTO_X.forEach((x, i) => {
        const y = garlandY(x + 3) + 2;
        p(x, y, 7, 8, '#3a2c35');
        p(x + 1, y + 1, 5, 6, '#fbf8f2');
        p(x + 1, y + 1, 5, 4, PHOTOS[(i + c) % PHOTOS.length]);
        p(x + 2, y + 3, 2, 2, shade(PHOTOS[(i + c) % PHOTOS.length], -0.25));
        p(x + 3, y - 1, 1, 2, '#8a5a3c');
      });
    },
  };

  const PEG = ['#d9b98c', '#f2efe9', '#5f7c8a'];

  I.pegboard = {
    name: 'Pegboard',
    sw: 30,
    sh: 20,
    ox: 1,
    wy: 8,
    colors: PEG,
    colorNames: ['Natural', 'White', 'Slate'],
    draw(p, c) {
      const b = PEG[c];
      p(0, 0, 30, 20, b);
      for (let y = 2; y < 20; y += 3) for (let x = 2; x < 30; x += 3) p(x, y, 1, 1, shade(b, -0.25));
      p(3, 3, 1, 10, '#d9665b');
      p(4, 3, 3, 1, '#d9665b');
      p(10, 4, 5, 4, '#c87b55');
      p(9, 1, 3, 3, LEAF[1]);
      p(12, 0, 3, 4, LEAF[2]);
      p(18, 3, 8, 2, '#5b7fa8');
      p(18, 5, 2, 6, '#3d424b');
      p(24, 5, 2, 6, '#3d424b');
      p(6, 14, 8, 3, '#f2c14e');
      p(17, 14, 3, 4, '#ece6da');
      p(21, 13, 5, 5, '#9b7bb5');
    },
  };

  // ---------- Ek eşyaların yönleri ----------
  I.rockingChair.views = {
    // yandan: sallanma ayakları görünür, arkalık sağda
    1: {
      seats: [{ x: 0.45, y: 0.8, pose: 'sit', dir: 'left', cells: [[0, 0]], act: 'sit' }],
      draw(p, c) {
        const w = WOOD[c];
        const wd = shade(w, -0.22);
        p(11, 1, 3, 2, shade(w, 0.18));
        p(11, 3, 2, 15, w);
        p(13, 3, 1, 15, wd);
        p(2, 14, 11, 4, w);
        p(3, 13, 9, 3, '#d9785f');
        p(3, 13, 9, 1, shade('#d9785f', 0.2));
        p(2, 10, 11, 2, w);
        p(2, 12, 1, 2, wd);
        p(3, 18, 2, 4, wd);
        p(10, 18, 2, 4, wd);
        p(1, 23, 13, 1, wd);
        p(0, 22, 1, 1, wd);
        p(14, 22, 1, 1, wd);
      },
    },
    // arkadan: oturanın önünde arkalık çubukları
    2: {
      seats: [{ x: 0.5, y: 0.72, pose: 'sit', dir: 'up', cells: [[0, 0]], act: 'sit' }],
      draw(p, c) {
        const w = WOOD[c];
        const wd = shade(w, -0.22);
        p(2, 14, 12, 4, w);
        p(1, 11, 2, 2, w);
        p(13, 11, 2, 2, w);
        p(3, 19, 2, 4, wd);
        p(11, 19, 2, 4, wd);
        p(1, 23, 14, 1, wd);
        this.cover(p, c);
      },
      // arkadan bakınca arkalık oturanın sırtını örter, başı üstünden görünür
      cover(p, c) {
        const w = WOOD[c];
        p(2, 9, 12, 2, shade(w, 0.18));
        for (const x of [3, 6, 9, 12]) p(x, 11, 1, 5, w);
        p(2, 9, 1, 9, shade(w, -0.22));
        p(13, 9, 1, 9, shade(w, -0.22));
        p(2, 15, 12, 2, w);
      },
    },
  };

  const eggShell = (p, cut) => {
    const wick = '#c9a46a';
    p(3, 0, 10, 2, '#3d424b');
    p(7, 2, 2, 5, '#8a8f97');
    ellipse(p, 8, 20, 7.8, 11, shade(wick, -0.15));
    ellipse(p, 8, 19.5, 7.3, 10.5, wick);
    const r = rng(9);
    for (let i = 0; i < 30; i++) {
      const x = 1 + Math.floor(r() * 14);
      const y = 10 + Math.floor(r() * 20);
      if (!cut || !cut(x, y)) p(x, y, 1, 1, shade(wick, -0.2));
    }
    p(5, 31, 6, 3, '#8a8f97');
    p(3, 34, 10, 2, '#3d424b');
  };

  I.eggChair.views = {
    1: {
      seats: [{ x: 0.42, y: 0.62, pose: 'sit', dir: 'left', cells: [[0, 0]], act: 'sit' }],
      draw(p, c) {
        eggShell(p);
        ellipse(p, 6, 21, 3.8, 7.5, shade(FABRIC[c], -0.25));
        ellipse(p, 5.5, 22, 3.2, 6.5, FABRIC[c]);
        p(4, 18, 1, 1, shade(FABRIC[c], 0.25));
      },
    },
    2: {
      seats: [{ x: 0.5, y: 0.62, pose: 'sit', dir: 'up', cells: [[0, 0]], act: 'sit' }],
      draw(p) {
        eggShell(p);
      },
      cover(p) {
        eggShell(p);
      },
    },
  };

  I.hammock.views = {
    // dikey: baş üstte
    1: {
      sw: 16,
      sh: 40,
      seats: [{ x: 0.5, y: 1.2, pose: 'lie', dir: 'down', cells: [[0, 0], [0, 1]], act: 'lie' }],
      draw(p, c) {
        const wood = '#7a5236';
        p(0, 0, 16, 2, wood);
        p(0, 38, 16, 2, wood);
        p(0, 0, 2, 40, shade(wood, -0.15));
        p(14, 0, 2, 40, shade(wood, -0.15));
        p(7, 2, 2, 3, '#d9c7a5');
        p(7, 35, 2, 3, '#d9c7a5');
        this.cover(p, c, 5, 34);
      },
      cover(p, c, from = 17, to = 34) {
        const f = FABRIC[c];
        for (let y = from; y <= to; y++) {
          const sag = Math.round(2 * Math.sin((Math.PI * (y - 5)) / 29));
          p(3 + sag, y, 10, 1, y % 4 < 2 ? f : shade(f, 0.22));
          p(12 + sag, y, 1, 1, shade(f, -0.25));
        }
      },
    },
  };

  I.aquarium.views = {
    1: {
      sw: 16,
      sh: 40,
      glows: [{ x: 8, y: 14, r: 32, when: 'always', strength: 0.16, color: [90, 190, 230] }],
      draw(p, c) {
        const w = WOOD[c];
        p(1, 30, 14, 10, w);
        p(1, 30, 14, 1, shade(w, 0.18));
        p(3, 32, 10, 6, shade(w, -0.1));
        p(0, 2, 16, 28, '#3d424b');
        p(1, 3, 14, 26, '#4fa3c7');
        p(1, 3, 14, 3, '#7fc2de');
        p(1, 26, 14, 3, '#d9c29a');
        p(3, 18, 2, 8, LEAF[0]);
        p(11, 14, 2, 12, LEAF[1]);
        p(7, 22, 3, 4, '#b8b2a7');
      },
      over(ctx, r, item, env) {
        const t = env.t / 1000;
        [['#f08a3c', 0], ['#f2c14e', 2.1], ['#e05d6f', 4.2]].forEach(([col, ph], i) => {
          const y = Math.round(15 + Math.sin(t * 0.5 + ph) * 10);
          const x = 4 + i * 3 + Math.round(Math.sin(t * 1.2 + ph));
          ctx.fillStyle = col;
          ctx.fillRect(r.x + x, r.y + y, 2, 3);
        });
      },
    },
  };

  I.tvStand.views = {
    // ekran sola bakar
    1: {
      sw: 16,
      sh: 40,
      glows: [{ x: 4, y: 18, r: 30, when: 'night', strength: 0.14, color: [120, 170, 255] }],
      draw(p, c) {
        const w = WOOD[c];
        p(1, 14, 14, 22, shade(w, 0.18));
        p(1, 36, 14, 4, w);
        p(8, 24, 3, 6, '#3d424b');
        p(6, 6, 4, 24, '#1f1d22');
        p(5, 7, 1, 22, '#3a4a66');
        p(9, 8, 1, 20, '#2a2629');
      },
    },
    // arkadan
    2: {
      glows: [],
      draw(p, c) {
        const w = shade(WOOD[c], -0.1);
        p(0, 22, 32, 10, w);
        p(0, 20, 32, 3, shade(WOOD[c], 0.18));
        p(1, 32, 3, 2, shade(w, -0.3));
        p(28, 32, 3, 2, shade(w, -0.3));
        p(3, 1, 26, 17, '#2a2629');
        for (let y = 4; y < 16; y += 3) p(8, y, 16, 1, '#3d424b');
        p(14, 18, 4, 2, '#3d424b');
        p(15, 20, 1, 3, '#1f1d22');
      },
    },
  };

  I.gamingDesk.views = {
    // masa altta, oyuncu koltuğu arkasında: oturan bize bakar
    2: {
      cuts: [21],
      overBand: 1,
      sortY: 2,
      solid: (cx, cy) => cy === 1,
      seats: [{ x: 1, y: 1.15, pose: 'study', dir: 'down', cells: [[0, 0], [1, 0]], band: 0, act: 'work' }],
      glows: [{ x: 16, y: 32, r: 30, when: 'always', strength: 0.14, color: [170, 110, 255] }],
      draw(p, c) {
        const col = GAMING[c];
        const accent = c === 2 ? '#f2efe9' : '#d9665b';
        p(8, 3, 16, 16, '#2a2629');
        p(11, 3, 2, 16, accent);
        p(19, 3, 2, 16, accent);
        p(10, 18, 12, 3, '#3d424b');
        p(0, 24, 32, 7, shade(col, 0.1));
        p(0, 31, 32, 6, col);
        p(1, 37, 2, 3, '#3d424b');
        p(29, 37, 2, 3, '#3d424b');
        p(3, 20, 12, 7, '#2a2629');
        p(17, 20, 12, 7, '#2a2629');
        p(8, 27, 2, 1, '#3d424b');
        p(22, 27, 2, 1, '#3d424b');
      },
      over(ctx, r, item, env) {
        ctx.fillStyle = `hsl(${(env.t / 25) % 360}, 80%, 65%)`;
        ctx.fillRect(r.x, r.y + 31, 32, 1);
      },
    },
    // masa solda, koltuk sağda: oturan sola bakar
    1: {
      sortY: 2,
      solid: (cx) => cx === 0,
      seats: [{ x: 1.4, y: 1.35, pose: 'work', dir: 'left', cells: [[1, 0], [1, 1]], act: 'work' }],
      glows: [{ x: 14, y: 22, r: 30, when: 'always', strength: 0.14, color: [170, 110, 255] }],
      draw(p, c) {
        const col = GAMING[c];
        const accent = c === 2 ? '#f2efe9' : '#d9665b';
        p(0, 9, 15, 25, shade(col, 0.1));
        p(0, 34, 15, 4, col);
        p(1, 38, 2, 2, '#3d424b');
        p(12, 38, 2, 2, '#3d424b');
        p(2, 11, 3, 9, '#2a2629');
        p(2, 22, 3, 9, '#2a2629');
        p(5, 12, 1, 7, '#1b1f2a');
        p(5, 23, 1, 7, '#1b1f2a');
        p(8, 16, 3, 10, '#3d424b');
        p(17, 26, 11, 4, '#3d424b');
        p(27, 10, 4, 18, '#2a2629');
        p(28, 12, 2, 14, accent);
        p(20, 30, 6, 2, '#3d424b');
        p(22, 32, 2, 6, '#8a8f97');
      },
      over(ctx, r, item, env) {
        ctx.fillStyle = `hsl(${(env.t / 25) % 360}, 80%, 65%)`;
        ctx.fillRect(r.x + 14, r.y + 9, 1, 25);
        if (env.activeItems && env.activeItems.has(item.id)) {
          ctx.fillStyle = '#7fd3e8';
          ctx.fillRect(r.x + 5, r.y + 12, 1, 7);
          ctx.fillRect(r.x + 5, r.y + 23, 1, 7);
        }
      },
    },
  };

  I.piano.views = {
    // piyano altta, çalan arkasında bize bakar
    2: {
      cuts: [22],
      sortY: 2,
      solid: (cx, cy) => cy === 1,
      seats: [{ x: 1, y: 1.12, pose: 'study', dir: 'down', cells: [[0, 0], [1, 0]], band: 0, act: 'play', anim: true }],
      draw(p, c) {
        const col = PIANO[c];
        const light = shade(col, c === 1 ? -0.06 : 0.18);
        p(8, 15, 16, 4, shade('#7a5236', -0.1));
        p(8, 15, 16, 1, '#9a6a46');
        p(9, 19, 2, 4, '#5a3d2b');
        p(21, 19, 2, 4, '#5a3d2b');
        p(1, 24, 30, 14, col);
        p(0, 22, 32, 3, light);
        p(4, 27, 24, 1, shade(col, c === 1 ? -0.12 : 0.12));
        p(4, 33, 24, 1, shade(col, c === 1 ? -0.12 : 0.12));
        p(2, 38, 3, 2, shade(col, -0.2));
        p(27, 38, 3, 2, shade(col, -0.2));
      },
    },
    // piyano solda, tabure sağda: çalan sola bakar
    1: {
      sortY: 2,
      solid: (cx) => cx === 0,
      seats: [{ x: 1.4, y: 1.42, pose: 'work', dir: 'left', cells: [[1, 0], [1, 1]], act: 'play', anim: true }],
      draw(p, c) {
        const col = PIANO[c];
        const light = shade(col, c === 1 ? -0.06 : 0.18);
        p(0, 6, 12, 32, col);
        p(0, 4, 12, 3, light);
        p(2, 10, 6, 10, '#f2efe9');
        p(12, 10, 4, 26, '#f7f4ee');
        for (let y = 11; y < 36; y += 2) p(12, y, 4, 1, '#c9c2b6');
        for (const y of [12, 14, 18, 20, 22, 26, 28, 32, 34]) p(12, y, 2, 1, '#1f1d22');
        p(1, 38, 3, 2, shade(col, -0.2));
        p(8, 38, 3, 2, shade(col, -0.2));
        p(19, 22, 9, 10, shade('#7a5236', -0.1));
        p(19, 22, 9, 1, '#9a6a46');
        p(20, 32, 2, 6, '#5a3d2b');
        p(25, 32, 2, 6, '#5a3d2b');
      },
    },
  };

  // ---------- Arkalıksız oturaklar: görünüş aynı, oturan kişinin baktığı yön döner ----------
  // (karşılıklı oturmak için: 1 = sola, 2 = arkaya, 3 = sağa bakar)
  const facingViews = (seat) => ({
    1: { seats: [{ ...seat, x: seat.x + 0.05, dir: 'left' }] },
    2: { seats: [{ ...seat, y: seat.y - 0.05, dir: 'up' }] },
  });
  for (const t of ['pouf', 'beanbag', 'stool', 'floorCushion']) I[t].views = facingViews(I[t].seats[0]);
  I.bench.views[2] = { seats: I.bench.seats.map((st) => ({ ...st, y: st.y - 0.05, dir: 'up' })) };

  // ---------- Katalog sekmeleri ----------
  Art.TABS = {
    seating: ['sofa', 'armchair', 'pouf', 'beanbag', 'floorCushion', 'bench', 'stool', 'rockingChair', 'eggChair', 'bed', 'hammock'],
    tables: ['desk', 'gamingDesk', 'cafeTable', 'readingTable', 'counter', 'table', 'sideTable', 'piano', 'easel'],
    storage: ['bookshelf', 'narrowShelf', 'wardrobe', 'dresser', 'tvStand', 'aquarium', 'fridge', 'pastryCase', 'coatRack'],
    decor: ['plant', 'bigPlant', 'ficus', 'cactus', 'flowers', 'lamp', 'lantern', 'candles', 'fireplace', 'recordPlayer', 'globe', 'telescope', 'guitar', 'floorMirror', 'bookStack', 'cat', 'dogBed', 'rug', 'roundRug', 'runner'],
    wall: ['window', 'curtainWindow', 'archWindow', 'board', 'chalkboard', 'pegboard', 'shelf', 'painting', 'poster', 'worldMap', 'photoGarland', 'mirror', 'calendar', 'clock', 'sconce', 'stringLights', 'neon', 'hangingPlant'],
  };


  // Katalog ile çizimler uyuşmuyorsa geliştirme sırasında fark edilsin
  for (const [type, cat] of Object.entries(Sh.CATALOG)) {
    const def = I[type];
    if (!def) console.error(`Item has no artwork: ${type}`);
    else if (def.colors.length !== cat.colors) console.error(`Color count mismatch: ${type}`);
  }
})();
