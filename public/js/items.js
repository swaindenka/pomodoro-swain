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
    // tıklayınca lo-fi müziği açar / kapatır
    use: 'music',
    petSfx: 'click',
    useGlyph: '\u266A',
    useColor: '#5b7fa8',
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
      if (!env.music) return;
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
    colors: ['#7fae73', '#e98a5b', '#4f78a3', '#e59aa6', '#3d3a3f', '#2f3550', '#e39a4f', '#5b9bd8', '#f2c14e'],
    colorNames: ['Mountains', 'Sunset', 'Sea', 'Flowers', 'Abstract', 'Night city', 'Cat portrait', 'Lighthouse', 'Lemons'],
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
      } else if (c === 4) {
        p(1, 1, 12, 10, '#efe9df');
        p(2, 2, 5, 5, '#d9785f');
        p(7, 5, 5, 5, '#5b7fa8');
        p(3, 7, 3, 3, '#e3b766');
        p(9, 2, 2, 2, '#3d3a3f');
      } else if (c === 5) {
        p(1, 1, 12, 10, '#2f3550');
        p(10, 2, 2, 2, '#f6efc6');
        for (const [x, w, h] of [[1, 3, 6], [4, 2, 8], [6, 3, 5], [9, 2, 7], [11, 2, 4]]) p(x, 11 - h, w, h, '#1f2238');
        for (const [x, y] of [[2, 6], [4, 4], [5, 7], [7, 7], [9, 5], [10, 8], [11, 9], [2, 9]]) p(x, y, 1, 1, '#f2c14e');
      } else if (c === 6) {
        p(1, 1, 12, 10, '#9fc6e0');
        ellipse(p, 7, 8, 4.5, 3.5, '#e39a4f');
        p(4, 3, 6, 4, '#e39a4f');
        p(4, 2, 1, 1, '#e39a4f');
        p(9, 2, 1, 1, '#e39a4f');
        p(5, 4, 1, 1, '#2b2230');
        p(8, 4, 1, 1, '#2b2230');
        p(6, 5, 2, 1, '#f0a3a0');
        p(6, 7, 2, 1, '#c97a35');
      } else if (c === 7) {
        p(1, 1, 12, 6, '#f6dcb4');
        p(1, 7, 12, 4, '#4f78a3');
        p(9, 3, 2, 6, '#f2efe9');
        p(9, 5, 2, 1, '#d9665b');
        p(9, 2, 2, 1, '#d9665b');
        p(8, 9, 4, 2, '#7a7f87');
        p(2, 3, 6, 1, '#fff4c2');
        p(2, 9, 3, 1, '#8fb7dc');
      } else {
        p(1, 1, 12, 10, '#f3ece0');
        ellipse(p, 5, 6, 3, 2.5, '#f2c14e');
        ellipse(p, 9.5, 7, 2.5, 2, '#f2c14e');
        p(4, 5, 1, 1, '#fff4c2');
        p(6, 2, 3, 1, LEAF[1]);
        p(8, 3, 2, 1, LEAF[0]);
        p(2, 10, 10, 1, '#d9c7a5');
      }
    },
  };

  I.poster = {
    name: 'Poster',
    sw: 12,
    sh: 16,
    ox: 2,
    wy: 9,
    colors: ['#d9665b', '#e3b766', '#5b7fa8', '#2f3550', '#6fa268', '#3b2f4a', '#f2efe9', '#e59aa6'],
    colorNames: ['Tomato', 'Coffee', 'Waves', 'Night', 'Monstera', 'Rocket', 'Rainbow', 'Music'],
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
      } else if (c === 3) {
        p(0, 0, 12, 16, '#2f3550');
        p(6, 3, 3, 4, '#f6efc6');
        p(5, 4, 1, 2, '#f6efc6');
        p(8, 3, 1, 3, '#2f3550');
        for (const [x, y] of [[2, 2], [3, 9], [9, 10], [6, 12], [10, 6]]) p(x, y, 1, 1, '#f4f1d0');
      } else if (c === 4) {
        p(0, 0, 12, 16, '#efe6d2');
        ellipse(p, 6, 7, 4.5, 4.5, '#4f8a5a');
        p(5, 4, 1, 3, '#efe6d2');
        p(8, 6, 2, 1, '#efe6d2');
        p(3, 8, 2, 1, '#efe6d2');
        p(6, 11, 1, 3, '#4f7f4c');
        p(3, 13, 6, 1, '#3d3a3f');
      } else if (c === 5) {
        p(0, 0, 12, 16, '#3b2f4a');
        p(5, 3, 2, 7, '#f2efe9');
        p(5, 2, 2, 1, '#d9665b');
        p(5, 6, 2, 1, '#5b9bd8');
        p(4, 8, 1, 3, '#d9665b');
        p(7, 8, 1, 3, '#d9665b');
        p(5, 10, 2, 2, '#f2c14e');
        p(5, 12, 2, 1, '#f08a3c');
        for (const [x, y] of [[2, 3], [9, 5], [2, 11], [10, 12]]) p(x, y, 1, 1, '#f4f1d0');
      } else if (c === 6) {
        p(0, 0, 12, 16, '#f7f3ea');
        ['#e05d6f', '#f2c14e', '#6fa268', '#5b9bd8'].forEach((col, i) => {
          p(2 + i, 4 + i, 8 - i * 2, 1, col);
          p(2 + i, 5 + i, 1, 6 - i, col);
          p(9 - i, 5 + i, 1, 6 - i, col);
        });
        p(2, 13, 8, 1, '#3d3a3f');
      } else {
        p(0, 0, 12, 16, '#e59aa6');
        p(4, 3, 1, 7, '#2f3550');
        p(8, 2, 1, 7, '#2f3550');
        p(4, 2, 5, 1, '#2f3550');
        p(4, 3, 5, 1, '#2f3550');
        p(2, 9, 3, 2, '#2f3550');
        p(6, 8, 3, 2, '#2f3550');
        p(2, 13, 8, 1, '#f2efe9');
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
    ceiling: true,
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
    ceiling: true,
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

  // =====================================================================
  // BÜYÜK GENİŞLEME: yeni oturma, mutfak, depolama, eğlence, bitki, açık hava, halı ve duvar eşyaları
  // =====================================================================

  // ---------- Oturma ----------
  const tufts = (p, f, x0, x1, y0, y1) => {
    const d = shade(f, -0.3);
    for (let y = y0, row = 0; y <= y1; y += 3, row++) {
      for (let x = x0 + (row % 2) * 2; x <= x1; x += 4) p(x, y, 1, 1, d);
    }
  };

  I.chesterfield = {
    name: 'Chesterfield',
    sw: 32,
    sh: 24,
    colors: FABRIC,
    colorNames: FABRIC_NAMES,
    seats: I.sofa.seats,
    draw(p, c) {
      const f = FABRIC[c];
      I.sofa.draw(p, c);
      tufts(p, f, 4, 27, 6, 11);
      p(0, 8, 5, 2, shade(f, 0.24));
      p(27, 8, 5, 2, shade(f, 0.24));
      p(3, 22, 2, 2, '#c9a24b');
      p(27, 22, 2, 2, '#c9a24b');
    },
    views: {
      1: {
        ...I.sofa.views[1],
        draw(p, c) {
          I.sofa.views[1].draw(p, c);
          tufts(p, FABRIC[c], 11, 14, 6, 33);
          p(1, 37, 2, 3, '#c9a24b');
          p(12, 37, 2, 3, '#c9a24b');
        },
      },
      2: {
        ...I.sofa.views[2],
        draw(p, c) {
          I.sofa.views[2].draw(p, c);
          p(0, 0, 5, 1, shade(FABRIC[c], 0.24));
          p(27, 0, 5, 1, shade(FABRIC[c], 0.24));
          p(3, 22, 2, 2, '#c9a24b');
          p(27, 22, 2, 2, '#c9a24b');
        },
      },
    },
  };

  const TEAK = '#9a6a46';

  I.loungeChair = {
    name: 'Lounge chair',
    sw: 16,
    sh: 24,
    colors: FABRIC,
    colorNames: FABRIC_NAMES,
    seats: [{ x: 0.5, y: 0.875, pose: 'sit', dir: 'down', cells: [[0, 0]], act: 'sit' }],
    draw(p, c) {
      const f = FABRIC[c];
      p(1, 3, 1, 16, shade(TEAK, -0.15));
      p(14, 3, 1, 16, shade(TEAK, -0.15));
      p(2, 1, 12, 11, f);
      p(2, 1, 12, 1, shade(f, 0.2));
      p(3, 6, 10, 1, shade(f, -0.12));
      p(0, 11, 3, 2, TEAK);
      p(13, 11, 3, 2, TEAK);
      p(2, 13, 12, 5, shade(f, 0.12));
      p(2, 17, 12, 1, shade(f, -0.2));
      p(1, 18, 14, 1, TEAK);
      p(2, 19, 1, 3, TEAK);
      p(13, 19, 1, 3, TEAK);
      p(1, 22, 1, 2, TEAK);
      p(14, 22, 1, 2, TEAK);
    },
    views: {
      1: {
        seats: [{ x: 0.5, y: 0.8, pose: 'sit', dir: 'left', cells: [[0, 0]], act: 'sit' }],
        draw(p, c) {
          const f = FABRIC[c];
          p(11, 1, 3, 15, f);
          p(12, 0, 3, 2, shade(f, 0.2));
          p(13, 2, 1, 14, shade(f, -0.15));
          p(1, 13, 11, 4, shade(f, 0.12));
          p(1, 16, 11, 1, shade(f, -0.2));
          p(0, 10, 12, 2, TEAK);
          p(0, 17, 15, 1, TEAK);
          p(1, 18, 1, 4, TEAK);
          p(12, 18, 1, 4, TEAK);
          p(0, 22, 2, 2, TEAK);
          p(12, 22, 2, 2, TEAK);
        },
      },
      2: {
        cuts: [10],
        seats: [{ x: 0.5, y: 0.55, pose: 'sit', dir: 'up', cells: [[0, 0]], band: 0, act: 'sit' }],
        draw(p, c) {
          const f = FABRIC[c];
          p(3, 3, 10, 7, shade(f, 0.12));
          p(0, 9, 3, 2, TEAK);
          p(13, 9, 3, 2, TEAK);
          p(2, 10, 12, 9, shade(f, -0.16));
          p(2, 10, 12, 1, f);
          p(1, 19, 14, 1, TEAK);
          p(2, 20, 1, 4, TEAK);
          p(13, 20, 1, 4, TEAK);
        },
      },
    },
  };

  const OFFICE = ['#3d424b', '#f2efe9', '#5b7fa8', '#d9665b'];
  const officeBase = (p, x0, x1) => {
    p(7, 15, 2, 4, '#8a929c');
    p(x0, 19, x1 - x0, 1, '#3d424b');
    for (const x of [x0, 7, x1 - 2]) p(x, 20, 2, 2, '#2a2629');
  };

  I.officeChair = {
    name: 'Office chair',
    sw: 16,
    sh: 22,
    colors: OFFICE,
    colorNames: ['Black', 'White', 'Blue', 'Red'],
    seats: [{ x: 0.5, y: 0.75, pose: 'sit', dir: 'down', cells: [[0, 0]], act: 'sit' }],
    draw(p, c) {
      const col = OFFICE[c];
      p(4, 0, 8, 1, shade(col, 0.2));
      p(3, 1, 10, 10, col);
      p(4, 2, 8, 1, shade(col, 0.2));
      p(5, 4, 6, 5, shade(col, -0.1));
      p(1, 9, 2, 1, '#5d646e');
      p(13, 9, 2, 1, '#5d646e');
      p(1, 10, 1, 3, '#5d646e');
      p(14, 10, 1, 3, '#5d646e');
      p(2, 12, 12, 3, shade(col, 0.1));
      p(2, 14, 12, 1, shade(col, -0.25));
      officeBase(p, 2, 14);
    },
    views: {
      1: {
        seats: [{ x: 0.5, y: 0.72, pose: 'sit', dir: 'left', cells: [[0, 0]], act: 'sit' }],
        draw(p, c) {
          const col = OFFICE[c];
          p(10, 0, 3, 12, col);
          p(10, 0, 3, 1, shade(col, 0.2));
          p(1, 12, 12, 3, shade(col, 0.1));
          p(1, 14, 12, 1, shade(col, -0.25));
          p(3, 9, 7, 1, '#5d646e');
          p(4, 10, 1, 2, '#5d646e');
          officeBase(p, 1, 15);
        },
      },
      2: {
        seats: [{ x: 0.5, y: 0.72, pose: 'sit', dir: 'up', cells: [[0, 0]], act: 'sit' }],
        draw(p, c) {
          const col = OFFICE[c];
          p(2, 12, 12, 3, shade(col, 0.1));
          officeBase(p, 2, 14);
          this.cover(p, c);
        },
        // arkadan bakınca sırtlık oturanın gövdesini örter
        cover(p, c) {
          const col = OFFICE[c];
          p(3, 8, 10, 8, shade(col, -0.12));
          p(4, 7, 8, 1, shade(col, 0.1));
          p(7, 16, 2, 2, '#8a929c');
          p(1, 11, 2, 1, '#5d646e');
          p(13, 11, 2, 1, '#5d646e');
        },
      },
    },
  };

  I.daybed = {
    name: 'Daybed',
    sw: 32,
    sh: 22,
    colors: FABRIC,
    colorNames: FABRIC_NAMES,
    seats: [{ x: 1.0, y: 0.72, pose: 'lie', dir: 'left', cells: [[0, 0], [1, 0]], act: 'lie' }],
    draw(p, c) {
      const w = '#a87650';
      p(0, 0, 3, 19, w);
      p(0, 0, 3, 1, shade(w, 0.2));
      p(29, 4, 3, 15, w);
      p(29, 4, 3, 1, shade(w, 0.2));
      p(3, 3, 26, 2, w);
      for (let x = 6; x < 28; x += 4) p(x, 5, 1, 4, shade(w, -0.1));
      p(2, 9, 28, 7, '#f3eee6');
      p(2, 9, 28, 1, '#ffffff');
      p(3, 6, 9, 6, '#ffffff');
      p(3, 11, 9, 1, '#ddd6cb');
      this.cover(p, c);
      p(1, 16, 30, 3, shade(w, -0.12));
      p(2, 19, 2, 3, shade(w, -0.25));
      p(28, 19, 2, 3, shade(w, -0.25));
    },
    cover(p, c) {
      const f = FABRIC[c];
      p(14, 8, 15, 8, f);
      p(14, 8, 15, 2, shade(f, 0.25));
      p(14, 14, 15, 2, shade(f, -0.18));
      p(20, 10, 1, 4, shade(f, -0.1));
    },
  };

  I.deckChair = {
    name: 'Sun lounger',
    sw: 16,
    sh: 36,
    colors: FABRIC,
    colorNames: FABRIC_NAMES,
    cuts: [19],
    seats: [{ x: 0.5, y: 1.375, pose: 'lie', dir: 'down', cells: [[0, 0], [0, 1]], band: 0, act: 'lie' }],
    draw(p, c) {
      const f = FABRIC[c];
      const w = '#b9875a';
      p(1, 2, 1, 30, w);
      p(14, 2, 1, 30, w);
      for (let x = 2; x < 14; x++) p(x, 2, 1, 30, x % 4 < 2 ? f : '#f2efe9');
      p(2, 2, 12, 1, shade(f, 0.2));
      p(4, 4, 8, 3, '#ffffff');
      p(4, 6, 8, 1, '#ddd6cb');
      p(2, 16, 12, 1, shade(f, -0.25));
      p(1, 31, 14, 1, shade(w, -0.2));
      p(1, 32, 2, 4, shade(w, -0.2));
      p(13, 32, 2, 4, shade(w, -0.2));
    },
  };

  I.swingBench = {
    name: 'Porch swing',
    sw: 32,
    sh: 30,
    colors: WOOD,
    colorNames: WOOD_NAMES,
    seats: [
      { x: 0.6, y: 0.4, pose: 'sit', dir: 'down', cells: [[0, 0]], act: 'sit' },
      { x: 1.4, y: 0.4, pose: 'sit', dir: 'down', cells: [[1, 0]], act: 'sit' },
    ],
    draw(p, c) {
      const w = WOOD[c];
      const post = '#5a3d2b';
      p(0, 0, 32, 2, post);
      p(0, 0, 2, 30, post);
      p(30, 0, 2, 30, post);
      p(0, 28, 4, 2, post);
      p(28, 28, 4, 2, post);
      p(5, 2, 1, 14, '#8a8f97');
      p(26, 2, 1, 14, '#8a8f97');
      for (let x = 4; x < 28; x += 3) p(x, 6, 2, 9, w);
      p(4, 5, 24, 2, shade(w, 0.18));
      p(3, 15, 26, 3, shade(w, 0.16));
      p(3, 15, 26, 1, shade(w, 0.32));
      p(3, 18, 26, 2, shade(w, -0.2));
      p(2, 13, 2, 3, w);
      p(28, 13, 2, 3, w);
      p(10, 15, 6, 3, '#f2efe9');
      p(10, 15, 6, 1, '#ffffff');
    },
  };

  // ---------- Mutfak ve kafe ----------
  const APPLIANCE = ['#f2efe9', '#3d424b', '#a8d8c8', '#d9665b'];
  const APPLIANCE_NAMES = ['White', 'Black', 'Mint', 'Red'];

  I.stove = {
    name: 'Stove',
    sw: 32,
    sh: 30,
    colors: APPLIANCE,
    colorNames: APPLIANCE_NAMES,
    draw(p, c) {
      const col = APPLIANCE[c];
      const d = shade(col, -0.18);
      // tezgah
      p(0, 8, 32, 5, '#efe9df');
      p(0, 8, 32, 1, '#ffffff');
      p(0, 12, 32, 1, '#d6cfc3');
      // ocak gözleri ve çaydanlık
      ellipse(p, 5, 10, 3, 1.3, '#3d424b');
      ellipse(p, 11, 10, 3, 1.3, '#3d424b');
      p(3, 3, 6, 6, '#c0c6cc');
      p(3, 3, 6, 1, '#e2e6e9');
      p(5, 2, 2, 1, '#3d424b');
      p(9, 4, 2, 1, '#c0c6cc');
      p(2, 5, 1, 2, '#3d424b');
      // tencere
      p(20, 5, 8, 4, '#d9785f');
      p(19, 5, 10, 1, shade('#d9785f', 0.2));
      p(23, 4, 2, 1, '#3d424b');
      // fırın ve dolap
      p(0, 13, 16, 15, col);
      p(0, 13, 16, 2, d);
      for (const x of [3, 7, 11]) p(x, 13, 2, 1, '#3d424b');
      p(2, 16, 12, 9, d);
      p(3, 18, 10, 6, '#2c3440');
      p(4, 19, 3, 1, '#5b6470');
      p(3, 16, 10, 1, '#c0c6cc');
      p(16, 13, 16, 15, shade(col, -0.06));
      p(16, 13, 1, 15, d);
      p(17, 20, 15, 1, d);
      p(23, 16, 3, 1, '#c0c6cc');
      p(23, 23, 3, 1, '#c0c6cc');
      p(0, 28, 32, 2, shade(col, -0.35));
    },
    over(ctx, r, item, env) {
      steam(ctx, r.x + 10, r.y + 4, env.t, item.x);
      steam(ctx, r.x + 24, r.y + 4, env.t + 400, item.x + 2);
    },
  };

  I.sink = {
    name: 'Kitchen sink',
    sw: 32,
    sh: 30,
    colors: APPLIANCE,
    colorNames: APPLIANCE_NAMES,
    draw(p, c) {
      const col = APPLIANCE[c];
      const d = shade(col, -0.18);
      p(0, 8, 32, 5, '#efe9df');
      p(0, 8, 32, 1, '#ffffff');
      p(0, 12, 32, 1, '#d6cfc3');
      p(4, 9, 14, 3, '#b9c2c9');
      p(5, 10, 12, 1, '#9aa5ae');
      // musluk
      p(10, 2, 2, 7, '#c0c6cc');
      p(10, 2, 5, 2, '#c0c6cc');
      p(14, 4, 1, 1, '#9aa5ae');
      p(8, 7, 1, 2, '#c0c6cc');
      p(13, 7, 1, 2, '#c0c6cc');
      // bulaşık sepeti
      p(21, 2, 9, 7, '#8a929c');
      p(22, 3, 7, 5, '#efe9df');
      for (const x of [23, 25, 27]) p(x, 1, 1, 7, ['#5b7fa8', '#e3b766', '#d9785f'][(x - 23) / 2]);
      p(0, 13, 32, 15, col);
      p(1, 14, 14, 12, d);
      p(17, 14, 14, 12, d);
      p(2, 15, 12, 10, col);
      p(18, 15, 12, 10, col);
      p(12, 19, 1, 3, '#c0c6cc');
      p(19, 19, 1, 3, '#c0c6cc');
      p(0, 28, 32, 2, shade(col, -0.35));
    },
  };

  const CART = ['#3d424b', '#c9a24b', '#f2efe9'];

  I.coffeeCart = {
    name: 'Coffee cart',
    sw: 16,
    sh: 28,
    colors: CART,
    colorNames: ['Black', 'Brass', 'White'],
    draw(p, c) {
      const m = CART[c];
      p(1, 11, 14, 2, m);
      p(1, 20, 14, 2, m);
      p(1, 11, 1, 14, m);
      p(14, 11, 1, 14, m);
      p(0, 25, 3, 3, '#2a2629');
      p(13, 25, 3, 3, '#2a2629');
      // espresso makinesi ve fincanlar
      p(2, 2, 7, 9, '#c0c6cc');
      p(2, 2, 7, 1, '#e2e6e9');
      p(3, 4, 5, 2, '#3d424b');
      p(4, 7, 3, 2, '#3d424b');
      p(4, 9, 3, 2, '#ece6da');
      p(10, 7, 4, 4, '#ece6da');
      p(10, 7, 4, 1, '#8a5a3c');
      p(10, 4, 4, 2, '#ece6da');
      // alt rafta kahve çekirdekleri
      p(3, 15, 4, 5, '#c9a46a');
      p(3, 15, 4, 1, shade('#c9a46a', 0.2));
      p(8, 16, 5, 4, '#7a5236');
      p(9, 17, 3, 1, '#e3b766');
    },
    over(ctx, r, item, env) {
      steam(ctx, r.x + 11, r.y + 6, env.t, item.x + item.y);
    },
  };

  const VEND = ['#d9665b', '#5b7fa8', '#6f9a7d', '#3d424b'];

  I.vendingMachine = {
    name: 'Vending machine',
    sw: 16,
    sh: 36,
    colors: VEND,
    colorNames: ['Red', 'Blue', 'Green', 'Black'],
    use: 'vend',
    petSfx: 'vend',
    useGlyph: '●',
    useColor: '#5fb0c8',
    glows: [{ x: 6, y: 14, r: 22, when: 'always', strength: 0.12, color: [200, 235, 255] }],
    draw(p, c) {
      const col = VEND[c];
      p(0, 0, 16, 34, col);
      p(0, 0, 16, 1, shade(col, 0.2));
      p(1, 2, 14, 3, shade(col, -0.25));
      p(3, 3, 4, 1, '#f2efe9');
      p(1, 6, 10, 18, '#d8ecf5');
      const cans = ['#e05d6f', '#f2c14e', '#6fa268', '#5b7fa8', '#f08a3c'];
      for (let row = 0; row < 4; row++) {
        for (let i = 0; i < 4; i++) p(2 + i * 2 + (i > 1 ? 1 : 0), 7 + row * 4, 1, 3, cans[(i + row) % cans.length]);
        p(1, 10 + row * 4, 10, 1, '#9aa5ae');
      }
      p(2, 6, 1, 18, 'rgba(255,255,255,0.6)');
      p(12, 7, 3, 4, '#2c3440');
      p(12, 12, 3, 2, '#c0c6cc');
      p(13, 15, 1, 3, '#3d424b');
      p(2, 26, 12, 4, '#2a2629');
      p(0, 34, 16, 2, shade(col, -0.35));
    },
    over(ctx, r, item, env) {
      if (env.thumb) return;
      ctx.fillStyle = Math.floor(env.t / 700) % 2 ? '#7fe0a0' : '#2c3440';
      ctx.fillRect(r.x + 12, r.y + 8, 3, 2);
    },
  };

  // ---------- Depolama ----------
  I.cubeShelf = {
    name: 'Cube shelf',
    sw: 32,
    sh: 30,
    colors: WOOD,
    colorNames: WOOD_NAMES,
    draw(p, c) {
      const w = WOOD[c];
      const in_ = shade(w, -0.3);
      p(0, 0, 32, 30, w);
      p(0, 0, 32, 1, shade(w, 0.2));
      for (let row = 0; row < 2; row++) {
        for (const x of [2, 9, 17, 24]) p(x, 2 + row * 13, 6, 11, in_);
      }
      // dolu bölmeler
      books(p, 2, 8, 13, 9, 3);
      p(9, 5, 6, 8, '#c9a46a');
      p(9, 5, 6, 1, shade('#c9a46a', 0.2));
      for (let y = 7; y < 13; y += 2) p(9, y, 6, 1, shade('#c9a46a', -0.15));
      p(19, 9, 4, 4, POTS[0]);
      p(18, 6, 3, 3, LEAF[1]);
      p(21, 5, 3, 4, LEAF[2]);
      books(p, 24, 30, 13, 9, 8);
      p(2, 21, 6, 5, '#e3b766');
      p(3, 18, 4, 3, '#ece6da');
      books(p, 9, 15, 26, 8, 11);
      p(17, 18, 6, 8, '#9aa1a9');
      p(18, 19, 4, 1, '#c0c6cc');
      p(24, 22, 6, 4, '#e59aa6');
      p(26, 20, 2, 2, '#e59aa6');
      p(0, 28, 32, 2, shade(w, -0.22));
    },
  };

  I.ladderShelf = {
    name: 'Ladder shelf',
    sw: 16,
    sh: 38,
    colors: WOOD,
    colorNames: WOOD_NAMES,
    draw(p, c) {
      const w = WOOD[c];
      const shelves = [[8, 4], [17, 5], [26, 7], [35, 8]];
      for (const [y, half] of shelves) {
        p(8 - half, y, half * 2, 2, shade(w, 0.12));
        p(8 - half, y + 1, half * 2, 1, shade(w, -0.12));
      }
      p(5, 3, 1, 5, LEAF[1]);
      p(4, 2, 3, 2, LEAF[2]);
      p(4, 5, 4, 3, POTS[1]);
      p(9, 4, 2, 4, '#e3b766');
      books(p, 3, 11, 17, 6, 2);
      p(12, 13, 2, 4, '#d9785f');
      p(2, 21, 6, 5, '#c9a46a');
      p(10, 22, 4, 4, '#ece6da');
      p(11, 21, 2, 1, '#8a5a3c');
      p(1, 31, 5, 4, POTS[2]);
      p(1, 28, 3, 3, LEAF[0]);
      books(p, 8, 14, 35, 6, 7);
      // dikmeler: tepede birleşir, aşağı açılır
      for (let y = 0; y < 38; y++) {
        const spread = Math.round((y / 38) * 6);
        p(6 - spread, y, 1, 1, w);
        p(9 + spread, y, 1, 1, w);
      }
    },
  };

  I.displayCabinet = {
    name: 'Display cabinet',
    sw: 32,
    sh: 40,
    colors: WOOD,
    colorNames: WOOD_NAMES,
    draw(p, c) {
      const w = WOOD[c];
      p(0, 0, 32, 3, shade(w, 0.2));
      p(1, 3, 30, 35, w);
      p(3, 5, 12, 22, '#dcecf0');
      p(17, 5, 12, 22, '#dcecf0');
      for (const y of [12, 19]) {
        p(3, y, 12, 1, shade(w, -0.15));
        p(17, y, 12, 1, shade(w, -0.15));
      }
      // tabaklar, fincanlar, kupa
      ellipse(p, 6.5, 8.5, 2.5, 2.5, '#f2efe9');
      ellipse(p, 11.5, 8.5, 2.5, 2.5, '#9fc6e0');
      p(19, 9, 3, 3, '#f2efe9');
      p(23, 9, 3, 3, '#e59aa6');
      p(26, 10, 1, 1, '#e59aa6');
      p(5, 15, 3, 4, '#e3b766');
      p(9, 14, 4, 5, '#6fa268');
      p(20, 14, 4, 3, '#c9a24b');
      p(21, 17, 2, 2, '#c9a24b');
      p(19, 13, 1, 2, '#c9a24b');
      p(24, 13, 1, 2, '#c9a24b');
      p(4, 22, 4, 5, '#d9785f');
      p(9, 23, 5, 4, '#5b7fa8');
      p(18, 23, 10, 4, '#ece6da');
      p(4, 6, 1, 6, 'rgba(255,255,255,0.7)');
      p(18, 6, 1, 6, 'rgba(255,255,255,0.7)');
      p(15, 5, 2, 22, shade(w, -0.12));
      p(3, 29, 26, 7, shade(w, -0.15));
      p(15, 31, 2, 1, '#f0e6cc');
      p(2, 38, 3, 2, shade(w, -0.3));
      p(27, 38, 3, 2, shade(w, -0.3));
    },
  };

  const TOYBOX = ['#d9785f', '#5b7fa8', '#e3b766', '#6f9a7d'];

  I.toyChest = {
    name: 'Toy chest',
    sw: 16,
    sh: 18,
    colors: TOYBOX,
    colorNames: ['Red', 'Blue', 'Yellow', 'Green'],
    draw(p, c) {
      const col = TOYBOX[c];
      // dışarı taşan oyuncaklar
      ellipse(p, 4, 3.5, 2.5, 2.5, '#e05d6f');
      p(3, 2, 1, 1, '#f2efe9');
      p(10, 1, 2, 5, '#c9a46a');
      p(9, 0, 4, 2, '#c9a46a');
      p(10, 1, 1, 1, '#3d3a3f');
      p(1, 5, 14, 3, shade(col, 0.2));
      p(1, 5, 14, 1, shade(col, 0.35));
      p(1, 8, 14, 9, col);
      p(1, 8, 14, 1, shade(col, -0.2));
      p(6, 10, 4, 4, '#f2efe9');
      p(7, 11, 2, 2, col);
      p(1, 16, 14, 2, shade(col, -0.3));
    },
  };

  // ---------- Eğlence ve dekor ----------
  const ARCADE = ['#5b3fa0', '#d9665b', '#2f6b8a'];

  I.arcade = {
    name: 'Arcade machine',
    sw: 16,
    sh: 38,
    colors: ARCADE,
    colorNames: ['Purple', 'Red', 'Teal'],
    use: 'play',
    petSfx: 'arcade',
    useGlyph: '★',
    useColor: '#f2c14e',
    glows: [{ x: 8, y: 14, r: 24, when: 'always', strength: 0.16, tint: true }],
    draw(p, c) {
      const col = ARCADE[c];
      const d = shade(col, -0.25);
      p(1, 0, 14, 6, d);
      p(2, 1, 12, 4, '#f2c14e');
      p(4, 2, 8, 2, '#e05d6f');
      p(0, 6, 16, 32, col);
      p(0, 6, 1, 32, d);
      p(15, 6, 1, 32, d);
      p(2, 7, 12, 11, '#1b1f2a');
      p(1, 18, 14, 5, shade(col, 0.15));
      p(4, 19, 1, 2, '#3d424b');
      p(3, 18, 3, 1, '#e05d6f');
      p(9, 20, 2, 1, '#f2c14e');
      p(12, 19, 2, 1, '#4fe0d0');
      p(3, 26, 10, 6, d);
      p(6, 28, 4, 2, '#f2c14e');
      p(1, 36, 14, 2, shade(col, -0.4));
    },
    over(ctx, r, item, env) {
      const t = env.t / 1000;
      ctx.fillStyle = '#1b1f2a';
      ctx.fillRect(r.x + 2, r.y + 7, 12, 11);
      // basit bir oyun: yürüyen uzaylılar ve oyuncu
      ctx.fillStyle = '#4fe0d0';
      const shift = Math.floor(t * 2) % 3;
      for (let i = 0; i < 3; i++) ctx.fillRect(r.x + 3 + shift + i * 3, r.y + 9, 2, 1);
      ctx.fillStyle = '#ff6fa8';
      for (let i = 0; i < 2; i++) ctx.fillRect(r.x + 4 + shift + i * 3, r.y + 11, 2, 1);
      ctx.fillStyle = '#f2c14e';
      const px = r.x + 3 + Math.round(4 + 4 * Math.sin(t * 1.7));
      ctx.fillRect(px, r.y + 16, 3, 1);
      ctx.fillRect(px + 1, r.y + 15, 1, 1);
      if (Math.floor(t * 4) % 3 === 0) ctx.fillRect(px + 1, r.y + 12 + (Math.floor(t * 8) % 3), 1, 1);
    },
  };

  const DRUMS = ['#d9665b', '#3d424b', '#5b7fa8'];

  I.drumKit = {
    name: 'Drum kit',
    sw: 32,
    sh: 30,
    colors: DRUMS,
    colorNames: ['Red', 'Black', 'Blue'],
    cuts: [17],
    seats: [{ x: 1, y: 0.5, pose: 'study', dir: 'down', cells: [[0, 0], [1, 0]], band: 0, act: 'play', anim: true, sfx: 'drum' }],
    draw(p, c) {
      const col = DRUMS[c];
      const cym = '#e3c25a';
      // tabure ve ziller (davulcunun arkasında)
      p(12, 12, 8, 3, '#3d424b');
      p(15, 15, 2, 6, '#8a929c');
      p(3, 9, 1, 19, '#8a929c');
      p(28, 7, 1, 21, '#8a929c');
      p(0, 8, 8, 2, cym);
      p(1, 8, 6, 1, shade(cym, 0.25));
      p(25, 6, 8, 2, cym);
      p(26, 6, 6, 1, shade(cym, 0.25));
      // davullar
      p(4, 17, 8, 4, col);
      p(4, 17, 8, 1, '#f2efe9');
      p(20, 17, 8, 4, col);
      p(20, 17, 8, 1, '#f2efe9');
      ellipse(p, 16, 23.5, 7, 6, col);
      ellipse(p, 16, 23.5, 5, 4.2, '#f2efe9');
      p(12, 22, 8, 1, shade(col, 0.1));
      p(13, 23, 6, 1, '#3d424b');
      p(2, 23, 6, 4, col);
      p(2, 23, 6, 1, '#f2efe9');
      p(4, 27, 1, 2, '#8a929c');
      p(25, 24, 5, 4, col);
      p(25, 24, 5, 1, '#f2efe9');
      p(27, 28, 1, 2, '#8a929c');
      p(10, 29, 12, 1, '#3d424b');
    },
  };

  const BEARS = ['#b9875a', '#f2efe9', '#e59aa6', '#7a5236'];

  I.teddyBear = {
    name: 'Teddy bear',
    sw: 16,
    sh: 18,
    colors: BEARS,
    colorNames: ['Honey', 'Snow', 'Pink', 'Cocoa'],
    use: 'pet',
    petSfx: 'squeak',
    draw(p, c) {
      const col = BEARS[c];
      const d = shade(col, -0.2);
      const l = shade(col, 0.25);
      ellipse(p, 8, 12, 5.5, 5, col);
      ellipse(p, 8, 13, 3.2, 3, l);
      p(1, 10, 3, 3, col);
      p(12, 10, 3, 3, col);
      p(2, 15, 4, 3, col);
      p(10, 15, 4, 3, col);
      p(3, 16, 2, 1, l);
      p(11, 16, 2, 1, l);
      ellipse(p, 8, 4.5, 4.5, 4, col);
      p(3, 0, 3, 3, col);
      p(10, 0, 3, 3, col);
      p(4, 1, 1, 1, d);
      p(11, 1, 1, 1, d);
      p(6, 5, 4, 3, l);
      p(7, 5, 2, 1, '#3d3a3f');
      p(5, 3, 1, 1, '#2b2230');
      p(10, 3, 1, 1, '#2b2230');
      p(6, 8, 4, 1, '#e05d6f');
      p(7, 9, 2, 1, '#e05d6f');
    },
  };

  const LAVA = ['#ff6fa8', '#4fe0d0', '#ffd257', '#b98aff'];

  I.lavaLamp = {
    name: 'Lava lamp',
    sw: 10,
    sh: 22,
    ox: 3,
    colors: LAVA,
    colorNames: ['Pink', 'Turquoise', 'Yellow', 'Violet'],
    glows: [{ x: 5, y: 9, r: 26, when: 'always', strength: 0.2, tint: true }],
    draw(p, c) {
      const col = LAVA[c];
      p(3, 0, 4, 2, '#c0c6cc');
      p(2, 2, 6, 13, shade(col, -0.45));
      p(1, 6, 8, 6, shade(col, -0.45));
      p(2, 15, 6, 2, '#c0c6cc');
      p(1, 17, 8, 5, '#9aa5ae');
      p(1, 17, 8, 1, '#e2e6e9');
    },
    over(ctx, r, item, env) {
      const col = LAVA[item.c];
      const t = env.t / 1000;
      ctx.fillStyle = shade(col, -0.2);
      ctx.fillRect(r.x + 2, r.y + 2, 6, 13);
      ctx.fillRect(r.x + 1, r.y + 6, 8, 6);
      ctx.fillStyle = col;
      for (let i = 0; i < 3; i++) {
        const y = 3 + ((Math.sin(t * 0.6 + i * 2.1) + 1) / 2) * 9;
        const x = 3 + Math.round(Math.sin(t * 0.4 + i) * 1.2);
        ctx.fillRect(r.x + x, r.y + Math.round(y), i === 1 ? 3 : 2, 2);
      }
      ctx.fillRect(r.x + 2, r.y + 13, 6, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(r.x + 2, r.y + 3, 1, 9);
    },
  };

  const FANS = ['#f2efe9', '#a8d8c8', '#3d424b'];

  I.floorFan = {
    name: 'Floor fan',
    sw: 16,
    sh: 30,
    colors: FANS,
    colorNames: ['White', 'Mint', 'Black'],
    draw(p, c) {
      const col = FANS[c];
      ellipse(p, 8, 7, 7, 7, shade(col, -0.15));
      ellipse(p, 8, 7, 6, 6, '#e8eef2');
      p(7, 14, 2, 12, shade(col, -0.1));
      p(3, 26, 10, 3, col);
      p(3, 26, 10, 1, shade(col, 0.2));
      p(10, 27, 2, 1, '#d9665b');
    },
    over(ctx, r, item, env) {
      const a = env.t / 90;
      ctx.fillStyle = shade(FANS[item.c], -0.25);
      for (let k = 0; k < 3; k++) {
        const ang = a + (k * Math.PI * 2) / 3;
        for (let s = 1; s <= 5; s++) ctx.fillRect(r.x + 7 + Math.round(Math.cos(ang) * s), r.y + 6 + Math.round(Math.sin(ang) * s), 2, 2);
      }
      ctx.fillStyle = '#c0c6cc';
      ctx.fillRect(r.x + 7, r.y + 6, 2, 2);
      ctx.fillStyle = 'rgba(120,130,140,0.5)';
      for (let i = -6; i <= 6; i += 3) ctx.fillRect(r.x + 8 + i, r.y + 1, 1, 12);
    },
  };

  const BAUBLES = ['#e05d6f', '#f2c14e', '#5b9bd8'];
  const TREE_LIGHTS = [[6, 9], [10, 12], [5, 16], [11, 19], [7, 22], [3, 25], [12, 25], [9, 26]];

  I.christmasTree = {
    name: 'Holiday tree',
    sw: 16,
    sh: 36,
    colors: BAUBLES,
    colorNames: ['Red', 'Gold', 'Blue'],
    glows: [{ x: 8, y: 18, r: 30, when: 'always', strength: 0.14, color: [255, 214, 140] }],
    draw(p, c) {
      const g1 = '#3f7a4f';
      const g2 = '#4f9461';
      for (const [top, h, w0] of [[3, 9, 2], [9, 10, 4], [16, 12, 6]]) {
        for (let i = 0; i < h; i++) {
          const half = Math.min(7.5, w0 / 2 + i * 0.55);
          p(Math.round(8 - half), top + i, Math.round(half * 2), 1, i % 3 === 0 ? g2 : g1);
        }
      }
      p(7, 28, 2, 3, '#7a5236');
      // hediyeler
      p(1, 29, 6, 5, '#d9665b');
      p(3, 29, 1, 5, '#f2c14e');
      p(9, 30, 6, 4, '#5b7fa8');
      p(11, 30, 1, 4, '#f2efe9');
      p(4, 32, 6, 4, '#e3b766');
      p(6, 32, 1, 4, '#e05d6f');
      // tepe yıldızı
      p(7, 0, 2, 3, '#f2c14e');
      p(6, 1, 4, 1, '#f2c14e');
      for (const [x, y] of TREE_LIGHTS) p(x, y, 1, 1, BAUBLES[c]);
    },
    over(ctx, r, item, env) {
      if (env.thumb) return;
      const cols = ['#fff4c2', '#ff9fb0', '#9fd8ff'];
      TREE_LIGHTS.forEach(([x, y], i) => {
        if (Math.sin(env.t / 300 + i * 1.7) < 0.2) return;
        ctx.fillStyle = cols[i % 3];
        ctx.fillRect(r.x + x + (i % 2 ? 1 : -1), r.y + y - 1, 1, 1);
      });
    },
  };

  const PUMPKINS = ['#e8853a', '#efe6d2', '#9bbf6a'];

  I.pumpkin = {
    name: 'Pumpkin',
    sw: 16,
    sh: 14,
    colors: PUMPKINS,
    colorNames: ['Orange', 'White', 'Green'],
    glows: [nightGlow(8, 8, 26, { color: [255, 160, 60], strength: 0.4 })],
    draw(p, c) {
      const col = PUMPKINS[c];
      ellipse(p, 8, 8.5, 7.5, 5.2, shade(col, -0.15));
      ellipse(p, 5, 8.5, 3.5, 5, col);
      ellipse(p, 11, 8.5, 3.5, 5, col);
      ellipse(p, 8, 8.5, 2.5, 5.2, shade(col, 0.12));
      p(7, 1, 2, 3, '#6b8f3a');
      p(9, 2, 2, 1, '#6b8f3a');
      this.face(p, '#3d2a20');
    },
    face(p, col) {
      p(4, 6, 2, 2, col);
      p(10, 6, 2, 2, col);
      p(7, 8, 2, 1, col);
      p(4, 10, 8, 1, col);
      p(5, 11, 2, 1, col);
      p(9, 11, 2, 1, col);
    },
    over(ctx, r, item, env) {
      if (env.light.night < 0.25) return;
      ctx.globalAlpha = Math.min(1, env.light.night * 1.5) * (0.85 + 0.15 * Math.sin(env.t / 120));
      I.pumpkin.face((x, y, w, h) => {
        ctx.fillStyle = '#ffcf5a';
        ctx.fillRect(r.x + x, r.y + y, w, h);
      });
      ctx.globalAlpha = 1;
    },
  };

  // ---------- Bitkiler ----------
  I.palm = {
    name: 'Palm',
    sw: 24,
    sh: 40,
    ox: -4,
    colors: POTS,
    colorNames: POT_NAMES,
    draw(p, c) {
      const pot = POTS[c];
      p(11, 14, 2, 18, '#9a7a52');
      for (let y = 16; y < 32; y += 3) p(11, y, 2, 1, '#7a5a3a');
      // yapraklar: yelpaze gibi dışa doğru eğilir
      const frond = (dir, len, droop, col) => {
        for (let i = 0; i < len; i++) {
          const x = 12 + dir * i;
          const y = 12 + Math.round((i * i) / droop) - Math.round(i * 0.4);
          p(x, y, 1, 2, col);
          if (i > 1 && i < len - 1) p(x, y + 2, 1, 1, shade(col, -0.15));
        }
      };
      frond(-1, 12, 7, LEAF[0]);
      frond(1, 12, 7, LEAF[0]);
      frond(-1, 10, 4, LEAF[1]);
      frond(1, 10, 4, LEAF[1]);
      frond(-1, 8, 14, LEAF[2]);
      frond(1, 8, 14, LEAF[2]);
      p(10, 5, 4, 8, LEAF[1]);
      p(11, 3, 2, 3, LEAF[2]);
      p(6, 31, 12, 2, shade(pot, 0.15));
      p(7, 33, 10, 7, pot);
      p(7, 39, 10, 1, shade(pot, -0.2));
    },
  };

  const TRAYS = ['#3d3a3f', '#c87b55', '#5f7c8a'];

  I.bonsai = {
    name: 'Bonsai',
    sw: 16,
    sh: 20,
    colors: TRAYS,
    colorNames: ['Black', 'Terracotta', 'Slate'],
    draw(p, c) {
      const tray = TRAYS[c];
      // alçak sehpa
      p(1, 13, 14, 2, '#7a5236');
      p(2, 15, 2, 5, '#5a3d2b');
      p(12, 15, 2, 5, '#5a3d2b');
      p(3, 10, 10, 3, tray);
      p(3, 10, 10, 1, shade(tray, 0.2));
      p(4, 9, 8, 1, '#6b4a2f');
      // kıvrık gövde ve yaprak bulutları
      p(7, 6, 2, 3, '#6b4a2f');
      p(6, 4, 2, 2, '#6b4a2f');
      p(8, 3, 3, 1, '#6b4a2f');
      ellipse(p, 4.5, 3.5, 3.5, 2, LEAF[1]);
      ellipse(p, 11.5, 2.5, 3.5, 2, LEAF[1]);
      ellipse(p, 9, 6, 2.5, 1.5, LEAF[0]);
      p(3, 2, 2, 1, LEAF[2]);
      p(10, 1, 2, 1, LEAF[2]);
    },
  };

  I.pampasVase = {
    name: 'Pampas vase',
    sw: 16,
    sh: 34,
    colors: POTS,
    colorNames: POT_NAMES,
    draw(p, c) {
      const pot = POTS[c];
      const plume = '#e6d4b0';
      for (const [x0, lean] of [[8, 0], [6, -1], [10, 1], [7, -2], [9, 2]]) {
        for (let y = 2; y < 22; y++) {
          const x = x0 + Math.round((lean * (22 - y)) / 8);
          p(x, y, 1, 1, y < 12 ? plume : '#b9a27a');
          if (y < 12) p(x - 1 + (y % 2) * 2, y, 1, 1, shade(plume, y % 3 ? 0.1 : -0.08));
        }
      }
      p(5, 20, 6, 2, pot);
      p(4, 22, 8, 10, pot);
      p(4, 22, 8, 1, shade(pot, 0.2));
      p(5, 23, 1, 7, shade(pot, 0.12));
      p(5, 32, 6, 2, shade(pot, -0.2));
    },
  };

  // ---------- Açık hava ----------
  const STONES = ['#9aa1a9', '#c9b8a0'];

  I.campfire = {
    name: 'Campfire',
    sw: 16,
    sh: 12,
    colors: STONES,
    colorNames: ['Gray', 'Sand'],
    glows: [{ x: 8, y: 2, r: 56, when: 'always', strength: 0.45 }],
    draw(p, c) {
      const s = STONES[c];
      ellipse(p, 8, 8, 7.5, 3.5, shade(s, -0.2));
      ellipse(p, 8, 7.5, 5, 2.2, '#3a2c35');
      for (const [x, y] of [[1, 7], [4, 5], [9, 4], [13, 6], [12, 9], [7, 10], [2, 9]]) {
        p(x, y, 3, 2, s);
        p(x, y, 2, 1, shade(s, 0.2));
      }
      p(3, 6, 10, 2, '#7a5236');
      p(5, 5, 6, 1, '#9a6a46');
      p(6, 7, 4, 1, '#f08a3c');
    },
    over(ctx, r, item, env) {
      const t = env.t / 1000;
      const cols = ['#d9502f', '#f08a3c', '#f7d154'];
      for (let i = 0; i < 4; i++) {
        const h = 5 + Math.round(4 * Math.abs(Math.sin(t * 3.4 + i * 1.9)));
        cols.forEach((col, k) => {
          const hh = Math.max(1, h - k * 2);
          ctx.fillStyle = col;
          ctx.fillRect(r.x + 5 + i * 2 - (k === 0 ? 0 : 0), r.y + 6 - hh, k === 2 ? 1 : 2, hh);
        });
      }
      if (env.thumb) return;
      const ph = (t * 0.7 + item.x * 0.3) % 1;
      ctx.fillStyle = `rgba(255, 190, 90, ${1 - ph})`;
      ctx.fillRect(r.x + 7 + Math.round(Math.sin(ph * 9) * 3), r.y - 2 - Math.round(ph * 14), 1, 1);
    },
  };

  I.lampPost = {
    name: 'Lamp post',
    sw: 12,
    sh: 48,
    ox: 2,
    colors: METAL.slice(0, 3),
    colorNames: METAL_NAMES.slice(0, 3),
    glows: [nightGlow(6, 7, 46, { strength: 0.5 })],
    draw(p, c) {
      const m = METAL[c];
      p(4, 0, 4, 1, m);
      p(2, 1, 8, 2, m);
      p(3, 3, 6, 7, '#f6e7b8');
      p(3, 3, 1, 7, m);
      p(8, 3, 1, 7, m);
      p(4, 4, 2, 5, '#fff7dc');
      p(2, 10, 8, 1, m);
      p(5, 11, 2, 33, m);
      p(4, 22, 4, 1, m);
      p(3, 43, 6, 3, m);
      p(2, 46, 8, 2, shade(m, -0.2));
    },
  };

  const FLOWER_BEDS = ['#e05d6f', '#f2c14e', '#9b7bb5', '#f2efe9'];

  I.planterBox = {
    name: 'Planter box',
    sw: 32,
    sh: 20,
    colors: FLOWER_BEDS,
    colorNames: ['Red', 'Yellow', 'Purple', 'White'],
    draw(p, c) {
      const fl = FLOWER_BEDS[c];
      const w = '#9a6a46';
      const r = rng(31);
      for (let x = 2; x < 30; x += 2) {
        const h = 3 + Math.floor(r() * 4);
        p(x, 9 - h, 1, h + 1, LEAF[x % 3]);
        p(x + 1, 8 - Math.floor(h / 2), 1, 2, LEAF[(x + 1) % 3]);
      }
      for (let i = 0; i < 9; i++) {
        const x = 2 + Math.floor(r() * 27);
        const y = 1 + Math.floor(r() * 5);
        p(x, y, 2, 2, fl);
        p(x, y, 1, 1, shade(fl, 0.3));
      }
      p(0, 8, 32, 12, w);
      p(0, 8, 32, 1, shade(w, 0.25));
      p(0, 13, 32, 1, shade(w, -0.15));
      p(0, 17, 32, 1, shade(w, -0.15));
      p(0, 8, 2, 12, shade(w, -0.1));
      p(30, 8, 2, 12, shade(w, -0.1));
    },
  };

  const FOUNTAIN = ['#d8d1c4', '#9aa1a9'];

  I.fountain = {
    name: 'Fountain',
    sw: 32,
    sh: 44,
    colors: FOUNTAIN,
    colorNames: ['Sandstone', 'Granite'],
    draw(p, c) {
      const s = FOUNTAIN[c];
      ellipse(p, 16, 32, 16, 9, shade(s, -0.22));
      ellipse(p, 16, 30.5, 16, 8.5, s);
      ellipse(p, 16, 30, 13.5, 6.5, '#5b9bc8');
      ellipse(p, 16, 30.5, 11, 4.5, '#6fb0d8');
      p(14, 14, 4, 16, s);
      p(14, 14, 1, 16, shade(s, 0.15));
      ellipse(p, 16, 14, 7, 2.5, shade(s, -0.15));
      ellipse(p, 16, 13.5, 6, 2, '#6fb0d8');
      p(15, 8, 2, 5, s);
      p(14, 7, 4, 2, shade(s, 0.15));
      p(0, 34, 32, 6, shade(s, -0.12));
      p(1, 34, 30, 1, shade(s, 0.08));
      p(2, 40, 28, 2, shade(s, -0.3));
    },
    over(ctx, r, item, env) {
      const t = env.t / 1000;
      ctx.fillStyle = 'rgba(220, 240, 255, 0.9)';
      // tepe fıskiyesi
      for (let i = 0; i < 5; i++) {
        const ph = (t * 1.2 + i / 5) % 1;
        const dx = (i - 2) * ph * 3;
        ctx.fillRect(r.x + 16 + Math.round(dx), r.y + 6 - Math.round(Math.sin(ph * Math.PI) * 5) + Math.round(ph * 8), 1, 1);
      }
      // alt havuza dökülen su
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const ph = (t * 1.5 + i / 3) % 1;
          ctx.fillRect(r.x + 16 + side * (6 + Math.round(ph * 2)), r.y + 14 + Math.round(ph * 14), 1, 2);
        }
      }
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      const rip = Math.floor(t * 3) % 3;
      ctx.fillRect(r.x + 7 + rip * 2, r.y + 31, 3, 1);
      ctx.fillRect(r.x + 20 - rip * 2, r.y + 29, 3, 1);
    },
  };

  const SCARVES = ['#d9665b', '#5b7fa8', '#6f9a7d'];

  I.snowman = {
    name: 'Snowman',
    sw: 16,
    sh: 28,
    colors: SCARVES,
    colorNames: ['Red', 'Blue', 'Green'],
    draw(p, c) {
      const snow = '#f4f6fa';
      const sd = '#d8e0ea';
      ellipse(p, 8, 22, 7, 6, sd);
      ellipse(p, 8, 21.5, 6.5, 5.5, snow);
      ellipse(p, 8, 12, 5, 4.5, sd);
      ellipse(p, 8, 11.5, 4.5, 4.2, snow);
      ellipse(p, 8, 5, 3.6, 3.4, snow);
      p(5, 0, 6, 2, '#3d3a3f');
      p(4, 2, 8, 1, '#3d3a3f');
      p(6, 4, 1, 1, '#2b2230');
      p(9, 4, 1, 1, '#2b2230');
      p(8, 5, 3, 1, '#f08a3c');
      p(4, 8, 8, 2, SCARVES[c]);
      p(9, 10, 2, 4, SCARVES[c]);
      for (const y of [12, 15, 19]) p(7, y, 2, 1, '#3d3a3f');
      p(0, 10, 3, 1, '#7a5236');
      p(13, 10, 3, 1, '#7a5236');
      p(0, 9, 1, 1, '#7a5236');
      p(15, 9, 1, 1, '#7a5236');
    },
  };

  const BIKES = ['#d9665b', '#5b7fa8', '#6f9a7d', '#e3b766'];

  I.bicycle = {
    name: 'Bicycle',
    sw: 32,
    sh: 22,
    colors: BIKES,
    colorNames: ['Red', 'Blue', 'Mint', 'Yellow'],
    draw(p, c) {
      const f = BIKES[c];
      const wheel = (cx) => {
        for (let a = 0; a < 32; a++) {
          const ang = (a / 32) * Math.PI * 2;
          p(Math.round(cx + Math.cos(ang) * 6), Math.round(15 + Math.sin(ang) * 6), 1, 1, '#2a2629');
        }
        p(cx - 5, 15, 11, 1, '#c0c6cc');
        p(cx, 10, 1, 11, '#c0c6cc');
        p(cx, 15, 1, 1, '#3d424b');
      };
      wheel(7);
      wheel(25);
      // kadro
      for (let i = 0; i <= 9; i++) p(7 + i, 15 - Math.round(i * 0.6), 1, 1, f);
      for (let i = 0; i <= 9; i++) p(16 + i, 9 + Math.round(i * 0.6), 1, 1, f);
      p(12, 9, 10, 1, f);
      p(12, 9, 1, 7, f);
      p(16, 15, 1, 1, f);
      p(10, 7, 5, 2, '#3d3a3f');
      p(22, 5, 1, 5, f);
      p(20, 5, 5, 1, '#3d3a3f');
      // sepet ve çiçekler
      p(24, 5, 6, 4, '#c9a46a');
      p(24, 5, 6, 1, shade('#c9a46a', 0.2));
      p(25, 3, 2, 2, '#e05d6f');
      p(27, 2, 2, 3, '#f2c14e');
      p(25, 6, 4, 1, shade('#c9a46a', -0.2));
    },
  };

  // ---------- Halılar ----------
  I.shagRug = {
    name: 'Shag rug',
    sw: 32,
    sh: 32,
    colors: FABRIC,
    colorNames: FABRIC_NAMES,
    draw(p, c) {
      const f = FABRIC[c];
      ellipse(p, 16, 16, 15.5, 15.5, shade(f, -0.12));
      ellipse(p, 16, 16, 14.5, 14.5, f);
      const r = rng(77);
      for (let i = 0; i < 160; i++) {
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r()) * 13.5;
        p(Math.round(16 + Math.cos(a) * d), Math.round(16 + Math.sin(a) * d), 1, 1, shade(f, r() > 0.5 ? 0.16 : -0.1));
      }
    },
  };

  I.checkerRug = {
    name: 'Checkered rug',
    sw: 48,
    sh: 32,
    colors: FABRIC,
    colorNames: FABRIC_NAMES,
    draw(p, c) {
      const f = FABRIC[c];
      const light = c === 8 ? '#c9b8a0' : '#f3ece0';
      p(0, 0, 48, 32, light);
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 6; x++) if ((x + y) % 2 === 0) p(x * 8, y * 8, 8, 8, f);
      }
      p(0, 0, 48, 1, shade(f, -0.15));
      p(0, 31, 48, 1, shade(f, -0.15));
      p(0, 0, 1, 32, shade(f, -0.15));
      p(47, 0, 1, 32, shade(f, -0.15));
    },
    views: { 1: { sw: 32, sh: 48, rotateOf: 0 } },
  };

  const MATS = ['#9b7bb5', '#6f9a7d', '#e59aa6', '#5b7fa8'];

  I.yogaMat = {
    name: 'Yoga mat',
    sw: 14,
    sh: 32,
    ox: 1,
    colors: MATS,
    colorNames: ['Lavender', 'Sage', 'Pink', 'Blue'],
    draw(p, c) {
      const m = MATS[c];
      p(0, 3, 14, 29, m);
      p(0, 3, 14, 1, shade(m, 0.2));
      p(0, 0, 14, 4, shade(m, -0.15));
      p(0, 1, 14, 1, shade(m, 0.15));
      p(1, 30, 12, 1, shade(m, -0.1));
      p(3, 12, 8, 1, shade(m, 0.12));
      p(3, 22, 8, 1, shade(m, 0.12));
    },
    views: { 1: { sw: 32, sh: 14, ox: 0, rotateOf: 0 } },
  };

  // ---------- Duvar ----------
  const TVS = ['#2a2629', '#f2efe9'];

  I.wallTV = {
    name: 'Wall TV',
    sw: 32,
    sh: 20,
    wy: 12,
    colors: TVS,
    colorNames: ['Black', 'White'],
    glows: [{ x: 16, y: 10, r: 28, when: 'always', strength: 0.1, color: [140, 200, 255] }],
    draw(p, c) {
      p(0, 0, 32, 19, TVS[c]);
      p(1, 1, 30, 16, '#1b1f2a');
      p(14, 19, 4, 1, '#8a929c');
    },
    over(ctx, r, item, env) {
      // değişen sahneler: deniz, orman, gün batımı
      const scene = Math.floor(env.t / 6000) % 3;
      const skies = ['#8fc4e8', '#bfe3c8', '#f6b98a'];
      const grounds = ['#3f78a8', '#4f8a5a', '#9b5f6e'];
      ctx.fillStyle = skies[scene];
      ctx.fillRect(r.x + 1, r.y + 1, 30, 10);
      ctx.fillStyle = grounds[scene];
      ctx.fillRect(r.x + 1, r.y + 11, 30, 6);
      ctx.fillStyle = scene === 2 ? '#f7d154' : '#ffffff';
      const sx = (Math.floor(env.t / 200) % 40) - 5;
      if (scene === 2) ctx.fillRect(r.x + 20, r.y + 6, 4, 4);
      else ctx.fillRect(r.x + 1 + Math.max(0, Math.min(26, sx)), r.y + 4, 4, 1);
      if (scene === 1) {
        ctx.fillStyle = '#2f6b3f';
        for (const x of [4, 9, 22, 27]) ctx.fillRect(r.x + x, r.y + 8, 2, 4);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(r.x + 2, r.y + 2, 6, 1);
    },
  };

  const BOARD_FRAMES = ['#c0c6cc', '#a87650'];

  I.whiteboard = {
    name: 'Whiteboard',
    sw: 32,
    sh: 22,
    wy: 10,
    colors: BOARD_FRAMES,
    colorNames: ['Silver', 'Wood'],
    draw(p, c) {
      const fr = BOARD_FRAMES[c];
      p(0, 0, 32, 20, fr);
      p(1, 1, 30, 18, '#fbfbf8');
      // çizimler: liste, grafik, ok
      p(3, 3, 10, 1, '#5b7fa8');
      for (const y of [6, 9, 12]) {
        p(3, y, 1, 1, '#d9665b');
        p(5, y, 3 + (y % 5), 1, '#3d424b');
      }
      p(17, 14, 1, 1, '#3d424b');
      p(17, 4, 1, 11, '#3d424b');
      p(17, 15, 11, 1, '#3d424b');
      for (let i = 0; i < 9; i++) p(18 + i, 13 - Math.round(i * 0.9 + (i % 3 === 1 ? 1 : 0)), 1, 1, '#6fa268');
      p(25, 4, 3, 1, '#d9665b');
      p(3, 15, 6, 2, '#f2e27a');
      p(0, 20, 32, 2, shade(fr, -0.2));
      p(5, 19, 4, 1, '#d9665b');
      p(10, 19, 4, 1, '#5b7fa8');
    },
  };

  const DART = [['#3d3a3f', '#f2efe9', '#d9665b', '#6fa268'], ['#9b7bb5', '#f6efc6', '#e59aa6', '#9fc6e0']];

  I.dartboard = {
    name: 'Dartboard',
    sw: 14,
    sh: 14,
    ox: 1,
    wy: 12,
    colors: ['#3d3a3f', '#9b7bb5'],
    colorNames: ['Classic', 'Pastel'],
    draw(p, c) {
      const [a, b, ring, bull] = DART[c];
      ellipse(p, 7, 7, 7, 7, '#5a3d2b');
      for (let y = 0; y < 14; y++) {
        for (let x = 0; x < 14; x++) {
          const dx = x + 0.5 - 7;
          const dy = y + 0.5 - 7;
          const d = Math.hypot(dx, dy);
          if (d > 6) continue;
          const seg = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2)) * 10) % 2;
          let col = seg ? a : b;
          if ((d > 5 && d <= 6) || (d > 3 && d <= 3.8)) col = seg ? ring : bull;
          if (d <= 1.2) col = ring;
          p(x, y, 1, 1, col);
        }
      }
      p(9, 4, 3, 1, '#e3b766');
      p(4, 8, 1, 3, '#e3b766');
    },
  };

  const GALLERY_ART = ['#e98a5b', '#7fae73', '#5b7fa8', '#e59aa6', '#f2c14e'];

  I.gallery = {
    name: 'Gallery wall',
    sw: 48,
    sh: 30,
    wy: 6,
    colors: FRAME3,
    colorNames: FRAME3_NAMES,
    draw(p, c) {
      const fr = FRAME3[c];
      const frame = (x, y, w, h, art) => {
        p(x, y, w, h, fr);
        p(x + 1, y + 1, w - 2, h - 2, '#f7f3ea');
        art(x + 2, y + 2, w - 4, h - 4);
      };
      frame(0, 2, 14, 18, (x, y, w, h) => {
        p(x, y, w, h, '#cfe3ef');
        ellipse(p, x + w / 2, y + h - 3, w / 2, 4, GALLERY_ART[1]);
        p(x + 6, y + 2, 3, 3, GALLERY_ART[4]);
      });
      frame(16, 0, 16, 12, (x, y, w, h) => {
        p(x, y, w, h, '#f3ece0');
        p(x + 1, y + 1, 5, 6, GALLERY_ART[0]);
        p(x + 6, y + 3, 5, 5, GALLERY_ART[2]);
      });
      frame(16, 14, 10, 14, (x, y, w, h) => {
        p(x, y, w, h, '#fbf4e2');
        p(x + 2, y + 2, 2, 6, LEAF[0]);
        p(x + 1, y + 3, 1, 2, LEAF[1]);
        p(x + 4, y + 4, 1, 2, LEAF[1]);
      });
      frame(28, 14, 8, 8, (x, y, w, h) => {
        p(x, y, w, h, GALLERY_ART[3]);
        p(x + 1, y + 1, 2, 2, '#ffffff');
      });
      frame(34, 2, 14, 10, (x, y, w, h) => {
        p(x, y, w, h, '#2f3550');
        p(x + 6, y + 1, 3, 3, '#f6efc6');
        p(x + 1, y + 4, 1, 1, '#f6efc6');
        p(x + 3, y + 1, 1, 1, '#f6efc6');
      });
      frame(38, 14, 10, 14, (x, y, w, h) => {
        p(x, y, w, h, '#f3ece0');
        ellipse(p, x + w / 2, y + h / 2, 2.5, 3.5, GALLERY_ART[0]);
      });
    },
  };

  I.tapestry = {
    name: 'Tapestry',
    sw: 30,
    sh: 34,
    ox: 1,
    wy: 4,
    colors: FABRIC,
    colorNames: FABRIC_NAMES,
    draw(p, c) {
      const f = FABRIC[c];
      const cream = c === 8 ? '#c9b8a0' : '#f3ece0';
      p(0, 0, 30, 2, '#7a5236');
      p(2, 2, 26, 26, cream);
      p(2, 2, 26, 3, f);
      for (let i = 0; i < 6; i++) {
        p(4 + i * 4, 6, 2, 1, f);
        p(3 + i * 4, 7, 4, 1, f);
      }
      // ortadaki güneş ve dağlar
      ellipse(p, 15, 14, 4, 4, shade(f, 0.25));
      for (let i = 0; i < 6; i++) p(8 - i, 16 + i, 2 + i * 2, 1, f);
      for (let i = 0; i < 5; i++) p(21 - i, 17 + i, 2 + i * 2, 1, shade(f, -0.2));
      p(2, 22, 26, 2, f);
      p(2, 25, 26, 1, shade(f, -0.2));
      for (let x = 3; x < 28; x += 2) p(x, 28, 1, 4 + (x % 3), shade(cream, -0.15));
    },
  };

  const FLAG_SETS = [
    ['#e05d6f', '#f2c14e', '#6fa268', '#5b7fa8', '#9b7bb5'],
    ['#f7c5cf', '#fbe3a8', '#c9e7c4', '#bfdcf2', '#ddd0f0'],
  ];
  const flagY = (x) => 1 + Math.round(3 * Math.sin((Math.PI * (x % 24)) / 24));

  I.bunting = {
    name: 'Bunting',
    ceiling: true,
    sw: 48,
    sh: 14,
    wy: 3,
    colors: ['#e05d6f', '#f7c5cf'],
    colorNames: ['Colorful', 'Pastel'],
    noOutline: true,
    draw(p, c) {
      for (let x = 0; x < 48; x++) p(x, flagY(x), 1, 1, '#8a6a4a');
      const set = FLAG_SETS[c];
      for (let i = 0; i < 8; i++) {
        const x = 2 + i * 6;
        const y = flagY(x + 2) + 1;
        const col = set[i % set.length];
        for (let k = 0; k < 6; k++) {
          const half = Math.max(0, 2 - Math.floor(k / 2));
          p(x + 2 - half, y + k, half * 2 + 1, 1, col);
        }
        p(x, y, 5, 1, shade(col, -0.15));
      }
    },
  };

  I.portholeWindow = {
    name: 'Round window',
    sw: 14,
    sh: 14,
    ox: 1,
    wy: 12,
    colors: METAL.slice(0, 3),
    colorNames: METAL_NAMES.slice(0, 3),
    draw(p, c, g) {
      const m = METAL[c];
      ellipse(p, 7, 7, 7, 7, m);
      ellipse(p, 7, 7, 6, 6, shade(m, 0.15));
      for (let y = 0; y < 14; y++) {
        for (let x = 0; x < 14; x++) if (Math.hypot(x + 0.5 - 7, y + 0.5 - 7) < 4.4) g.clearRect(x, y, 1, 1);
      }
      for (const [x, y] of [[6, 0], [12, 6], [6, 12], [0, 6]]) p(x + (x === 12 ? 0 : x === 0 ? 1 : 0), y + (y === 12 ? 0 : y === 0 ? 1 : 0), 1, 1, shade(m, -0.3));
    },
    under(ctx, r, item, env) {
      Art.drawSky(ctx, r.x + 3, r.y + 3, 8, 8, env);
    },
  };

  const NEON_ART = ['#ff6fa8', '#4fe0d0', '#ffd257', '#b98aff'];

  function neonArtShape(p, c, col) {
    if (c === 0) {
      // kalp
      p(9, 3, 4, 1, col);
      p(17, 3, 4, 1, col);
      p(8, 4, 1, 3, col);
      p(21, 4, 1, 3, col);
      p(13, 4, 1, 1, col);
      p(16, 4, 1, 1, col);
      p(14, 5, 2, 1, col);
      for (let i = 0; i < 7; i++) {
        p(9 + i, 7 + i, 1, 1, col);
        p(20 - i, 7 + i, 1, 1, col);
      }
    } else if (c === 1) {
      // hilal ve yıldız
      for (let a = 0; a < 40; a++) {
        const ang = (a / 40) * Math.PI * 1.5 + Math.PI * 0.25;
        p(Math.round(13 + Math.cos(ang) * 6), Math.round(9 + Math.sin(ang) * 6), 1, 1, col);
      }
      for (let a = 0; a < 20; a++) {
        const ang = (a / 20) * Math.PI - Math.PI * 0.15 + Math.PI * 0.5;
        p(Math.round(16 + Math.cos(ang) * 4.5), Math.round(9 + Math.sin(ang) * 5), 1, 1, col);
      }
      p(23, 4, 1, 3, col);
      p(22, 5, 3, 1, col);
    } else if (c === 2) {
      // yıldız
      const pts = [];
      for (let k = 0; k < 10; k++) {
        const rr = k % 2 ? 3 : 8;
        const ang = (k / 10) * Math.PI * 2 - Math.PI / 2;
        pts.push([16 + Math.cos(ang) * rr, 9 + Math.sin(ang) * rr]);
      }
      for (let k = 0; k < 10; k++) {
        const [x0, y0] = pts[k];
        const [x1, y1] = pts[(k + 1) % 10];
        for (let s = 0; s <= 8; s++) p(Math.round(x0 + ((x1 - x0) * s) / 8), Math.round(y0 + ((y1 - y0) * s) / 8), 1, 1, col);
      }
    } else {
      // şimşek
      const path = [[18, 1], [11, 10], [16, 10], [12, 17], [21, 7], [16, 7], [19, 1]];
      for (let k = 0; k < path.length; k++) {
        const [x0, y0] = path[k];
        const [x1, y1] = path[(k + 1) % path.length];
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
        for (let s = 0; s <= n; s++) p(Math.round(x0 + ((x1 - x0) * s) / n), Math.round(y0 + ((y1 - y0) * s) / n), 1, 1, col);
      }
    }
  }

  I.neonArt = {
    name: 'Neon art',
    sw: 32,
    sh: 18,
    wy: 10,
    colors: NEON_ART,
    colorNames: ['Heart', 'Moon', 'Star', 'Bolt'],
    noOutline: true,
    glows: [{ x: 16, y: 9, r: 30, when: 'always', strength: 0.18, tint: true }],
    draw(p, c) {
      neonArtShape(p, c, shade(NEON_ART[c], -0.35));
    },
    over(ctx, r, item, env) {
      const flicker = Math.sin(env.t / 80 + item.x) > 0.98 ? 0.5 : 1;
      ctx.globalAlpha = flicker;
      neonArtShape((x, y, w, h, col) => {
        ctx.fillStyle = col;
        ctx.fillRect(r.x + x, r.y + y, w, h);
      }, item.c, NEON_ART[item.c]);
      ctx.globalAlpha = 1;
    },
  };

  // ---------- Yeni eşyaların yönleri ----------
  // Şezlong yana dönük: baş solda (3 = aynası, baş sağda)
  I.deckChair.views = {
    1: {
      sw: 32,
      sh: 20,
      cuts: undefined,
      seats: [{ x: 1.0, y: 0.74, pose: 'lie', dir: 'left', cells: [[0, 0], [1, 0]], act: 'lie' }],
      draw(p, c) {
        const f = FABRIC[c];
        const w = '#b9875a';
        // yükseltilmiş sırtlık (solda) ve oturak
        for (let y = 1; y < 15; y++) p(1, y, 11, 1, y % 4 < 2 ? f : '#f2efe9');
        p(1, 1, 11, 1, shade(f, 0.2));
        p(2, 4, 5, 7, '#ffffff');
        p(2, 10, 5, 1, '#ddd6cb');
        this.cover(p, c);
        p(12, 8, 1, 7, shade(f, -0.25));
        p(0, 1, 1, 15, w);
        p(0, 15, 32, 1, shade(w, -0.2));
        p(1, 16, 2, 4, shade(w, -0.2));
        p(29, 16, 2, 4, shade(w, -0.2));
      },
      cover(p, c) {
        const f = FABRIC[c];
        for (let y = 7; y < 15; y++) p(13, y, 18, 1, y % 4 < 2 ? f : '#f2efe9');
        p(13, 7, 18, 1, shade(f, 0.2));
        p(31, 7, 1, 8, '#b9875a');
      },
    },
  };

  // Salıncak arkadan: oturanlar arkasını döner, arkalık sırtlarını örter
  I.swingBench.views = {
    2: {
      seats: I.swingBench.seats.map((st) => ({ ...st, dir: 'up' })),
      draw(p, c) {
        const w = WOOD[c];
        const post = '#5a3d2b';
        p(0, 0, 32, 2, post);
        p(0, 0, 2, 30, post);
        p(30, 0, 2, 30, post);
        p(0, 28, 4, 2, post);
        p(28, 28, 4, 2, post);
        p(5, 2, 1, 14, '#8a8f97');
        p(26, 2, 1, 14, '#8a8f97');
        p(3, 13, 26, 3, shade(w, 0.16));
        this.cover(p, c);
      },
      cover(p, c) {
        const w = WOOD[c];
        p(3, 9, 26, 2, shade(w, 0.18));
        for (let x = 4; x < 28; x += 3) p(x, 11, 2, 7, shade(w, -0.08));
        p(3, 17, 26, 3, w);
        p(3, 19, 26, 1, shade(w, -0.25));
      },
    },
  };

  // Bateri arkadan: davulcu bize sırtını döner, davullar önünde
  I.drumKit.views = {
    2: {
      seats: [{ x: 1, y: 0.75, pose: 'work', dir: 'up', cells: [[0, 0], [1, 0]], act: 'play', anim: true, sfx: 'drum' }],
      draw(p, c) {
        const col = DRUMS[c];
        const cym = '#e3c25a';
        p(3, 6, 1, 18, '#8a929c');
        p(28, 4, 1, 20, '#8a929c');
        p(0, 5, 8, 2, cym);
        p(25, 3, 8, 2, cym);
        // davulların arkası
        ellipse(p, 16, 14, 7, 5.5, shade(col, -0.15));
        p(11, 13, 10, 1, shade(col, 0.1));
        p(5, 12, 7, 4, col);
        p(5, 12, 7, 1, '#f2efe9');
        p(20, 12, 7, 4, col);
        p(20, 12, 7, 1, '#f2efe9');
        p(1, 16, 6, 5, col);
        p(1, 16, 6, 1, '#f2efe9');
        p(25, 16, 6, 5, col);
        p(25, 16, 6, 1, '#f2efe9');
        p(10, 19, 12, 1, '#3d424b');
        // tabure
        p(12, 22, 8, 3, '#3d424b');
        p(15, 25, 2, 4, '#8a929c');
        p(12, 29, 8, 1, '#3d424b');
      },
    },
  };

  // Atari: yandan (ekran solda) ve arkadan
  I.arcade.views = {
    1: {
      glows: [{ x: 3, y: 13, r: 20, when: 'always', strength: 0.12, tint: true }],
      draw(p, c) {
        const col = ARCADE[c];
        const d = shade(col, -0.25);
        p(5, 0, 10, 6, d);
        p(3, 5, 12, 2, d);
        p(5, 6, 10, 32, col);
        p(2, 7, 3, 11, '#1b1f2a');
        p(2, 7, 1, 11, d);
        p(0, 18, 7, 4, shade(col, 0.15));
        p(1, 17, 2, 1, '#e05d6f');
        p(3, 22, 12, 16, col);
        p(3, 22, 1, 16, d);
        for (let y = 9; y < 34; y += 5) p(8, y, 5, 2, '#f2c14e');
        p(3, 36, 12, 2, shade(col, -0.4));
      },
    },
    2: {
      glows: [],
      draw(p, c) {
        const col = ARCADE[c];
        const d = shade(col, -0.25);
        p(1, 0, 14, 6, d);
        p(0, 6, 16, 32, d);
        p(1, 6, 14, 1, shade(col, 0.1));
        for (let y = 10; y < 20; y += 2) p(4, y, 8, 1, shade(d, -0.25));
        p(5, 26, 6, 6, shade(d, -0.15));
        p(6, 27, 1, 1, '#c0c6cc');
        p(9, 31, 1, 7, '#2a2629');
        p(1, 36, 14, 2, shade(col, -0.4));
      },
    },
  };

  // Otomat: yandan ve arkadan
  I.vendingMachine.views = {
    1: {
      glows: [{ x: 2, y: 14, r: 16, when: 'always', strength: 0.08, color: [200, 235, 255] }],
      draw(p, c) {
        const col = VEND[c];
        p(1, 0, 14, 34, shade(col, -0.12));
        p(1, 0, 14, 1, shade(col, 0.15));
        p(0, 1, 2, 33, col);
        p(0, 6, 1, 18, '#d8ecf5');
        p(4, 4, 8, 22, shade(col, -0.2));
        p(5, 6, 6, 3, '#f2efe9');
        p(5, 12, 6, 2, shade(col, 0.15));
        p(1, 34, 14, 2, shade(col, -0.35));
      },
    },
    2: {
      glows: [],
      draw(p, c) {
        const col = VEND[c];
        const d = shade(col, -0.2);
        p(0, 0, 16, 34, d);
        p(0, 0, 16, 1, shade(col, 0.1));
        for (let y = 4; y < 14; y += 2) p(3, y, 10, 1, shade(d, -0.25));
        p(4, 20, 8, 6, shade(d, -0.12));
        p(7, 28, 1, 6, '#2a2629');
        p(0, 34, 16, 2, shade(col, -0.35));
      },
    },
  };

  // Vantilatör yandan (sola üfler)
  I.floorFan.views = {
    1: {
      draw(p, c) {
        const col = FANS[c];
        p(5, 1, 3, 13, shade(col, -0.15));
        p(6, 2, 1, 11, '#e8eef2');
        p(8, 5, 4, 5, col);
        p(8, 5, 4, 1, shade(col, 0.2));
        p(4, 6, 1, 3, '#c0c6cc');
        p(9, 10, 2, 16, shade(col, -0.1));
        p(4, 26, 10, 3, col);
        p(4, 26, 10, 1, shade(col, 0.2));
      },
      over(ctx, r, item, env) {
        ctx.fillStyle = shade(FANS[item.c], -0.25);
        const k = Math.floor(env.t / 60) % 3;
        ctx.fillRect(r.x + 6, r.y + 3 + k * 3, 1, 3);
        if (env.thumb) return;
        ctx.fillStyle = 'rgba(200, 220, 235, 0.5)';
        const ph = (env.t / 500) % 1;
        ctx.fillRect(r.x + 3 - Math.round(ph * 10), r.y + 5 + Math.round(Math.sin(ph * 8)), 3, 1);
      },
    },
  };

  // Saksı kutusu dikey
  I.planterBox.views = {
    1: {
      sw: 16,
      sh: 40,
      draw(p, c) {
        const fl = FLOWER_BEDS[c];
        const w = '#9a6a46';
        p(0, 8, 16, 32, w);
        p(1, 9, 14, 20, '#5a3d2b');
        const r = rng(43);
        for (let y = 4; y < 28; y += 2) {
          for (let x = 2; x < 14; x += 3) {
            const h = 2 + Math.floor(r() * 4);
            p(x + (y % 4 ? 1 : 0), y + 4 - h, 1, h, LEAF[(x + y) % 3]);
          }
        }
        for (let i = 0; i < 10; i++) {
          const x = 1 + Math.floor(r() * 13);
          const y = 2 + Math.floor(r() * 24);
          p(x, y, 2, 2, fl);
          p(x, y, 1, 1, shade(fl, 0.3));
        }
        p(0, 29, 16, 11, w);
        p(0, 29, 16, 1, shade(w, 0.25));
        p(0, 34, 16, 1, shade(w, -0.15));
        p(0, 8, 1, 21, shade(w, 0.15));
        p(15, 8, 1, 21, shade(w, -0.1));
      },
    },
  };

  // Bisiklet önden (dikey, ön teker bize bakar)
  I.bicycle.views = {
    1: {
      sw: 16,
      sh: 36,
      draw(p, c) {
        const f = BIKES[c];
        // arka teker (uzakta, yukarıda)
        p(7, 4, 2, 13, '#2a2629');
        p(6, 9, 4, 1, '#3d3a3f');
        p(7, 9, 2, 10, f);
        p(6, 8, 4, 2, '#3d3a3f');
        // gidon, sepet, ön teker
        p(7, 17, 2, 6, f);
        p(1, 16, 14, 1, '#3d3a3f');
        p(1, 16, 2, 2, '#3d3a3f');
        p(13, 16, 2, 2, '#3d3a3f');
        p(4, 18, 8, 5, '#c9a46a');
        p(4, 18, 8, 1, shade('#c9a46a', 0.2));
        p(5, 16, 2, 2, '#e05d6f');
        p(8, 15, 2, 3, '#f2c14e');
        p(5, 20, 6, 1, shade('#c9a46a', -0.2));
        p(7, 23, 2, 13, '#2a2629');
        p(6, 23, 1, 9, '#c0c6cc');
        p(9, 23, 1, 9, '#c0c6cc');
        p(7, 28, 2, 1, '#c0c6cc');
        p(6, 33, 4, 1, shade(f, -0.2));
      },
    },
  };

  // =====================================================================
  // MASA VE RAF ÜSTÜ KÜÇÜK EŞYALAR (layer: top)
  // Çizimin alt kenarı, üstünde durduğu eşyanın yüzeyine oturur.
  // =====================================================================

  // Üst yüzeyi olan eşyalar: top.y = en öndeki yüzey satırının sprite içindeki y'si,
  // step = bir kare geride duran küçük eşyanın kaç piksel yukarı çizileceği
  I.desk.top = { y: 14 };
  I.desk.views[2].top = { y: 30 };
  I.desk.views[1].top = { y: 32, step: 12 };
  I.gamingDesk.top = { y: 14 };
  I.gamingDesk.views[2].top = { y: 30 };
  I.gamingDesk.views[1].top = { y: 32, step: 12 };
  I.cafeTable.top = { y: 26 };
  I.cafeTable.views[1].top = { y: 21 };
  I.readingTable.top = { y: 27 };
  I.readingTable.views[1].top = { y: 44, step: 14 };
  I.counter.top = { y: 14 };
  I.table.top = { y: 8 };
  I.table.views[1].top = { y: 26, step: 12 };
  for (const t of ['bookshelf', 'narrowShelf', 'cubeShelf', 'displayCabinet', 'fridge', 'wardrobe']) I[t].top = { y: 1 };
  I.dresser.top = { y: 6 };
  I.pastryCase.top = { y: 2 };
  I.stove.top = { y: 12 };
  I.sink.top = { y: 12 };
  I.piano.top = { y: 2 };
  I.piano.views[2].top = { y: 24 };
  I.piano.views[1].top = { y: 20, step: 12 };

  const smallItem = (name, colors, colorNames, draw, extra) => ({ name, sw: 16, sh: 16, colors, colorNames, draw, ...extra });

  I.mug = smallItem('Mug', ['#f2efe9', '#d9665b', '#5b7fa8', '#e3b766'], ['White', 'Red', 'Blue', 'Yellow'], (p, c) => {
    const col = I.mug.colors[c];
    p(5, 8, 6, 8, col);
    p(5, 8, 6, 1, shade(col, 0.2));
    p(6, 8, 4, 1, '#6b4226');
    p(11, 10, 2, 1, col);
    p(12, 11, 1, 2, col);
    p(11, 13, 2, 1, col);
    p(5, 15, 6, 1, shade(col, -0.2));
  }, {
    over(ctx, r, item, env) {
      steam(ctx, r.x + 8, r.y + 7, env.t, item.x + item.y * 3);
    },
  });

  I.teapot = smallItem('Teapot', ['#f2efe9', '#7fa3c4', '#e59aa6'], ['White', 'Blue', 'Pink'], (p, c) => {
    const col = I.teapot.colors[c];
    ellipse(p, 8, 11, 5, 4.5, col);
    p(6, 6, 4, 2, shade(col, -0.1));
    p(7, 5, 2, 1, shade(col, -0.25));
    p(1, 9, 3, 2, col);
    p(0, 8, 1, 1, col);
    p(13, 8, 2, 1, col);
    p(14, 9, 1, 3, col);
    p(5, 10, 6, 1, shade(col, -0.12));
    p(4, 15, 8, 1, shade(col, -0.25));
  });

  I.tableLamp = smallItem('Desk lamp', METAL.slice(0, 3), METAL_NAMES.slice(0, 3), (p, c) => {
    const m = METAL[c];
    p(4, 14, 7, 2, m);
    p(6, 8, 1, 6, m);
    p(6, 7, 5, 1, m);
    p(9, 4, 5, 4, m);
    p(10, 8, 3, 1, '#fff2b0');
    p(10, 4, 2, 1, shade(m, 0.3));
  }, { glows: [nightGlow(11, 9, 22)] });

  const PILES = [['#d9785f', '#5b7fa8', '#e3b766'], ['#6f9a7d', '#ece6da', '#9b7bb5'], ['#3d3a3f', '#c4553f', '#c9a24b']];
  I.bookPile = smallItem('Book pile', PILES.map((s) => s[0]), ['Warm', 'Pastel', 'Classic'], (p, c) => {
    const [a, b, d] = PILES[c];
    p(2, 12, 12, 4, a);
    p(2, 12, 12, 1, shade(a, 0.2));
    p(13, 13, 1, 2, '#f2efe9');
    p(3, 8, 10, 4, b);
    p(3, 8, 10, 1, shade(b, 0.2));
    p(3, 9, 1, 2, '#f2efe9');
    p(4, 5, 8, 3, d);
    p(4, 5, 8, 1, shade(d, 0.25));
  });

  I.succulent = smallItem('Succulent', POTS, POT_NAMES, (p, c) => {
    const pot = POTS[c];
    p(5, 11, 6, 5, pot);
    p(4, 10, 8, 2, shade(pot, 0.15));
    p(7, 5, 2, 5, LEAF[1]);
    p(4, 7, 3, 3, LEAF[0]);
    p(9, 7, 3, 3, LEAF[0]);
    p(5, 6, 2, 2, LEAF[2]);
    p(9, 6, 2, 2, LEAF[2]);
    p(7, 4, 2, 1, LEAF[2]);
  });

  I.vase = smallItem('Flower vase', ['#e05d6f', '#f2c14e', '#9b7bb5'], ['Red', 'Yellow', 'Purple'], (p, c) => {
    const fl = I.vase.colors[c];
    p(6, 10, 4, 6, '#9fc6e0');
    p(5, 11, 6, 4, '#9fc6e0');
    p(6, 11, 1, 3, '#d8ecf5');
    p(7, 5, 1, 5, LEAF[0]);
    p(5, 6, 1, 4, LEAF[0]);
    p(10, 6, 1, 4, LEAF[0]);
    for (const [x, y] of [[6, 2], [3, 4], [9, 3], [11, 5]]) {
      p(x, y, 3, 2, fl);
      p(x + 1, y, 1, 1, shade(fl, 0.35));
    }
  });

  const WAX2 = ['#f2efe9', '#e59aa6', '#e3b766'];
  I.candle = smallItem('Candle', WAX2, ['White', 'Pink', 'Honey'], (p, c) => {
    p(4, 14, 8, 2, '#c9a24b');
    p(6, 7, 4, 7, WAX2[c]);
    p(6, 7, 1, 7, shade(WAX2[c], 0.2));
    p(9, 8, 1, 3, shade(WAX2[c], -0.1));
    p(7, 6, 1, 1, '#3d3a3f');
  }, {
    glows: [{ x: 8, y: 3, r: 18, when: 'always', strength: 0.2 }],
    over(ctx, r, item, env) {
      const f = Math.sin(env.t / 120 + item.x) > 0 ? 1 : 0;
      ctx.fillStyle = '#f7b267';
      ctx.fillRect(r.x + 7, r.y + 3 + f, 2, 3 - f);
      ctx.fillStyle = '#fff2b0';
      ctx.fillRect(r.x + 7, r.y + 4, 1, 2);
    },
  });

  I.laptop = smallItem('Laptop', ['#8a929c', '#f2efe9'], ['Silver', 'White'], (p, c) => {
    const col = I.laptop.colors[c];
    p(3, 3, 10, 9, col);
    p(4, 4, 8, 7, '#2c3440');
    p(2, 12, 12, 2, shade(col, 0.15));
    p(2, 14, 12, 1, shade(col, -0.25));
    p(7, 12, 2, 1, shade(col, -0.2));
  }, {
    glows: [{ x: 8, y: 7, r: 14, when: 'always', strength: 0.08, color: [140, 200, 255] }],
    over(ctx, r, item, env) {
      ctx.fillStyle = '#b9e0ef';
      ctx.fillRect(r.x + 4, r.y + 4, 8, 7);
      ctx.fillStyle = '#5b7fa8';
      const k = Math.floor(env.t / 700) % 3;
      for (let i = 0; i < 3; i++) ctx.fillRect(r.x + 5, r.y + 5 + i * 2, [6, 4, 5][(i + k) % 3], 1);
    },
  });

  const TYPE = ['#3d424b', '#7a9a7a', '#c4553f'];
  I.typewriter = smallItem('Typewriter', TYPE, ['Black', 'Sage', 'Red'], (p, c) => {
    const col = TYPE[c];
    p(5, 2, 6, 6, '#fbf8f0');
    p(6, 3, 4, 1, '#b8b2a7');
    p(6, 5, 3, 1, '#b8b2a7');
    p(2, 7, 12, 2, '#2a2629');
    p(2, 9, 12, 6, col);
    p(2, 9, 12, 1, shade(col, 0.25));
    for (let x = 3; x < 13; x += 2) {
      p(x, 11, 1, 1, '#f2efe9');
      p(x + 1, 13, 1, 1, '#f2efe9');
    }
    p(2, 15, 12, 1, shade(col, -0.3));
  });

  const CLOCKS = ['#c9a24b', '#3d424b', '#d9665b'];
  I.deskClock = smallItem('Desk clock', CLOCKS, ['Brass', 'Black', 'Red'], (p, c) => {
    const col = CLOCKS[c];
    p(4, 1, 2, 2, col);
    p(10, 1, 2, 2, col);
    ellipse(p, 8, 8, 5, 5, col);
    ellipse(p, 8, 8, 3.8, 3.8, '#f6f2ea');
    p(4, 13, 2, 3, col);
    p(10, 13, 2, 3, col);
  }, {
    over(ctx, r, item, env) {
      const now = env.date;
      const min = now.getMinutes();
      const hr = (now.getHours() % 12) + min / 60;
      const hand = (a, len, col) => {
        ctx.fillStyle = col;
        for (let s = 0; s <= len; s += 0.5) ctx.fillRect(r.x + Math.round(7.5 + Math.sin(a) * s), r.y + Math.round(7.5 - Math.cos(a) * s), 1, 1);
      };
      hand((min / 60) * Math.PI * 2, 2.6, '#3d424b');
      hand((hr / 12) * Math.PI * 2, 1.8, '#d9665b');
    },
  });

  I.photoFrame = smallItem('Photo frame', FRAME3, FRAME3_NAMES, (p, c) => {
    const fr = FRAME3[c];
    p(3, 3, 10, 12, fr);
    p(4, 4, 8, 10, '#9fc6e0');
    p(4, 10, 8, 4, '#8cc07f');
    ellipse(p, 8, 8, 1.6, 1.6, '#f6d5b8');
    p(6, 10, 4, 3, '#e05d6f');
    p(7, 6, 2, 1, '#5b3a26');
    p(10, 5, 1, 1, '#fff2b0');
    p(3, 15, 10, 1, shade(fr, -0.3));
  });

  const CAKES = ['#f2efe9', '#e59aa6', '#7a5236'];
  I.cake = smallItem('Cake', CAKES, ['Vanilla', 'Strawberry', 'Chocolate'], (p, c) => {
    const col = CAKES[c];
    p(1, 14, 14, 2, '#e8eef2');
    p(3, 7, 10, 7, shade(col, -0.08));
    p(3, 10, 10, 1, '#f2c14e');
    p(3, 6, 10, 2, c === 0 ? '#fbf3e3' : shade(col, 0.25));
    for (const x of [4, 7, 10]) p(x, 8, 1, 1 + (x % 2), c === 0 ? '#fbf3e3' : shade(col, 0.25));
    p(7, 4, 2, 2, '#d9363e');
    p(8, 3, 1, 1, LEAF[0]);
  });

  I.fruitBowl = smallItem('Fruit bowl', ['#ece6da', '#5f7c8a'], ['Cream', 'Slate'], (p, c) => {
    const bowl = I.fruitBowl.colors[c];
    ellipse(p, 5, 9, 2.5, 2.5, '#d9363e');
    ellipse(p, 10, 9, 2.5, 2.5, '#f08a3c');
    p(6, 5, 5, 2, '#f2d36b');
    p(4, 6, 2, 1, '#f2d36b');
    p(8, 7, 2, 2, '#7c5aa6');
    p(5, 7, 1, 1, '#ff8a8a');
    p(1, 10, 14, 3, bowl);
    p(2, 13, 12, 1, shade(bowl, -0.15));
    p(4, 14, 8, 2, shade(bowl, -0.25));
  });

  I.breadBasket = smallItem('Bread basket', ['#c9a46a', '#8a6a4a'], ['Wicker', 'Dark wicker'], (p, c) => {
    const w = I.breadBasket.colors[c];
    p(4, 3, 3, 9, '#d9a25a');
    p(5, 4, 1, 1, '#f2d39a');
    p(8, 2, 3, 10, '#c88a48');
    p(9, 3, 1, 1, '#f2d39a');
    p(11, 5, 3, 6, '#e3b26a');
    p(1, 9, 14, 6, w);
    for (let x = 2; x < 15; x += 2) p(x, 10, 1, 4, shade(w, -0.2));
    p(1, 9, 14, 1, shade(w, 0.2));
    p(2, 15, 12, 1, shade(w, -0.3));
  });

  const JAR_LIDS = ['#e3b766', '#d9665b', '#6fa268'];
  I.jars = smallItem('Jars', JAR_LIDS, ['Honey', 'Cherry', 'Herb'], (p, c) => {
    const lid = JAR_LIDS[c];
    const glass = '#dcecf0';
    for (const [x, h, fill] of [[1, 9, '#e3a857'], [6, 12, '#c4553f'], [11, 7, '#7aa25a']]) {
      p(x, 16 - h, 4, h, glass);
      p(x, 16 - h + 3, 4, h - 3, fill);
      p(x, 16 - h - 1, 4, 2, lid);
      p(x, 16 - h + 2, 1, h - 3, 'rgba(255,255,255,0.6)');
    }
  });

  const CUPS = ['#5b7fa8', '#d9785f', '#3d424b'];
  I.pencilCup = smallItem('Pencil cup', CUPS, ['Blue', 'Terracotta', 'Black'], (p, c) => {
    p(5, 3, 1, 6, '#f2c14e');
    p(5, 2, 1, 1, '#3d3a3f');
    p(8, 2, 1, 7, '#d9665b');
    p(10, 4, 1, 5, '#6fa268');
    p(7, 4, 1, 5, '#3d424b');
    p(4, 8, 8, 8, CUPS[c]);
    p(4, 8, 8, 1, shade(CUPS[c], 0.25));
    p(4, 15, 8, 1, shade(CUPS[c], -0.25));
  });

  const CRYSTAL = ['#b98aff', '#9fd8ff', '#ff9fb0'];
  I.crystals = smallItem('Crystals', CRYSTAL, ['Amethyst', 'Quartz', 'Rose'], (p, c) => {
    const col = CRYSTAL[c];
    p(2, 13, 12, 3, '#6b6f78');
    for (const [x, h, w] of [[3, 6, 2], [6, 10, 3], [10, 7, 2], [12, 4, 2]]) {
      p(x, 14 - h, w, h, col);
      p(x, 14 - h, 1, h, shade(col, 0.35));
      p(x + w - 1, 14 - h - 1, 1, 1, shade(col, 0.2));
    }
  }, { glows: [{ x: 8, y: 8, r: 14, when: 'always', strength: 0.14, tint: true }] });

  const POTION = ['#7fe0a0', '#b98aff', '#ff6fa8'];
  I.potions = smallItem('Potion bottles', POTION, ['Green', 'Violet', 'Pink'], (p, c) => {
    const col = POTION[c];
    ellipse(p, 4.5, 12, 3, 3.5, '#dcecf0');
    ellipse(p, 4.5, 13, 2.5, 2.4, col);
    p(4, 5, 2, 4, '#dcecf0');
    p(4, 4, 2, 1, '#8a5a3c');
    p(9, 6, 4, 10, '#dcecf0');
    p(9, 9, 4, 7, shade(col, -0.2));
    p(10, 4, 2, 2, '#dcecf0');
    p(10, 3, 2, 1, '#8a5a3c');
    p(9, 10, 4, 2, '#f2efe9');
  }, { glows: [{ x: 7, y: 11, r: 14, when: 'always', strength: 0.14, tint: true }] });

  const RADIO = ['#c4553f', '#9fc6e0', '#e3b766'];
  I.radio = smallItem('Retro radio', RADIO, ['Red', 'Mint', 'Mustard'], (p, c) => {
    const col = RADIO[c];
    p(11, 1, 1, 6, '#8a929c');
    p(1, 7, 14, 9, col);
    p(2, 6, 12, 1, col);
    p(2, 6, 12, 1, shade(col, 0.2));
    p(2, 8, 6, 6, '#f2efe9');
    for (let y = 9; y < 14; y += 2) p(3, y, 4, 1, shade(col, -0.2));
    p(9, 9, 4, 2, '#fbf3c2');
    p(10, 9, 1, 2, '#d9665b');
    ellipse(p, 10.5, 13, 1.2, 1.2, '#3d424b');
    p(1, 15, 14, 1, shade(col, -0.3));
  });

  const GLASS_FRAMES = ['#c9a24b', '#7a5236'];
  I.hourglass = smallItem('Hourglass', GLASS_FRAMES, ['Brass', 'Wood'], (p, c) => {
    const fr = GLASS_FRAMES[c];
    p(3, 1, 10, 2, fr);
    p(3, 14, 10, 2, fr);
    p(4, 3, 1, 11, fr);
    p(11, 3, 1, 11, fr);
    for (let i = 0; i < 5; i++) {
      p(5 + i, 3 + i, 6 - i * 2 > 0 ? 6 - i * 2 : 1, 1, '#dcecf0');
      p(5 + i, 13 - i, 6 - i * 2 > 0 ? 6 - i * 2 : 1, 1, '#dcecf0');
    }
  }, {
    over(ctx, r, item, env) {
      const k = (env.t / 20000 + item.x * 0.1) % 1;
      ctx.fillStyle = '#e3b766';
      const top = Math.round((1 - k) * 3);
      if (top > 0) ctx.fillRect(r.x + 6, r.y + 5, 4, top);
      ctx.fillRect(r.x + 7, r.y + 8, 1, 4);
      const bot = Math.round(k * 3);
      if (bot > 0) ctx.fillRect(r.x + 6, r.y + 13 - bot, 4, bot);
    },
  });

  I.paintJars = smallItem('Paint jars', ['#f2efe9', '#c9a46a'], ['Glass', 'Clay'], (p, c) => {
    const jar = I.paintJars.colors[c];
    p(4, 2, 1, 7, '#c9a46a');
    p(4, 1, 1, 1, '#d9665b');
    p(6, 3, 1, 6, '#9a6a46');
    p(6, 2, 1, 1, '#5b7fa8');
    p(3, 8, 5, 8, jar);
    p(3, 12, 5, 4, '#9fc6e0');
    for (const [x, col] of [[9, '#e05d6f'], [12, '#f2c14e']]) {
      p(x, 11, 3, 5, jar);
      p(x, 12, 3, 4, col);
      p(x, 10, 3, 1, shade(col, -0.2));
    }
  });

  const MAKER = ['#3d424b', '#f2efe9', '#d9665b'];
  I.coffeeMaker = smallItem('Coffee maker', MAKER, ['Black', 'White', 'Red'], (p, c) => {
    const col = MAKER[c];
    p(3, 1, 10, 4, col);
    p(10, 5, 3, 11, col);
    p(3, 15, 10, 1, shade(col, -0.3));
    p(3, 14, 7, 1, col);
    p(4, 7, 5, 7, '#dcecf0');
    p(4, 10, 5, 4, '#6b4226');
    p(4, 6, 5, 1, '#3d424b');
    p(11, 7, 1, 1, '#7fe0a0');
  }, {
    over(ctx, r, item, env) {
      steam(ctx, r.x + 6, r.y + 6, env.t, item.y);
    },
  });

  I.miniGlobe = smallItem('Mini globe', ['#c9a24b', '#7a5236', '#3d424b'], ['Brass', 'Wood', 'Black'], (p, c) => {
    const st = I.miniGlobe.colors[c];
    p(4, 14, 8, 2, st);
    p(7, 11, 2, 3, st);
    ellipse(p, 8, 6.5, 4.5, 4.5, '#5b9bc8');
    p(6, 4, 2, 2, '#7fae73');
    p(9, 6, 2, 3, '#7fae73');
    p(5, 7, 1, 2, '#7fae73');
    for (let y = 2; y <= 11; y++) p(y < 4 || y > 9 ? 3 : 2, y, 1, 1, st);
  });

  const HORNS = ['#c9a24b', '#7a5236'];
  I.gramophone = smallItem('Gramophone', HORNS, ['Brass', 'Wood'], (p, c) => {
    const h = HORNS[c];
    p(2, 11, 9, 5, '#7a5236');
    p(2, 11, 9, 1, '#9a6a46');
    p(3, 10, 7, 1, '#2a2629');
    p(7, 7, 1, 4, '#c9a24b');
    p(8, 5, 2, 3, h);
    p(9, 2, 4, 4, h);
    p(11, 0, 5, 7, h);
    p(13, 1, 2, 5, shade(h, -0.35));
    p(11, 0, 1, 7, shade(h, 0.25));
  });

  // =====================================================================
  // REFERANSLARDAN: mutfak, çalışma odası, büyü köşesi, atölye ve spor
  // =====================================================================
  const CAB = ['#7fa3c4', '#9bb592', '#efe6d2', '#a58fc4'];
  const CAB_NAMES = ['Blue', 'Sage', 'Cream', 'Lavender'];

  // ---------- Mutfak ----------
  I.cabinet = {
    name: 'Kitchen counter',
    sw: 16,
    sh: 26,
    colors: CAB,
    colorNames: CAB_NAMES,
    top: { y: 11 },
    draw(p, c) {
      const col = CAB[c];
      p(0, 8, 16, 4, '#d9b98c');
      p(0, 8, 16, 1, '#ecd6b0');
      p(0, 11, 16, 1, shade('#d9b98c', -0.25));
      p(1, 12, 14, 12, col);
      inset2(p, 2, 13, 12, 3, col);
      inset2(p, 2, 17, 12, 7, col);
      p(7, 14, 2, 1, '#e3e6ea');
      p(12, 19, 1, 3, '#e3e6ea');
      p(0, 24, 16, 2, shade(col, -0.35));
    },
  };

  function inset2(p, x, y, w, h, col) {
    p(x, y, w, h, shade(col, -0.08));
    p(x, y, w, 1, shade(col, -0.22));
    p(x, y + h - 1, w, 1, shade(col, 0.15));
  }

  I.wallCabinet = {
    name: 'Wall cabinet',
    sw: 32,
    sh: 24,
    wy: 3,
    // dolap altı aydınlatma: tezgaha düşen sıcak ışık
    glows: [nightGlow(16, 24, 26, { strength: 0.28 })],
    colors: CAB,
    colorNames: CAB_NAMES,
    draw(p, c) {
      const col = CAB[c];
      p(0, 0, 32, 2, shade(col, 0.15));
      p(0, 2, 32, 20, col);
      for (const x of [2, 17]) {
        p(x, 4, 13, 16, '#dcecf0');
        p(x, 11, 13, 1, shade(col, -0.1));
        p(x, 4, 13, 1, shade(col, -0.25));
        p(x + 1, 5, 1, 5, '#ffffff');
      }
      // tabaklar ve fincanlar
      ellipse(p, 6, 8, 2.5, 2.5, '#f2efe9');
      p(10, 8, 3, 3, '#e59aa6');
      p(19, 8, 3, 3, '#f2efe9');
      p(23, 7, 4, 4, '#e3b766');
      for (const x of [3, 6, 9, 12]) p(x, 15, 2, 4, '#f2efe9');
      p(19, 15, 4, 4, '#6fa268');
      p(24, 16, 4, 3, '#d9785f');
      p(15, 9, 2, 2, '#e3e6ea');
      p(0, 22, 32, 2, shade(col, -0.3));
    },
  };

  const HOODS = ['#3d424b', '#c0c6cc', '#f2efe9'];
  I.rangeHood = {
    name: 'Range hood',
    sw: 32,
    sh: 38,
    wy: 0,
    ceiling: true,
    colors: HOODS,
    glows: [nightGlow(16, 37, 30, { strength: 0.34 })],
    colorNames: ['Black', 'Steel', 'White'],
    draw(p, c) {
      const col = HOODS[c];
      p(11, 0, 10, 24, col);
      p(11, 0, 2, 24, shade(col, 0.15));
      for (let y = 6; y < 24; y += 6) p(11, y, 10, 1, shade(col, -0.12));
      for (let i = 0; i < 9; i++) p(10 - i, 24 + i, 12 + i * 2, 1, i % 4 === 0 ? shade(col, 0.12) : col);
      p(1, 33, 30, 3, shade(col, -0.2));
      p(6, 36, 20, 1, '#fff2b0');
      p(22, 34, 2, 1, '#7fe0a0');
    },
  };

  const RAILS = ['#c9a24b', '#3d424b'];
  I.panRail = {
    name: 'Hanging pans',
    sw: 32,
    sh: 22,
    wy: 12,
    colors: RAILS,
    colorNames: ['Brass', 'Black'],
    draw(p, c) {
      const rail = RAILS[c];
      p(0, 1, 32, 2, rail);
      p(0, 0, 2, 4, rail);
      p(30, 0, 2, 4, rail);
      const hook = (x) => p(x, 3, 1, 3, '#8a8f97');
      hook(4);
      ellipse(p, 4.5, 11, 3.5, 3.5, '#c87b55');
      p(4, 6, 1, 2, '#3d3a3f');
      hook(12);
      ellipse(p, 12.5, 13, 4.5, 4.5, '#3d424b');
      p(12, 6, 1, 3, '#3d424b');
      hook(20);
      p(20, 6, 1, 9, '#c0c6cc');
      ellipse(p, 20.5, 16, 2, 1.6, '#c0c6cc');
      hook(26);
      p(26, 6, 1, 8, '#9a6a46');
      p(25, 14, 3, 4, '#c0c6cc');
    },
  };

  I.spiceRack = {
    name: 'Spice rack',
    sw: 16,
    sh: 16,
    wy: 14,
    colors: ['#b9875a', '#f2efe9', '#7fa3c4'],
    colorNames: ['Wood', 'White', 'Blue'],
    draw(p, c) {
      const w = this.colors[c];
      const jarCols = ['#c4553f', '#e3b766', '#6fa268', '#8a5a3c', '#e98a5b', '#9b7bb5'];
      for (const [y, k] of [[1, 0], [9, 3]]) {
        for (let i = 0; i < 3; i++) {
          p(1 + i * 5, y, 3, 5, '#dcecf0');
          p(1 + i * 5, y + 2, 3, 3, jarCols[k + i]);
          p(1 + i * 5, y - 1, 3, 1, '#3d3a3f');
        }
        p(0, y + 5, 16, 2, w);
      }
    },
  };

  const DINE_CLOTH = ['#d9665b', '#5b7fa8', '#6fa268', '#e3b766'];
  const checkerCloth = (p, cx, cy, rx, ry, col) => {
    ellipse(p, cx, cy + 1.4, rx, ry, shade(col, -0.25));
    ellipse(p, cx, cy, rx, ry, '#f7f3ea');
    for (let y = Math.floor(cy - ry); y <= cy + ry + 2; y++) {
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        if (((x >> 1) + (y >> 1)) % 2 === 0) {
          const dx = (x + 0.5 - cx) / rx;
          const dy = (y + 0.5 - cy) / ry;
          if (dx * dx + dy * dy <= 1) p(x, y, 1, 1, col);
        }
      }
    }
    // örtünün sarkan kenarı
    for (let x = Math.ceil(cx - rx); x < cx + rx; x++) p(x, Math.round(cy + ry * 0.7), 1, 3 + (x % 2), x % 4 < 2 ? col : '#f7f3ea');
  };

  I.diningTable = {
    name: 'Dining table',
    sw: 16,
    sh: 52,
    colors: DINE_CLOTH,
    colorNames: ['Red check', 'Blue check', 'Green check', 'Yellow check'],
    cuts: [20, 38],
    overBand: 1,
    solid: (cx, cy) => cy === 1,
    top: { y: 26 },
    seats: I.cafeTable.seats,
    draw(p, c) {
      chairFront(p, 2, 1, '#8a5a3c');
      p(7, 30, 2, 6, '#5a3d2b');
      p(4, 35, 8, 2, '#5a3d2b');
      checkerCloth(p, 8, 24, 7.5, 3.8, DINE_CLOTH[c]);
      chairBack(p, 2, 38, '#8a5a3c');
    },
    views: {
      1: {
        sw: 48,
        sh: 28,
        solid: (cx) => cx === 1,
        top: { y: 21 },
        seats: I.cafeTable.views[1].seats,
        draw(p, c) {
          sideChair(p, 2, 16, true, '#8a5a3c');
          sideChair(p, 33, 16, false, '#8a5a3c');
          p(23, 22, 2, 5, '#5a3d2b');
          p(20, 26, 8, 2, '#5a3d2b');
          checkerCloth(p, 24, 18, 7.5, 3.8, DINE_CLOTH[c]);
        },
      },
    },
  };

  const BINS = ['#f2efe9', '#e59aa6', '#3d424b'];
  I.trashBin = {
    name: 'Pedal bin',
    sw: 16,
    sh: 18,
    colors: BINS,
    colorNames: ['White', 'Pink', 'Black'],
    draw(p, c) {
      const col = BINS[c];
      p(4, 1, 8, 2, shade(col, -0.1));
      p(3, 3, 10, 1, shade(col, 0.15));
      p(4, 4, 8, 12, col);
      p(5, 4, 1, 11, shade(col, 0.2));
      p(4, 16, 8, 1, shade(col, -0.3));
      p(6, 16, 4, 2, '#8a8f97');
    },
  };

  // ---------- Çalışma odası ----------
  I.filingCabinet = {
    name: 'Drawer cabinet',
    sw: 32,
    sh: 30,
    colors: WOOD,
    colorNames: WOOD_NAMES,
    top: { y: 2 },
    draw(p, c) {
      const w = WOOD[c];
      p(0, 0, 32, 3, shade(w, 0.2));
      p(1, 3, 30, 25, w);
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 6; col++) {
          const x = 2 + col * 5;
          const y = 4 + row * 5;
          p(x, y, 4, 4, shade(w, 0.08));
          p(x, y + 3, 4, 1, shade(w, -0.2));
          p(x + 1, y + 1, 2, 1, '#c9a24b');
        }
      }
      p(1, 28, 3, 2, shade(w, -0.3));
      p(28, 28, 3, 2, shade(w, -0.3));
    },
  };

  const CLOCK_FRAMES = ['#c9a24b', '#3d424b'];
  const TRIO = [[6, 7, 5.5, 0], [19, 9, 4, 8], [27, 17, 4, -5]];
  I.clockTrio = {
    name: 'World clocks',
    sw: 32,
    sh: 22,
    ox: 0,
    wy: 6,
    colors: CLOCK_FRAMES,
    colorNames: ['Brass', 'Black'],
    draw(p, c) {
      for (const [x, y, rad] of TRIO) {
        ellipse(p, x, y, rad, rad, CLOCK_FRAMES[c]);
        ellipse(p, x, y, rad - 1, rad - 1, '#f6f2ea');
        p(Math.round(x - 0.5), Math.round(y - rad + 1), 1, 1, '#8a8f97');
      }
    },
    over(ctx, r, item, env) {
      // yerel saat, +8 ve -5 saat dilimleri
      const now = env.date;
      for (const [x, y, rad, off] of TRIO) {
        const min = now.getMinutes();
        const hr = ((now.getHours() + off + 24) % 12) + min / 60;
        const hand = (a, len, col) => {
          ctx.fillStyle = col;
          for (let s = 0; s <= len; s += 0.5) ctx.fillRect(r.x + Math.round(x - 0.5 + Math.sin(a) * s), r.y + Math.round(y - 0.5 - Math.cos(a) * s), 1, 1);
        };
        hand((min / 60) * Math.PI * 2, rad - 2, '#3d424b');
        hand((hr / 12) * Math.PI * 2, (rad - 2) * 0.6, '#d9665b');
      }
    },
  };

  // 3x5 rakam yazı tipi (dijital saat)
  const DIGITS = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001001001001', '111101111101111', '111101111001111'];
  const drawDigit = (ctx, x, y, d) => {
    const bits = DIGITS[d];
    for (let i = 0; i < 15; i++) if (bits[i] === '1') ctx.fillRect(x + (i % 3), y + Math.floor(i / 3), 1, 1);
  };

  I.digitalClock = {
    name: 'Digital clock',
    sw: 20,
    sh: 11,
    ox: -2,
    wy: 12,
    colors: ['#2a2629', '#f2efe9'],
    colorNames: ['Black', 'White'],
    draw(p, c) {
      p(0, 0, 20, 11, this.colors[c]);
      p(1, 1, 18, 9, '#1a1418');
    },
    over(ctx, r, item, env) {
      const now = env.date;
      const h = now.getHours();
      const m = now.getMinutes();
      ctx.fillStyle = '#ff5a4a';
      drawDigit(ctx, r.x + 2, r.y + 3, Math.floor(h / 10));
      drawDigit(ctx, r.x + 6, r.y + 3, h % 10);
      if (Math.floor(env.t / 500) % 2) {
        ctx.fillRect(r.x + 10, r.y + 4, 1, 1);
        ctx.fillRect(r.x + 10, r.y + 6, 1, 1);
      }
      drawDigit(ctx, r.x + 12, r.y + 3, Math.floor(m / 10));
      drawDigit(ctx, r.x + 16, r.y + 3, m % 10);
    },
  };

  const PENDANT = ['#3d424b', '#c9a24b', '#f2efe9'];
  I.pendantLamp = {
    name: 'Pendant lamp',
    sw: 14,
    sh: 44,
    ox: 1,
    wy: 0,
    ceiling: true,
    colors: PENDANT,
    colorNames: ['Black', 'Brass', 'White'],
    glows: [{ x: 7, y: 41, r: 36, when: 'night', strength: 0.45 }],
    draw(p, c) {
      const m = PENDANT[c];
      p(4, 0, 6, 2, '#3d3a3f');
      p(7, 2, 1, 31, '#3d3a3f');
      p(5, 32, 4, 2, m);
      p(3, 34, 8, 2, m);
      p(1, 36, 12, 3, m);
      p(1, 36, 12, 1, shade(m, 0.25));
      p(0, 39, 14, 1, shade(m, -0.25));
      p(5, 40, 4, 2, '#fff2b0');
    },
  };

  const IVY_SETS = ['#4f7f4c', '#6f9a63'];
  I.ivy = {
    name: 'Ivy garland',
    ceiling: true,
    sw: 48,
    sh: 26,
    wy: 2,
    colors: IVY_SETS,
    colorNames: ['Ivy', 'Blooming ivy'],
    noOutline: true,
    draw(p, c) {
      const r = rng(23);
      for (let x = 0; x < 48; x++) {
        const y = 2 + Math.round(4 * Math.sin((Math.PI * x) / 24) ** 2);
        p(x, y, 1, 1, '#5a4030');
        if (x % 3 === 0) {
          p(x, y + 1, 2, 2, LEAF[x % 2]);
          p(x - 1, y - 1, 2, 1, LEAF[2]);
        }
      }
      for (const x0 of [5, 14, 27, 38, 45]) {
        const len = 8 + Math.floor(r() * 12);
        for (let k = 0; k < len; k++) {
          const x = x0 + Math.round(Math.sin(k / 3) * 1.2);
          p(x, 5 + k, 1, 1, '#5a7a40');
          if (k % 2 === 0) p(x + (k % 4 ? 1 : -2), 5 + k, 2, 2, LEAF[(k + x0) % 3]);
          if (c === 1 && k % 6 === 3) p(x + 1, 5 + k, 2, 2, '#f7a8c0');
        }
      }
    },
  };

  // ---------- Büyü köşesi ----------
  I.windowBench = {
    name: 'Cushion bench',
    sw: 32,
    sh: 18,
    colors: FABRIC,
    colorNames: FABRIC_NAMES,
    seats: [
      { x: 0.6, y: 0.88, pose: 'sit', dir: 'down', cells: [[0, 0]], act: 'sit' },
      { x: 1.4, y: 0.88, pose: 'sit', dir: 'down', cells: [[1, 0]], act: 'sit' },
    ],
    draw(p, c) {
      const f = FABRIC[c];
      p(1, 2, 30, 7, f);
      p(2, 1, 28, 1, shade(f, 0.25));
      p(1, 2, 30, 2, shade(f, 0.15));
      p(1, 8, 30, 1, shade(f, -0.2));
      p(9, 5, 2, 1, shade(f, -0.3));
      p(21, 5, 2, 1, shade(f, -0.3));
      p(0, 9, 32, 7, '#5a3d2b');
      p(0, 9, 32, 1, '#7a5236');
      p(3, 11, 26, 3, '#4a3022');
      p(1, 16, 3, 2, '#3d2a20');
      p(28, 16, 3, 2, '#3d2a20');
    },
    views: {
      1: {
        sw: 16,
        sh: 36,
        seats: [
          { x: 0.55, y: 0.6, pose: 'sit', dir: 'left', cells: [[0, 0]], act: 'sit' },
          { x: 0.55, y: 1.45, pose: 'sit', dir: 'left', cells: [[0, 1]], act: 'sit' },
        ],
        draw(p, c) {
          const f = FABRIC[c];
          p(2, 4, 12, 24, f);
          p(2, 3, 12, 2, shade(f, 0.25));
          p(2, 27, 12, 1, shade(f, -0.2));
          p(7, 13, 2, 1, shade(f, -0.3));
          p(7, 21, 2, 1, shade(f, -0.3));
          p(1, 28, 14, 6, '#5a3d2b');
          p(1, 28, 14, 1, '#7a5236');
          p(2, 34, 2, 2, '#3d2a20');
          p(12, 34, 2, 2, '#3d2a20');
        },
      },
      2: { seats: [{ x: 0.6, y: 0.83, pose: 'sit', dir: 'up', cells: [[0, 0]], act: 'sit' }, { x: 1.4, y: 0.83, pose: 'sit', dir: 'up', cells: [[1, 0]], act: 'sit' }] },
    },
  };

  I.potionShelf = {
    name: 'Apothecary shelf',
    sw: 32,
    sh: 44,
    colors: WOOD,
    colorNames: WOOD_NAMES,
    top: { y: 1 },
    glows: [{ x: 16, y: 20, r: 26, when: 'night', strength: 0.14, color: [150, 255, 190] }],
    draw(p, c) {
      const w = WOOD[c];
      const inner = shade(w, -0.4);
      p(0, 0, 32, 3, shade(w, 0.2));
      p(0, 3, 32, 39, w);
      p(2, 4, 28, 36, inner);
      for (const y of [14, 26]) p(2, y, 28, 2, w);
      // kavanozlar ve şişeler
      const glass = '#dcecf0';
      for (const [x, y, h, fill] of [[3, 7, 7, '#c4553f'], [8, 9, 5, '#e3b766'], [13, 6, 8, '#9b7bb5'], [20, 8, 6, '#7aa25a'], [25, 7, 7, '#e98a5b']]) {
        p(x, y, 4, h, glass);
        p(x, y + 2, 4, h - 2, fill);
        p(x, y - 1, 4, 1, '#8a5a3c');
      }
      for (const [x, col] of [[3, '#7fe0a0'], [9, '#b98aff'], [16, '#ff6fa8'], [23, '#7fe0a0']]) {
        p(x + 1, 17, 2, 2, glass);
        ellipse(p, x + 2, 22, 2.5, 3, glass);
        ellipse(p, x + 2, 23, 2, 2, col);
      }
      books(p, 3, 18, 38, 9, 44);
      p(20, 31, 9, 7, '#6b4a2f');
      p(21, 32, 7, 1, '#c9a24b');
      p(1, 42, 3, 2, shade(w, -0.3));
      p(28, 42, 3, 2, shade(w, -0.3));
    },
  };

  const BREW = ['#7fe0a0', '#b98aff', '#ff9f6f'];
  I.cauldron = {
    name: 'Cauldron',
    sw: 16,
    sh: 18,
    colors: BREW,
    colorNames: ['Green brew', 'Violet brew', 'Ember brew'],
    glows: [{ x: 8, y: 5, r: 26, when: 'always', strength: 0.2, tint: true }],
    draw(p, c) {
      ellipse(p, 8, 10, 7, 6, '#2a2629');
      ellipse(p, 8, 5, 6.5, 2, '#3d3a3f');
      ellipse(p, 8, 5, 5, 1.4, BREW[c]);
      p(3, 9, 2, 1, '#4a4550');
      p(2, 15, 2, 3, '#2a2629');
      p(12, 15, 2, 3, '#2a2629');
      p(5, 17, 6, 1, '#d9502f');
      p(6, 16, 4, 1, '#f08a3c');
    },
    over(ctx, r, item, env) {
      const t = env.t / 1000;
      ctx.fillStyle = shade(BREW[item.c], 0.3);
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.8 + i / 3 + item.x * 0.1) % 1;
        ctx.globalAlpha = 1 - ph;
        ctx.fillRect(r.x + 5 + i * 3, r.y + 3 - Math.round(ph * 8), ph > 0.5 ? 1 : 2, ph > 0.5 ? 1 : 2);
      }
      ctx.globalAlpha = 1;
    },
  };

  I.candelabra = {
    name: 'Candelabra',
    sw: 16,
    sh: 34,
    colors: METAL.slice(0, 3),
    colorNames: METAL_NAMES.slice(0, 3),
    glows: [{ x: 8, y: 2, r: 34, when: 'always', strength: 0.3 }],
    draw(p, c) {
      const m = METAL[c];
      p(4, 31, 8, 3, m);
      p(7, 12, 2, 19, m);
      p(2, 11, 12, 2, m);
      p(2, 8, 2, 3, m);
      p(12, 8, 2, 3, m);
      p(7, 6, 2, 6, m);
      for (const [x, y] of [[2, 3], [7, 1], [12, 3]]) p(x, y, 2, 5, '#f2efe9');
    },
    over(ctx, r, item, env) {
      for (const [x, y, k] of [[2, 3, 0], [7, 1, 1], [12, 3, 2]]) {
        const f = Math.sin(env.t / 110 + k * 2 + item.x) > 0 ? 1 : 0;
        ctx.fillStyle = '#f7b267';
        ctx.fillRect(r.x + x, r.y + y - 3 + f, 2, 3 - f);
        ctx.fillStyle = '#fff2b0';
        ctx.fillRect(r.x + x, r.y + y - 2, 1, 1);
      }
    },
  };

  // ---------- Atölye ----------
  const CANVAS_ART = [['#9fc6e0', '#e3b766', '#d9785f'], ['#e59aa6', '#9b7bb5', '#f2efe9'], ['#6fa268', '#e3b766', '#5b7fa8'], ['#2f3550', '#f2c14e', '#e05d6f']];
  I.canvasStack = {
    name: 'Canvas stack',
    sw: 16,
    sh: 22,
    colors: CANVAS_ART.slice(0, 3).map((a) => a[0]),
    colorNames: ['Sky', 'Blossom', 'Meadow'],
    draw(p, c) {
      const [a, b, d] = CANVAS_ART[c];
      p(1, 2, 11, 17, '#c9a46a');
      p(2, 3, 9, 15, b);
      p(4, 0, 11, 20, '#e0c290');
      p(5, 1, 9, 18, a);
      p(5, 10, 9, 9, d);
      p(7, 4, 3, 3, '#f2efe9');
      p(4, 20, 12, 2, '#7a5236');
    },
  };

  I.floorCanvas = {
    name: 'Canvas on the floor',
    sw: 16,
    sh: 12,
    colors: CANVAS_ART.map((a) => a[0]),
    colorNames: ['Sky', 'Blossom', 'Meadow', 'Night'],
    draw(p, c) {
      const [a, b, d] = CANVAS_ART[c];
      p(1, 1, 14, 10, '#e0c290');
      p(2, 2, 12, 8, a);
      p(2, 6, 12, 4, d);
      p(4, 3, 3, 2, b);
      p(9, 4, 4, 1, shade(d, 0.2));
      p(1, 11, 14, 1, shade('#e0c290', -0.3));
    },
  };

  I.artTable = {
    name: 'Art table',
    sw: 32,
    sh: 24,
    colors: WOOD,
    colorNames: WOOD_NAMES,
    top: { y: 8 },
    draw(p, c) {
      const w = WOOD[c];
      p(0, 4, 32, 6, shade(w, 0.18));
      p(0, 4, 32, 1, shade(w, 0.3));
      for (const [x, y, col] of [[5, 6, '#e05d6f'], [12, 5, '#5b9bd8'], [22, 7, '#f2c14e'], [27, 5, '#6fa268']]) p(x, y, 2, 1, col);
      p(0, 10, 32, 2, w);
      p(2, 12, 2, 12, shade(w, -0.2));
      p(28, 12, 2, 12, shade(w, -0.2));
      p(4, 18, 24, 2, shade(w, -0.1));
      p(6, 14, 8, 4, '#f2efe9');
      p(16, 15, 6, 3, '#c9a46a');
    },
  };

  // ---------- Spor ----------
  const GYM = ['#3d424b', '#f2efe9'];
  I.treadmill = {
    name: 'Treadmill',
    sw: 32,
    sh: 30,
    colors: GYM,
    colorNames: ['Black', 'White'],
    seats: [{ x: 1.1, y: 0.62, pose: 'stand', dir: 'left', cells: [[0, 0], [1, 0]], act: 'run', anim: true }],
    draw(p, c) {
      const col = GYM[c];
      p(1, 3, 2, 18, '#5d646e');
      p(1, 2, 9, 2, '#5d646e');
      p(2, 0, 7, 4, col);
      p(3, 1, 5, 2, '#7fd3e8');
      p(1, 20, 30, 6, col);
      p(3, 20, 26, 4, '#2a2629');
      p(1, 26, 30, 2, shade(col, -0.3));
      p(28, 20, 3, 6, shade(col, -0.15));
    },
    over(ctx, r, item, env) {
      // koşu bandı çizgileri
      const run = env.activeRun && env.activeRun.has(item.id);
      const off = run ? Math.floor(env.t / 60) % 6 : 0;
      ctx.fillStyle = '#4a4550';
      for (let x = 3 + off; x < 29; x += 6) ctx.fillRect(r.x + x, r.y + 21, 1, 3);
    },
  };

  const BIKE_COL = ['#3d424b', '#d9665b', '#5b7fa8'];
  I.exerciseBike = {
    name: 'Exercise bike',
    sw: 16,
    sh: 26,
    colors: BIKE_COL,
    colorNames: ['Black', 'Red', 'Blue'],
    seats: [{ x: 0.55, y: 0.6, pose: 'sit', dir: 'left', cells: [[0, 0]], act: 'run', anim: true }],
    draw(p, c) {
      const col = BIKE_COL[c];
      p(1, 3, 4, 2, '#3d424b');
      p(3, 5, 2, 9, col);
      ellipse(p, 5, 18, 4, 4, '#2a2629');
      ellipse(p, 5, 18, 2, 2, '#8a929c');
      p(5, 12, 7, 2, col);
      p(10, 8, 2, 12, col);
      p(8, 7, 6, 2, '#2a2629');
      p(1, 23, 14, 2, '#3d424b');
      p(3, 5, 1, 2, '#7fd3e8');
    },
  };

  I.dumbbellRack = {
    name: 'Dumbbell rack',
    sw: 32,
    sh: 22,
    colors: ['#3d424b', '#c0c6cc'],
    colorNames: ['Black', 'Steel'],
    draw(p, c) {
      const f = this.colors[c];
      p(1, 6, 30, 2, f);
      p(1, 14, 30, 2, f);
      p(1, 6, 2, 16, f);
      p(29, 6, 2, 16, f);
      const bell = (x, y, size, col) => {
        p(x, y, 2, size, col);
        p(x + 2, y + Math.floor(size / 2) - 1, 4, 2, '#8a8f97');
        p(x + 6, y, 2, size, col);
      };
      [[4, 1, 5, '#2a2629'], [13, 2, 4, '#d9665b'], [21, 2, 4, '#5b7fa8']].forEach(([x, y, s, col]) => bell(x, y, s, col));
      [[4, 9, 5, '#2a2629'], [13, 10, 4, '#e3b766'], [21, 10, 4, '#6fa268']].forEach(([x, y, s, col]) => bell(x, y, s, col));
    },
  };

  const BAGS = ['#d9665b', '#3d424b', '#5b7fa8'];
  I.punchingBag = {
    name: 'Punching bag',
    sw: 16,
    sh: 40,
    colors: BAGS,
    colorNames: ['Red', 'Black', 'Blue'],
    use: 'punch',
    petSfx: 'punch',
    useGlyph: '✶',
    useColor: '#f08a3c',
    draw(p, c) {
      const col = BAGS[c];
      p(1, 0, 12, 2, '#3d424b');
      p(1, 0, 2, 40, '#3d424b');
      p(0, 37, 10, 3, '#3d424b');
      p(10, 2, 1, 5, '#8a8f97');
      p(6, 7, 9, 25, col);
      p(7, 6, 7, 1, col);
      p(7, 8, 2, 23, shade(col, 0.2));
      p(6, 12, 9, 1, shade(col, -0.25));
      p(6, 27, 9, 1, shade(col, -0.25));
      p(7, 32, 7, 1, shade(col, -0.3));
    },
  };

  const BALLS = ['#9b7bb5', '#5b9bd8', '#e59aa6', '#6fa268'];
  I.exerciseBall = {
    name: 'Exercise ball',
    sw: 16,
    sh: 16,
    colors: BALLS,
    colorNames: ['Purple', 'Blue', 'Pink', 'Green'],
    draw(p, c) {
      ellipse(p, 8, 8.5, 7.5, 7.3, BALLS[c]);
      ellipse(p, 6, 6, 3, 2.5, shade(BALLS[c], 0.2));
      p(4, 4, 2, 1, shade(BALLS[c], 0.45));
      p(3, 14, 10, 1, shade(BALLS[c], -0.3));
    },
  };

  // =====================================================================
  // EVCİL HAYVANLAR: boş yatak çizimleri ve dolaşırken kullanılan yürüme / oturma kareleri
  // =====================================================================
  I.cat.empty = (p) => {
    ellipse(p, 8, 9, 8, 4, '#b4825a');
    ellipse(p, 8, 8.6, 6.4, 3, '#e8d8c3');
    ellipse(p, 8, 8.2, 4.2, 1.6, shade('#e8d8c3', -0.08));
  };
  I.dogBed.empty = (p) => {
    ellipse(p, 9, 9.5, 9, 4.3, '#6f9a7d');
    ellipse(p, 9, 9, 7.2, 3.2, '#cfe0c8');
    ellipse(p, 9, 8.6, 5, 2, shade('#cfe0c8', -0.08));
    p(12, 7, 3, 2, '#d9665b');
  };

  const PET_ART = {
    cat: {
      colors: I.cat.colors,
      walk: { w: 16, h: 12 },
      sit: { w: 12, h: 14 },
      drawWalk(p, c, frame) {
        const col = this.colors[c];
        const dark = shade(col, c === 1 ? 0.25 : -0.22);
        p(12, 1, 1, 2, col);
        p(13, 2, 1, 4, col);
        p(4, 5, 9, 4, col);
        p(5, 4, 7, 1, col);
        p(1, 2, 5, 4, col);
        p(1, 1, 1, 1, col);
        p(4, 1, 1, 1, col);
        p(2, 3, 1, 1, '#2b2230');
        p(1, 4, 1, 1, '#f0a3a0');
        if (c === 0) for (const x of [7, 9, 11]) p(x, 5, 1, 2, dark);
        if (c === 3) p(8, 5, 3, 2, '#e3b766');
        p(5, 8, 7, 1, shade(col, -0.12));
        const legs = frame ? [[5, 1], [7, 0], [10, 1], [12, 0]] : [[4, 0], [6, 1], [9, 0], [11, 1]];
        for (const [x, up] of legs) p(x, 9, 1, 3 - up, x % 2 ? col : dark);
      },
      drawSit(p, c) {
        const col = this.colors[c];
        const dark = shade(col, c === 1 ? 0.25 : -0.22);
        p(9, 10, 3, 2, col);
        p(11, 8, 1, 2, col);
        p(3, 7, 6, 6, col);
        p(4, 6, 4, 1, col);
        p(2, 1, 8, 6, col);
        p(2, 0, 2, 2, col);
        p(8, 0, 2, 2, col);
        p(3, 1, 1, 1, '#f0a3a0');
        p(8, 1, 1, 1, '#f0a3a0');
        p(4, 3, 1, 1, '#2b2230');
        p(7, 3, 1, 1, '#2b2230');
        p(5, 4, 2, 1, '#f0a3a0');
        if (c === 0) {
          p(5, 1, 2, 1, dark);
          p(3, 9, 1, 2, dark);
          p(8, 9, 1, 2, dark);
        }
        if (c === 3) p(6, 8, 2, 2, '#e3b766');
        p(4, 12, 1, 1, shade(col, 0.2));
        p(7, 12, 1, 1, shade(col, 0.2));
      },
    },
    dogBed: {
      colors: I.dogBed.colors,
      walk: { w: 18, h: 13 },
      sit: { w: 14, h: 15 },
      drawWalk(p, c, frame) {
        const col = this.colors[c];
        const dark = shade(col, c === 1 ? 0.25 : -0.25);
        p(15, frame ? 1 : 2, 1, 4, col);
        p(5, 5, 10, 4, col);
        p(1, 1, 6, 5, col);
        p(0, 4, 2, 2, shade(col, 0.12));
        p(0, 4, 1, 1, '#2b2230');
        p(4, 1, 2, 5, dark);
        p(2, 2, 1, 1, '#2b2230');
        if (c === 2) p(9, 5, 3, 2, '#c99a66');
        p(6, 8, 8, 1, shade(col, -0.12));
        const legs = frame ? [[6, 1], [8, 0], [12, 1], [14, 0]] : [[5, 0], [7, 1], [11, 0], [13, 1]];
        for (const [x, up] of legs) p(x, 9, 1, 4 - up, x % 2 ? col : dark);
      },
      drawSit(p, c) {
        const col = this.colors[c];
        const dark = shade(col, c === 1 ? 0.25 : -0.25);
        p(10, 11, 3, 2, col);
        p(4, 7, 7, 7, col);
        p(3, 1, 9, 7, col);
        p(1, 2, 2, 6, dark);
        p(12, 2, 2, 6, dark);
        p(5, 4, 1, 1, '#2b2230');
        p(9, 4, 1, 1, '#2b2230');
        p(6, 5, 3, 2, shade(col, 0.15));
        p(7, 5, 1, 1, '#2b2230');
        p(7, 7, 1, 1, '#e05d6f');
        if (c === 2) p(8, 9, 3, 3, '#c99a66');
        p(5, 13, 2, 1, shade(col, 0.15));
        p(8, 13, 2, 1, shade(col, 0.15));
      },
    },
  };

  const petCache = new Map();
  // pose: walk | sit; dir: left | right | up | down (yürürken yalnızca sola/sağa bakan kare kullanılır)
  Art.petSprite = (kind, c, pose, frame, dir) => {
    const key = `${kind}:${c}:${pose}:${frame}:${dir}`;
    let img = petCache.get(key);
    if (img) return img;
    const art = PET_ART[kind];
    const size = art[pose];
    const cv = Art.makeCanvas(size.w, size.h);
    const p = Art.painter(cv.getContext('2d'));
    if (pose === 'walk') art.drawWalk(p, c, frame);
    else art.drawSit(p, c);
    img = Art.outline(cv);
    if (pose === 'walk' && dir === 'right') {
      const m = Art.makeCanvas(img.width, img.height);
      const g = m.getContext('2d');
      g.translate(img.width, 0);
      g.scale(-1, 1);
      g.drawImage(img, 0, 0);
      img = m;
    }
    petCache.set(key, img);
    return img;
  };
  Art.PET_KINDS = Object.keys(PET_ART);

  // Üzerine yazı yazılabilen not kâğıdı (yazı odada tıklayınca okunur)
  const NOTE_PAPER = ['#f7e27a', '#f7a8c0', '#a8d8f0', '#b9e3a8'];
  I.stickyNote = {
    name: 'Sticky note',
    sw: 12,
    sh: 13,
    ox: 2,
    wy: 16,
    colors: NOTE_PAPER,
    colorNames: ['Yellow', 'Pink', 'Blue', 'Green'],
    draw(p, c) {
      const paper = NOTE_PAPER[c];
      p(0, 1, 12, 12, paper);
      p(0, 1, 12, 1, shade(paper, 0.2));
      p(9, 10, 3, 3, shade(paper, -0.12));
      p(10, 11, 2, 2, shade(paper, -0.22));
      for (const [y, w] of [[4, 8], [6, 6], [8, 7]]) p(2, y, w, 1, shade(paper, -0.4));
      p(5, 0, 2, 2, '#d9665b');
      p(5, 0, 1, 1, '#f08a8a');
    },
  };

  // ---------- Katalog sekmeleri ----------
  Art.TABS = {
    seating: ['sofa', 'chesterfield', 'armchair', 'loungeChair', 'officeChair', 'pouf', 'beanbag', 'floorCushion', 'bench', 'windowBench', 'stool', 'rockingChair', 'eggChair', 'swingBench', 'bed', 'daybed', 'deckChair', 'hammock'],
    tables: ['desk', 'gamingDesk', 'cafeTable', 'diningTable', 'readingTable', 'counter', 'table', 'sideTable', 'artTable', 'piano', 'easel'],
    small: ['mug', 'teapot', 'coffeeMaker', 'tableLamp', 'candle', 'laptop', 'typewriter', 'radio', 'gramophone', 'bookPile', 'pencilCup', 'deskClock', 'hourglass', 'photoFrame', 'miniGlobe', 'succulent', 'vase', 'cake', 'fruitBowl', 'breadBasket', 'jars', 'paintJars', 'crystals', 'potions'],
    kitchen: ['cabinet', 'stove', 'sink', 'fridge', 'wallCabinet', 'rangeHood', 'panRail', 'spiceRack', 'coffeeCart', 'vendingMachine', 'pastryCase', 'trashBin'],
    storage: ['bookshelf', 'narrowShelf', 'cubeShelf', 'ladderShelf', 'displayCabinet', 'filingCabinet', 'potionShelf', 'wardrobe', 'dresser', 'tvStand', 'aquarium', 'toyChest', 'coatRack'],
    plants: ['plant', 'bigPlant', 'ficus', 'palm', 'cactus', 'flowers', 'bonsai', 'pampasVase'],
    decor: ['lamp', 'lantern', 'candelabra', 'lavaLamp', 'candles', 'fireplace', 'cauldron', 'recordPlayer', 'globe', 'telescope', 'floorMirror', 'floorFan', 'bookStack', 'canvasStack', 'floorCanvas', 'christmasTree', 'pumpkin'],
    fun: ['arcade', 'drumKit', 'guitar', 'teddyBear', 'cat', 'dogBed'],
    sport: ['treadmill', 'exerciseBike', 'dumbbellRack', 'punchingBag', 'exerciseBall'],
    outdoor: ['campfire', 'lampPost', 'planterBox', 'fountain', 'snowman', 'bicycle'],
    rugs: ['rug', 'roundRug', 'runner', 'shagRug', 'checkerRug', 'yogaMat'],
    wall: ['stickyNote', 'window', 'curtainWindow', 'archWindow', 'portholeWindow', 'board', 'chalkboard', 'whiteboard', 'pegboard', 'shelf', 'painting', 'poster', 'gallery', 'tapestry', 'worldMap', 'photoGarland', 'bunting', 'ivy', 'mirror', 'calendar', 'clock', 'clockTrio', 'digitalClock', 'dartboard', 'wallTV', 'sconce', 'pendantLamp', 'stringLights', 'neon', 'neonArt', 'hangingPlant'],
  };


  // Katalog ile çizimler uyuşmuyorsa geliştirme sırasında fark edilsin
  for (const [type, cat] of Object.entries(Sh.CATALOG)) {
    const def = I[type];
    if (!def) console.error(`Item has no artwork: ${type}`);
    else if (def.colors.length !== cat.colors) console.error(`Color count mismatch: ${type}`);
  }
})();
