/*
 * Odak istatistikleri (yalnızca tarayıcıda saklanır).
 * Her gün için: pomodoro sayısı ve süresi, etiket başına pomodoro / süre, saat başına pomodoro, biten görevler.
 * Pencere üç sekmedir: Genel (hedef, özet, haftalık grafik, odak takvimi), Analiz (dönem seçimi,
 * etiketlere ve saatlere göre dağılım, görevler) ve Günlük (journal.js doldurur).
 */
(() => {
  'use strict';

  const App = window.App;
  const { storage, KEYS, $ } = App;
  const tr = App.t;
  const I18N = App.i18n;

  const KEEP_DAYS = 400;
  const HEAT_WEEKS = 20;

  const pad = (n) => String(n).padStart(2, '0');
  const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const daysAgo = (n) => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - n);
    return d;
  };
  const posInt = (v, max) => (Number.isFinite(v) && v > 0 ? Math.min(Math.round(v), max) : 0);

  function cleanDay(v) {
    const day = { p: posInt(v.p, 999), m: posInt(v.m, 99999), t: {}, h: {}, d: posInt(v.d, 999) };
    if (v.t && typeof v.t === 'object') {
      for (const [tag, val] of Object.entries(v.t)) {
        if (typeof tag !== 'string' || tag.length > 20 || !Array.isArray(val)) continue;
        const p = posInt(val[0], 999);
        if (p) day.t[tag] = [p, posInt(val[1], 99999)];
      }
    }
    if (v.h && typeof v.h === 'object') {
      for (const [hour, n] of Object.entries(v.h)) {
        const h = Number(hour);
        if (Number.isInteger(h) && h >= 0 && h < 24 && posInt(n, 999)) day.h[h] = posInt(n, 999);
      }
    }
    return day;
  }

  function load() {
    const raw = storage.get(KEYS.history, null);
    const out = {};
    if (raw && typeof raw === 'object') {
      for (const [k, v] of Object.entries(raw)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !v || typeof v !== 'object') continue;
        const day = cleanDay(v);
        if (day.p || day.m || day.d) out[k] = day;
      }
    }
    // önceki sürümden kalan bugünkü sayaç
    const today = dayKey(new Date());
    const legacy = App.Timer ? App.Timer.todayCount() : 0;
    if (!out[today] && legacy > 0) out[today] = { p: legacy, m: legacy * (App.Timer ? App.Timer.workMinutes() : 25), t: {}, h: {}, d: 0 };
    return out;
  }

  let history = load();

  function save() {
    const cutoff = dayKey(daysAgo(KEEP_DAYS));
    for (const k of Object.keys(history)) if (k < cutoff) delete history[k];
    storage.set(KEYS.history, history);
  }

  const blank = () => ({ p: 0, m: 0, t: {}, h: {}, d: 0 });
  const todayEntry = () => {
    const k = dayKey(new Date());
    if (!history[k]) history[k] = blank();
    return history[k];
  };

  // ---------- Kayıt ----------
  // Bitirilen pomodoro: o güne, o saate ve odaklanılan görevin her etiketine (etiketsizse '') yazılır
  App.on('timer:finished', ({ finished }) => {
    if (finished !== 'work') return;
    const min = App.Timer ? App.Timer.workMinutes() : 25;
    const cur = todayEntry();
    cur.p += 1;
    cur.m += min;
    const hour = new Date().getHours();
    cur.h[hour] = (cur.h[hour] || 0) + 1;
    const task = App.Todos && App.Todos.focused();
    const tags = task && task.tags.length ? task.tags : [''];
    for (const tag of tags) {
      const [p, m] = cur.t[tag] || [0, 0];
      cur.t[tag] = [p + 1, m + min];
    }
    save();
    if (!modal.hidden) render();
  });

  App.on('todo:done', () => {
    todayEntry().d += 1;
    save();
  });

  App.on('todo:undone', ({ at }) => {
    const k = dayKey(new Date(at));
    if (history[k] && history[k].d > 0) {
      history[k].d -= 1;
      save();
    }
  });

  const day = (n) => history[dayKey(daysAgo(n))] || blank();

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

  const hours = (m) => I18N.duration(m);
  const pomodoros = (n) => App.tn(n, '{n} pomodoro', '{n} pomodoros');
  const dayCount = (n) => App.tn(n, '{n} day', '{n} days');
  const goal = () => (App.Timer && App.Timer.setting('goal')) || 6;

  const modal = $('#modal-stats');
  const chart = $('#week-chart');
  const dayName = (d) => I18N.day(d.getDay(), true);

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // ---------- Sekmeler ----------
  let tab = 'overview';
  const tabs = modal.querySelectorAll('.stats-tab');
  function showTab(name) {
    tab = name;
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.statsTab === name)));
    modal.querySelectorAll('.stats-panel').forEach((p) => {
      p.hidden = p.dataset.statsPanel !== name;
    });
    render();
  }
  tabs.forEach((t) => t.addEventListener('click', () => showTab(t.dataset.statsTab)));
  modal.querySelector('.stats-tabs').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const list = [...tabs];
    const i = list.findIndex((t) => t.dataset.statsTab === tab);
    const next = list[(i + (e.key === 'ArrowRight' ? 1 : list.length - 1)) % list.length];
    showTab(next.dataset.statsTab);
    next.focus();
  });

  // ---------- Genel ----------
  function renderOverview() {
    const t = day(0);
    $('#st-today').textContent = String(t.p);
    $('#st-today-sub').textContent = tr('today · {time}', { time: hours(t.m) });
    let wp = 0;
    let wm = 0;
    for (let i = 0; i < 7; i++) {
      wp += day(i).p;
      wm += day(i).m;
    }
    $('#st-week').textContent = String(wp);
    $('#st-week-sub').textContent = tr('last 7 days · {time}', { time: hours(wm) });
    const s = streak();
    $('#st-streak').textContent = String(s);
    $('#st-streak-sub').textContent = tr('day streak · best {n}', { n: Math.max(s, bestStreak()) });

    const days = [];
    for (let i = 6; i >= 0; i--) days.push({ d: daysAgo(i), v: day(i), today: i === 0 });
    const max = Math.max(4, ...days.map((x) => x.v.p));
    chart.replaceChildren(
      ...days.map(({ d, v, today }) => {
        const col = el('div', 'week-col');
        col.classList.toggle('is-today', today);
        const bar = el('span', 'week-bar');
        bar.style.height = `${Math.round((v.p / max) * 100)}%`;
        const wrap = el('span', 'week-track');
        wrap.append(bar);
        col.append(el('span', 'week-num', v.p ? String(v.p) : ''), wrap, el('span', 'week-day', today ? tr('Today') : dayName(d)));
        return col;
      }),
    );
    chart.setAttribute('aria-label', tr('Pomodoros in the last 7 days: {list}', { list: days.map((x) => `${dayName(x.d)} ${x.v.p}`).join(', ') }));
    renderHeatmap();
  }

  // Odak takvimi: son 20 hafta, her kare bir gün (Pazartesi üstte); renk günlük hedefe göre koyulaşır
  function level(p) {
    if (!p) return 0;
    const g = goal();
    if (p >= g) return 4;
    if (p >= Math.ceil((g * 2) / 3)) return 3;
    if (p >= Math.ceil(g / 3)) return 2;
    return 1;
  }

  function renderHeatmap() {
    const root = $('#heatmap');
    const today = daysAgo(0);
    const mondayOffset = (today.getDay() + 6) % 7; // bugünün haftasındaki Pazartesi'ye uzaklık
    const startAgo = mondayOffset + (HEAT_WEEKS - 1) * 7;
    const cells = [];
    const months = [];
    let total = 0;
    let active = 0;
    let lastMonth = -1;
    for (let w = 0; w < HEAT_WEEKS; w++) {
      const weekStart = daysAgo(startAgo - w * 7);
      const m = weekStart.getMonth();
      // ayın ilk haftasının üstüne ay adı
      // ilk sütunda ay sonuna yakınsa yazılmaz (yanındaki ayın adıyla çakışmasın)
      if (m !== lastMonth && (w === 0 ? weekStart.getDate() <= 21 : weekStart.getDate() <= 7)) {
        months.push({ w, label: I18N.month(m, true) });
        lastMonth = m;
      }
      for (let r = 0; r < 7; r++) {
        const ago = startAgo - w * 7 - r;
        const cell = el('i', 'heat-cell');
        cell.style.gridColumn = String(w + 2);
        cell.style.gridRow = String(r + 2);
        if (ago < 0) {
          cell.classList.add('future');
        } else {
          const d = daysAgo(ago);
          const v = day(ago);
          cell.dataset.l = String(level(v.p));
          if (ago === 0) cell.classList.add('today');
          cell.title = `${I18N.dateLabel(d, { weekday: 'short', month: 'short' })}: ${v.p ? `${pomodoros(v.p)} · ${hours(v.m)}` : tr('no focus')}`;
          total += v.p;
          if (v.p) active++;
        }
        cells.push(cell);
      }
    }
    const labels = months.map(({ w, label }) => {
      const s = el('span', 'heat-month', label);
      s.style.gridColumn = `${w + 2} / span 3`;
      s.style.gridRow = '1';
      return s;
    });
    const days = [1, 0, 3, 0, 5, 0, 0].map((i) => (i ? I18N.day(i, true) : '')).map((d, r) => {
      const s = el('span', 'heat-day', d);
      s.style.gridRow = String(r + 2);
      s.style.gridColumn = '1';
      return s;
    });
    root.replaceChildren(...labels, ...days, ...cells);
    root.style.setProperty('--weeks', String(HEAT_WEEKS));
    const sum = { pomodoros: pomodoros(total), days: dayCount(active), weeks: HEAT_WEEKS };
    $('#heat-sum').textContent = tr('{pomodoros} · {days} in {weeks} weeks', sum);
    root.setAttribute('aria-label', tr('Focus calendar for the last {weeks} weeks: {pomodoros} on {days}.', sum));
  }

  // ---------- Analiz ----------
  let range = 7;
  $('#range-chips').addEventListener('click', (e) => {
    const b = e.target.closest('.range-chip');
    if (!b) return;
    range = Number(b.dataset.days);
    $('#range-chips')
      .querySelectorAll('.range-chip')
      .forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    renderInsights();
  });

  function sumRange(n) {
    const out = { p: 0, m: 0, d: 0, active: 0, tags: new Map(), hours: new Array(24).fill(0) };
    for (let i = 0; i < n; i++) {
      const v = day(i);
      out.p += v.p;
      out.m += v.m;
      out.d += v.d;
      if (v.p) out.active++;
      for (const [tag, [p, m]] of Object.entries(v.t)) {
        const cur = out.tags.get(tag) || [0, 0];
        out.tags.set(tag, [cur[0] + p, cur[1] + m]);
      }
      for (const [h, c] of Object.entries(v.h)) out.hours[h] += c;
    }
    return out;
  }

  function renderInsights() {
    const r = sumRange(range);
    $('#in-time').textContent = hours(r.m);
    $('#in-pomos').textContent = String(r.p);
    $('#in-done').textContent = String(r.d);
    $('#in-avg').textContent = r.active ? I18N.num(r.p / r.active) : '0';
    $('#in-avg-sub').textContent = tr('a day (on {days})', { days: App.tn(r.active, '{n} active day', '{n} active days') });

    // etiketlere göre
    const tags = [...r.tags.entries()].sort((a, b) => b[1][0] - a[1][0]);
    const hasTagged = tags.some(([tag]) => tag);
    const max = Math.max(1, ...tags.map(([, v]) => v[0]));
    $('#tag-bars').replaceChildren(
      ...(hasTagged ? tags : []).map(([tag, [p, m]]) => {
        const li = el('li', 'tag-bar');
        const color = tag && App.Tags ? App.Tags.color(tag) : 'var(--muted)';
        li.style.setProperty('--tag', color);
        const name = el('span', 'tag-bar-name', tag ? `#${tag}` : tr('No tag'));
        const track = el('span', 'tag-bar-track');
        const fill = el('span', 'tag-bar-fill');
        fill.style.width = `${Math.max(4, Math.round((p / max) * 100))}%`;
        track.append(fill);
        li.append(name, track, el('span', 'tag-bar-value', `${p} · ${hours(m)}`));
        li.title = `${tag ? `#${tag}` : tr('Without a tag')}: ${pomodoros(p)}, ${hours(m)}`;
        return li;
      }),
    );
    $('#tag-bars-empty').hidden = hasTagged;

    // saatlere göre
    const hmax = Math.max(1, ...r.hours);
    const peak = r.hours.indexOf(Math.max(...r.hours));
    $('#hour-chart').replaceChildren(
      ...r.hours.map((c, h) => {
        const col = el('span', 'hour-col');
        const bar = el('span', 'hour-bar');
        bar.style.height = `${c ? Math.max(8, Math.round((c / hmax) * 100)) : 0}%`;
        bar.classList.toggle('peak', c > 0 && h === peak);
        col.title = `${pad(h)}:00–${pad((h + 1) % 24)}:00 · ${pomodoros(c)}`;
        col.append(bar);
        return col;
      }),
    );
    $('#hours-peak').textContent = r.p ? tr('Most often around {h}:00', { h: pad(peak) }) : '';
    $('#hour-chart').setAttribute('aria-label', r.p ? tr('You focus most often around {h}:00.', { h: pad(peak) }) : tr('No pomodoros in this period yet.'));

    // görevler (bugüne kadar)
    const list = App.Todos ? App.Todos.all().filter((x) => x.pomos > 0).sort((a, b) => b.pomos - a.pomos).slice(0, 6) : [];
    $('#stat-tasks').replaceChildren(
      ...list.map((x) => {
        const li = el('li');
        li.classList.toggle('done', x.done);
        const name = el('span', 'stat-task-name', x.text);
        for (const tag of x.tags || []) {
          const chip = el('span', 'tag-chip', `#${tag}`);
          chip.style.setProperty('--tag', App.Tags.color(tag));
          name.append(' ', chip);
        }
        li.append(name, el('span', 'todo-pomos', x.est ? `${x.pomos}/${x.est}` : String(x.pomos)));
        return li;
      }),
    );
    $('#stat-tasks-empty').hidden = list.length > 0;
  }

  function render() {
    if (tab === 'overview') renderOverview();
    else if (tab === 'insights') renderInsights();
  }

  $('#today-count').addEventListener('click', () => {
    render();
    App.openModal('modal-stats');
  });

  // Son 7 günün özeti (haftalık günlük metni için)
  function week() {
    let p = 0;
    let m = 0;
    for (let i = 0; i < 7; i++) {
      p += day(i).p;
      m += day(i).m;
    }
    return { pomodoros: p, time: hours(m), streak: streak() };
  }

  App.on('settings:changed', () => {
    if (!modal.hidden) render();
  });

  App.Stats = { history: () => JSON.parse(JSON.stringify(history)), streak, week, render, showTab };
})();
