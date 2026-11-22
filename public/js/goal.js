/*
 * Günlük hedef: "bugün 6 pomodoro" gibi bir hedef ve dolan bir halka.
 * Halka üst çubukta ve istatistik penceresinde görünür; hedefe ulaşılınca küçük bir kutlama yapılır.
 */
(() => {
  'use strict';

  const App = window.App;
  const Sh = window.Shared;
  const { $, t } = App;
  const [GOAL_MIN, GOAL_MAX] = Sh.SETTING_LIMITS.goal;

  const btn = $('#today-count');
  const text = $('#today-text');
  const fills = [$('#goal-fill'), $('#goal-fill-lg')];
  const bigText = $('#goal-big-text');
  const title = $('#goal-title');
  const sub = $('#goal-sub');
  const value = $('#goal-value');
  const minus = $('#goal-minus');
  const plus = $('#goal-plus');
  const panel = $('#goal-panel');

  const goal = () => App.Timer.setting('goal') || Sh.DEFAULT_SETTINGS.goal;
  const count = () => App.Timer.todayCount();
  const plural = (n) => App.tn(n, '{n} pomodoro', '{n} pomodoros');

  function render() {
    const n = count();
    const g = goal();
    const done = n >= g;
    const pct = Math.min(100, (n / g) * 100);
    for (const f of fills) f.style.strokeDashoffset = String(100 - pct);
    btn.classList.toggle('goal-done', done);
    panel.classList.toggle('goal-done', done);
    text.textContent = done ? t('{count} today · goal reached', { count: plural(n) }) : t('{n} / {goal} today', { n, goal: plural(g) });
    btn.setAttribute('aria-label', t('{count} today, daily goal {goal}. Open your focus stats.', { count: plural(n), goal: g }));
    bigText.textContent = `${n}/${g}`;
    title.textContent = done ? t('Daily goal reached!') : t('{n} to go today', { n: g - n });
    sub.textContent = done ? t('You set {goal} a day. Anything more is a bonus.', { goal: plural(g) }) : t('Daily goal: {goal}', { goal: plural(g) });
    value.textContent = String(g);
    minus.disabled = g <= GOAL_MIN;
    plus.disabled = g >= GOAL_MAX;
  }

  function change(delta) {
    App.Timer.setPersonal('goal', goal() + delta);
  }

  minus.addEventListener('click', () => change(-1));
  plus.addEventListener('click', () => change(1));

  // Bu pomodoroyla hedef tamamlandıysa kutla (her gün hedefe ilk ulaşıldığında bir kez)
  App.on('timer:finished', ({ finished }) => {
    render();
    if (finished !== 'work' || count() !== goal()) return;
    setTimeout(() => {
      App.toast(t('Daily goal reached: {goal} today! 🎉', { goal: plural(goal()) }), 5000);
      if (App.Audio && App.Timer.setting('sound')) App.Audio.fanfare();
      App.emit('goal:reached', goal());
      for (const el of [btn, panel]) {
        el.classList.remove('goal-pop');
        void el.offsetWidth;
        el.classList.add('goal-pop');
      }
    }, 900);
  });

  App.on('today:changed', render);
  App.on('settings:changed', render);
  // gece yarısı sayaç sıfırlanınca halka da boşalsın
  setInterval(render, 60000);

  App.Goal = { render, goal };
  render();
})();
