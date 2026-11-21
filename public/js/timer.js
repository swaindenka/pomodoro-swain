/*
 * Pomodoro zamanlayıcı. Tek başına çalışırken yerel, bir odadayken sunucudaki ortak zamanlayıcıyı gösterir.
 */
(() => {
  'use strict';

  const App = window.App;
  const Sh = window.Shared;
  const { storage, KEYS, $ } = App;

  const MODE_INFO = {
    work: { label: 'Time to focus', title: 'Focus' },
    short: { label: 'Short break', title: 'Short break' },
    long: { label: 'Long break', title: 'Long break' },
  };
  const SHARED_KEYS = ['work', 'short', 'long', 'interval', 'autoStart'];

  let localSettings = Sh.sanitizeSettings(storage.get(KEYS.settings, Sh.DEFAULT_SETTINGS));
  let settings = { ...localSettings };
  let remote = null; // odadayken: { count }

  // ---------- Günlük sayaç ----------
  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };
  let stats = storage.get(KEYS.stats, null);

  function todayCount() {
    if (!stats || stats.date !== todayKey() || !Number.isFinite(stats.count)) stats = { date: todayKey(), count: 0 };
    return stats.count;
  }

  function incrementToday() {
    stats = { date: todayKey(), count: todayCount() + 1 };
    storage.set(KEYS.stats, stats);
  }

  // ---------- Durum ----------
  const timeEl = $('#time');
  const sessionEl = $('#session');
  const progressEl = $('#progress-bar');
  const startBtn = $('#start');
  const resetBtn = $('#reset');
  const skipBtn = $('#skip');
  const todayEl = $('#today-count');
  const sharedEl = $('#timer-shared');
  const modeBtns = document.querySelectorAll('.mode');
  const settingsForm = $('#settings-form');

  let mode = 'work';
  let remaining = duration('work');
  let endAt = null;
  let tickId = null;
  let endTimeoutId = null;

  function duration(m) {
    return Sh.durationMs(settings, m);
  }

  const isRunning = () => endAt !== null;
  const timeLeft = () => (isRunning() ? Math.max(0, endAt - Date.now()) : remaining);

  function format(ms) {
    const total = Math.ceil(ms / 1000);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  function clearTimers() {
    clearInterval(tickId);
    clearTimeout(endTimeoutId);
    tickId = null;
    endTimeoutId = null;
  }

  function startTicking() {
    clearTimers();
    tickId = setInterval(tick, 250);
    // Arka plan sekmelerinde aralıklar yavaşlar; bitişi kaçırmamak için tek seferlik zamanlayıcı
    if (!remote) endTimeoutId = setTimeout(tick, timeLeft() + 20);
  }

  function tick() {
    if (!isRunning()) return;
    if (timeLeft() <= 0 && !remote) finish();
    else renderTime();
  }

  // ---------- Eylemler ----------
  function send(action, extra) {
    if (!remote) return false;
    App.Net.send({ t: 'timer', action, ...extra });
    return true;
  }

  function start(userInitiated = true) {
    unlockAudio();
    askNotificationPermission();
    if (userInitiated && mode === 'work' && settings.autoDesk && App.Game) App.Game.goToDesk();
    if (send('start')) return;
    if (isRunning()) return;
    endAt = Date.now() + remaining;
    startTicking();
    render();
  }

  function pause() {
    if (send('pause')) return;
    if (!isRunning()) return;
    remaining = timeLeft();
    endAt = null;
    clearTimers();
    render();
  }

  function toggle() {
    if (isRunning()) pause();
    else start();
  }

  function setMode(next, autoStart = false) {
    clearTimers();
    endAt = null;
    mode = next;
    remaining = duration(mode);
    render();
    if (autoStart) start(false);
  }

  function reset() {
    if (send('reset')) return;
    setMode(mode);
  }

  function skip() {
    if (send('skip')) return;
    setMode(mode === 'work' ? 'short' : 'work');
  }

  function chooseMode(next) {
    if (send('mode', { mode: next })) return;
    setMode(next);
  }

  function finish() {
    clearTimers();
    endAt = null;
    const finished = mode;
    let next = 'work';
    if (mode === 'work') {
      incrementToday();
      next = Sh.nextMode('work', todayCount(), settings.interval);
    }
    setMode(next);
    announce(finished, next);
    if (settings.autoStart) start(false);
  }

  function announce(finished, next) {
    if (finished === 'work') {
      notify('Pomodoro complete', next === 'long' ? 'Take a long break.' : 'Take a short break.');
      App.toast('Pomodoro complete! Take a break on the sofa or in bed.', 4500);
    } else {
      notify('Break is over', 'Time to focus!');
      App.toast('Break is over, time to focus.', 3500);
    }
    if (settings.sound) playChime();
    App.emit('timer:finished', { finished, next });
  }

  // ---------- Çizim ----------
  function cycleCount() {
    return remote ? remote.count : todayCount();
  }

  function renderTime() {
    const left = timeLeft();
    const total = duration(mode);
    const text = format(left);
    timeEl.textContent = text;
    progressEl.style.width = `${Math.min(100, Math.max(0, (1 - left / total) * 100))}%`;
    document.title = isRunning() || left < total ? `${text} · ${MODE_INFO[mode].title}` : 'Pomodoro';
  }

  function render() {
    document.body.dataset.mode = mode;
    modeBtns.forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.mode === mode)));
    const left = timeLeft();
    startBtn.textContent = isRunning() ? 'Pause' : left < duration(mode) ? 'Resume' : 'Start';
    sessionEl.textContent = mode === 'work' ? `#${cycleCount() + 1} · ${MODE_INFO.work.label}` : MODE_INFO[mode].label;
    todayEl.textContent = `${todayCount()} pomodoro${todayCount() === 1 ? '' : 's'} today`;
    sharedEl.hidden = !remote;
    renderTime();
  }

  // ---------- Ses ve bildirim ----------
  let audioCtx = null;

  function unlockAudio() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch {
      audioCtx = null;
    }
  }

  function playChime() {
    if (App.Audio) {
      App.Audio.chime();
      return;
    }
    if (!audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      [
        [0, 880],
        [0.22, 880],
        [0.44, 1174.66],
      ].forEach(([offset, freq]) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.35);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.4);
      });
    } catch {
      /* yoksay */
    }
  }

  function askNotificationPermission() {
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        const result = Notification.requestPermission();
        if (result && typeof result.catch === 'function') result.catch(() => {});
      }
    } catch {
      /* yoksay */
    }
  }

  function notify(title, body) {
    try {
      if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
        new Notification(title, { body });
      }
    } catch {
      /* bazı tarayıcılar desteklemez */
    }
  }

  // ---------- Ayarlar ----------
  function fillSettingsForm() {
    for (const key of Object.keys(Sh.SETTING_LIMITS)) settingsForm.elements[key].value = settings[key];
    settingsForm.elements.autoStart.checked = settings.autoStart;
    settingsForm.elements.sound.checked = settings.sound;
    settingsForm.elements.autoDesk.checked = settings.autoDesk;
  }

  settingsForm.addEventListener('change', () => {
    const els = settingsForm.elements;
    const next = Sh.sanitizeSettings({
      work: els.work.value,
      short: els.short.value,
      long: els.long.value,
      interval: els.interval.value,
      autoStart: els.autoStart.checked,
      sound: els.sound.checked,
      autoDesk: els.autoDesk.checked,
    });
    // Ses ve masaya geçme her zaman kişisel ayardır
    localSettings = { ...localSettings, sound: next.sound, autoDesk: next.autoDesk };
    if (remote) {
      settings = { ...settings, sound: next.sound, autoDesk: next.autoDesk };
      storage.set(KEYS.settings, localSettings);
      const shared = {};
      for (const key of SHARED_KEYS) shared[key] = next[key];
      App.Net.send({ t: 'settings', settings: shared });
      return;
    }
    const wasFresh = !isRunning() && remaining === duration(mode);
    localSettings = next;
    settings = { ...next };
    storage.set(KEYS.settings, localSettings);
    fillSettingsForm();
    if (wasFresh) remaining = duration(mode);
    else if (!isRunning()) remaining = Math.min(remaining, duration(mode));
    render();
  });

  settingsForm.addEventListener('submit', (e) => e.preventDefault());

  // ---------- Olaylar ----------
  startBtn.addEventListener('click', toggle);
  resetBtn.addEventListener('click', reset);
  skipBtn.addEventListener('click', skip);

  let pendingMode = null;
  let pendingTimer = null;
  modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.mode;
      if (next === mode) return;
      if (isRunning() && pendingMode !== next) {
        pendingMode = next;
        App.toast('The timer is running. Click again to switch.');
        clearTimeout(pendingTimer);
        pendingTimer = setTimeout(() => {
          pendingMode = null;
        }, 3000);
        return;
      }
      pendingMode = null;
      chooseMode(next);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || e.repeat || e.ctrlKey || e.metaKey || e.altKey || App.modalOpen()) return;
    const target = e.target instanceof Element ? e.target : document.body;
    if (target.closest('input, textarea, select, button, summary, a, [contenteditable="true"]')) return;
    e.preventDefault();
    toggle();
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) tick();
  });

  // ---------- Oda (ortak zamanlayıcı) ----------
  function applyRemote(ts, meta = {}) {
    if (!ts || !Sh.MODES.includes(ts.mode)) return;
    const shared = Sh.sanitizeSettings(ts.settings);
    remote = { count: Number.isFinite(ts.count) ? ts.count : 0 };
    settings = { ...localSettings };
    for (const key of SHARED_KEYS) settings[key] = shared[key];
    mode = ts.mode;
    remaining = Math.max(0, Number(ts.remaining) || 0);
    endAt = ts.running ? Date.now() + remaining : null;
    clearTimers();
    if (endAt) startTicking();
    fillSettingsForm();
    render();
    if (meta.event === 'finished' && Sh.MODES.includes(meta.finished)) {
      if (meta.finished === 'work') incrementToday();
      announce(meta.finished, mode);
      render();
    }
  }

  function useLocal() {
    remote = null;
    settings = { ...localSettings };
    clearTimers();
    endAt = null;
    mode = 'work';
    remaining = duration('work');
    fillSettingsForm();
    render();
  }

  App.Timer = {
    isRunning,
    isFocusRunning: () => isRunning() && mode === 'work',
    mode: () => mode,
    localSettings: () => {
      const out = {};
      for (const key of SHARED_KEYS) out[key] = localSettings[key];
      return out;
    },
    applyRemote,
    useLocal,
    start: () => start(),
  };

  fillSettingsForm();
  render();
})();
