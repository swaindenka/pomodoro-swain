/*
 * Kafe, kütüphane ve oda için eşyalar:
 *  kafe: dört kişilik kafe locası, ayaklı menü tabelası, kahve çuvalları, eski usul yazar kasa
 *  kütüphane: iki kişilik çalışma kabini, sarkaçlı ayaklı saat, kaide üstünde büst, kitap arabası, banker lambası
 *  oda: bilgisayar ekranı, kademeli saksı standı, çamaşır sepeti
 */
(() => {
  'use strict';

  const App = window.App;
  const Art = App.Art;
  const { shade, ellipse, books, LEAF, FABRIC, FABRIC_NAMES, WOOD, WOOD_NAMES } = Art;
  const I = Art.ITEMS;

  const nightGlow = (x, y, r, extra) => ({ x, y, r, when: 'night', ...extra });
  const smallItem = (name, colors, colorNames, draw, extra) => ({ name, sw: 16, sh: 16, colors, colorNames, draw, ...extra });

  // Buhar: fincan ve kahvelerin üstünde yavaşça yükselen iki ince çizgi
  function steam(ctx, x, y, t, seed) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 2; i++) {
      const k = ((t / 1400 + i * 0.5 + seed * 0.13) % 1 + 1) % 1;
      const sx = x + Math.round(Math.sin(k * 6 + i * 2) * 1.2);
      ctx.fillRect(sx, Math.round(y - k * 7), 1, 2);
    }
  }

  // Arkası bize dönük sandalye (desk.js'teki ofis koltuğunun ahşap hali)
  function chairBack(p, x, y, color) {
    const light = shade(color, 0.2);
    p(x + 1, y, 10, 3, light);
    p(x, y + 2, 1, 10, color);
    p(x + 11, y + 2, 1, 10, color);
    p(x + 1, y + 3, 10, 6, color);
    p(x + 1, y + 3, 10, 1, light);
    p(x + 1, y + 6, 10, 1, shade(color, -0.15));
    p(x + 1, y + 11, 1, 2, color);
    p(x + 10, y + 11, 1, 2, color);
  }

  // =====================================================================
  // KAFE
  // =====================================================================
  const BOOTH_WOOD = '#6b4630';

  // Loca: üstte bize bakan yüksek sırtlı minder, ortada masa, altta arkası bize dönük minder.
  // Dört kişi karşılıklı oturup çalışır; masaya küçük eşya konabilir.
  I.booth = {
    name: 'Café booth',
    sw: 32,
    sh: 52,
    colors: FABRIC,
    colorNames: FABRIC_NAMES,
    cuts: [20, 37],
    overBand: 1,
    solid: (cx, cy) => cy === 1,
    top: { y: 27 },
    seats: [
      { x: 0.5, y: 1.375, pose: 'study', dir: 'down', cells: [[0, 0]], band: 0, act: 'work' },
      { x: 1.5, y: 1.375, pose: 'study', dir: 'down', cells: [[1, 0]], band: 0, act: 'work' },
      { x: 0.5, y: 2.5, pose: 'work', dir: 'up', cells: [[0, 2]], band: 1, act: 'work' },
      { x: 1.5, y: 2.5, pose: 'work', dir: 'up', cells: [[1, 2]], band: 1, act: 'work' },
    ],
    draw(p, c) {
      const f = FABRIC[c];
      const fl = shade(f, 0.18);
      const fd = shade(f, -0.22);
      const wl = shade(BOOTH_WOOD, 0.2);
      // üst minder: ahşap çerçeve, kapitone sırt, oturak
      p(0, 0, 32, 2, wl);
      p(0, 2, 2, 17, BOOTH_WOOD);
      p(30, 2, 2, 17, BOOTH_WOOD);
      p(2, 2, 28, 11, f);
      p(2, 2, 28, 1, fl);
      for (const x of [8, 16, 24]) p(x, 3, 1, 9, fd);
      for (const x of [5, 12, 20, 27]) p(x, 7, 1, 1, fd);
      p(2, 12, 28, 1, fd);
      p(2, 13, 28, 4, fl);
      p(2, 17, 28, 2, f);
      p(0, 19, 32, 1, shade(BOOTH_WOOD, -0.25));
      // masa: geniş tabla, tek ayak
      p(1, 21, 30, 6, '#c9a27a');
      p(1, 21, 30, 1, '#e0c09a');
      p(1, 27, 30, 2, BOOTH_WOOD);
      p(2, 29, 28, 1, shade(BOOTH_WOOD, -0.3));
      p(14, 30, 4, 5, '#3d3a3f');
      p(10, 34, 12, 2, '#3d3a3f');
      // masanın üstü: iki fincan, kruvasanlı tabak, açık defter
      p(3, 23, 4, 3, '#f2efe9');
      p(3, 23, 4, 1, '#8a5a3c');
      p(7, 24, 1, 1, '#f2efe9');
      p(25, 23, 4, 3, '#f2efe9');
      p(25, 23, 4, 1, '#8a5a3c');
      p(24, 24, 1, 1, '#f2efe9');
      ellipse(p, 16, 23.5, 4, 1.6, '#f2efe9');
      p(13, 22, 6, 2, '#e3a857');
      p(14, 22, 1, 1, shade('#e3a857', 0.25));
      p(17, 23, 1, 1, shade('#e3a857', -0.2));
      p(9, 22, 4, 3, '#f7f3ea');
      p(10, 23, 2, 1, '#b8b2a7');
      // alt minder: arkası bize dönük yüksek sırt
      p(0, 37, 32, 2, wl);
      p(0, 39, 32, 1, BOOTH_WOOD);
      p(0, 40, 2, 11, BOOTH_WOOD);
      p(30, 40, 2, 11, BOOTH_WOOD);
      p(2, 40, 28, 9, BOOTH_WOOD);
      p(2, 40, 28, 1, shade(BOOTH_WOOD, 0.12));
      for (const x of [9, 16, 23]) p(x, 41, 1, 7, shade(BOOTH_WOOD, -0.18));
      p(0, 49, 32, 2, shade(BOOTH_WOOD, -0.25));
      p(1, 51, 3, 1, '#2a2629');
      p(28, 51, 3, 1, '#2a2629');
    },
    over(ctx, r, item, env) {
      steam(ctx, r.x + 5, r.y + 22, env.t, item.x + item.y);
      steam(ctx, r.x + 27, r.y + 22, env.t, item.x + item.y + 3);
    },
  };

  // Kapının önüne konan ayaklı menü tabelası
  const SIGN_FRAMES = ['#8a5a3c', '#3d3a3f', '#e9e2d4'];
  I.menuSign = {
    name: 'Menu sign',
    sw: 16,
    sh: 26,
    colors: SIGN_FRAMES,
    colorNames: ['Wood', 'Black', 'White'],
    draw(p, c) {
      const fr = SIGN_FRAMES[c];
      // arka ayaklar
      p(3, 20, 1, 6, shade(fr, -0.3));
      p(12, 20, 1, 6, shade(fr, -0.3));
      // çerçeve ve kara tahta
      p(2, 1, 12, 21, fr);
      p(2, 1, 12, 1, shade(fr, 0.2));
      p(1, 21, 2, 5, fr);
      p(13, 21, 2, 5, fr);
      p(3, 3, 10, 17, '#2f3a35');
      // fincan çizimi ve menü satırları
      p(6, 5, 4, 3, '#efece4');
      p(10, 6, 1, 1, '#efece4');
      p(5, 8, 6, 1, '#efece4');
      p(7, 4, 1, 1, '#d6d3cb');
      p(4, 11, 6, 1, '#d6d3cb');
      p(11, 11, 1, 1, '#f2c14e');
      p(4, 13, 5, 1, '#d6d3cb');
      p(11, 13, 1, 1, '#f2c14e');
      p(4, 15, 6, 1, '#d6d3cb');
      p(11, 15, 1, 1, '#f2c14e');
      p(4, 17, 4, 1, '#f08a8a');
      p(9, 17, 3, 1, '#f08a8a');
    },
  };

  // Kahve çekirdeği çuvalları; damganın rengi değişir
  const STAMPS = ['#c4553f', '#3f7f5a', '#2f4a6b'];
  const BURLAP = '#c9a46a';
  I.coffeeSacks = {
    name: 'Coffee sacks',
    sw: 16,
    sh: 20,
    colors: STAMPS,
    colorNames: ['Red', 'Green', 'Blue'],
    draw(p, c) {
      const st = STAMPS[c];
      const bd = shade(BURLAP, -0.2);
      // arkadaki kapalı çuval
      p(8, 2, 7, 3, bd);
      p(9, 1, 5, 1, BURLAP);
      p(7, 4, 9, 14, BURLAP);
      p(7, 4, 1, 14, bd);
      p(10, 0, 3, 2, shade(BURLAP, 0.15));
      p(9, 9, 5, 4, st);
      p(10, 10, 3, 2, shade(BURLAP, 0.25));
      // öndeki açık çuval: kıvrık ağız, çekirdekler, kepçe
      p(0, 8, 9, 12, BURLAP);
      p(0, 8, 9, 2, shade(BURLAP, 0.2));
      p(1, 7, 7, 1, shade(BURLAP, 0.2));
      p(1, 9, 7, 2, '#5a3a26');
      for (const [x, y] of [[2, 9], [5, 9], [3, 10], [6, 10]]) p(x, y, 1, 1, '#7a5236');
      p(6, 5, 1, 4, '#b4bac1');
      p(5, 4, 3, 2, '#c0c6cc');
      p(2, 13, 5, 3, st);
      p(3, 14, 3, 1, shade(BURLAP, 0.25));
      p(0, 18, 9, 2, bd);
      p(7, 18, 9, 2, shade(bd, -0.1));
    },
  };

  // Tezgaha konan eski usul yazar kasa
  const TILLS = ['#c9a24b', '#3d424b', '#9fd3c7'];
  I.cashRegister = smallItem('Cash register', TILLS, ['Brass', 'Black', 'Mint'], (p, c) => {
    const col = TILLS[c];
    const dark = shade(col, -0.25);
    p(4, 2, 8, 3, '#f2efe9');
    p(5, 3, 2, 1, '#3d424b');
    p(8, 3, 3, 1, '#3d424b');
    p(3, 5, 10, 6, col);
    p(3, 5, 10, 1, shade(col, 0.25));
    for (let y = 6; y < 10; y += 2) for (let x = 4; x < 12; x += 2) p(x, y, 1, 1, dark);
    p(1, 11, 14, 4, shade(col, -0.1));
    p(1, 11, 14, 1, shade(col, 0.15));
    p(6, 12, 4, 1, dark);
    p(1, 15, 14, 1, dark);
  });

  // =====================================================================
  // KÜTÜPHANE
  // =====================================================================
  const GREEN_GLASS = '#3f7f5a';

  // İki kişilik çalışma kabini: arada bölme, her bölmede raf, banker lambası ve sandalye
  I.studyCarrel = {
    name: 'Study carrel',
    sw: 32,
    sh: 44,
    colors: WOOD,
    colorNames: WOOD_NAMES,
    sortY: 1,
    cuts: [34],
    overBand: 0,
    solid: (cx, cy) => cy === 0,
    top: { y: 23 },
    seats: [
      { x: 0.5, y: 1.75, pose: 'work', dir: 'up', cells: [[0, 1]], band: 0, act: 'work' },
      { x: 1.5, y: 1.75, pose: 'work', dir: 'up', cells: [[1, 1]], band: 0, act: 'work' },
    ],
    glows: [nightGlow(10, 15, 22), nightGlow(26, 15, 22)],
    draw(p, c) {
      const w = WOOD[c];
      const wl = shade(w, 0.18);
      const wd = shade(w, -0.22);
      const inner = shade(w, -0.38);
      // arka panel ve yan bölmeler
      p(0, 0, 32, 2, wl);
      p(0, 2, 32, 16, w);
      p(2, 3, 13, 15, inner);
      p(17, 3, 13, 15, inner);
      p(15, 0, 2, 22, wl);
      p(0, 2, 2, 20, wl);
      p(30, 2, 2, 20, wl);
      // raflarda kitaplar
      p(2, 8, 13, 1, w);
      p(17, 8, 13, 1, w);
      books(p, 3, 14, 8, 5, 41 + c);
      books(p, 18, 29, 8, 5, 47 + c);
      // banker lambaları
      for (const lx of [10, 26]) {
        p(lx - 2, 16, 5, 1, '#c9a24b');
        p(lx, 13, 1, 3, '#c9a24b');
        p(lx - 3, 11, 7, 2, GREEN_GLASS);
        p(lx - 3, 11, 7, 1, shade(GREEN_GLASS, 0.3));
        p(lx - 2, 13, 5, 1, '#fff2b0');
      }
      // açık kitap ve defter
      p(3, 15, 5, 2, '#f7f3ea');
      p(5, 15, 1, 2, '#d9d3c9');
      p(19, 15, 4, 2, '#f2c14e');
      p(23, 16, 2, 1, '#3d424b');
      // masa yüzeyi ve ön kenar
      p(0, 18, 32, 5, shade(w, 0.1));
      p(0, 18, 32, 1, wl);
      p(0, 23, 32, 3, wd);
      p(15, 23, 2, 3, shade(wd, -0.15));
      p(1, 26, 2, 6, wd);
      p(29, 26, 2, 6, wd);
      p(15, 26, 2, 6, wd);
      // sandalyeler (arkası bize dönük)
      chairBack(p, 2, 31, '#7a5236');
      chairBack(p, 18, 31, '#7a5236');
    },
  };

  // Sarkacı sallanan, gerçek saati gösteren ayaklı saat
  I.grandfatherClock = {
    name: 'Grandfather clock',
    sw: 16,
    sh: 46,
    colors: WOOD,
    colorNames: WOOD_NAMES,
    draw(p, c) {
      const w = WOOD[c];
      const wl = shade(w, 0.2);
      const wd = shade(w, -0.25);
      // taç
      p(3, 0, 10, 2, wl);
      p(2, 2, 12, 2, w);
      p(7, 0, 2, 1, '#c9a24b');
      // kadran kutusu
      p(2, 4, 12, 13, w);
      p(2, 4, 12, 1, wl);
      ellipse(p, 8, 10.5, 5, 5, '#c9a24b');
      ellipse(p, 8, 10.5, 4, 4, '#f6f2ea');
      for (const [x, y] of [[8, 7], [11, 10], [8, 13], [4, 10]]) p(x, y, 1, 1, '#8a8f97');
      // gövde: camlı sarkaç bölmesi
      p(3, 17, 10, 21, w);
      p(3, 17, 10, 1, wd);
      p(5, 19, 6, 16, '#2a2629');
      p(5, 19, 6, 1, shade(w, -0.4));
      p(3, 17, 1, 21, wl);
      // kaide
      p(2, 38, 12, 6, w);
      p(2, 38, 12, 1, wl);
      p(4, 40, 8, 2, wd);
      p(1, 44, 14, 2, wd);
    },
    over(ctx, r, item, env) {
      const now = env.date;
      const min = now.getMinutes() + now.getSeconds() / 60;
      const hr = (now.getHours() % 12) + min / 60;
      const hand = (angle, len, color) => {
        ctx.fillStyle = color;
        for (let s = 0; s <= len; s += 0.5) {
          ctx.fillRect(r.x + Math.round(7.5 + Math.sin(angle) * s), r.y + Math.round(10 - Math.cos(angle) * s), 1, 1);
        }
      };
      hand((min / 60) * Math.PI * 2, 3.2, '#3d424b');
      hand((hr / 12) * Math.PI * 2, 2.2, '#8c3b4a');
      // sarkaç: iki saniyede bir gidip gelir
      const swing = Math.sin((env.t / 1000) * Math.PI) * 1.6;
      const bx = Math.round(7.5 + swing);
      ctx.fillStyle = '#c9a24b';
      for (let y = 20; y < 31; y++) ctx.fillRect(r.x + Math.round(7.5 + (swing * (y - 19)) / 12), r.y + y, 1, 1);
      ctx.fillRect(r.x + bx - 1, r.y + 31, 3, 3);
      ctx.fillStyle = '#e3c26b';
      ctx.fillRect(r.x + bx - 1, r.y + 31, 1, 1);
    },
  };

  // Kaide üstünde klasik büst
  const BUSTS = ['#ece6da', '#a8743a', '#9aa1a9'];
  I.bust = {
    name: 'Bust',
    sw: 16,
    sh: 36,
    colors: BUSTS,
    colorNames: ['Marble', 'Bronze', 'Stone'],
    draw(p, c) {
      const b = BUSTS[c];
      const bl = shade(b, 0.18);
      const bd = shade(b, -0.2);
      // baş ve omuzlar
      ellipse(p, 8, 4.5, 3.6, 4.2, b);
      p(5, 1, 6, 2, bd);
      p(4, 2, 2, 3, bd);
      p(6, 3, 1, 1, bl);
      p(9, 5, 1, 1, bd);
      p(7, 5, 1, 1, bd);
      p(8, 6, 1, 1, bd);
      p(7, 8, 3, 3, b);
      ellipse(p, 8, 12.5, 6, 2.6, b);
      p(2, 12, 12, 2, b);
      p(3, 11, 4, 1, bl);
      p(6, 12, 4, 1, bd);
      p(5, 14, 6, 2, bd);
      // sütun kaide
      const m = '#e6e0d6';
      p(3, 16, 10, 2, shade(m, 0.08));
      p(4, 18, 8, 13, m);
      for (const x of [5, 8, 10]) p(x, 18, 1, 13, shade(m, -0.12));
      p(4, 18, 1, 13, shade(m, 0.12));
      p(3, 31, 10, 2, shade(m, -0.05));
      p(2, 33, 12, 3, shade(m, -0.18));
    },
  };

  // Tekerlekli kitap arabası
  I.bookCart = {
    name: 'Book cart',
    sw: 16,
    sh: 26,
    colors: WOOD,
    colorNames: WOOD_NAMES,
    draw(p, c) {
      const w = WOOD[c];
      const wd = shade(w, -0.22);
      p(1, 3, 2, 19, wd);
      p(13, 3, 2, 19, wd);
      p(0, 2, 16, 2, shade(w, 0.2));
      // üst raf: eğik dizili kitaplar
      books(p, 2, 14, 10, 7, 61 + c);
      p(1, 10, 14, 2, w);
      // alt raf
      books(p, 2, 14, 19, 6, 67 + c);
      p(1, 19, 14, 2, w);
      p(1, 21, 14, 1, wd);
      // tekerlekler
      p(2, 22, 3, 3, '#2a2629');
      p(11, 22, 3, 3, '#2a2629');
      p(3, 23, 1, 1, '#8a8f97');
      p(12, 23, 1, 1, '#8a8f97');
    },
  };

  // Yeşil camlı banker lambası (masa üstü)
  const GLASSES = [GREEN_GLASS, '#8c3b4a', '#2f4a6b'];
  I.bankerLamp = smallItem('Banker lamp', GLASSES, ['Green', 'Red', 'Blue'], (p, c) => {
    const g = GLASSES[c];
    p(3, 14, 10, 2, '#c9a24b');
    p(3, 14, 10, 1, '#e3c26b');
    p(7, 9, 2, 5, '#c9a24b');
    p(2, 5, 12, 4, g);
    p(3, 4, 10, 1, g);
    p(3, 5, 10, 1, shade(g, 0.3));
    p(2, 8, 12, 1, shade(g, -0.25));
    p(4, 9, 8, 1, '#fff2b0');
    p(12, 9, 1, 3, '#c9a24b');
  }, { glows: [nightGlow(8, 10, 24)] });

  // =====================================================================
  // ODA
  // =====================================================================
  // Masaya konan bilgisayar ekranı ve klavye; ekranda kod satırları
  const MONITORS = ['#3d424b', '#f2efe9'];
  I.monitor = smallItem('Computer screen', MONITORS, ['Black', 'White'], (p, c) => {
    const m = MONITORS[c];
    p(1, 0, 14, 10, m);
    p(2, 1, 12, 8, '#22303d');
    p(3, 2, 5, 1, '#9fd3c7');
    p(4, 4, 7, 1, '#f2c14e');
    p(4, 6, 4, 1, '#e59aa6');
    p(3, 7, 6, 1, '#9fd3c7');
    p(7, 10, 2, 2, shade(m, -0.15));
    p(5, 12, 6, 1, m);
    p(2, 14, 12, 2, '#c0c6cc');
    p(2, 14, 12, 1, '#e2e6e9');
  }, {
    glows: [nightGlow(8, 5, 18, { strength: 0.12, color: [170, 215, 255] })],
    over(ctx, r, item, env) {
      if (Math.floor(env.t / 530) % 2) return;
      ctx.fillStyle = '#f2efe9';
      ctx.fillRect(r.x + 10, r.y + 7, 1, 1);
    },
  });

  // Kademeli ahşap saksı standı
  I.plantStand = {
    name: 'Plant stand',
    sw: 16,
    sh: 34,
    colors: WOOD,
    colorNames: WOOD_NAMES,
    draw(p, c) {
      const w = WOOD[c];
      const wd = shade(w, -0.22);
      // ayaklar ve basamaklar
      p(1, 8, 2, 26, wd);
      p(13, 8, 2, 26, wd);
      for (const y of [11, 21, 31]) {
        p(0, y, 16, 2, w);
        p(0, y, 16, 1, shade(w, 0.2));
      }
      // üst: sarkan sarmaşık
      p(5, 6, 6, 5, '#c87b55');
      p(5, 6, 6, 1, shade('#c87b55', 0.2));
      ellipse(p, 8, 4, 4.5, 3, LEAF[1]);
      p(4, 7, 1, 7, LEAF[0]);
      p(3, 12, 2, 2, LEAF[1]);
      p(11, 7, 1, 5, LEAF[0]);
      p(11, 11, 2, 2, LEAF[2]);
      p(7, 1, 2, 2, LEAF[2]);
      // orta: iki küçük saksı
      p(2, 17, 5, 4, '#ece6da');
      p(9, 17, 5, 4, '#5f7c8a');
      ellipse(p, 4.5, 15.5, 2.6, 2.2, LEAF[2]);
      p(4, 13, 1, 2, LEAF[1]);
      ellipse(p, 11.5, 15.5, 2.2, 2.4, LEAF[0]);
      p(10, 14, 1, 1, '#e59aa6');
      p(12, 13, 1, 1, '#e59aa6');
      // alt: geniş yapraklı saksı
      p(4, 26, 8, 5, '#e3b766');
      p(4, 26, 8, 1, shade('#e3b766', 0.2));
      ellipse(p, 5, 23.5, 3, 2, LEAF[1]);
      ellipse(p, 11, 23, 3, 2.2, LEAF[0]);
      p(8, 21, 1, 5, LEAF[0]);
    },
  };

  // Hasır çamaşır sepeti
  const BASKETS = ['#c9a46a', '#e9e2d4', '#8a929c'];
  I.laundryBasket = {
    name: 'Laundry basket',
    sw: 16,
    sh: 18,
    colors: BASKETS,
    colorNames: ['Wicker', 'White', 'Gray'],
    draw(p, c) {
      const b = BASKETS[c];
      const bd = shade(b, -0.2);
      // taşan çamaşırlar
      p(3, 2, 5, 4, '#e59aa6');
      p(7, 1, 5, 4, '#5b7fa8');
      p(10, 3, 4, 3, '#f2efe9');
      p(2, 4, 3, 2, '#e3b766');
      p(8, 1, 2, 1, shade('#5b7fa8', 0.25));
      // örgü sepet
      p(1, 6, 14, 2, shade(b, 0.15));
      p(2, 8, 12, 9, b);
      for (let y = 9; y < 17; y += 2) p(2, y, 12, 1, bd);
      for (let x = 4; x < 14; x += 3) p(x, 8, 1, 9, shade(b, 0.08));
      p(0, 7, 2, 2, bd);
      p(14, 7, 2, 2, bd);
      p(2, 17, 12, 1, shade(b, -0.35));
    },
  };

  // ---------- Katalog sekmelerine ekle ----------
  const addTo = (tab, after, types) => {
    const list = Art.TABS[tab];
    const at = list.indexOf(after);
    list.splice(at < 0 ? list.length : at + 1, 0, ...types);
  };
  addTo('tables', 'cafeTable', ['booth']);
  addTo('tables', 'desk', ['studyCarrel']);
  addTo('small', 'tableLamp', ['bankerLamp', 'monitor']);
  addTo('small', 'breadBasket', ['cashRegister']);
  addTo('kitchen', 'coffeeCart', ['coffeeSacks']);
  addTo('storage', 'ladderShelf', ['bookCart']);
  addTo('storage', 'coatRack', ['laundryBasket']);
  addTo('plants', 'pampasVase', ['plantStand']);
  addTo('decor', 'globe', ['grandfatherClock', 'bust', 'menuSign']);
})();
