/*
 * Kişisel yapılacaklar listesi (tarayıcıda saklanır, odadaki diğer kişilerle paylaşılmaz).
 * - Görevlerin alt adımları, #etiketleri ve pomodoro tahmini olabilir; etikete göre süzülür.
 * - Görev ya da adım adına çift tıklayınca yeniden adlandırılır.
 * - Görevler ve adımlar tutamaçtan sürüklenerek (ya da tutamaç seçiliyken ok tuşlarıyla) sıralanır.
 */
(() => {
  'use strict';

  const App = window.App;
  const { storage, KEYS, $ } = App;

  const TEXT_MAX = 200;
  const SUBS_MAX = 30;
  const TAGS_MAX = 4;
  const EST_MAX = 20;
  const FILTER_KEY = 'pomodoro.todoFilter';

  const todoForm = $('#todo-form');
  const todoInput = $('#todo-input');
  const todoList = $('#todo-list');
  const todoEmpty = $('#todo-empty');
  const todoFooter = $('#todo-footer');
  const todoCount = $('#todo-count');
  const clearDoneBtn = $('#clear-done');
  const filterBar = $('#todo-filter');

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const cleanText = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, TEXT_MAX) : '');

  // ---------- Etiketler ----------
  const TAG_RE = /(^|\s)#([\p{L}\p{N}_-]{1,20})/gu;
  const TAG_COLORS = ['#e05d6f', '#f08a3c', '#d9a62e', '#5fa37a', '#3fa3a0', '#5b9bd8', '#8f7bd8', '#c86fb4'];
  const cleanTag = (t) => (typeof t === 'string' ? t.replace(/^#/, '').toLocaleLowerCase().replace(/[^\p{L}\p{N}_-]/gu, '').slice(0, 20) : '');

  // aynı etiket hep aynı rengi alır (FNV-1a + karıştırma: renkler iyi dağılsın)
  function tagColor(tag) {
    let h = 2166136261;
    for (const ch of tag) {
      h ^= ch.codePointAt(0);
      h = Math.imul(h, 16777619) >>> 0;
    }
    h ^= h >>> 13;
    h = Math.imul(h, 0x5bd1e995) >>> 0;
    h ^= h >>> 15;
    return TAG_COLORS[(h >>> 0) % TAG_COLORS.length];
  }

  // "Makale oku #okul #acil" → metin + etiketler
  function parseTags(input) {
    const tags = [];
    const text = cleanText(
      String(input).replace(TAG_RE, (m, sp, tag) => {
        const t = cleanTag(tag);
        if (t && !tags.includes(t)) tags.push(t);
        return sp;
      }),
    );
    return { text: text || cleanText(input), tags: tags.slice(0, TAGS_MAX) };
  }

  const mergeTags = (a, b) => [...new Set([...a, ...b])].slice(0, TAGS_MAX);

  function load() {
    const data = storage.get(KEYS.todos, []);
    if (!Array.isArray(data)) return [];
    const ids = new Set();
    return data
      .filter((t) => t && cleanText(t.text))
      .map((t) => {
        let id = String(t.id || App.newId('t'));
        if (ids.has(id)) id = App.newId('t');
        ids.add(id);
        const subs = Array.isArray(t.subs)
          ? t.subs
              .filter((s) => s && cleanText(s.text))
              .slice(0, SUBS_MAX)
              .map((s) => ({ id: String(s.id || App.newId('s')), text: cleanText(s.text), done: Boolean(s.done) }))
          : [];
        const tags = Array.isArray(t.tags) ? [...new Set(t.tags.map(cleanTag).filter(Boolean))].slice(0, TAGS_MAX) : [];
        return {
          id,
          text: cleanText(t.text),
          done: Boolean(t.done),
          pomos: Number.isInteger(t.pomos) && t.pomos > 0 ? Math.min(t.pomos, 9999) : 0,
          est: Number.isInteger(t.est) && t.est > 0 ? Math.min(t.est, EST_MAX) : 0,
          tags,
          doneAt: Number.isFinite(t.doneAt) && t.done ? t.doneAt : 0,
          due: typeof t.due === 'string' && DATE_RE.test(t.due) ? t.due : '',
          subs,
          open: Boolean(t.open),
        };
      });
  }

  let todos = load();
  const save = () => storage.set(KEYS.todos, todos);
  const byId = (id) => todos.find((t) => t.id === id) || null;

  // Etiket süzgeci (boş = hepsi)
  let filter = cleanTag(storage.get(FILTER_KEY, '') || '');
  const allTags = () => {
    const count = new Map();
    for (const t of todos) for (const tag of t.tags) count.set(tag, (count.get(tag) || 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  };
  const visible = (todo) => !filter || todo.tags.includes(filter);

  // Üzerinde çalışılan görev: bitirilen her pomodoro bu göreve sayılır
  let focusId = storage.get(KEYS.focusTask, null);
  const focusTask = () => todos.find((t) => t.id === focusId && !t.done) || null;
  const focusLine = $('#focus-task');
  const focusText = $('#focus-task-text');
  const focusStep = $('#focus-task-step');

  function setFocus(id) {
    focusId = id;
    storage.set(KEYS.focusTask, id);
    todoList.querySelectorAll('.todo-focus').forEach((b) => b.setAttribute('aria-pressed', String(b.closest('.todo-item').dataset.id === id)));
    renderFocus();
  }

  // Zamanlayıcının altında görev adı ve sıradaki adım
  function renderFocus() {
    const t = focusTask();
    focusLine.hidden = !t;
    if (!t) return;
    focusText.textContent = t.text;
    const next = t.subs.find((s) => !s.done);
    focusStep.hidden = !next;
    if (next) focusStep.textContent = next.text;
  }

  // ---------- Simgeler ----------
  const svg = (body, size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 16 16" aria-hidden="true">${body}</svg>`;
  const FOCUS_ICON = svg('<circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="8" r="2" fill="currentColor"/>');
  const DELETE_ICON = svg('<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>');
  const SMALL_X = svg('<path d="M5 5l6 6M11 5l-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>', 10);
  const GRIP_ICON = svg(
    [5.5, 10.5].map((x) => [4, 8, 12].map((y) => `<circle cx="${x}" cy="${y}" r="1.25" fill="currentColor"/>`).join('')).join(''),
  );
  const DETAILS_ICON = svg('<path d="M3 4h10M6 8h7M6 12h7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M3.5 7.5v4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity=".6"/>');

  function iconButton(cls, icon, label, title) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.setAttribute('aria-label', label);
    b.title = title;
    b.innerHTML = icon;
    return b;
  }

  const grip = (text) => iconButton('todo-grip', GRIP_ICON, `Reorder: ${text}`, 'Drag to reorder (or use the arrow keys)');

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function tagChip(tag, removable) {
    const chip = el(removable ? 'span' : 'button', 'tag-chip');
    if (!removable) {
      chip.type = 'button';
      chip.dataset.filterTag = tag;
      chip.title = `Show only #${tag}`;
    }
    chip.style.setProperty('--tag', tagColor(tag));
    chip.append(`#${tag}`);
    if (removable) {
      const x = iconButton('tag-remove', SMALL_X, `Remove tag ${tag}`, 'Remove tag');
      x.dataset.tag = tag;
      chip.append(x);
    }
    return chip;
  }

  // ---------- Çizim ----------
  function checkbox(cls, checked, label) {
    const check = el('input', cls);
    check.type = 'checkbox';
    check.checked = checked;
    check.setAttribute('aria-label', label);
    return check;
  }

  function createSub(sub) {
    const li = el('li', 'sub-item');
    li.classList.toggle('done', sub.done);
    li.dataset.sid = sub.id;
    const label = el('div', 'todo-label');
    const text = el('span', 'todo-text sub-text', sub.text);
    text.title = 'Double-click to rename';
    label.append(checkbox('sub-check', sub.done, `Done: ${sub.text}`), text);
    li.append(grip(sub.text), label, iconButton('todo-delete sub-delete', DELETE_ICON, `Delete step: ${sub.text}`, 'Delete step'));
    return li;
  }

  function stepsLabel(todo) {
    const done = todo.subs.filter((s) => s.done).length;
    return `${done}/${todo.subs.length}`;
  }

  // Teslim tarihi rozeti: Today / Tomorrow / gün adı; geçmişse kırmızı "Overdue"
  const pad2 = (n) => String(n).padStart(2, '0');
  const isoDay = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function dueInfo(due) {
    if (!due) return null;
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const d = new Date(`${due}T12:00:00`);
    const diff = Math.round((d - today) / 86400000);
    const date = `${SHORT_DAYS[d.getDay()]} ${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`;
    if (diff < 0) return { label: `Overdue · ${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`, cls: 'overdue', date };
    if (diff === 0) return { label: 'Today', cls: 'today', date };
    if (diff === 1) return { label: 'Tomorrow', cls: 'soon', date };
    if (diff < 7) return { label: SHORT_DAYS[d.getDay()], cls: 'soon', date };
    return { label: `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`, cls: '', date };
  }

  function pomosBadge(todo) {
    if (!todo.pomos && !todo.est) return null;
    const badge = el('span', 'todo-pomos');
    badge.textContent = todo.est ? `${todo.pomos}/${todo.est}` : String(todo.pomos);
    badge.classList.toggle('reached', todo.est > 0 && todo.pomos >= todo.est);
    badge.title = todo.est ? `${todo.pomos} of ${todo.est} estimated pomodoros` : `${todo.pomos} pomodoro${todo.pomos === 1 ? '' : 's'}`;
    return badge;
  }

  function createDetails(todo) {
    const box = el('div', 'todo-subs');
    box.hidden = !todo.open;

    // pomodoro tahmini ve etiketler
    const meta = el('div', 'todo-details');
    const est = el('div', 'est-row');
    est.append(el('span', 'detail-label', 'Pomodoros'));
    const minus = iconButton('est-btn est-minus', '−', 'Lower the estimate', 'Lower the estimate');
    minus.textContent = '−';
    minus.disabled = todo.est <= 0;
    const value = el('span', 'est-value', todo.est ? `${todo.pomos} / ${todo.est}` : todo.pomos ? `${todo.pomos} done` : 'No estimate');
    const plus = iconButton('est-btn est-plus', '+', 'Raise the estimate', 'Raise the estimate');
    plus.textContent = '+';
    plus.disabled = todo.est >= EST_MAX;
    est.append(minus, value, plus);

    const tags = el('div', 'tag-row');
    tags.append(el('span', 'detail-label', 'Tags'));
    for (const t of todo.tags) tags.append(tagChip(t, true));
    if (todo.tags.length < TAGS_MAX) {
      const form = el('form', 'tag-form');
      form.autocomplete = 'off';
      const input = el('input', 'tag-input');
      input.type = 'text';
      input.maxLength = 21;
      input.placeholder = '+ tag';
      input.setAttribute('aria-label', `Add a tag to ${todo.text}`);
      input.setAttribute('list', 'todo-tag-list');
      form.append(input);
      tags.append(form);
    }
    const dueRow = el('div', 'est-row');
    dueRow.append(el('span', 'detail-label', 'Due'));
    const dueInput = el('input', 'due-input');
    dueInput.type = 'date';
    dueInput.value = todo.due;
    dueInput.setAttribute('aria-label', `Due date for ${todo.text}`);
    dueRow.append(dueInput);
    if (todo.due) {
      const clear = el('button', 'link-btn due-clear', 'Clear');
      clear.type = 'button';
      dueRow.append(clear);
    }
    meta.append(est, dueRow, tags);

    const subList = el('ul', 'sub-list');
    subList.setAttribute('aria-label', `Steps for ${todo.text}`);
    subList.append(...todo.subs.map(createSub));
    const form = el('form', 'sub-form');
    form.autocomplete = 'off';
    const input = el('input', 'sub-input');
    input.type = 'text';
    input.maxLength = TEXT_MAX;
    input.placeholder = todo.subs.length >= SUBS_MAX ? `Up to ${SUBS_MAX} steps` : 'Add a step…';
    input.disabled = todo.subs.length >= SUBS_MAX;
    input.setAttribute('aria-label', `New step for ${todo.text}`);
    const add = el('button', 'btn btn-ghost btn-sm', 'Add');
    add.type = 'submit';
    add.disabled = input.disabled;
    form.append(input, add);
    box.append(meta, subList, form);
    return box;
  }

  function createItem(todo) {
    const li = el('li', 'todo-item');
    li.classList.toggle('done', todo.done);
    li.classList.toggle('open', todo.open);
    li.dataset.id = todo.id;
    li.hidden = !visible(todo);

    const row = el('div', 'todo-row');
    const label = el('div', 'todo-label');
    const main = el('span', 'todo-main');
    const text = el('span', 'todo-text', todo.text);
    text.title = 'Double-click to rename';
    main.append(text);
    // adın altında: etiketler, adım ve pomodoro rozetleri (dar sütunda ad tek satırda kalsın)
    const info = el('span', 'todo-tags');
    info.append(...todo.tags.map((t) => tagChip(t, false)));
    if (todo.subs.length) {
      const steps = el('span', 'todo-steps', stepsLabel(todo));
      steps.classList.toggle('complete', todo.subs.every((s) => s.done));
      steps.title = `${stepsLabel(todo)} steps done`;
      info.append(steps);
    }
    const due = dueInfo(todo.due);
    if (due) {
      const chip = el('span', `todo-due ${todo.done ? '' : due.cls}`.trim(), due.label);
      chip.title = `Due ${due.date}`;
      info.append(chip);
    }
    const badge = pomosBadge(todo);
    if (badge) info.append(badge);
    if (info.childElementCount) main.append(info);
    label.append(checkbox('todo-check', todo.done, `Done: ${todo.text}`), main);

    const toggle = iconButton('todo-steps-toggle', DETAILS_ICON, `Details for: ${todo.text}`, 'Steps, tags and estimate');
    toggle.setAttribute('aria-expanded', String(todo.open));

    const focus = iconButton('todo-focus', FOCUS_ICON, `Focus on: ${todo.text}`, 'Focus on this task');
    focus.setAttribute('aria-pressed', String(todo.id === focusId));
    focus.hidden = todo.done;

    const del = iconButton('todo-delete', DELETE_ICON, `Delete: ${todo.text}`, 'Delete');

    row.append(grip(todo.text), label, toggle, focus, del);
    li.append(row, createDetails(todo));
    return li;
  }

  // Tek bir görevi yeniden çizer; odak isteğe bağlı olarak yeni öğedeki bir alana taşınır
  function rerender(id, focusSel) {
    const todo = byId(id);
    const old = todoList.querySelector(`.todo-item[data-id="${CSS.escape(id)}"]`);
    if (!todo || !old) return;
    const fresh = createItem(todo);
    old.replaceWith(fresh);
    if (focusSel) {
      const target = fresh.querySelector(focusSel);
      if (target) target.focus();
    }
    renderFilter();
  }

  // Etiket süzgeci: listede kullanılan etiketler
  function renderFilter() {
    const tags = allTags();
    if (filter && !tags.some(([t]) => t === filter)) setFilter('');
    filterBar.hidden = tags.length === 0;
    const all = el('button', 'filter-chip', 'All');
    all.type = 'button';
    all.dataset.filter = '';
    all.setAttribute('aria-pressed', String(!filter));
    filterBar.replaceChildren(
      all,
      ...tags.map(([tag, n]) => {
        const b = el('button', 'filter-chip');
        b.type = 'button';
        b.dataset.filter = tag;
        b.style.setProperty('--tag', tagColor(tag));
        b.setAttribute('aria-pressed', String(filter === tag));
        b.append(`#${tag}`, el('span', 'filter-count', String(n)));
        return b;
      }),
    );
    const list = $('#todo-tag-list');
    list.replaceChildren(...tags.map(([tag]) => Object.assign(document.createElement('option'), { value: tag })));
  }

  function setFilter(tag) {
    filter = tag;
    storage.set(FILTER_KEY, tag);
    for (const li of todoList.children) {
      const todo = byId(li.dataset.id);
      li.hidden = !todo || !visible(todo);
    }
    filterBar.querySelectorAll('.filter-chip').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === tag)));
    todoInput.placeholder = tag ? `Add a #${tag} task…` : 'Add a task… (#tag)';
    renderMeta();
  }

  function renderMeta() {
    const left = todos.filter((t) => !t.done).length;
    const shown = todos.filter(visible);
    todoEmpty.hidden = todos.length > 0;
    todoFooter.hidden = todos.length === 0;
    const leftShown = shown.filter((t) => !t.done).length;
    todoCount.textContent = filter
      ? `${leftShown} #${filter} task${leftShown === 1 ? '' : 's'} left`
      : left === 0
        ? 'All done'
        : `${left} task${left === 1 ? '' : 's'} left`;
    clearDoneBtn.hidden = todos.length - left === 0;
    App.emit('todos:changed', left);
    renderFocus();
  }

  function renderAll() {
    todoList.replaceChildren(...todos.map(createItem));
    renderFilter();
    renderMeta();
  }

  // ---------- Yeniden adlandırma (çift tıklama) ----------
  function startRename(span, current, onSave) {
    const input = el('input', 'todo-rename');
    input.type = 'text';
    input.maxLength = TEXT_MAX + 50;
    input.value = current;
    input.setAttribute('aria-label', 'Rename');
    span.replaceWith(input);
    input.focus();
    input.select();
    let done = false;
    const finish = (keep) => {
      if (done) return;
      done = true;
      const value = input.value;
      if (keep && cleanText(value) && cleanText(value) !== current) onSave(value);
      else input.replaceWith(span);
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        finish(true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        finish(false);
      }
    });
    input.addEventListener('blur', () => finish(true));
  }

  todoList.addEventListener('dblclick', (e) => {
    const span = e.target.closest('.todo-text');
    if (!span) return;
    const item = span.closest('.todo-item');
    const todo = byId(item.dataset.id);
    if (!todo) return;
    const subLi = span.closest('.sub-item');
    if (subLi) {
      const sub = todo.subs.find((s) => s.id === subLi.dataset.sid);
      if (!sub) return;
      startRename(span, sub.text, (value) => {
        sub.text = cleanText(value);
        save();
        rerender(todo.id);
        renderFocus();
      });
      return;
    }
    startRename(span, todo.text, (value) => {
      const parsed = parseTags(value);
      todo.text = parsed.text;
      todo.tags = mergeTags(todo.tags, parsed.tags);
      save();
      rerender(todo.id, '.todo-steps-toggle');
      renderFocus();
    });
  });

  // ---------- Görevler ----------
  todoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const parsed = parseTags(todoInput.value);
    if (!parsed.text) return;
    // süzgeç açıkken eklenen görev o etiketi alır
    const tags = filter ? mergeTags([filter], parsed.tags) : parsed.tags;
    const todo = { id: App.newId('t'), text: parsed.text, done: false, pomos: 0, est: 0, tags, doneAt: 0, due: '', subs: [], open: false };
    todos.push(todo);
    save();
    todoList.append(createItem(todo));
    renderFilter();
    renderMeta();
    todoInput.value = '';
    todoInput.focus();
  });

  todoList.addEventListener('change', (e) => {
    const target = e.target;
    if (target.classList.contains('due-input')) {
      const todo = byId(target.closest('.todo-item').dataset.id);
      if (!todo) return;
      todo.due = DATE_RE.test(target.value) ? target.value : '';
      save();
      rerender(todo.id, '.due-input');
      renderMeta();
      return;
    }
    if (target.classList.contains('todo-check')) {
      const li = target.closest('.todo-item');
      const todo = byId(li.dataset.id);
      if (!todo) return;
      todo.done = target.checked;
      li.classList.toggle('done', todo.done);
      li.querySelector('.todo-focus').hidden = todo.done;
      if (todo.done) {
        todo.doneAt = Date.now();
        App.emit('todo:done', { tags: todo.tags.slice() });
      } else {
        if (todo.doneAt) App.emit('todo:undone', { at: todo.doneAt, tags: todo.tags.slice() });
        todo.doneAt = 0;
      }
      if (todo.done && focusId === todo.id) setFocus(null);
      save();
      renderMeta();
      return;
    }
    if (target.classList.contains('sub-check')) {
      const todo = byId(target.closest('.todo-item').dataset.id);
      const sub = todo && todo.subs.find((s) => s.id === target.closest('.sub-item').dataset.sid);
      if (!sub) return;
      sub.done = target.checked;
      save();
      rerender(todo.id, `.sub-item[data-sid="${CSS.escape(sub.id)}"] .sub-check`);
      renderFocus();
      if (sub.done && !todo.done && todo.subs.every((s) => s.done)) {
        App.toast('All steps done! Tick off the task when you are ready.', 3200);
        App.emit('sfx', 'pick');
      }
    }
  });

  todoList.addEventListener('submit', (e) => {
    const tagForm = e.target.closest('.tag-form');
    if (tagForm) {
      e.preventDefault();
      const todo = byId(tagForm.closest('.todo-item').dataset.id);
      const tag = cleanTag(tagForm.querySelector('.tag-input').value);
      if (!todo || !tag || todo.tags.includes(tag) || todo.tags.length >= TAGS_MAX) return;
      todo.tags.push(tag);
      save();
      rerender(todo.id, '.tag-input');
      return;
    }
    const form = e.target.closest('.sub-form');
    if (!form) return;
    e.preventDefault();
    const todo = byId(form.closest('.todo-item').dataset.id);
    const input = form.querySelector('.sub-input');
    const text = cleanText(input.value);
    if (!todo || !text || todo.subs.length >= SUBS_MAX) return;
    todo.subs.push({ id: App.newId('s'), text, done: false });
    todo.open = true;
    save();
    rerender(todo.id, '.sub-input');
    renderFocus();
  });

  filterBar.addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (chip) setFilter(filter === chip.dataset.filter ? '' : chip.dataset.filter);
  });

  todoList.addEventListener('click', (e) => {
    const item = e.target.closest('.todo-item');
    if (!item) return;
    const todo = byId(item.dataset.id);
    if (!todo) return;

    const tagFilter = e.target.closest('[data-filter-tag]');
    if (tagFilter) {
      setFilter(filter === tagFilter.dataset.filterTag ? '' : tagFilter.dataset.filterTag);
      return;
    }
    const removeTag = e.target.closest('.tag-remove');
    if (removeTag) {
      todo.tags = todo.tags.filter((t) => t !== removeTag.dataset.tag);
      save();
      rerender(todo.id, '.tag-input');
      return;
    }
    if (e.target.closest('.due-clear')) {
      todo.due = '';
      save();
      rerender(todo.id, '.due-input');
      renderMeta();
      return;
    }
    const estBtn = e.target.closest('.est-btn');
    if (estBtn) {
      const step = estBtn.classList.contains('est-plus') ? 1 : -1;
      // ilk kez artırırken tahmin, yapılan pomodoroların bir fazlasından başlar
      todo.est = Math.max(0, Math.min(EST_MAX, (todo.est || (step > 0 ? todo.pomos : 0)) + step));
      save();
      rerender(todo.id, step > 0 ? '.est-plus' : '.est-minus');
      return;
    }
    if (e.target.closest('.todo-steps-toggle')) {
      todo.open = !todo.open;
      save();
      rerender(todo.id, todo.open ? '.sub-input' : '.todo-steps-toggle');
      return;
    }
    const subDel = e.target.closest('.sub-delete');
    if (subDel) {
      const sid = subDel.closest('.sub-item').dataset.sid;
      const i = todo.subs.findIndex((s) => s.id === sid);
      if (i < 0) return;
      todo.subs.splice(i, 1);
      save();
      const next = todo.subs[i] || todo.subs[i - 1];
      rerender(todo.id, next ? `.sub-item[data-sid="${CSS.escape(next.id)}"] .sub-delete` : '.sub-input');
      renderFocus();
      return;
    }
    if (e.target.closest('.todo-focus')) {
      setFocus(focusId === todo.id ? null : todo.id);
      if (focusId) App.toast('Every pomodoro you finish now counts for this task.', 2600);
      return;
    }
    if (!e.target.closest('.todo-delete')) return;
    const neighbor = item.nextElementSibling || item.previousElementSibling;
    todos = todos.filter((t) => t.id !== todo.id);
    save();
    item.remove();
    renderFilter();
    renderMeta();
    (neighbor ? neighbor.querySelector('.todo-delete') : todoInput).focus();
  });

  clearDoneBtn.addEventListener('click', () => {
    todos = todos.filter((t) => !t.done);
    save();
    renderAll();
    todoInput.focus();
  });

  $('#focus-clear').addEventListener('click', () => setFocus(null));

  // ---------- Sıralama ----------
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  // DOM'daki yeni sıra veriye yazılır
  function commitOrder(list) {
    if (list === todoList) {
      const order = [...list.children].map((li) => li.dataset.id);
      todos.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
      save();
      App.emit('todos:changed', todos.filter((t) => !t.done).length);
      return;
    }
    const todo = byId(list.closest('.todo-item').dataset.id);
    if (!todo) return;
    const order = [...list.children].map((li) => li.dataset.sid);
    todo.subs.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    save();
    renderFocus();
  }

  // Kardeşler yerlerine kayarak geçer (FLIP)
  function moveWithAnimation(list, li, before, skip) {
    const kids = [...list.children].filter((k) => k !== skip);
    const old = new Map(kids.map((k) => [k, [k.offsetLeft, k.offsetTop]]));
    list.insertBefore(li, before);
    if (reduceMotion && reduceMotion.matches) return;
    for (const k of kids) {
      const [ox, oy] = old.get(k);
      const dx = ox - k.offsetLeft;
      const dy = oy - k.offsetTop;
      if ((dx || dy) && k.animate) k.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 170, easing: 'ease-out' });
    }
  }

  const columns = (list) => {
    const cs = getComputedStyle(list);
    return cs.display === 'grid' ? cs.gridTemplateColumns.split(' ').filter(Boolean).length : 1;
  };

  let drag = null;

  function dropTarget(e) {
    const { list, li } = drag;
    const base = list.getBoundingClientRect();
    const px = e.clientX - base.left;
    const py = e.clientY - base.top;
    const grid = columns(list) > 1;
    let best = null;
    for (const k of list.children) {
      if (k === li || k.hidden) continue;
      const cx = k.offsetLeft + k.offsetWidth / 2;
      const cy = k.offsetTop + k.offsetHeight / 2;
      const d = grid ? Math.hypot((px - cx) * 0.6, py - cy) : Math.abs(py - cy);
      if (!best || d < best.d) best = { k, d, cx, cy, h: k.offsetHeight };
    }
    if (!best) return null;
    const sameRow = grid && Math.abs(py - best.cy) < best.h / 2;
    const before = sameRow ? px < best.cx : py < best.cy;
    return before ? best.k : best.k.nextElementSibling;
  }

  function follow(e) {
    const { li, list } = drag;
    const base = list.getBoundingClientRect();
    const grid = columns(list) > 1;
    const tx = grid ? e.clientX - drag.gx - (base.left + li.offsetLeft) : 0;
    const ty = e.clientY - drag.gy - (base.top + li.offsetTop);
    // listenin dışına çok taşmasın
    const maxY = list.offsetHeight - li.offsetTop - li.offsetHeight + 12;
    const minY = -li.offsetTop - 12;
    drag.tx = tx;
    drag.ty = Math.max(minY, Math.min(maxY, ty));
    li.style.transform = `translate(${drag.tx}px, ${drag.ty}px)`;
  }

  // Öğe DOM'da yer değiştirince işaretçi yakalaması düştüğü için hareketler pencereden dinlenir
  function onMove(e) {
    if (!drag || e.pointerId !== drag.pid) return;
    if (!drag.moved) {
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 5) return;
      drag.moved = true;
      drag.li.classList.add('dragging');
      drag.list.classList.add('sorting');
      App.emit('sfx', 'pick');
    }
    e.preventDefault();
    const before = dropTarget(e);
    if (before !== drag.li && before !== drag.li.nextElementSibling) moveWithAnimation(drag.list, drag.li, before, drag.li);
    follow(e);
  }

  function endDrag(e) {
    if (!drag || (e && e.pointerId !== drag.pid)) return;
    const d = drag;
    drag = null;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointercancel', endDrag);
    if (!d.moved) return;
    const { li, list } = d;
    li.style.transform = '';
    if (li.animate && !(reduceMotion && reduceMotion.matches)) {
      li.animate([{ transform: `translate(${d.tx}px, ${d.ty}px)` }, { transform: 'none' }], { duration: 140, easing: 'ease-out' });
    }
    li.classList.remove('dragging');
    list.classList.remove('sorting');
    commitOrder(list);
    App.emit('sfx', 'nudge');
    if (d.handle.isConnected) d.handle.focus({ preventScroll: true });
  }

  todoList.addEventListener('pointerdown', (e) => {
    const handle = e.target.closest('.todo-grip');
    if (!handle || e.button !== 0 || drag) return;
    const li = handle.closest('li');
    const list = li.parentElement;
    if ([...list.children].filter((k) => !k.hidden).length < 2) return;
    e.preventDefault();
    handle.focus({ preventScroll: true });
    const r = li.getBoundingClientRect();
    drag = { li, list, handle, pid: e.pointerId, sx: e.clientX, sy: e.clientY, gx: e.clientX - r.left, gy: e.clientY - r.top, tx: 0, ty: 0, moved: false };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
  });

  // Klavye: tutamaç seçiliyken yukarı / aşağı ok tuşları öğeyi taşır
  todoList.addEventListener('keydown', (e) => {
    const handle = e.target.closest('.todo-grip');
    if (!handle || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    const li = handle.closest('li');
    const list = li.parentElement;
    // süzgeç açıkken gizli görevlerin üstünden atlar
    const sibling = (from, dir) => {
      let n = from[dir];
      while (n && n.hidden) n = n[dir];
      return n;
    };
    const prev = sibling(li, 'previousElementSibling');
    const next = sibling(li, 'nextElementSibling');
    if (e.key === 'ArrowUp' && prev) moveWithAnimation(list, li, prev);
    else if (e.key === 'ArrowDown' && next) moveWithAnimation(list, li, next.nextElementSibling);
    else return;
    handle.focus();
    commitOrder(list);
    App.emit('sfx', 'nudge');
  });

  // Bitirilen odak oturumunu seçili göreve yaz
  App.on('timer:finished', ({ finished }) => {
    const t = focusTask();
    if (finished !== 'work' || !t) return;
    t.pomos = (t.pomos || 0) + 1;
    save();
    rerender(t.id);
  });

  App.Tags = { color: tagColor, parse: parseTags };

  // Takvimden görev ekleme ve tamamlama
  function addTask(input, due) {
    const parsed = parseTags(input);
    if (!parsed.text) return null;
    const todo = { id: App.newId('t'), text: parsed.text, done: false, pomos: 0, est: 0, tags: parsed.tags, doneAt: 0, due: DATE_RE.test(due) ? due : '', subs: [], open: false };
    todos.push(todo);
    save();
    todoList.append(createItem(todo));
    renderFilter();
    renderMeta();
    return todo.id;
  }

  function setDone(id, done) {
    const todo = byId(id);
    if (!todo || todo.done === done) return;
    const box = todoList.querySelector(`.todo-item[data-id="${CSS.escape(id)}"] .todo-check`);
    if (box) {
      box.checked = done;
      box.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  App.Todos = {
    add: addTask,
    setDone,
    leftCount: () => todos.filter((t) => !t.done).length,
    focused: () => {
      const t = focusTask();
      return t ? { ...t, tags: t.tags.slice(), subs: t.subs.map((s) => ({ ...s })) } : null;
    },
    all: () => todos.map((t) => ({ ...t, tags: t.tags.slice(), subs: t.subs.map((s) => ({ ...s })) })),
  };

  renderAll();
  setFilter(filter);
})();
