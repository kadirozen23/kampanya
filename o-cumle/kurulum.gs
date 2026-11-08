/**
 * O Cümle — cümle duvarının kayıt servisi (Google Apps Script)
 * 1) Bu kodu script.google.com'da yeni projeye yapıştır.
 * 2) Yukarıdan "kurulum" fonksiyonunu seçip Çalıştır'a bas, izin ver.
 * 3) Dağıt > Yeni dağıtım > Web uygulaması: "Ben olarak çalıştır", erişim "Herkes".
 * Gelen cümleler "O Cümle" tablosuna düşer. Duvarda görünmesi için
 * "Onay" sütununa  evet  yazman yeterli.
 */

const SAYFA = 'Cümleler';
const AZAMI = 240; // karakter

function kurulum() {
  const ss = SpreadsheetApp.create('O Cümle');
  const sh = ss.getSheets()[0];
  sh.setName(SAYFA);
  sh.appendRow(['Tarih', 'Cümle', 'Ders', 'Yıl', 'Ad', 'Onay']);
  sh.setFrozenRows(1);
  sh.getRange('A1:F1').setFontWeight('bold');
  sh.setColumnWidth(2, 420);
  const kural = SpreadsheetApp.newDataValidation().requireValueInList(['evet', 'hayır'], true).build();
  sh.getRange('F2:F5000').setDataValidation(kural);
  PropertiesService.getScriptProperties().setProperty('SS_ID', ss.getId());
  Logger.log('Tablo hazır: ' + ss.getUrl());
}

function tablo_() {
  const id = PropertiesService.getScriptProperties().getProperty('SS_ID');
  return SpreadsheetApp.openById(id).getSheetByName(SAYFA);
}

function temiz_(s, n) {
  return String(s || '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
}

// Duvar: yalnız onaylı cümleler
function doGet() {
  const rows = tablo_().getDataRange().getValues().slice(1);
  const onayli = rows
    .filter(r => String(r[5]).toLowerCase().trim() === 'evet')
    .map(r => ({ c: r[1], d: r[2], y: r[3], a: r[4], t: r[0] instanceof Date ? r[0].getTime() : 0 }))
    .reverse()
    .slice(0, 500);
  return ContentService.createTextOutput(JSON.stringify({ items: onayli, toplam: rows.length }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Yeni cümle: onaysız kaydedilir
function doPost(e) {
  let p = {};
  try { p = JSON.parse(e.postData.contents); } catch (err) { p = e.parameter || {}; }
  const c = temiz_(p.c, AZAMI);
  if (c.length < 4 || p.hp) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false })).setMimeType(ContentService.MimeType.JSON);
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    tablo_().appendRow([new Date(), c, temiz_(p.d, 40), temiz_(p.y, 10), temiz_(p.a, 30), '']);
  } finally { lock.releaseLock(); }
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}
