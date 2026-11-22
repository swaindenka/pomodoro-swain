/*
 * Kişisel yapılacaklar listesi (tarayıcıda saklanır, odadaki diğer kişilerle paylaşılmaz).
 */
(() => {
  'use strict';

  const App = window.App;
  const { storage, KEYS, $ } = App;

  const todoForm = $('#todo-form');
  const todoInput = $('#todo-input');
  const todoList = $('#todo-list');
  const todoEmpty = $('#todo-empty');
  const todoFooter = $('#todo-footer');
  const todoCount = $('#todo-count');
  const clearDoneBtn = $('#clear-done');

  function load() {
    const data = storage.get(KEYS.todos, []);
    if (!Array.isArray(data)) return [];
    return data
      .filter((t) => t && typeof t.text === 'string' && t.text.trim())
      .map((t) => ({
        id: String(t.id || App.newId('t')),
        text: t.text.trim().slice(0, 200),
        done: Boolean(t.done),
        pomos: Number.isInteger(t.pomos) && t.pomos > 0 ? Math.min(t.pomos, 9999) : 0,
      }));
  }

  let todos = load();
  const save = () => storage.set(KEYS.todos, todos);

  // Üzerinde çalışılan görev: bitirilen her pomodoro bu göreve sayılır
  let focusId = storage.get(KEYS.focusTask, null);
  const focusTask = () => todos.find((t) => t.id === focusId && !t.done) || null;
  const focusLine = $('#focus-task');
  const focusText = $('#focus-task-text');

  function setFocus(id) {
    focusId = id;
    storage.set(KEYS.focusTask, id);
    todoList.querySelectorAll('.todo-focus').forEach((b) => b.setAttribute('aria-pressed', String(b.closest('.todo-item').dataset.id === id)));
    renderFocus();
  }

  function renderFocus() {
    const t = focusTask();
    focusLine.hidden = !t;
    if (t) focusText.textContent = t.text;
  }

  const FOCUS_ICON =
    '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="8" r="2" fill="currentColor"/></svg>';
  const DELETE_ICON =
    '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

  function createItem(todo) {
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
    if (todo.pomos) {
      const badge = document.createElement('span');
      badge.className = 'todo-pomos';
      badge.textContent = String(todo.pomos);
      badge.title = `${todo.pomos} pomodoro${todo.pomos === 1 ? '' : 's'}`;
      label.append(badge);
    }

    const focus = document.createElement('button');
    focus.type = 'button';
    focus.className = 'todo-focus';
    focus.setAttribute('aria-pressed', String(todo.id === focusId));
    focus.setAttribute('aria-label', `Focus on: ${todo.text}`);
    focus.title = 'Focus on this task';
    focus.innerHTML = FOCUS_ICON;
    focus.hidden = todo.done;

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'todo-delete';
    del.setAttribute('aria-label', `Delete: ${todo.text}`);
    del.title = 'Delete';
    del.innerHTML = DELETE_ICON;

    li.append(label, focus, del);
    return li;
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

  todoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = todoInput.value.trim();
    if (!text) return;
    const todo = { id: App.newId('t'), text: text.slice(0, 200), done: false };
    todos.push(todo);
    save();
    todoList.append(createItem(todo));
    renderMeta();
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
    li.querySelector('.todo-focus').hidden = todo.done;
    if (todo.done && focusId === todo.id) setFocus(null);
    save();
    renderMeta();
  });

  todoList.addEventListener('click', (e) => {
    const fb = e.target.closest('.todo-focus');
    if (fb) {
      const id = fb.closest('.todo-item').dataset.id;
      setFocus(focusId === id ? null : id);
      if (focusId) App.toast('Every pomodoro you finish now counts for this task.', 2600);
      return;
    }
    const del = e.target.closest('.todo-delete');
    if (!del) return;
    const li = del.closest('.todo-item');
    const neighbor = li.nextElementSibling || li.previousElementSibling;
    todos = todos.filter((t) => t.id !== li.dataset.id);
    save();
    li.remove();
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

  // Bitirilen odak oturumunu seçili göreve yaz
  App.on('timer:finished', ({ finished }) => {
    const t = focusTask();
    if (finished !== 'work' || !t) return;
    t.pomos = (t.pomos || 0) + 1;
    save();
    renderAll();
  });

  App.Todos = {
    leftCount: () => todos.filter((t) => !t.done).length,
    focused: () => focusTask(),
    all: () => todos.map((t) => ({ ...t })),
  };

  renderAll();
})();
