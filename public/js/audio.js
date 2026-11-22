/*
 * Sesler: ortam sesleri (yağmur, rüzgar, kar, cırcır böceği, şömine, kuşlar) ve ses efektleri.
 * Ses dosyası yok; hepsi Web Audio ile tarayıcıda üretilir. Ayarlar tarayıcıda saklanır.
 */
(() => {
  'use strict';

  const App = window.App;
  const KEY = 'pomodoro.sound';

  const AMBIENTS = [
    { id: 'rain', name: 'Rain' },
    { id: 'wind', name: 'Wind' },
    { id: 'snow', name: 'Snowfall' },
    { id: 'crickets', name: 'Crickets' },
    { id: 'fire', name: 'Fireplace' },
    { id: 'birds', name: 'Birds' },
  ];

  const clamp01 = (v, d) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : d;
  };

  function load() {
    const src = App.storage.get(KEY, null) || {};
    const amb = {};
    for (const a of AMBIENTS) {
      const s = (src.amb && src.amb[a.id]) || {};
      amb[a.id] = { on: s.on === true, vol: clamp01(s.vol, 0.6) };
    }
    return {
      master: clamp01(src.master, 0.8),
      sfxOn: src.sfxOn !== false,
      sfx: clamp01(src.sfx, 0.6),
      amb,
    };
  }

  const st = load();
  const save = () => App.storage.set(KEY, st);

  // ---------- Ses bağlamı ----------
  let ctx = null;
  let master = null;
  let sfxBus = null;
  let ambBus = null;
  const noise = {};
  const running = {};
  let unlocked = false;

  function makeNoise() {
    const len = ctx.sampleRate * 4;
    const make = () => ctx.createBuffer(1, len, ctx.sampleRate);
    noise.white = make();
    noise.pink = make();
    noise.brown = make();
    const w = noise.white.getChannelData(0);
    const pk = noise.pink.getChannelData(0);
    const br = noise.brown.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    let last = 0;
    for (let i = 0; i < len; i++) {
      const x = Math.random() * 2 - 1;
      w[i] = x;
      b0 = 0.99886 * b0 + x * 0.0555179;
      b1 = 0.99332 * b1 + x * 0.0750759;
      b2 = 0.969 * b2 + x * 0.153852;
      b3 = 0.8665 * b3 + x * 0.3104856;
      b4 = 0.55 * b4 + x * 0.5329522;
      b5 = -0.7616 * b5 - x * 0.016898;
      pk[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + x * 0.5362) * 0.11;
      b6 = x * 0.115926;
      last = (last + 0.02 * x) / 1.02;
      br[i] = last * 3.5;
    }
  }

  function ensure() {
    if (!ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      try {
        ctx = new Ctx();
      } catch {
        return null;
      }
      master = ctx.createGain();
      master.gain.value = st.master;
      master.connect(ctx.destination);
      sfxBus = ctx.createGain();
      sfxBus.gain.value = st.sfxOn ? st.sfx : 0;
      sfxBus.connect(master);
      ambBus = ctx.createGain();
      ambBus.connect(master);
      makeNoise();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  // ---------- Yapı taşları ----------
  const gainNode = (v) => {
    const g = ctx.createGain();
    g.gain.value = v;
    return g;
  };

  const filter = (type, freq, q) => {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    if (q !== undefined) f.Q.value = q;
    return f;
  };

  function loop(buf) {
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.start(0, Math.random() * 3);
    return s;
  }

  function chain(...nodes) {
    for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
    return nodes[nodes.length - 1];
  }

  function lfo(freq, depth, target) {
    const o = ctx.createOscillator();
    o.frequency.value = freq;
    const g = gainNode(depth);
    o.connect(g);
    g.connect(target);
    o.start();
    return o;
  }

  // Kısa gürültü patlaması (damla, çıtırtı, adım)
  function burst({ at, dur, gain, type = 'bandpass', freq = 1000, q = 1, buf = 'white', dest }) {
    const s = ctx.createBufferSource();
    s.buffer = noise[buf];
    const f = filter(type, freq, q);
    const g = gainNode(0);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), at + Math.min(0.01, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    chain(s, f, g, dest);
    s.start(at, Math.random() * 3, dur + 0.05);
  }

  // Ton (sinüs vb.), isteğe bağlı frekans kayması
  function tone({ at, dur, freq, to, gain, type = 'sine', dest, attack = 0.005 }) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, at);
    if (to) o.frequency.exponentialRampToValueAtTime(to, at + dur);
    const g = gainNode(0);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    chain(o, g, dest);
    o.start(at);
    o.stop(at + dur + 0.05);
  }

  // Rastgele aralıklarla olay planlayan zamanlayıcı
  function scheduler(everyMs, fn) {
    const id = setInterval(() => {
      if (ctx && ctx.state === 'running') fn(ctx.currentTime);
    }, everyMs);
    return () => clearInterval(id);
  }

  // ---------- Ortam sesleri ----------
  const BUILDERS = {
    rain(out) {
      const a = loop(noise.pink);
      chain(a, filter('highpass', 500), filter('lowpass', 7000), gainNode(0.45), out);
      const b = loop(noise.brown);
      chain(b, filter('lowpass', 450), gainNode(0.5), out);
      const stopDrops = scheduler(90, (now) => {
        const n = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < n; i++) {
          burst({ at: now + Math.random() * 0.09, dur: 0.02 + Math.random() * 0.03, gain: 0.05 + Math.random() * 0.12, freq: 2200 + Math.random() * 3500, q: 4, dest: out });
        }
      });
      return () => {
        stopDrops();
        a.stop();
        b.stop();
      };
    },
    wind(out) {
      const a = loop(noise.pink);
      const bp = filter('bandpass', 450, 0.7);
      const g = gainNode(0.7);
      chain(a, bp, g, out);
      const l1 = lfo(0.07, 260, bp.frequency);
      const l2 = lfo(0.11, 0.35, g.gain);
      const b = loop(noise.brown);
      chain(b, filter('lowpass', 250), gainNode(0.35), out);
      return () => {
        a.stop();
        b.stop();
        l1.stop();
        l2.stop();
      };
    },
    snow(out) {
      const a = loop(noise.brown);
      const g = gainNode(0.55);
      chain(a, filter('lowpass', 320), g, out);
      const l = lfo(0.05, 0.22, g.gain);
      const b = loop(noise.pink);
      chain(b, filter('highpass', 6000), gainNode(0.025), out);
      const stopTinkle = scheduler(700, (now) => {
        if (Math.random() < 0.3) tone({ at: now + Math.random() * 0.5, dur: 0.6, freq: 1800 + Math.random() * 1600, gain: 0.012, dest: out });
      });
      return () => {
        stopTinkle();
        a.stop();
        b.stop();
        l.stop();
      };
    },
    crickets(out) {
      const bed = loop(noise.brown);
      chain(bed, filter('lowpass', 300), gainNode(0.08), out);
      const voices = [0, 1, 2].map(() => ({ next: 0, freq: 4200 + Math.random() * 700, pan: Math.random() * 2 - 1 }));
      const stopChirps = scheduler(80, (now) => {
        for (const v of voices) {
          if (v.next > now + 0.2) continue;
          const at = Math.max(now, v.next);
          const pulses = 3 + Math.floor(Math.random() * 2);
          for (let k = 0; k < pulses; k++) {
            tone({ at: at + k * 0.04, dur: 0.025, freq: v.freq, gain: 0.05, dest: out, attack: 0.003 });
          }
          v.next = at + 0.55 + Math.random() * 0.7;
        }
      });
      return () => {
        stopChirps();
        bed.stop();
      };
    },
    fire(out) {
      const a = loop(noise.brown);
      const g = gainNode(0.6);
      chain(a, filter('lowpass', 380), g, out);
      const l = lfo(0.3, 0.12, g.gain);
      const b = loop(noise.pink);
      chain(b, filter('bandpass', 1300, 0.8), gainNode(0.05), out);
      const stopCrackle = scheduler(60, (now) => {
        if (Math.random() < 0.45) {
          const big = Math.random();
          burst({ at: now + Math.random() * 0.06, dur: 0.006 + big * 0.02, gain: 0.08 + big * big * 0.45, type: 'highpass', freq: 900 + Math.random() * 2500, dest: out });
        }
      });
      return () => {
        stopCrackle();
        a.stop();
        b.stop();
        l.stop();
      };
    },
    birds(out) {
      const stopSong = scheduler(400, (now) => {
        if (Math.random() > 0.35) return;
        let at = now + Math.random() * 0.3;
        const base = 2200 + Math.random() * 1600;
        const notes = 2 + Math.floor(Math.random() * 5);
        for (let k = 0; k < notes; k++) {
          const f = base * (0.85 + Math.random() * 0.35);
          const dur = 0.05 + Math.random() * 0.08;
          tone({ at, dur, freq: f, to: f * (Math.random() < 0.5 ? 1.35 : 0.75), gain: 0.06, dest: out, attack: 0.008 });
          at += dur + 0.03 + Math.random() * 0.07;
        }
      });
      const bed = loop(noise.pink);
      chain(bed, filter('bandpass', 900, 0.5), gainNode(0.02), out);
      return () => {
        stopSong();
        bed.stop();
      };
    },
  };

  function startAmbient(id) {
    if (running[id] || !ensure()) return;
    const out = gainNode(0);
    out.connect(ambBus);
    const stop = BUILDERS[id](out);
    out.gain.setTargetAtTime(st.amb[id].vol, ctx.currentTime, 0.4);
    running[id] = { out, stop };
  }

  function stopAmbient(id) {
    const r = running[id];
    if (!r) return;
    delete running[id];
    r.out.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
    setTimeout(() => {
      try {
        r.stop();
      } catch {
        /* zaten durmuş */
      }
      r.out.disconnect();
    }, 700);
  }

  // Tarayıcılar ses çalmayı bir kullanıcı etkileşimine kadar engeller
  function unlock() {
    if (unlocked) return;
    if (!ensure()) return;
    unlocked = true;
    for (const a of AMBIENTS) if (st.amb[a.id].on) startAmbient(a.id);
    window.removeEventListener('pointerdown', unlock, true);
    window.removeEventListener('keydown', unlock, true);
  }
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);

  // ---------- Ses efektleri ----------
  let stepSide = 0;

  function sfx(name) {
    if (!st.sfxOn || !unlocked || !ensure()) return;
    const t = ctx.currentTime + 0.005;
    const d = sfxBus;
    switch (name) {
      case 'step': {
        stepSide = 1 - stepSide;
        tone({ at: t, dur: 0.07, freq: 95 + stepSide * 14 + Math.random() * 10, to: 60, gain: 0.22, dest: d });
        burst({ at: t, dur: 0.04, gain: 0.07, type: 'lowpass', freq: 900, buf: 'pink', dest: d });
        break;
      }
      case 'sit':
        burst({ at: t, dur: 0.22, gain: 0.35, type: 'lowpass', freq: 450, buf: 'pink', dest: d });
        tone({ at: t, dur: 0.16, freq: 80, to: 55, gain: 0.2, dest: d });
        break;
      case 'lie':
        burst({ at: t, dur: 0.4, gain: 0.3, type: 'lowpass', freq: 350, buf: 'pink', dest: d });
        burst({ at: t + 0.12, dur: 0.35, gain: 0.12, type: 'bandpass', freq: 1200, q: 0.6, buf: 'pink', dest: d });
        break;
      case 'stand':
        burst({ at: t, dur: 0.12, gain: 0.16, type: 'lowpass', freq: 700, buf: 'pink', dest: d });
        break;
      case 'place':
        tone({ at: t, dur: 0.12, freq: 190, to: 110, gain: 0.38, dest: d });
        burst({ at: t, dur: 0.02, gain: 0.15, type: 'highpass', freq: 2200, dest: d });
        break;
      case 'pick':
        tone({ at: t, dur: 0.05, freq: 880, to: 1100, gain: 0.08, dest: d });
        break;
      case 'nudge':
        tone({ at: t, dur: 0.03, freq: 700, gain: 0.06, dest: d });
        break;
      case 'rotate': {
        const s = ctx.createBufferSource();
        s.buffer = noise.white;
        const bp = filter('bandpass', 600, 2);
        bp.frequency.setValueAtTime(600, t);
        bp.frequency.exponentialRampToValueAtTime(2600, t + 0.16);
        const g = gainNode(0);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.22, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        chain(s, bp, g, d);
        s.start(t, 0, 0.25);
        break;
      }
      case 'remove':
        tone({ at: t, dur: 0.12, freq: 520, to: 170, gain: 0.22, dest: d });
        break;
      case 'pet': {
        // mırlama + kısa "mrrp"
        const s = ctx.createBufferSource();
        s.buffer = noise.pink;
        const g = gainNode(0);
        const lp = filter('lowpass', 220);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.4, t + 0.1);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
        const am = ctx.createGain();
        am.gain.value = 0.5;
        lfo(26, 0.5, am.gain);
        chain(s, lp, am, g, d);
        s.start(t, 0, 1);
        tone({ at: t + 0.15, dur: 0.28, freq: 620, to: 840, gain: 0.07, type: 'triangle', dest: d, attack: 0.04 });
        break;
      }
      case 'bark':
        tone({ at: t, dur: 0.09, freq: 320, to: 210, gain: 0.22, type: 'triangle', dest: d, attack: 0.01 });
        burst({ at: t, dur: 0.08, gain: 0.12, type: 'bandpass', freq: 700, q: 1.5, buf: 'pink', dest: d });
        tone({ at: t + 0.16, dur: 0.08, freq: 300, to: 200, gain: 0.16, type: 'triangle', dest: d, attack: 0.01 });
        break;
      case 'piano': {
        const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
        const f = scale[Math.floor(Math.random() * scale.length)];
        tone({ at: t, dur: 1.1, freq: f, gain: 0.12, type: 'triangle', dest: d, attack: 0.004 });
        tone({ at: t, dur: 0.6, freq: f * 2, gain: 0.03, dest: d, attack: 0.004 });
        break;
      }
      case 'drum': {
        // davul: kick, trampet ya da zil
        const k = Math.random();
        if (k < 0.45) tone({ at: t, dur: 0.22, freq: 120, to: 45, gain: 0.45, dest: d, attack: 0.002 });
        else if (k < 0.8) {
          burst({ at: t, dur: 0.12, gain: 0.3, type: 'bandpass', freq: 1800, q: 0.7, dest: d });
          tone({ at: t, dur: 0.08, freq: 220, to: 160, gain: 0.15, type: 'triangle', dest: d, attack: 0.002 });
        } else burst({ at: t, dur: 0.5, gain: 0.14, type: 'highpass', freq: 6000, dest: d });
        break;
      }
      case 'punch':
        tone({ at: t, dur: 0.14, freq: 110, to: 60, gain: 0.4, dest: d, attack: 0.002 });
        burst({ at: t, dur: 0.08, gain: 0.25, type: 'lowpass', freq: 900, buf: 'pink', dest: d });
        break;
      case 'arcade':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone({ at: t + i * 0.07, dur: 0.07, freq: f, gain: 0.06, type: 'square', dest: d, attack: 0.002 }));
        break;
      case 'squeak':
        tone({ at: t, dur: 0.16, freq: 900, to: 1500, gain: 0.1, type: 'triangle', dest: d, attack: 0.01 });
        tone({ at: t + 0.18, dur: 0.12, freq: 1300, to: 1000, gain: 0.07, type: 'triangle', dest: d, attack: 0.01 });
        break;
      case 'vend':
        tone({ at: t, dur: 0.08, freq: 1200, gain: 0.06, dest: d });
        burst({ at: t + 0.3, dur: 0.18, gain: 0.3, type: 'lowpass', freq: 500, buf: 'pink', dest: d });
        tone({ at: t + 0.32, dur: 0.15, freq: 140, to: 80, gain: 0.3, dest: d });
        break;
      case 'click':
        tone({ at: t, dur: 0.025, freq: 1500, gain: 0.05, dest: d, attack: 0.002 });
        break;
      case 'message':
        tone({ at: t, dur: 0.08, freq: 880, gain: 0.12, dest: d });
        tone({ at: t + 0.08, dur: 0.12, freq: 1320, gain: 0.12, dest: d });
        break;
      case 'join':
        tone({ at: t, dur: 0.1, freq: 660, gain: 0.1, dest: d });
        tone({ at: t + 0.1, dur: 0.16, freq: 990, gain: 0.1, dest: d });
        break;
      case 'leave':
        tone({ at: t, dur: 0.1, freq: 990, gain: 0.08, dest: d });
        tone({ at: t + 0.1, dur: 0.16, freq: 660, gain: 0.08, dest: d });
        break;
      default:
    }
  }

  // Zamanlayıcı bitiş sesi: efektler kapalı olsa da çalar (ana ses düzeyine bağlı)
  function chime() {
    if (!ensure()) return;
    const t = ctx.currentTime;
    [
      [0, 880],
      [0.22, 880],
      [0.44, 1174.66],
    ].forEach(([o, f]) => tone({ at: t + o, dur: 0.35, freq: f, gain: 0.25, dest: master, attack: 0.02 }));
  }

  App.on('sfx', sfx);

  // Arayüz düğmelerinde hafif tık sesi
  document.addEventListener('click', (e) => {
    if (e.target instanceof Element && e.target.closest('button:not(.switch)')) sfx('click');
  });

  // ---------- Ayarlar API'si ----------
  function apply() {
    if (!ctx) return;
    master.gain.setTargetAtTime(st.master, ctx.currentTime, 0.05);
    sfxBus.gain.setTargetAtTime(st.sfxOn ? st.sfx : 0, ctx.currentTime, 0.05);
    for (const id of Object.keys(running)) running[id].out.gain.setTargetAtTime(st.amb[id].vol, ctx.currentTime, 0.1);
  }

  App.Audio = {
    AMBIENTS,
    settings: () => JSON.parse(JSON.stringify(st)),
    setMaster(v) {
      st.master = clamp01(v, st.master);
      save();
      apply();
    },
    setSfxOn(on) {
      st.sfxOn = Boolean(on);
      save();
      apply();
    },
    setSfx(v) {
      st.sfx = clamp01(v, st.sfx);
      save();
      apply();
    },
    setAmbient(id, on) {
      if (!st.amb[id]) return;
      st.amb[id].on = Boolean(on);
      save();
      unlock();
      if (on) startAmbient(id);
      else stopAmbient(id);
      App.emit('sound:changed');
    },
    setAmbientVol(id, v) {
      if (!st.amb[id]) return;
      st.amb[id].vol = clamp01(v, st.amb[id].vol);
      save();
      apply();
    },
    playing: () => AMBIENTS.some((a) => st.amb[a.id].on),
    weather: () => ({ rain: st.amb.rain.on, snow: st.amb.snow.on }),
    chime,
    sfx,
  };
})();
