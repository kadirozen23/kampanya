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

// Duvar: yalnız onaylı cümleler (?tur=sayac → 10 Kasım saygı duruşu sayısı)
function doGet(e) {
  if (e && e.parameter && e.parameter.tur === 'sayac') {
    const n = Number(PropertiesService.getScriptProperties().getProperty('DURDUM') || 0);
    return ContentService.createTextOutput(JSON.stringify({ sayi: n })).setMimeType(ContentService.MimeType.JSON);
  }
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
  if (p.tur === 'durdum') {
    const l = LockService.getScriptLock(); l.waitLock(10000);
    try { const pr = PropertiesService.getScriptProperties(); pr.setProperty('DURDUM', String(Number(pr.getProperty('DURDUM') || 0) + 1)); }
    finally { l.releaseLock(); }
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  }
  const c = temiz_(p.c, AZAMI);
  if (c.length < 4 || p.hp || [c, p.d, p.a].some(uygunsuzMu)) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false })).setMimeType(ContentService.MimeType.JSON);
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    tablo_().appendRow([new Date(), c, temiz_(p.d, 40), temiz_(p.y, 10), temiz_(p.a, 30), '']);
  } finally { lock.releaseLock(); }
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}

// O Cümle — uygunsuz ifade filtresi (sayfada ve kayıt servisinde aynı kod)
// Kelimenin kendisini kullanıcıya göstermez; yalnız "uygun değil" der.
function uygunsuzMu(metin) {
  if (!metin) return false;
  var t = String(metin).toLocaleLowerCase('tr-TR');
  // bağlantı, e-posta, telefon numarası: kişisel bilgi ve reklam
  if (/(https?:\/\/|www\.|\.com\b|\.net\b|\.org\b|\.tr\b|@[a-z0-9_]{3,}|\b\d[\d\s-]{8,}\d\b)/.test(t)) return true;
  // karakter oyunlarını çöz: 4→a 3→e 1/!→i 0→o 5/$→s 7→t @→a
  t = t.replace(/4|@/g, 'a').replace(/3/g, 'e').replace(/[1!|]/g, 'i').replace(/0/g, 'o').replace(/[5$]/g, 's').replace(/7/g, 't');
  // Türkçe harfleri sadeleştirmeden önce ve sonra iki sürüm kontrol edilir
  var sade = t.replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u');
  var kontrol = [t, sade].map(function (s) {
    s = s.replace(/[^a-zçğıöşü\s]/g, ' ');            // noktalama: s.i.k → s i k
    s = s.replace(/(.)\1{2,}/g, '$1$1');               // siiiiktir → siiktir
    // tek harfleri birleştir: "s i k t i r" → "siktir"
    s = s.replace(/\b(?:[a-zçğıöşü]\s+){2,}[a-zçğıöşü]\b/g, function (m) { return m.replace(/\s+/g, ''); });
    return s.split(/\s+/).filter(Boolean);
  });
  var TAM = ['amk', 'aq', 'amq', 'mk', 'oc', 'oç', 'sg', 'bok', 'boktan', 'ibne', 'puşt', 'pust', 'piç', 'pic', 'göt', 'got'];
  var KOK = ['orospu', 'orosbu', 'siktir', 'sikerim', 'sikeyim', 'sikim', 'sikik', 'siktig', 'siktiğ', 'sikis', 'sikiş', 'yarrak', 'yarak', 'amcık', 'amcik',
    'amına', 'amina', 'amını', 'amini', 'ananı', 'anani', 'ananızı', 'ananizi', 'gavat', 'kahpe', 'pezevenk', 'yavşak', 'yavsak', 'kaltak', 'sürtük',
    'surtuk', 'fahişe', 'fahise', 'godoş', 'godos', 'kodumun', 'şerefsiz', 'serefsiz', 'haysiyetsiz', 'namussuz', 'gerizekal', 'geri zekal', 'dangalak',
    'göte', 'götü', 'götün', 'gote', 'gotu', 'gotun', 'götveren', 'gotveren', 'ibneler', 'piçler', 'picler', 'piçlik', 'piclik', 'puştlar', 'pustlar'];
  var IZIN = ['götür', 'goture', 'gotur', 'götüren', 'sikke', 'yarakt', 'ananas', 'gotik', 'gotham', 'picasso', 'piknik'];
  var IZIN_TAM = ['amin', 'amine', 'aminler'];
  for (var k = 0; k < kontrol.length; k++) {
    var kel = kontrol[k];
    var genis = [];
    kel.forEach(function (x) { genis.push(x); var tek = x.replace(/(.)\1+/g, '$1'); if (tek !== x) genis.push(tek); });
    for (var i = 0; i < genis.length; i++) {
      var w = genis[i];
      if (IZIN_TAM.indexOf(w) >= 0 || IZIN.some(function (x) { return w.indexOf(x) === 0; })) continue;
      if (TAM.indexOf(w) >= 0) return true;
      if (KOK.some(function (x) { return w.indexOf(x) === 0; })) return true;
    }
    var bitisik = kel.join(' ');
    if (/\bgeri\s?zekal/.test(bitisik)) return true;
  }
  return false;
}
