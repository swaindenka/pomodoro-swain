/*
 * Yeni evcil hayvanlar: odada dolaşan tavşan, kafeste şakıyan kuş, masaya konan balık fanusu.
 * Akvaryum ve fanustaki balıklar yemlenebilir; tıklayınca yem serpilir, balıklar yüzeye çıkar.
 */
(() => {
  'use strict';

  const App = window.App;
  const Art = App.Art;
  const { shade, ellipse, LEAF } = Art;
  const I = Art.ITEMS;

  // Yemleme / kullanma anından bu yana geçen süre (saniye); hiç kullanılmadıysa büyük bir sayı
  const sinceUsed = (env, item) => {
    const at = env.used && env.used.get(item.id);
    return at ? (env.t - at) / 1000 : 99;
  };
  // 0 → 1 → 0: yem atılınca balıkların yüzeye çıkma isteği
  const feedK = (age) => (age > 7 ? 0 : Math.min(1, age / 0.6) * Math.min(1, (7 - age) / 1.5));

  // Suyun yüzeyinde dağılan ve yavaşça batan yem taneleri
  function flakes(ctx, x0, w, surface, age, seed) {
    if (age > 6) return;
    ctx.fillStyle = '#e8b46a';
    for (let i = 0; i < 6; i++) {
      const eaten = age > 2.2 + i * 0.5;
      if (eaten) continue;
      const fx = x0 + ((i * 7 + seed * 3) % w);
      const fy = surface + Math.min(6, age * (0.8 + (i % 3) * 0.4));
      ctx.fillRect(Math.round(fx + Math.sin(age * 2 + i)), Math.round(fy), 1, 1);
    }
  }

  // =====================================================================
  // TAVŞAN (dolaşan evcil hayvan)
  // =====================================================================
  const BUNNIES = ['#f2efe9', '#b9875a', '#9aa1a9', '#3d3a3f'];
  const BASKET = '#b4825a';
  const HAY = '#e3c26b';

  I.rabbit = {
    name: 'Rabbit',
    sw: 16,
    sh: 14,
    colors: BUNNIES,
    colorNames: ['White', 'Brown', 'Gray', 'Dutch'],
    use: 'pet',
    petSfx: 'nibble',
    draw(p, c) {
      const col = BUNNIES[c];
      const dark = shade(col, c === 3 ? 0.3 : -0.2);
      this.empty(p);
      // kıvrılıp uyuyan tavşan: kulaklar sırtına yatmış
      ellipse(p, 9, 7.5, 5.2, 3.2, col);
      ellipse(p, 4.5, 7.2, 2.8, 2.5, c === 3 ? '#f2efe9' : col);
      p(6, 4, 6, 2, dark);
      p(7, 3, 5, 1, dark);
      p(3, 7, 1, 1, '#2b2230');
      p(2, 8, 1, 1, '#f0a3a0');
      p(13, 6, 2, 2, '#ffffff');
      if (c === 3) p(8, 5, 5, 4, '#3d3a3f');
    },
    empty(p) {
      ellipse(p, 8, 10, 8, 3.6, BASKET);
      ellipse(p, 8, 9.4, 6.6, 2.6, HAY);
      for (const [x, y] of [[3, 9], [7, 8], [11, 9], [5, 10], [12, 10]]) p(x, y, 2, 1, shade(HAY, -0.18));
      p(2, 11, 12, 1, shade(BASKET, -0.2));
      for (let x = 1; x < 15; x += 3) p(x, 10, 1, 2, shade(BASKET, 0.15));
      // havuç
      p(12, 7, 3, 1, '#e8853a');
      p(14, 6, 1, 1, '#6fa268');
    },
  };

  // =====================================================================
  // KAFESTE KUŞ
  // =====================================================================
  const BIRDS = ['#f2d64e', '#7fc4e0', '#8cc07f', '#f2efe9'];
  const CAGE = '#c9a24b';

  // Kuşun kafesteki tünekleri: [x, y] (kuşun ayak noktası, sprite koordinatında)
  const PERCHES = [[5, 15], [11, 12], [8, 19]];

  function drawBird(ctx, x, y, col, opts) {
    const { flap, sing, dir } = opts;
    const px = (dx, dy, w, h, c) => {
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(x + (dir < 0 ? -dx - w + 1 : dx)), Math.round(y + dy), w, h);
    };
    const dark = shade(col, -0.25);
    px(-2, -5, 4, 4, col); // gövde
    px(-1, -7, 3, 3, col); // baş
    px(1, -6, 1, 1, '#2b2230'); // göz
    px(2, -5, sing ? 2 : 1, 1, '#f08a3c'); // gaga
    if (sing) px(2, -4, 1, 1, '#f08a3c');
    px(-3, -3, 2, 1, dark); // kuyruk
    if (flap) px(-2, -7, 2, 2, dark);
    else px(-2, -4, 2, 2, dark); // kanat
    px(-1, -1, 1, 1, '#c97a3a');
    px(1, -1, 1, 1, '#c97a3a');
  }

  I.birdCage = {
    name: 'Bird cage',
    sw: 16,
    sh: 34,
    colors: BIRDS,
    colorNames: ['Canary', 'Budgie', 'Green finch', 'Dove'],
    use: 'pet',
    petSfx: 'chirp',
    useGlyph: '♪',
    useColor: '#5b7fa8',
    noOutline: true,
    draw(p) {
      const d = shade(CAGE, -0.3);
      // ayak
      p(4, 32, 8, 2, d);
      p(5, 31, 6, 1, CAGE);
      p(7, 23, 2, 8, CAGE);
      p(8, 23, 1, 8, d);
      // tepsi
      p(1, 21, 14, 2, CAGE);
      p(1, 22, 14, 1, d);
      p(2, 20, 12, 1, '#e8dcc0');
      // kubbe ve çubuklar
      p(7, 0, 2, 1, d);
      p(6, 1, 1, 1, d);
      p(9, 1, 1, 1, d);
      p(5, 2, 6, 1, CAGE);
      p(3, 3, 10, 1, CAGE);
      p(2, 4, 12, 1, CAGE);
      for (const x of [1, 4, 7, 10, 14]) p(x, x === 1 || x === 14 ? 5 : 4, 1, x === 1 || x === 14 ? 15 : 16, x === 14 ? d : CAGE);
      p(1, 11, 14, 1, shade(CAGE, -0.12));
      // tünekler
      p(3, 15, 5, 1, '#7a5236');
      p(9, 12, 5, 1, '#7a5236');
      // salıncak
      p(6, 5, 1, 13, '#8a8f97');
      p(10, 5, 1, 13, '#8a8f97');
      p(6, 19, 5, 1, '#7a5236');
      // yem ve su kabı
      p(2, 18, 3, 2, '#f2efe9');
      p(2, 18, 3, 1, '#e3b766');
      p(11, 18, 3, 2, '#9fc6e0');
    },
    // kuş çubukların arkasında çizilir
    under(ctx, r, item, env) {
      const col = BIRDS[item.c] || BIRDS[0];
      if (env.thumb) {
        drawBird(ctx, r.x + 5, r.y + 15, col, { dir: 1 });
        return;
      }
      const t = env.t / 1000;
      const seed = (item.x * 7 + item.y * 13) % 5;
      const age = sinceUsed(env, item);
      const singing = age < 3;
      // birkaç saniyede bir tünekler arasında zıplar
      const slot = Math.floor((t + seed) / 3.2);
      const local = (t + seed) % 3.2;
      const from = PERCHES[(slot * 2 + seed) % PERCHES.length];
      const to = PERCHES[((slot + 1) * 2 + seed) % PERCHES.length];
      let [bx, by] = from;
      let flap = false;
      if (local > 2.8) {
        const k = (local - 2.8) / 0.4;
        bx = from[0] + (to[0] - from[0]) * k;
        by = from[1] + (to[1] - from[1]) * k - Math.sin(k * Math.PI) * 3;
        flap = Math.floor(env.t / 70) % 2 === 0;
      } else if (from === PERCHES[2]) {
        // salıncakta hafifçe sallanır
        bx += Math.round(Math.sin(t * 2.4));
      }
      const dir = to[0] >= from[0] ? 1 : -1;
      drawBird(ctx, r.x + bx, r.y + by, col, { flap, sing: singing && Math.floor(env.t / 160) % 2 === 0, dir });
    },
  };

  // =====================================================================
  // BALIK FANUSU (masa ve raf üstü)
  // =====================================================================
  const FISH = ['#f08a3c', '#5b7fa8', '#e05d6f', '#f2efe9'];

  I.fishBowl = {
    name: 'Fish bowl',
    sw: 16,
    sh: 16,
    colors: FISH,
    colorNames: ['Goldfish', 'Betta', 'Red', 'Calico'],
    use: 'feed',
    petSfx: 'bubble',
    useGlyph: '•',
    useColor: '#e8b46a',
    glows: [{ x: 8, y: 9, r: 14, when: 'always', strength: 0.08, color: [90, 190, 230] }],
    draw(p) {
      ellipse(p, 8, 9.5, 7.5, 6.5, '#cfe9f5');
      ellipse(p, 8, 10, 6.5, 5.5, '#6fb7d6');
      p(2, 6, 12, 1, '#9fd3ea');
      p(4, 4, 8, 1, '#cfe9f5');
      p(3, 3, 10, 1, '#e7f4fa');
      ellipse(p, 8, 14, 5, 1.4, '#d9c29a');
      p(5, 13, 1, 1, '#c87b55');
      p(10, 14, 1, 1, '#8a8f97');
      p(11, 9, 1, 5, LEAF[1]);
      p(12, 10, 1, 3, LEAF[0]);
      p(3, 8, 1, 2, '#ffffff');
    },
    over(ctx, r, item, env) {
      const col = FISH[item.c] || FISH[0];
      const t = env.t / 1000;
      const age = env.thumb ? 99 : sinceUsed(env, item);
      const k = feedK(age);
      flakes(ctx, r.x + 4, 8, r.y + 7, age, item.x);
      const sx = Math.sin(t * 0.9 + item.x);
      const x = Math.round(r.x + 7 + sx * 3);
      const y = Math.round(r.y + 10 + Math.sin(t * 1.7) * 1 - k * 2.5);
      const right = Math.cos(t * 0.9 + item.x) > 0;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 3, 2);
      ctx.fillRect(x + (right ? -1 : 3), y - 1 + (Math.floor(env.t / 200) % 2), 1, 2);
      ctx.fillStyle = '#2b2230';
      ctx.fillRect(x + (right ? 2 : 0), y, 1, 1);
      if (item.c === 3) {
        ctx.fillStyle = '#f08a3c';
        ctx.fillRect(x + 1, y + 1, 1, 1);
      }
      // kabarcık
      const ph = ((t * 0.6 + item.x * 0.3) % 1 + 1) % 1;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.fillRect(Math.round(x + (right ? 3 : -1)), Math.round(y - 1 - ph * 4), 1, 1);
    },
  };

  // ---------- Akvaryum: yemlenebilir ----------
  const AQUA_FISH = [['#f08a3c', 0], ['#f2c14e', 2.1], ['#e05d6f', 4.2]];
  Object.assign(I.aquarium, {
    use: 'feed',
    petSfx: 'bubble',
    useGlyph: '•',
    useColor: '#e8b46a',
    over(ctx, r, item, env) {
      const t = env.t / 1000;
      const age = env.thumb ? 99 : sinceUsed(env, item);
      const k = feedK(age);
      flakes(ctx, r.x + 10, 12, r.y + 4, age, item.x);
      AQUA_FISH.forEach(([col, ph], i) => {
        const nx = 14 + Math.sin(t * 0.6 + ph) * 11;
        const ny = 6 + i * 3 + Math.sin(t * 1.3 + ph);
        const x = Math.round(nx + (11 + i * 4 - nx) * k * 0.8);
        const y = Math.round(ny + (5 - ny) * k);
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
  });
  if (I.aquarium.views && I.aquarium.views[1]) {
    I.aquarium.views[1].over = (ctx, r, item, env) => {
      const t = env.t / 1000;
      const age = sinceUsed(env, item);
      const k = feedK(age);
      flakes(ctx, r.x + 3, 10, r.y + 5, age, item.y);
      AQUA_FISH.forEach(([col, ph], i) => {
        const ny = 15 + Math.sin(t * 0.5 + ph) * 10;
        const y = Math.round(ny + (6 - ny) * k);
        const x = 4 + i * 3 + Math.round(Math.sin(t * 1.2 + ph));
        ctx.fillStyle = col;
        ctx.fillRect(r.x + x, r.y + y, 2, 3);
      });
    };
  }

  // ---------- Dolaşırken kullanılan tavşan kareleri ----------
  Art.PET_ART.rabbit = {
    colors: BUNNIES,
    walk: { w: 15, h: 13 },
    sit: { w: 12, h: 16 },
    // sola bakan, zıplarken gerilen / toplanan gövde
    drawWalk(p, c, frame) {
      const col = this.colors[c];
      const dark = shade(col, c === 3 ? 0.3 : -0.2);
      const inner = '#f0a3a0';
      if (frame) {
        // havada: gövde uzar, arka ayaklar geride
        ellipse(p, 8, 7.5, 5.5, 3, col);
        ellipse(p, 3.5, 6, 2.6, 2.3, col);
        p(3, 0, 2, 5, col);
        p(5, 1, 2, 4, dark);
        p(3, 1, 1, 3, inner);
        p(13, 8, 2, 2, '#ffffff');
        p(2, 9, 2, 2, col);
        p(12, 10, 3, 1, dark);
      } else {
        // yerde: toplanmış gövde
        ellipse(p, 8, 8, 4.5, 3.4, col);
        ellipse(p, 3.5, 6.5, 2.6, 2.3, col);
        p(3, 1, 2, 5, col);
        p(5, 2, 2, 4, dark);
        p(3, 2, 1, 3, inner);
        p(12, 7, 2, 2, '#ffffff');
        p(4, 11, 3, 1, dark);
        p(9, 11, 4, 1, dark);
      }
      p(2, 6, 1, 1, '#2b2230');
      p(1, 7, 1, 1, inner);
      if (c === 3) p(7, 6, 4, 4, '#3d3a3f');
    },
    drawSit(p, c, frame) {
      const col = this.colors[c];
      const dark = shade(col, c === 3 ? 0.3 : -0.2);
      const inner = '#f0a3a0';
      p(3, 0, 2, 6, col);
      p(7, 0, 2, 6, col);
      p(3, 1, 1, 4, inner);
      p(8, 1, 1, 4, inner);
      ellipse(p, 6, 7.5, 3.6, 3, c === 3 ? '#f2efe9' : col);
      ellipse(p, 6, 12, 4.6, 3.8, col);
      p(4, 7, 1, 1, '#2b2230');
      p(7, 7, 1, 1, '#2b2230');
      p(5, 8 + (frame ? 1 : 0), 2, 1, inner);
      p(3, 15, 2, 1, dark);
      p(7, 15, 2, 1, dark);
      p(5, 11, 2, 3, shade(col, 0.15));
      if (c === 3) p(2, 10, 3, 4, '#3d3a3f');
    },
  };
  Art.PET_KINDS = Object.keys(Art.PET_ART);
})();
