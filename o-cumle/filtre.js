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
if (typeof module !== 'undefined') module.exports = uygunsuzMu;
