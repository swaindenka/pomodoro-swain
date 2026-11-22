/*
 * Kişisel yapılacaklar listesi (tarayıcıda saklanır, odadaki diğer kişilerle paylaşılmaz).
 * Görevlerin alt adımları olabilir; görevler ve adımlar tutamaçtan sürüklenerek
 * (ya da tutamaç seçiliyken ok tuşlarıyla) sıralanır.
 */
(() => {
  'use strict';

  const App = window.App;
  const { storage, KEYS, $ } = App;

  const TEXT_MAX = 200;
  const SUBS_MAX = 30;

  const todoForm = $('#todo-form');
  const todoInput = $('#todo-input');
  const todoList = $('#todo-list');
  const todoEmpty = $('#todo-empty');
  const todoFooter = $('#todo-footer');
  const todoCount = $('#todo-count');
  const clearDoneBtn = $('#clear-done');

  const cleanText = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, TEXT_MAX) : '');

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
        return {
          id,
          text: cleanText(t.text),
          done: Boolean(t.done),
          pomos: Number.isInteger(t.pomos) && t.pomos > 0 ? Math.min(t.pomos, 9999) : 0,
          subs,
          open: Boolean(t.open) && subs.length > 0,
        };
      });
  }

  let todos = load();
  const save = () => storage.set(KEYS.todos, todos);
  const byId = (id) => todos.find((t) => t.id === id) || null;

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
  const GRIP_ICON = svg(
    [5.5, 10.5].map((x) => [4, 8, 12].map((y) => `<circle cx="${x}" cy="${y}" r="1.25" fill="currentColor"/>`).join('')).join(''),
  );
  const STEPS_ICON = svg('<path d="M3 4h10M6 8h7M6 12h7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M3.5 7.5v4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity=".6"/>');

  function iconButton(cls, icon, label, title) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.setAttribute('aria-label', label);
    b.title = title;
    b.innerHTML = icon;
    return b;
  }

  function grip(text) {
    const b = iconButton('todo-grip', GRIP_ICON, `Reorder: ${text}`, 'Drag to reorder (or use the arrow keys)');
    return b;
  }

  // ---------- Çizim ----------
  function createSub(sub) {
    const li = document.createElement('li');
    li.className = 'sub-item';
    li.classList.toggle('done', sub.done);
    li.dataset.sid = sub.id;
    const label = document.createElement('label');
    label.className = 'todo-label';
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'sub-check';
    check.checked = sub.done;
    const text = document.createElement('span');
    text.className = 'todo-text';
    text.textContent = sub.text;
    label.append(check, text);
    li.append(grip(sub.text), label, iconButton('todo-delete sub-delete', DELETE_ICON, `Delete step: ${sub.text}`, 'Delete step'));
    return li;
  }

  function stepsLabel(todo) {
    const done = todo.subs.filter((s) => s.done).length;
    return `${done}/${todo.subs.length}`;
  }

  function createItem(todo) {
    const li = document.createElement('li');
    li.className = 'todo-item';
    li.classList.toggle('done', todo.done);
    li.classList.toggle('open', todo.open);
    li.dataset.id = todo.id;

    const row = document.createElement('div');
    row.className = 'todo-row';

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
    const meta = document.createElement('span');
    meta.className = 'todo-meta';
    if (todo.subs.length) {
      const steps = document.createElement('span');
      steps.className = 'todo-steps';
      steps.classList.toggle('complete', todo.subs.every((s) => s.done));
      steps.textContent = stepsLabel(todo);
      steps.title = `${stepsLabel(todo)} steps done`;
      meta.append(steps);
    }
    if (todo.pomos) {
      const badge = document.createElement('span');
      badge.className = 'todo-pomos';
      badge.textContent = String(todo.pomos);
      badge.title = `${todo.pomos} pomodoro${todo.pomos === 1 ? '' : 's'}`;
      meta.append(badge);
    }
    if (meta.childElementCount) label.append(meta);

    const toggle = iconButton('todo-steps-toggle', STEPS_ICON, `Steps for: ${todo.text}`, todo.subs.length ? 'Show steps' : 'Add steps');
    toggle.setAttribute('aria-expanded', String(todo.open));

    const focus = iconButton('todo-focus', FOCUS_ICON, `Focus on: ${todo.text}`, 'Focus on this task');
    focus.setAttribute('aria-pressed', String(todo.id === focusId));
    focus.hidden = todo.done;

    const del = iconButton('todo-delete', DELETE_ICON, `Delete: ${todo.text}`, 'Delete');

    row.append(grip(todo.text), label, toggle, focus, del);

    const subs = document.createElement('div');
    subs.className = 'todo-subs';
    subs.hidden = !todo.open;
    const subList = document.createElement('ul');
    subList.className = 'sub-list';
    subList.setAttribute('aria-label', `Steps for ${todo.text}`);
    subList.append(...todo.subs.map(createSub));
    const form = document.createElement('form');
    form.className = 'sub-form';
    form.autocomplete = 'off';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'sub-input';
    input.maxLength = TEXT_MAX;
    input.placeholder = todo.subs.length >= SUBS_MAX ? `Up to ${SUBS_MAX} steps` : 'Add a step…';
    input.disabled = todo.subs.length >= SUBS_MAX;
    input.setAttribute('aria-label', `New step for ${todo.text}`);
    const add = document.createElement('button');
    add.type = 'submit';
    add.className = 'btn btn-ghost btn-sm';
    add.textContent = 'Add';
    add.disabled = input.disabled;
    form.append(input, add);
    subs.append(subList, form);

    li.append(row, subs);
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
      const el = fresh.querySelector(focusSel);
      if (el) el.focus();
    }
  }

  function renderMeta() {
    const left = todos.filter((t) => !t.done).length;
    todoEmpty.hidden = todos.length > 0;
    todoFooter.hidden = todos.length === 0;
    todoCount.textContent = left === 0 ? 'All done' : `${left} task${left === 1 ? '' : 's'} left`;
    clearDoneBtn.hidden = todos.length - left === 0;
    App.emit('todos:changed', left);
    renderFocus();
  }

  function renderAll() {
    todoList.replaceChildren(...todos.map(createItem));
    renderMeta();
  }

  // ---------- Görevler ----------
  todoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = cleanText(todoInput.value);
    if (!text) return;
    const todo = { id: App.newId('t'), text, done: false, pomos: 0, subs: [], open: false };
    todos.push(todo);
    save();
    todoList.append(createItem(todo));
    renderMeta();
    todoInput.value = '';
    todoInput.focus();
  });

  todoList.addEventListener('change', (e) => {
    const target = e.target;
    if (target.classList.contains('todo-check')) {
      const li = target.closest('.todo-item');
      const todo = byId(li.dataset.id);
      if (!todo) return;
      todo.done = target.checked;
      li.classList.toggle('done', todo.done);
      li.querySelector('.todo-focus').hidden = todo.done;
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

  todoList.addEventListener('click', (e) => {
    const item = e.target.closest('.todo-item');
    if (!item) return;
    const todo = byId(item.dataset.id);
    if (!todo) return;

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
      if (k === li) continue;
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
    if (list.children.length < 2) return;
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
    if (e.key === 'ArrowUp' && li.previousElementSibling) moveWithAnimation(list, li, li.previousElementSibling);
    else if (e.key === 'ArrowDown' && li.nextElementSibling) moveWithAnimation(list, li, li.nextElementSibling.nextElementSibling);
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

  App.Todos = {
    leftCount: () => todos.filter((t) => !t.done).length,
    focused: () => {
      const t = focusTask();
      return t ? { ...t, subs: t.subs.map((s) => ({ ...s })) } : null;
    },
    all: () => todos.map((t) => ({ ...t, subs: t.subs.map((s) => ({ ...s })) })),
  };

  renderAll();
})();
