(() => {
  'use strict';

  // ---------- Storage (localStorage erişilemezse sessizce devam eder) ----------
  const storage = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* yoksay */
      }
    },
  };

  const KEYS = {
    settings: 'pomodoro.settings',
    stats: 'pomodoro.stats',
    todos: 'pomodoro.todos',
  };

  // ---------- Ayarlar ----------
  const DEFAULTS = { work: 25, short: 5, long: 15, interval: 4, autoStart: false, sound: true };

  const LIMITS = {
    work: [1, 180],
    short: [1, 60],
    long: [1, 90],
    interval: [1, 12],
  };

  function sanitizeSettings(input) {
    const src = input && typeof input === 'object' ? input : {};
    const out = {};
    for (const [key, [min, max]] of Object.entries(LIMITS)) {
      const n = Math.round(Number(src[key]));
      out[key] = Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : DEFAULTS[key];
    }
    out.autoStart = typeof src.autoStart === 'boolean' ? src.autoStart : DEFAULTS.autoStart;
    out.sound = typeof src.sound === 'boolean' ? src.sound : DEFAULTS.sound;
    return out;
  }

  let settings = sanitizeSettings(storage.get(KEYS.settings, DEFAULTS));

  // ---------- Günlük sayaç ----------
  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };

  let stats = storage.get(KEYS.stats, null);

  function todayCount() {
    if (!stats || stats.date !== todayKey() || !Number.isFinite(stats.count)) {
      stats = { date: todayKey(), count: 0 };
    }
    return stats.count;
  }

  function incrementToday() {
    stats = { date: todayKey(), count: todayCount() + 1 };
    storage.set(KEYS.stats, stats);
  }

  // ---------- Zamanlayıcı ----------
  const MODE_INFO = {
    work: { label: 'Odaklanma zamanı', title: 'Odaklan' },
    short: { label: 'Kısa mola', title: 'Kısa mola' },
    long: { label: 'Uzun mola', title: 'Uzun mola' },
  };

  const $ = (sel) => document.querySelector(sel);
  const timeEl = $('#time');
  const sessionEl = $('#session');
  const progressEl = $('#progress-bar');
  const startBtn = $('#start');
  const resetBtn = $('#reset');
  const skipBtn = $('#skip');
  const todayEl = $('#today-count');
  const modeBtns = document.querySelectorAll('.mode');
  const settingsForm = $('#settings-form');

  let mode = 'work';
  let remaining = duration(mode); // ms
  let endAt = null; // çalışırken bitiş zamanı (ms)
  let tickId = null;
  let endTimeoutId = null;

  function duration(m) {
    return settings[m] * 60 * 1000;
  }

  const isRunning = () => endAt !== null;

  function timeLeft() {
    return isRunning() ? Math.max(0, endAt - Date.now()) : remaining;
  }

  function format(ms) {
    const total = Math.ceil(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function clearTimers() {
    clearInterval(tickId);
    clearTimeout(endTimeoutId);
    tickId = null;
    endTimeoutId = null;
  }

  function start() {
    if (isRunning()) return;
    unlockAudio();
    askNotificationPermission();
    endAt = Date.now() + remaining;
    // Ekranı güncellemek için kısa aralıklı tick, bitişi kaçırmamak için ayrıca tek seferlik timeout
    tickId = setInterval(tick, 250);
    endTimeoutId = setTimeout(tick, remaining + 20);
    render();
  }

  function pause() {
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

  function tick() {
    if (!isRunning()) return;
    if (timeLeft() <= 0) finish();
    else renderTime();
  }

  function finish() {
    clearTimers();
    endAt = null;
    remaining = 0;

    let next;
    if (mode === 'work') {
      incrementToday();
      next = todayCount() % settings.interval === 0 ? 'long' : 'short';
      notify('Pomodoro tamamlandı', next === 'long' ? 'Uzun bir mola ver.' : 'Kısa bir mola ver.');
    } else {
      next = 'work';
      notify('Mola bitti', 'Odaklanma zamanı!');
    }
    if (settings.sound) playChime();
    setMode(next, settings.autoStart);
  }

  function setMode(next, autoStart = false) {
    clearTimers();
    endAt = null;
    mode = next;
    remaining = duration(mode);
    render();
    if (autoStart) start();
  }

  function reset() {
    setMode(mode);
  }

  function skip() {
    // Atlanan pomodoro sayılmaz
    setMode(mode === 'work' ? 'short' : 'work');
  }

  function renderTime() {
    const left = timeLeft();
    const total = duration(mode);
    const text = format(left);
    timeEl.textContent = text;
    progressEl.style.width = `${Math.min(100, (1 - left / total) * 100)}%`;
    document.title = isRunning() || left < total ? `${text} · ${MODE_INFO[mode].title}` : 'Pomodoro';
  }

  function render() {
    document.body.dataset.mode = mode;

    modeBtns.forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.mode === mode));
    });

    const left = timeLeft();
    startBtn.textContent = isRunning() ? 'Duraklat' : left < duration(mode) ? 'Devam et' : 'Başlat';

    const count = todayCount();
    sessionEl.textContent = mode === 'work' ? `#${count + 1} · ${MODE_INFO.work.label}` : MODE_INFO[mode].label;
    todayEl.textContent = `Bugün ${count} pomodoro`;

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
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
      }
    } catch {
      /* bazı mobil tarayıcılar desteklemez */
    }
  }

  // ---------- Ayarlar formu ----------
  function fillSettingsForm() {
    for (const key of Object.keys(LIMITS)) settingsForm.elements[key].value = settings[key];
    settingsForm.elements.autoStart.checked = settings.autoStart;
    settingsForm.elements.sound.checked = settings.sound;
  }

  settingsForm.addEventListener('change', () => {
    const wasFresh = !isRunning() && remaining === duration(mode);
    const els = settingsForm.elements;
    settings = sanitizeSettings({
      work: els.work.value,
      short: els.short.value,
      long: els.long.value,
      interval: els.interval.value,
      autoStart: els.autoStart.checked,
      sound: els.sound.checked,
    });
    storage.set(KEYS.settings, settings);
    fillSettingsForm();
    // Henüz başlamamış oturum yeni süreyi alır; devam eden/duraklatılmış oturum korunur
    if (wasFresh) remaining = duration(mode);
    else if (!isRunning()) remaining = Math.min(remaining, duration(mode));
    render();
  });

  settingsForm.addEventListener('submit', (e) => e.preventDefault());

  // ---------- Zamanlayıcı olayları ----------
  startBtn.addEventListener('click', toggle);
  resetBtn.addEventListener('click', reset);
  skipBtn.addEventListener('click', skip);

  modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.mode;
      if (next === mode) return;
      if (isRunning() && !window.confirm('Zamanlayıcı çalışıyor. Modu değiştirmek istediğine emin misin?')) return;
      setMode(next);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const target = e.target instanceof Element ? e.target : document.body;
    if (target.closest('input, textarea, select, button, summary, a, [contenteditable="true"]')) return;
    e.preventDefault();
    toggle();
  });

  // Sekme tekrar görünür olduğunda ekranı hemen güncelle
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) tick();
  });

  // ---------- Yapılacaklar ----------
  const todoForm = $('#todo-form');
  const todoInput = $('#todo-input');
  const todoList = $('#todo-list');
  const todoEmpty = $('#todo-empty');
  const todoFooter = $('#todo-footer');
  const todoCount = $('#todo-count');
  const clearDoneBtn = $('#clear-done');

  function loadTodos() {
    const data = storage.get(KEYS.todos, []);
    if (!Array.isArray(data)) return [];
    return data
      .filter((t) => t && typeof t.text === 'string' && t.text.trim())
      .map((t) => ({ id: String(t.id || newId()), text: t.text.trim().slice(0, 200), done: Boolean(t.done) }));
  }

  function newId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  let todos = loadTodos();

  const saveTodos = () => storage.set(KEYS.todos, todos);

  const DELETE_ICON =
    '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

  function createTodoItem(todo) {
    const li = document.createElement('li');
    li.className = 'todo-item';
    li.classList.toggle('done', todo.done);
    li.dataset.id = todo.id;

    const label = document.createElement('label');
    label.className = 'todo-label';

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'todo-check';
    check.checked = todo.done;

    const text = document.createElement('span');
    text.className = 'todo-text';
    text.textContent = todo.text;

    label.append(check, text);

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'todo-delete';
    del.setAttribute('aria-label', `Sil: ${todo.text}`);
    del.title = 'Sil';
    del.innerHTML = DELETE_ICON;

    li.append(label, del);
    return li;
  }

  function renderTodoMeta() {
    const left = todos.filter((t) => !t.done).length;
    const doneCount = todos.length - left;
    todoEmpty.hidden = todos.length > 0;
    todoFooter.hidden = todos.length === 0;
    todoCount.textContent = left === 0 ? 'Hepsi tamamlandı' : `${left} görev kaldı`;
    clearDoneBtn.hidden = doneCount === 0;
  }

  function renderTodos() {
    todoList.replaceChildren(...todos.map(createTodoItem));
    renderTodoMeta();
  }

  todoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = todoInput.value.trim();
    if (!text) return;
    const todo = { id: newId(), text: text.slice(0, 200), done: false };
    todos.push(todo);
    saveTodos();
    todoList.append(createTodoItem(todo));
    renderTodoMeta();
    todoInput.value = '';
    todoInput.focus();
  });

  todoList.addEventListener('change', (e) => {
    if (!e.target.classList.contains('todo-check')) return;
    const li = e.target.closest('.todo-item');
    const todo = todos.find((t) => t.id === li.dataset.id);
    if (!todo) return;
    todo.done = e.target.checked;
    li.classList.toggle('done', todo.done);
    saveTodos();
    renderTodoMeta();
  });

  todoList.addEventListener('click', (e) => {
    const del = e.target.closest('.todo-delete');
    if (!del) return;
    const li = del.closest('.todo-item');
    const neighbor = li.nextElementSibling || li.previousElementSibling;
    todos = todos.filter((t) => t.id !== li.dataset.id);
    saveTodos();
    li.remove();
    renderTodoMeta();
    // Klavye kullanıcıları için odağı mantıklı bir yere taşı
    const focusTarget = neighbor ? neighbor.querySelector('.todo-delete') : todoInput;
    focusTarget.focus();
  });

  clearDoneBtn.addEventListener('click', () => {
    todos = todos.filter((t) => !t.done);
    saveTodos();
    renderTodos();
    todoInput.focus();
  });

  // ---------- Başlat ----------
  fillSettingsForm();
  render();
  renderTodos();
})();
