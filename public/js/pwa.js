/*
 * Uygulama olarak yükleme: service worker'ı kaydeder; tarayıcı izin verince üst çubukta
 * "Install app" düğmesi çıkar ve uygulama ana ekrana / masaüstüne eklenir.
 */
(() => {
  'use strict';

  const App = window.App;
  const btn = document.getElementById('btn-install');

  // Dosyadan açıldığında (file://) service worker çalışmaz
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {
        /* yükleme olmadan da uygulama çalışır */
      });
    });
  }

  let deferred = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    btn.hidden = false;
  });

  btn.addEventListener('click', async () => {
    if (!deferred) return;
    const prompt = deferred;
    deferred = null;
    btn.hidden = true;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice && choice.outcome === 'dismissed') {
        deferred = null;
        App.toast('You can install it later from the browser menu.', 3000);
      }
    } catch {
      /* yoksay */
    }
  });

  window.addEventListener('appinstalled', () => {
    deferred = null;
    btn.hidden = true;
    App.toast('Pomodoro Room is installed. Open it from your home screen.', 3800);
  });
})();
