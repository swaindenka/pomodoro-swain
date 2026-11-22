/*
 * Oturum günlüğü: pomodoro bitince "ne yaptın?" diye tek satırlık bir not istenir.
 * Notlar tarayıcıda saklanır ve istatistik penceresindeki haftalık özette gün gün listelenir.
 */
(() => {
  'use strict';

  const App = window.App;
  const { storage, KEYS, $, t } = App;

  const TEXT_MAX = 120;
  const KEEP_DAYS = 120;
  const KEEP_MAX = 600;

  const form = $('#log-prompt');
  const input = $('#log-input');
  const question = $('#log-question');
  const daysEl = $('#log-days');
  const emptyEl = $('#log-empty');
  const copyBtn = $('#log-copy');
  const statsModal = $('#modal-stats');

  const clean = (v) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, TEXT_MAX) : '');

  function load() {
    const raw = storage.get(KEYS.log, []);
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((e) => e && Number.isFinite(e.at) && clean(e.text))
      .map((e) => ({
        id: typeof e.id === 'string' ? e.id : App.newId('l'),
        at: e.at,
        text: clean(e.text),
        task: clean(e.task) || null,
        min: Number.isFinite(e.min) && e.min > 0 ? Math.min(Math.round(e.min), 999) : 0,
      }))
      .sort((a, b) => a.at - b.at);
  }

  let log = load();

  function save() {
    const cutoff = Date.now() - KEEP_DAYS * 86400000;
    log = log.filter((e) => e.at >= cutoff).slice(-KEEP_MAX);
    storage.set(KEYS.log, log);
  }

  // ---------- "Ne yaptın?" sorusu ----------
  let pending = null; // { at, task, min }
  const canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;

  function ask() {
    const task = App.Todos && App.Todos.focused();
    pending = { at: Date.now(), task: task ? task.text : null, min: App.Timer.workMinutes() };
    question.textContent = task ? t('Pomodoro done! What did you get done on “{task}”?', { task: task.text }) : t('Pomodoro done! What did you get done?');
    input.value = '';
    form.hidden = false;
    form.classList.remove('log-saved');
    // masaüstünde hemen yazılabilsin (telefonda klavye kendiliğinden açılmasın)
    const active = document.activeElement;
    const busy = active && active !== document.body && App.isFormField(active);
    if (canHover && !busy && !App.modalOpen() && !document.hidden) input.focus({ preventScroll: true });
  }

  function close() {
    pending = null;
    form.hidden = true;
    if (document.activeElement === input) input.blur();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = clean(input.value);
    if (!text || !pending) {
      input.focus();
      return;
    }
    log.push({ id: App.newId('l'), at: pending.at, text, task: pending.task, min: pending.min });
    save();
    close();
    App.emit('journal:changed');
    App.toast(t('Saved to your log. See the whole week in your focus stats.'), 2800);
    App.emit('sfx', 'pick');
    if (!statsModal.hidden) render();
  });

  $('#log-skip').addEventListener('click', close);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  });

  App.on('timer:finished', ({ finished }) => {
    if (finished === 'work') ask();
  });

  // Yeni odak oturumuna geçilirken yanıtlanmamış (boş) soru kapanır
  App.on('timer:mode', (mode) => {
    if (mode === 'work' && pending && !clean(input.value) && document.activeElement !== input) close();
  });

  // ---------- Haftalık özet ----------
  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const timeOf = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const I18N = App.i18n;

  function weekStart() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - 6);
    return d;
  }

  function dayLabel(d) {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (dayKey(d) === dayKey(today)) return t('Today');
    if (dayKey(d) === dayKey(yesterday)) return t('Yesterday');
    return I18N.dateLabel(d, { month: 'short' });
  }

  // Son 7 günün notları, günlere ayrılmış (en yeni gün üstte)
  function weekGroups() {
    const from = weekStart().getTime();
    const groups = new Map();
    for (const e of log) {
      if (e.at < from) continue;
      const d = new Date(e.at);
      const k = dayKey(d);
      if (!groups.has(k)) groups.set(k, { date: d, entries: [] });
      groups.get(k).entries.push(e);
    }
    return [...groups.values()].sort((a, b) => b.date - a.date);
  }

  const DELETE_ICON =
    '<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

  function render() {
    const groups = weekGroups();
    emptyEl.hidden = groups.length > 0;
    copyBtn.hidden = groups.length === 0;
    daysEl.replaceChildren(
      ...groups.map((g) => {
        const sec = document.createElement('section');
        sec.className = 'log-day';
        const h = document.createElement('h4');
        h.className = 'log-day-title';
        h.textContent = dayLabel(g.date);
        const count = document.createElement('span');
        count.className = 'log-day-count';
        count.textContent = App.tn(g.entries.length, '{n} note', '{n} notes');
        h.append(count);
        const ol = document.createElement('ol');
        ol.className = 'log-list';
        ol.append(
          ...g.entries.map((e) => {
            const li = document.createElement('li');
            li.className = 'log-entry';
            li.dataset.id = e.id;
            const time = document.createElement('time');
            time.className = 'log-time';
            time.dateTime = new Date(e.at).toISOString();
            time.textContent = timeOf(new Date(e.at));
            const body = document.createElement('span');
            body.className = 'log-text';
            body.textContent = e.text;
            if (e.task) {
              const task = document.createElement('span');
              task.className = 'log-task';
              task.textContent = e.task;
              body.append(' ', task);
            }
            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'log-delete';
            del.setAttribute('aria-label', t('Delete note: {text}', { text: e.text }));
            del.title = t('Delete note');
            del.innerHTML = DELETE_ICON;
            li.append(time, body, del);
            return li;
          }),
        );
        sec.append(h, ol);
        return sec;
      }),
    );
  }

  daysEl.addEventListener('click', (e) => {
    const del = e.target.closest('.log-delete');
    if (!del) return;
    const id = del.closest('.log-entry').dataset.id;
    log = log.filter((x) => x.id !== id);
    save();
    render();
    App.emit('journal:changed');
    (copyBtn.hidden ? statsModal.querySelector('[data-close-modal]') : copyBtn).focus();
  });

  // Haftalık özeti düz metin olarak kopyala (öğretmene, ekibe ya da kendine göndermek için)
  function summaryText() {
    const start = weekStart();
    const end = new Date();
    const range = `${I18N.dateLabel(start, { weekday: false, month: 'short' })} – ${I18N.dateLabel(end, { weekday: false, month: 'short' })}`;
    const lines = [t('My focus week ({range})', { range })];
    const stats = App.Stats && App.Stats.week ? App.Stats.week() : null;
    if (stats) lines.push(`${App.tn(stats.pomodoros, '{n} pomodoro', '{n} pomodoros')} · ${stats.time}${stats.streak ? t(' · {n}-day streak', { n: stats.streak }) : ''}`);
    for (const g of weekGroups().reverse()) {
      lines.push('', dayLabel(g.date));
      for (const e of g.entries) lines.push(`- ${timeOf(new Date(e.at))} ${e.text}${e.task ? ` (${e.task})` : ''}`);
    }
    return lines.join('\n');
  }

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(summaryText());
      App.toast(t('Weekly summary copied.'));
    } catch {
      App.toast(t("Couldn't copy. Your browser blocked the clipboard."), 3200);
    }
  });

  App.on('modal:open', (id) => {
    if (id === 'modal-stats') render();
  });

  App.Journal = { entries: () => log.map((e) => ({ ...e })), summaryText, render };
})();
