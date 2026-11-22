(() => {
  'use strict';

  const App = (window.App = window.App || {});

  // localStorage erişilemezse (gizli pencere, engellenmiş çerezler) sessizce devam eder
  App.storage = {
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

  App.KEYS = {
    settings: 'pomodoro.settings',
    stats: 'pomodoro.stats',
    todos: 'pomodoro.todos',
    room: 'pomodoro.room', // eski sürüm (tek oda)
    venues: 'pomodoro.venues',
    venue: 'pomodoro.venue',
    player: 'pomodoro.player',
    history: 'pomodoro.history',
    focusTask: 'pomodoro.focusTask',
    music: 'pomodoro.music',
  };

  App.$ = (sel, root = document) => root.querySelector(sel);

  // Basit olay yayıncısı
  const listeners = Object.create(null);
  App.on = (name, fn) => {
    (listeners[name] || (listeners[name] = [])).push(fn);
  };
  App.emit = (name, data) => {
    (listeners[name] || []).forEach((fn) => fn(data));
  };

  App.isFormField = (el) =>
    el instanceof Element && Boolean(el.closest('input, textarea, select, [contenteditable="true"]'));

  App.newId = (prefix = 'i') => {
    const rand = Math.random().toString(36).slice(2, 7);
    return `${prefix}${Date.now().toString(36)}${rand}`.slice(0, 24);
  };

  let toastTimer = null;
  App.toast = (text, ms = 2800) => {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = text;
    el.hidden = false;
    el.classList.remove('show');
    // yeniden tetiklemek için reflow
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove('show');
      el.hidden = true;
    }, ms);
  };

  // ---------- Modal ----------
  let openModal = null;
  let lastFocus = null;

  App.openModal = (id) => {
    const modal = document.getElementById(id);
    if (!modal) return;
    if (openModal) App.closeModal();
    lastFocus = document.activeElement;
    modal.hidden = false;
    openModal = modal;
    const focusable = modal.querySelector('[data-autofocus]') || modal.querySelector('input, button');
    if (focusable) focusable.focus();
    App.emit('modal:open', id);
  };

  App.closeModal = () => {
    if (!openModal) return;
    const id = openModal.id;
    openModal.hidden = true;
    openModal = null;
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    App.emit('modal:close', id);
  };

  App.modalOpen = () => openModal !== null;

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openModal) {
      e.preventDefault();
      App.closeModal();
    }
  });

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    if (target.matches('.modal') || target.closest('[data-close-modal]')) App.closeModal();
  });
})();
