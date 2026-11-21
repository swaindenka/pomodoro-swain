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
      .map((t) => ({ id: String(t.id || App.newId('t')), text: t.text.trim().slice(0, 200), done: Boolean(t.done) }));
  }

  let todos = load();
  const save = () => storage.set(KEYS.todos, todos);

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

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'todo-delete';
    del.setAttribute('aria-label', `Delete: ${todo.text}`);
    del.title = 'Delete';
    del.innerHTML = DELETE_ICON;

    li.append(label, del);
    return li;
  }

  function renderMeta() {
    const left = todos.filter((t) => !t.done).length;
    todoEmpty.hidden = todos.length > 0;
    todoFooter.hidden = todos.length === 0;
    todoCount.textContent = left === 0 ? 'All done' : `${left} task${left === 1 ? '' : 's'} left`;
    clearDoneBtn.hidden = todos.length - left === 0;
    App.emit('todos:changed', left);
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
    save();
    renderMeta();
  });

  todoList.addEventListener('click', (e) => {
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

  App.Todos = {
    leftCount: () => todos.filter((t) => !t.done).length,
  };

  renderAll();
})();
