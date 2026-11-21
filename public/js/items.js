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
  const TABLE_TOP_NAMES = ['Mermer', 'Ahşap', 'Siyah'];
  const FRAME3 = ['#f3efe6', '#a87650', '#3d3a3f'];
  const FRAME3_NAMES = ['Beyaz', 'Ahşap', 'Siyah'];

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
    name: 'Kanepe',
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
    name: 'Koltuk',
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
    name: 'Minder',
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
    name: 'Armut koltuk',
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
    name: 'Bank',
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
    name: 'Tabure',
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
    name: 'Çalışma masası',
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
    name: 'Kafe masası',
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
    name: 'Okuma masası',
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
    name: 'Bar tezgahı',
    sw: 48,
    sh: 44,
    colors: ['#7a5236', '#e9e2d4', '#3d3a3f'],
    colorNames: ['Ceviz', 'Beyaz', 'Siyah'],
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
  };

  I.sideTable = {
    name: 'Komodin',
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
    name: 'Yatak',
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
  };

  I.narrowShelf = {
    name: 'Dar kitaplık',
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
    name: 'Gardırop',
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
    name: 'Pasta vitrini',
    sw: 32,
    sh: 28,
    colors: ['#7a5236', '#e9e2d4', '#3d3a3f'],
    colorNames: ['Ceviz', 'Beyaz', 'Siyah'],
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
  };

  I.bigPlant = {
    name: 'Büyük bitki',
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
    name: 'Kaktüs',
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
    name: 'Çiçek saksısı',
    sw: 16,
    sh: 20,
    colors: ['#e05d6f', '#f2c14e', '#9b7bb5', '#f2efe9'],
    colorNames: ['Kırmızı', 'Sarı', 'Mor', 'Beyaz'],
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
    name: 'Lambader',
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
    name: 'Fener',
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
    name: 'Şömine',
    sw: 32,
    sh: 36,
    colors: ['#b5aca0', '#c9826b', '#e9e2d4'],
    colorNames: ['Taş', 'Tuğla', 'Beyaz'],
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
    name: 'Pikap',
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
    name: 'Dünya küresi',
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
    name: 'Kedi',
    sw: 16,
    sh: 13,
    colors: ['#e39a4f', '#3d3a3f', '#9aa1a9', '#f2efe9'],
    colorNames: ['Turuncu', 'Siyah', 'Gri', 'Beyaz'],
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
  };

  I.roundRug = {
    name: 'Yuvarlak halı',
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
    name: 'Pencere',
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
    name: 'Kemerli pencere',
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
  };

  I.chalkboard = {
    name: 'Menü panosu',
    sw: 30,
    sh: 21,
    ox: 1,
    wy: 8,
    colors: ['#7a5236', '#3d3a3f'],
    colorNames: ['Ahşap', 'Siyah'],
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
  };

  I.painting = {
    name: 'Tablo',
    sw: 14,
    sh: 12,
    ox: 1,
    wy: 12,
    colors: ['#7fae73', '#e98a5b', '#4f78a3', '#e59aa6', '#3d3a3f'],
    colorNames: ['Dağ', 'Gün batımı', 'Deniz', 'Çiçekler', 'Soyut'],
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
    colorNames: ['Domates', 'Kahve', 'Dalga', 'Gece'],
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
    name: 'Duvar saati',
    sw: 11,
    sh: 11,
    ox: 2,
    wy: 11,
    colors: ['#3d424b', '#a87650', '#d9785f'],
    colorNames: ['Siyah', 'Ahşap', 'Kiremit'],
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
    name: 'Aplik',
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
    name: 'Işık zinciri',
    sw: 48,
    sh: 10,
    wy: 3,
    colors: ['#f7d58a', '#e05d6f', '#bfe3f5'],
    colorNames: ['Sıcak', 'Renkli', 'Buz mavisi'],
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
    name: 'Neon tabela',
    sw: 28,
    sh: 18,
    ox: 2,
    wy: 8,
    colors: NEON,
    colorNames: ['Pembe', 'Turkuaz', 'Sarı'],
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
    name: 'Askılı saksı',
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

  // ---------- Katalog sekmeleri ----------
  Art.TABS = {
    furniture: ['sofa', 'armchair', 'pouf', 'beanbag', 'bench', 'stool', 'desk', 'cafeTable', 'readingTable', 'counter', 'table', 'sideTable', 'bed', 'bookshelf', 'narrowShelf', 'wardrobe', 'pastryCase'],
    decor: ['plant', 'bigPlant', 'cactus', 'flowers', 'lamp', 'lantern', 'fireplace', 'recordPlayer', 'globe', 'cat', 'rug', 'roundRug'],
    wall: ['window', 'archWindow', 'board', 'chalkboard', 'shelf', 'painting', 'poster', 'clock', 'sconce', 'stringLights', 'neon', 'hangingPlant'],
  };

  // Katalog ile çizimler uyuşmuyorsa geliştirme sırasında fark edilsin
  for (const [type, cat] of Object.entries(Sh.CATALOG)) {
    const def = I[type];
    if (!def) console.error(`Çizimi olmayan eşya: ${type}`);
    else if (def.colors.length !== cat.colors) console.error(`Renk sayısı uyuşmuyor: ${type}`);
  }
})();
