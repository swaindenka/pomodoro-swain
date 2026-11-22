/*
 * Mola önerileri: mola başlayınca zamanlayıcının altında kısa, sağlıklı bir öneri çıkar.
 * "Do it" karakterine öneriyi yaptırır; süreli önerilerde geri sayım başlar.
 */
(() => {
  'use strict';

  const App = window.App;
  const { $, t } = App;

  // act: karakterin yapacağı hareket, seconds: geri sayım (isteğe bağlı)
  const SHORT = [
    { icon: '\u{1F646}', text: 'Stand up and stretch your arms and back.', act: 'stretch' },
    { icon: '\u{1F4A7}', text: 'Drink a glass of water.', act: 'drink' },
    { icon: '\u{1F440}', text: '20-20-20: look at something about 6 meters away for 20 seconds.', seconds: 20 },
    { icon: '\u{1F32C}️', text: 'Take five slow, deep breaths: in for 4, out for 6.', seconds: 50 },
    { icon: '\u{1F504}', text: 'Roll your shoulders and gently turn your neck.', act: 'stretch' },
    { icon: '\u{1F634}', text: 'Close your eyes and rest them for 30 seconds.', act: 'yawn', seconds: 30 },
    { icon: '\u{1F9F9}', text: 'Tidy up your desk a little.' },
    { icon: '\u{1FA9F}', text: 'Open a window and get some fresh air.' },
  ];
  const LONG = [
    { icon: '\u{1F6B6}', text: 'Go for a short walk, even just around the room.' },
    { icon: '\u{1F34E}', text: 'Have a healthy snack.' },
    { icon: '☀️', text: 'Step outside or get some daylight for a few minutes.' },
    { icon: '\u{1F375}', text: 'Make yourself a cup of tea.', act: 'drink' },
    { icon: '\u{1F938}', text: 'Do a quick stretching routine for your whole body.', act: 'stretch' },
    { icon: '\u{1F4AC}', text: 'Check in with a friend or send a nice message.' },
  ];

  const card = $('#break-tip');
  const iconEl = $('#break-icon');
  const textEl = $('#break-text');
  const doBtn = $('#break-do');
  let current = null;
  let last = { short: -1, long: -1 };
  let countdown = null;

  function pick(kind) {
    const list = kind === 'long' ? LONG : SHORT;
    let i = Math.floor(Math.random() * list.length);
    if (list.length > 1 && i === last[kind]) i = (i + 1) % list.length;
    last[kind] = i;
    return list[i];
  }

  function stopCountdown() {
    clearInterval(countdown);
    countdown = null;
  }

  function show(kind) {
    stopCountdown();
    current = pick(kind);
    current.kind = kind;
    iconEl.textContent = current.icon;
    textEl.textContent = t(current.text);
    doBtn.disabled = false;
    doBtn.textContent = current.seconds ? t('Start {s}s', { s: current.seconds }) : t('Do it');
    card.hidden = false;
  }

  function hide() {
    stopCountdown();
    card.hidden = true;
    current = null;
  }

  doBtn.addEventListener('click', () => {
    if (!current) return;
    if (current.act && App.Game) App.Game.playAct(current.act);
    if (!current.seconds) {
      doBtn.disabled = true;
      doBtn.textContent = t('Nice! ✓');
      return;
    }
    let left = current.seconds;
    doBtn.disabled = true;
    doBtn.textContent = t('{s}s', { s: left });
    stopCountdown();
    countdown = setInterval(() => {
      left--;
      if (left > 0) {
        doBtn.textContent = t('{s}s', { s: left });
        // gözleri dinlendirirken karakter de arada esner
        if (current && current.act && left % 8 === 0 && App.Game) App.Game.playAct(current.act);
        return;
      }
      stopCountdown();
      doBtn.textContent = t('Done! ✓');
      if (App.Audio) App.Audio.sfx('pick');
    }, 1000);
  });

  $('#break-next').addEventListener('click', () => current && show(current.kind));

  // Mola başlayınca öneri göster, karakter de hemen yapsın
  App.on('timer:mode', (mode) => {
    if (mode === 'short' || mode === 'long') {
      show(mode);
      if (current.act && App.Game) setTimeout(() => App.Game.playAct(current.act), 1200);
    } else hide();
  });
})();
