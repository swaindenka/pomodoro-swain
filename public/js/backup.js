/*
 * Yedek: tarayıcıda saklanan her şey (görevler, istatistikler, takvim, günlük, mekanlar, karakter, ayarlar)
 * tek bir JSON dosyasına indirilir; başka bir cihazda ya da tarayıcıda bu dosyadan geri yüklenir.
 */
(() => {
  'use strict';

  const App = window.App;
  const { $, t } = App;
  const PREFIX = 'pomodoro.';
  const KEY_RE = /^pomodoro\.[A-Za-z0-9_.-]{1,40}$/;
  const APP_ID = 'pomodoro-room';
  const MAX_FILE = 5 * 1024 * 1024;

  function collect() {
    const data = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && KEY_RE.test(key)) data[key] = localStorage.getItem(key);
      }
    } catch {
      /* tarayıcı depolaması yok */
    }
    return data;
  }

  const pad = (n) => String(n).padStart(2, '0');

  function download() {
    const data = collect();
    if (!Object.keys(data).length) {
      App.toast(t('There is nothing to back up yet.'));
      return;
    }
    const now = new Date();
    const backup = { app: APP_ID, version: 1, exported: now.toISOString(), data };
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pomodoro-room-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    App.toast(t('Backup saved. Keep the file somewhere safe.'), 3200);
  }

  // Dosyayı denetler; geçerliyse yalnızca uygulamanın anahtarlarını döndürür
  function parse(text) {
    let backup;
    try {
      backup = JSON.parse(text);
    } catch {
      return null;
    }
    if (!backup || backup.app !== APP_ID || !backup.data || typeof backup.data !== 'object') return null;
    const out = {};
    for (const [key, value] of Object.entries(backup.data)) {
      if (KEY_RE.test(key) && typeof value === 'string' && value.length <= 2 * 1024 * 1024) out[key] = value;
    }
    return Object.keys(out).length ? out : null;
  }

  function restore(file) {
    if (!file) return;
    if (file.size > MAX_FILE) {
      App.toast(t('This file is not a Pomodoro Room backup.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const data = parse(String(reader.result || ''));
      if (!data) {
        App.toast(t('This file is not a Pomodoro Room backup.'), 3200);
        return;
      }
      if (!window.confirm(t('Restore this backup? It replaces the tasks, stats, calendar, places and settings in this browser.'))) return;
      try {
        const old = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(PREFIX)) old.push(key);
        }
        for (const key of old) localStorage.removeItem(key);
        for (const [key, value] of Object.entries(data)) localStorage.setItem(key, value);
      } catch {
        App.toast(t('The backup could not be restored in this browser.'), 3200);
        return;
      }
      location.reload();
    };
    reader.onerror = () => App.toast(t('The backup could not be restored in this browser.'), 3200);
    reader.readAsText(file);
  }

  const fileInput = $('#backup-file');
  $('#backup-download').addEventListener('click', download);
  $('#backup-restore').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    e.stopPropagation(); // zamanlayıcı ayarlarına karışmasın
    restore(fileInput.files && fileInput.files[0]);
    fileInput.value = '';
  });

  App.Backup = { collect, parse };
})();
