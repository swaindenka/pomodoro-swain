/*
 * Odak istatistikleri: günlük geçmiş, haftalık grafik, seri (art arda çalışılan günler) ve görev bazında sayılar.
 * Veriler yalnızca tarayıcıda saklanır.
 */
(() => {
  'use strict';

  const App = window.App;
  const { storage, KEYS, $ } = App;

  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const daysAgo = (n) => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - n);
    return d;
  };

  function load() {
    const raw = storage.get(KEYS.history, null);
    const out = {};
    if (raw && typeof raw === 'object') {
      for (const [k, v] of Object.entries(raw)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !v || typeof v !== 'object') continue;
        const p = Number.isInteger(v.p) && v.p > 0 ? Math.min(v.p, 999) : 0;
        const m = Number.isFinite(v.m) && v.m > 0 ? Math.min(Math.round(v.m), 99999) : 0;
        if (p || m) out[k] = { p, m };
      }
    }
    // önceki sürümden kalan bugünkü sayaç
    const today = dayKey(new Date());
    const legacy = App.Timer ? App.Timer.todayCount() : 0;
    if (!out[today] && legacy > 0) out[today] = { p: legacy, m: legacy * (App.Timer ? App.Timer.workMinutes() : 25) };
    return out;
  }

  let history = load();

  function save() {
    // yalnızca son 180 günü tut
    const cutoff = dayKey(daysAgo(180));
    for (const k of Object.keys(history)) if (k < cutoff) delete history[k];
    storage.set(KEYS.history, history);
  }

  App.on('timer:finished', ({ finished }) => {
    if (finished !== 'work') return;
    const k = dayKey(new Date());
    const cur = history[k] || { p: 0, m: 0 };
    history[k] = { p: cur.p + 1, m: cur.m + (App.Timer ? App.Timer.workMinutes() : 25) };
    save();
    if (!modal.hidden) render();
  });

  const day = (n) => history[dayKey(daysAgo(n))] || { p: 0, m: 0 };

  function streak() {
    // bugün henüz çalışılmadıysa seri dünden itibaren sayılır
    let n = day(0).p > 0 ? 0 : 1;
    let count = 0;
    while (day(n).p > 0) {
      count++;
      n++;
    }
    return count;
  }

  function bestStreak() {
    const keys = Object.keys(history).filter((k) => history[k].p > 0).sort();
    let best = 0;
    let run = 0;
    let prev = null;
    for (const k of keys) {
      const d = new Date(`${k}T12:00:00`);
      run = prev && Math.round((d - prev) / 86400000) === 1 ? run + 1 : 1;
      best = Math.max(best, run);
      prev = d;
    }
    return best;
  }

  const hours = (m) => (m >= 60 ? `${(m / 60).toFixed(m >= 600 ? 0 : 1)} h` : `${m} min`);

  const modal = $('#modal-stats');
  const chart = $('#week-chart');
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function render() {
    const t = day(0);
    $('#st-today').textContent = String(t.p);
    $('#st-today-sub').textContent = `today · ${hours(t.m)}`;
    let wp = 0;
    let wm = 0;
    for (let i = 0; i < 7; i++) {
      wp += day(i).p;
      wm += day(i).m;
    }
    $('#st-week').textContent = String(wp);
    $('#st-week-sub').textContent = `last 7 days · ${hours(wm)}`;
    const s = streak();
    $('#st-streak').textContent = String(s);
    $('#st-streak-sub').textContent = `day streak · best ${Math.max(s, bestStreak())}`;

    const days = [];
    for (let i = 6; i >= 0; i--) days.push({ d: daysAgo(i), v: day(i), today: i === 0 });
    const max = Math.max(4, ...days.map((x) => x.v.p));
    chart.replaceChildren(
      ...days.map(({ d, v, today }) => {
        const col = document.createElement('div');
        col.className = 'week-col';
        col.classList.toggle('is-today', today);
        const num = document.createElement('span');
        num.className = 'week-num';
        num.textContent = v.p ? String(v.p) : '';
        const bar = document.createElement('span');
        bar.className = 'week-bar';
        bar.style.height = `${Math.round((v.p / max) * 100)}%`;
        const wrap = document.createElement('span');
        wrap.className = 'week-track';
        wrap.append(bar);
        const label = document.createElement('span');
        label.className = 'week-day';
        label.textContent = today ? 'Today' : DAY_NAMES[d.getDay()];
        col.append(num, wrap, label);
        return col;
      }),
    );
    chart.setAttribute('aria-label', `Pomodoros in the last 7 days: ${days.map((x) => `${DAY_NAMES[x.d.getDay()]} ${x.v.p}`).join(', ')}`);

    const tasks = App.Todos ? App.Todos.all().filter((x) => x.pomos > 0).sort((a, b) => b.pomos - a.pomos).slice(0, 6) : [];
    $('#stat-tasks').replaceChildren(
      ...tasks.map((x) => {
        const li = document.createElement('li');
        li.classList.toggle('done', x.done);
        const name = document.createElement('span');
        name.textContent = x.text;
        const n = document.createElement('span');
        n.className = 'todo-pomos';
        n.textContent = String(x.pomos);
        li.append(name, n);
        return li;
      }),
    );
    $('#stat-tasks-empty').hidden = tasks.length > 0;
  }

  $('#today-count').addEventListener('click', () => {
    render();
    App.openModal('modal-stats');
  });

  App.Stats = { history: () => ({ ...history }), streak, render };
})();
