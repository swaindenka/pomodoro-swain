/*
 * Takvim: ay görünümü ve seçilen günün notları.
 * - Her güne saatli ya da saatsiz notlar (etkinlik, hatırlatma) eklenir; çift tıklayınca düzenlenir.
 * - O gün teslimi olan görevler, o günkü pomodorolar ve oturum günlüğü de günün altında görünür.
 * - Saatli notlar, sayfa açıkken o saat gelince hatırlatılır.
 * Veriler yalnızca tarayıcıda saklanır.
 */
(() => {
  'use strict';

  const App = window.App;
  const { storage, $ } = App;
  const tr = App.t;
  const I18N = App.i18n;
  const KEY = 'pomodoro.calendar';
  const TEXT_MAX = 160;
  const KEEP_MAX = 3000;

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
  const pad = (n) => String(n).padStart(2, '0');
  const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseDay = (k) => new Date(`${k}T12:00:00`);
  const clean = (v) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, TEXT_MAX) : '');
  const hours = (m) => I18N.duration(m);
  const pomodoros = (n) => App.tn(n, '{n} pomodoro', '{n} pomodoros');

  function load() {
    const raw = storage.get(KEY, []);
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((e) => e && DATE_RE.test(e.date) && clean(e.text))
      .slice(-KEEP_MAX)
      .map((e) => ({ id: typeof e.id === 'string' ? e.id : App.newId('c'), date: e.date, time: TIME_RE.test(e.time) ? e.time : '', text: clean(e.text) }));
  }

  let entries = load();
  const save = () => storage.set(KEY, entries.slice(-KEEP_MAX));
  const byDate = (k) => entries.filter((e) => e.date === k).sort((a, b) => (a.time || '99') .localeCompare(b.time || '99'));

  // ---------- Görünüm ----------
  const card = $('#calendar-card');
  const grid = $('#cal-grid');
  const monthEl = $('#cal-month');
  const dayTitle = $('#cal-day-title');
  const daySub = $('#cal-day-sub');
  const dayList = $('#cal-day-list');
  const dayEmpty = $('#cal-day-empty');
  const form = $('#cal-form');
  const timeInput = $('#cal-time');
  const textInput = $('#cal-text');
  const kindBtns = card.querySelectorAll('[data-cal-kind]');

  let selected = isoDay(new Date());
  let view = (() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  })();
  let kind = 'note';

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  const history = () => (App.Stats ? App.Stats.history() : {});
  const tasks = () => (App.Todos ? App.Todos.all() : []);

  // pomodoro yoğunluğu (günlük hedefe göre 0–4)
  function level(p) {
    if (!p) return 0;
    const g = (App.Timer && App.Timer.setting('goal')) || 6;
    if (p >= g) return 4;
    if (p >= Math.ceil((g * 2) / 3)) return 3;
    if (p >= Math.ceil(g / 3)) return 2;
    return 1;
  }

  function renderGrid() {
    const hist = history();
    const due = new Map();
    for (const t of tasks()) if (t.due && !t.done) due.set(t.due, (due.get(t.due) || 0) + 1);
    const notes = new Map();
    for (const e of entries) notes.set(e.date, (notes.get(e.date) || 0) + 1);
    const today = isoDay(new Date());

    monthEl.textContent = `${I18N.month(view.m)} ${view.y}`;
    const first = new Date(view.y, view.m, 1, 12);
    const lead = (first.getDay() + 6) % 7; // Pazartesi ilk gün
    const start = new Date(first);
    start.setDate(1 - lead);
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const k = isoDay(d);
      const b = el('button', 'cal-day');
      b.type = 'button';
      b.dataset.date = k;
      b.classList.toggle('other', d.getMonth() !== view.m);
      b.classList.toggle('today', k === today);
      b.setAttribute('aria-pressed', String(k === selected));
      const h = hist[k];
      b.dataset.l = String(level(h ? h.p : 0));
      b.append(el('span', 'cal-num', String(d.getDate())));
      const marks = el('span', 'cal-marks');
      if (notes.get(k)) marks.append(el('i', 'cal-mark cal-mark-note'));
      if (due.get(k)) marks.append(el('i', `cal-mark cal-mark-due${k < today ? ' late' : ''}`));
      b.append(marks);
      const parts = [I18N.dateLabel(d)];
      if (h && h.p) parts.push(pomodoros(h.p));
      if (notes.get(k)) parts.push(App.tn(notes.get(k), '{n} note', '{n} notes'));
      if (due.get(k)) parts.push(tr('{tasks} due', { tasks: App.tn(due.get(k), '{n} task', '{n} tasks') }));
      b.setAttribute('aria-label', parts.join(', '));
      b.title = parts.join(' · ');
      cells.push(b);
    }
    // son satır tamamen başka aydaysa gizle (5 satırlık aylar daha derli toplu görünsün)
    const lastRowOther = cells.slice(35).every((c) => c.classList.contains('other'));
    grid.replaceChildren(...(lastRowOther ? cells.slice(0, 35) : cells));
  }

  function renderDay() {
    const d = parseDay(selected);
    const today = isoDay(new Date());
    const rel = selected === today ? `${tr('Today')} · ` : '';
    dayTitle.textContent = `${rel}${I18N.dateLabel(d)}`;
    const h = history()[selected];
    daySub.textContent = h && h.p ? `${pomodoros(h.p)} · ${hours(h.m)}` : selected > today ? '' : tr('No pomodoros');

    const items = [];
    // notlar
    for (const e of byDate(selected)) {
      const li = el('li', 'cal-item cal-note');
      li.dataset.id = e.id;
      li.append(el('span', 'cal-time', e.time || '•'));
      const text = el('span', 'cal-text', e.text);
      text.title = tr('Double-click to edit');
      li.append(text);
      const del = el('button', 'cal-del');
      del.type = 'button';
      del.setAttribute('aria-label', tr('Delete: {text}', { text: e.text }));
      del.title = tr('Delete');
      del.innerHTML = '<svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
      li.append(del);
      items.push(li);
    }
    // o gün teslimi olan görevler
    for (const t of tasks().filter((x) => x.due === selected)) {
      const li = el('li', 'cal-item cal-task');
      li.classList.toggle('done', t.done);
      li.dataset.task = t.id;
      const check = el('input', 'cal-check');
      check.type = 'checkbox';
      check.checked = t.done;
      check.setAttribute('aria-label', tr('Done: {text}', { text: t.text }));
      li.append(check, el('span', 'cal-text', t.text));
      for (const tag of t.tags || []) {
        const chip = el('span', 'tag-chip', `#${tag}`);
        chip.style.setProperty('--tag', App.Tags ? App.Tags.color(tag) : 'var(--muted)');
        li.append(chip);
      }
      items.push(li);
    }
    // oturum günlüğü
    const logs = App.Journal ? App.Journal.entries().filter((e) => isoDay(new Date(e.at)) === selected) : [];
    for (const e of logs) {
      const li = el('li', 'cal-item cal-log');
      const at = new Date(e.at);
      li.append(el('span', 'cal-time', `${pad(at.getHours())}:${pad(at.getMinutes())}`), el('span', 'cal-text', e.text));
      li.title = tr('From your session log');
      items.push(li);
    }
    dayList.replaceChildren(...items);
    dayEmpty.hidden = items.length > 0;
    textInput.placeholder = kind === 'task' ? tr('Add a task due this day… (#tag)') : tr('Add a note or event…');
    timeInput.hidden = kind === 'task';
  }

  function render() {
    renderGrid();
    renderDay();
  }

  // ---------- Etkileşim ----------
  function select(k) {
    selected = k;
    const d = parseDay(k);
    if (d.getMonth() !== view.m || d.getFullYear() !== view.y) view = { y: d.getFullYear(), m: d.getMonth() };
    render();
  }

  grid.addEventListener('click', (e) => {
    const b = e.target.closest('.cal-day');
    if (b) select(b.dataset.date);
  });

  // ok tuşlarıyla günler arasında gezinme
  grid.addEventListener('keydown', (e) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!step) return;
    e.preventDefault();
    const d = parseDay(selected);
    d.setDate(d.getDate() + step);
    select(isoDay(d));
    const b = grid.querySelector(`[data-date="${selected}"]`);
    if (b) b.focus();
  });

  function shiftMonth(n) {
    const d = new Date(view.y, view.m + n, 1);
    view = { y: d.getFullYear(), m: d.getMonth() };
    renderGrid();
  }

  $('#cal-prev').addEventListener('click', () => shiftMonth(-1));
  $('#cal-next').addEventListener('click', () => shiftMonth(1));
  $('#cal-today').addEventListener('click', () => select(isoDay(new Date())));

  kindBtns.forEach((b) =>
    b.addEventListener('click', () => {
      kind = b.dataset.calKind;
      kindBtns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      renderDay();
      textInput.focus();
    }),
  );

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = clean(textInput.value);
    if (!text) return;
    if (kind === 'task') {
      if (App.Todos) App.Todos.add(text, selected);
      App.toast(tr('Task added to your to-do list.'), 2200);
    } else {
      entries.push({ id: App.newId('c'), date: selected, time: TIME_RE.test(timeInput.value) ? timeInput.value : '', text });
      save();
      markPast();
    }
    textInput.value = '';
    timeInput.value = '';
    render();
    textInput.focus();
  });

  dayList.addEventListener('click', (e) => {
    const del = e.target.closest('.cal-del');
    if (!del) return;
    const id = del.closest('.cal-item').dataset.id;
    entries = entries.filter((x) => x.id !== id);
    save();
    render();
  });

  dayList.addEventListener('change', (e) => {
    if (!e.target.classList.contains('cal-check')) return;
    const id = e.target.closest('.cal-item').dataset.task;
    if (App.Todos) App.Todos.setDone(id, e.target.checked);
  });

  // çift tıklayınca notu düzenle ("14:30 metin" yazılırsa saat de değişir)
  dayList.addEventListener('dblclick', (e) => {
    const text = e.target.closest('.cal-note .cal-text');
    if (!text) return;
    const li = text.closest('.cal-item');
    const entry = entries.find((x) => x.id === li.dataset.id);
    if (!entry) return;
    const input = el('input', 'cal-edit');
    input.type = 'text';
    input.maxLength = TEXT_MAX + 6;
    input.value = entry.time ? `${entry.time} ${entry.text}` : entry.text;
    input.setAttribute('aria-label', tr('Edit note'));
    text.replaceWith(input);
    input.focus();
    input.select();
    let done = false;
    const finish = (keep) => {
      if (done) return;
      done = true;
      if (keep) {
        const m = input.value.trim().match(/^(([01]?\d|2[0-3]):[0-5]\d)\s+(.*)$/);
        const value = clean(m ? m[3] : input.value);
        if (value) {
          entry.text = value;
          if (m) entry.time = m[1].padStart(5, '0');
          save();
          markPast();
        }
      }
      render();
    };
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') finish(true);
      else if (ev.key === 'Escape') {
        ev.stopPropagation();
        finish(false);
      }
    });
    input.addEventListener('blur', () => finish(true));
  });

  // ---------- Hatırlatmalar ----------
  // Saatli notlar o saat gelince (sayfa açıksa) hatırlatılır; geçmiş saatler hatırlatılmaz
  const reminded = new Set();
  const nowHM = () => {
    const d = new Date();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  function markPast() {
    const today = isoDay(new Date());
    const hm = nowHM();
    for (const e of entries) if (e.time && (e.date < today || (e.date === today && e.time < hm))) reminded.add(e.id);
  }

  function checkReminders() {
    const today = isoDay(new Date());
    const hm = nowHM();
    for (const e of entries) {
      if (!e.time || e.date !== today || reminded.has(e.id) || e.time > hm) continue;
      reminded.add(e.id);
      App.toast(`⏰ ${e.time} · ${e.text}`, 8000);
      if (App.Audio && App.Timer && App.Timer.setting('sound')) App.Audio.chime();
      try {
        if ('Notification' in window && Notification.permission === 'granted' && document.hidden) new Notification(tr('{time} · Reminder', { time: e.time }), { body: e.text });
      } catch {
        /* bazı tarayıcılar desteklemez */
      }
    }
  }

  markPast();
  setInterval(checkReminders, 15000);

  // gece yarısı "bugün" değişince takvim de güncellensin
  let lastToday = isoDay(new Date());
  setInterval(() => {
    const t = isoDay(new Date());
    if (t !== lastToday) {
      if (selected === lastToday) selected = t;
      lastToday = t;
      render();
    }
  }, 60000);

  for (const ev of ['todos:changed', 'timer:finished', 'journal:changed', 'settings:changed']) App.on(ev, () => render());

  App.Calendar = { entries: () => entries.map((e) => ({ ...e })), select, render };
  render();
})();
