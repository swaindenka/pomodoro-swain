'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const I18N = require('../public/js/i18n.js');

const { TR } = I18N;
const JS_DIR = path.join(__dirname, '..', 'public', 'js');
const STR = String.raw`'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"`;
const pick = (a, b) => (a !== undefined ? a : b).replace(/\\(.)/g, '$1');
const vars = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

function sources() {
  return fs
    .readdirSync(JS_DIR)
    .filter((f) => f.endsWith('.js') && f !== 'i18n.js')
    .map((f) => ({ file: f, src: fs.readFileSync(path.join(JS_DIR, f), 'utf8') }));
}

// t('…'), tr('…'), App.t('…') ve App.tn(n, '…', '…') çağrılarındaki sabit metinler
function usedKeys() {
  const keys = new Map();
  const add = (k, file) => keys.set(k, keys.get(k) || file);
  for (const { file, src } of sources()) {
    for (const m of src.matchAll(new RegExp(String.raw`(?:^|[^\w.])(?:t|tr|App\.t)\(\s*(?:${STR})`, 'g'))) add(pick(m[1], m[2]), file);
    for (const m of src.matchAll(new RegExp(String.raw`\btn\(\s*[^,]+?,\s*(?:${STR})\s*,\s*(?:${STR})`, 'g'))) {
      add(pick(m[1], m[2]), file);
      add(pick(m[3], m[4]), file);
    }
  }
  return keys;
}

test('koddaki her çevrilebilir metnin Türkçesi var ve değişkenleri aynı', () => {
  const keys = usedKeys();
  assert.ok(keys.size > 150, `yalnızca ${keys.size} metin bulundu`);
  for (const [key, file] of keys) {
    assert.ok(Object.prototype.hasOwnProperty.call(TR, key), `${file}: "${key}" sözlükte yok`);
    assert.deepEqual(vars(TR[key]), vars(key), `"${key}" çevirisindeki değişkenler farklı`);
  }
});

test('eşya, renk ve seçenek adlarının Türkçesi var', () => {
  for (const { file, src } of sources()) {
    for (const m of src.matchAll(/\b(?:name|label|colorNames|[A-Z_]+_NAMES)\s*[:=]\s*(\[[^\]]*\]|'[^']*')/g)) {
      for (const s of m[1].matchAll(/'([^']*)'/g)) {
        if (!s[1] || s[1] === 'Guest') continue; // oyuncu adı, çevrilmez
        assert.ok(Object.prototype.hasOwnProperty.call(TR, s[1]), `${file}: "${s[1]}" sözlükte yok`);
      }
    }
  }
});

test('sayfadaki sabit metinlerin Türkçesi var', () => {
  let html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  // tuş ve kod örnekleri çevrilmez; yerlerine boş öğe konur ki çevresindeki metinler ayrı kalsın
  html = html.replace(/<head>[\s\S]*?<\/head>/, '').replace(/<(script|style|svg|kbd|code)\b[\s\S]*?<\/\1>/g, '<i></i>');
  // data-no-i18n işaretli öğelerin içeriği çevrilmez
  html = html.replace(/<(\w+)[^>]*\bdata-no-i18n\b[^>]*>[\s\S]*?<\/\1>/g, '');
  const texts = new Set();
  for (const m of html.matchAll(/>([^<>]+)</g)) {
    const s = m[1].replace(/\s+/g, ' ').trim();
    if (/[A-Za-z]{2}/.test(s) && !s.startsWith('<!--')) texts.add(s);
  }
  for (const m of html.matchAll(/\s(?:placeholder|title|aria-label|alt)="([^"]+)"/g)) texts.add(m[1]);
  // JavaScript'in yüklenince değiştirdiği yer tutucular
  for (const s of ['0 pomodoros today', '#1 · Time to focus', '6 pomodoros a day']) texts.delete(s);
  const missing = [...texts].filter((s) => !Object.prototype.hasOwnProperty.call(TR, s.replace(/&amp;/g, '&')));
  assert.deepEqual(missing, []);
});

test('tarih, sayı ve süre biçimleri', () => {
  const d = new Date(2026, 10, 22, 12);
  assert.equal(I18N.lang, 'en');
  assert.equal(I18N.dateLabel(d), 'Sunday, 22 November');
  assert.equal(I18N.dateLabel(d, { weekday: false, month: 'short' }), '22 Nov');
  assert.equal(I18N.duration(45), '45 min');
  assert.equal(I18N.duration(90), '1.5 h');
  assert.equal(I18N.num(2.5), '2.5');
  assert.equal(I18N.tn(1, '{n} task left', '{n} tasks left'), '1 task left');
  assert.equal(I18N.tn(3, '{n} task left', '{n} tasks left'), '3 tasks left');
  assert.equal(I18N.t('Room {code}', { code: 'ABC' }), 'Room ABC');
});
