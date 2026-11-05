/** Arabische und englische Ortsnamen → deutscher Ticket-Wert. Die Chat-Nachricht bleibt unverändert. */

function normAr(value) {
  return String(value || '')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىئ]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/\s+/g, ' ')
    .trim();
}

function normLat(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/\s+/g, ' ');
}

const PAIRS = [
  ['Berlin', ['برلين', 'بيرلين', 'berlin']],
  ['außerhalb Berlin', ['خارج برلين', 'خارج بيرلين', 'outside berlin', 'ausserhalb berlin', 'außerhalb berlin']],
  ['Bayern', ['بايرن', 'بافاريا', 'bavaria', 'bayern']],
  ['Brandenburg', ['براندنبورغ', 'براندنبورج', 'براندنبورج', 'brandenburg']],
  ['Baden-Württemberg', ['بادن فورتمبيرغ', 'بادن-فورتمبيرغ', 'بادن فورتمبيرج', 'baden-wurttemberg', 'baden wurttemberg']],
  ['Hamburg', ['هامبورغ', 'هامبورج', 'hamburg']],
  ['Bremen', ['بريمن', 'bremen']],
  ['Hessen', ['هيسن', 'هسن', 'hessen']],
  ['Niedersachsen', ['ساكسونيا السفلى', 'نيدرزاكسن', 'niedersachsen']],
  ['Nordrhein-Westfalen', ['شمال الراين-وستفاليا', 'شمال الراين وستفاليا', 'شمال الراين', 'nordrhein-westfalen', 'nrw']],
  ['Rheinland-Pfalz', ['راينلاند بفالتس', 'راينلاند-بفالتس', 'rheinland-pfalz']],
  ['Saarland', ['زارلاند', 'سارلاند', 'saarland']],
  ['Sachsen', ['ساكسونيا', 'زاكسن', 'sachsen']],
  ['Sachsen-Anhalt', ['ساكسونيا انهالت', 'ساكسونيا-أنهالت', 'sachsen-anhalt']],
  ['Schleswig-Holstein', ['شليسفيغ هولشتاين', 'شليزفيغ هولشتاين', 'schleswig-holstein']],
  ['Thüringen', ['تورينغن', 'تورينجن', 'thuringen', 'thueringen']],
  ['Mecklenburg-Vorpommern', ['مكلنبورغ', 'ميكلنبورغ', 'مكلنبورغ فوربومرن', 'mecklenburg-vorpommern']],
  ['München', ['ميونخ', 'ميونيخ', 'munich', 'muenchen', 'munchen']],
  ['Köln', ['كولونيا', 'كولن', 'cologne', 'koeln', 'koln']],
  ['Frankfurt', ['فرانكفورت', 'frankfurt', 'frankfurt am main']],
  ['Stuttgart', ['شتوتغارت', 'stuttgart']],
  ['Düsseldorf', ['دوسلدورف', 'dusseldorf', 'duesseldorf']],
  ['Dortmund', ['دورتموند', 'dortmund']],
  ['Essen', ['ايسن', 'essen']],
  ['Leipzig', ['لايبزيغ', 'لايبزيج', 'leipzig']],
  ['Dresden', ['دريسدن', 'dresden']],
  ['Hannover', ['هانوفر', 'hanover', 'hannover']],
  ['Nürnberg', ['نورنبرغ', 'نورنبيرغ', 'نورنبرج', 'nuremberg', 'nuernberg', 'nurnberg']],
  ['Duisburg', ['دويسبورغ', 'دويسبورج', 'duisburg']],
  ['Bochum', ['بوخوم', 'bochum']],
  ['Wuppertal', ['فوبرتال', 'wuppertal']],
  ['Bielefeld', ['بيليفيلد', 'bielefeld']],
  ['Bonn', ['بون', 'bonn']],
  ['Münster', ['مونستر', 'munster', 'muenster']],
  ['Karlsruhe', ['كارلسروه', 'karlsruhe']],
  ['Mannheim', ['مانهايم', 'mannheim']],
  ['Augsburg', ['اوغسبورغ', 'اوغسبورج', 'augsburg']],
  ['Wiesbaden', ['فيسبادن', 'wiesbaden']],
  ['Braunschweig', ['براونشفايغ', 'براونشفايج', 'braunschweig']],
  ['Kiel', ['كيل', 'kiel']],
  ['Chemnitz', ['كمنيتس', 'chemnitz']],
  ['Aachen', ['اخن', 'aachen']],
  ['Magdeburg', ['ماغديبورغ', 'ماغديبورج', 'magdeburg']],
  ['Freiburg', ['فرايبورغ', 'فرايبورج', 'freiburg']],
  ['Krefeld', ['كريفلد', 'krefeld']],
  ['Mainz', ['ماينتس', 'mainz']],
  ['Lübeck', ['لوبيك', 'lubeck', 'luebeck']],
  ['Erfurt', ['ارفورت', 'erfurt']],
  ['Rostock', ['روستوك', 'rostock']],
  ['Kassel', ['كاسل', 'kassel']],
  ['Potsdam', ['بوتسدام', 'potsdam']],
  ['Saarbrücken', ['زاربروكن', 'ساربروكن', 'saarbrucken', 'saarbruecken']],
  ['Heidelberg', ['هايدلبرغ', 'هايدلبرج', 'heidelberg']],
  ['Darmstadt', ['دارمشتات', 'darmstadt']],
  ['Regensburg', ['ريغنسبورغ', 'ريغنسبورج', 'regensburg']],
  ['Würzburg', ['فورتسبورغ', 'فورتسبورج', 'wurzburg', 'wuerzburg']],
  ['Wolfsburg', ['فولفسبورغ', 'فولفسبورج', 'wolfsburg']],
  ['Ulm', ['اولم', 'ulm']],
  ['Koblenz', ['كوبلنز', 'koblenz']],
  ['Trier', ['ترير', 'trier']],
  ['Jena', ['ينا', 'jena']],
  ['Schwerin', ['شفيرين', 'schwerin']],
  ['Cottbus', ['كوتبوس', 'cottbus']],
  ['Flensburg', ['فلنسبورغ', 'فلنسبورج', 'flensburg']],
  ['Konstanz', ['كونستانس', 'konstanz']],
  ['Marburg', ['ماربورغ', 'ماربورج', 'marburg']],
  ['Bamberg', ['بامبرغ', 'بامبرج', 'bamberg']],
  ['Bayreuth', ['بايرويت', 'bayreuth']],
  ['Aschaffenburg', ['اشافنبورغ', 'اشافنبورج', 'aschaffenburg']],
  ['Offenbach', ['اوفنباخ', 'offenbach']],
  ['Bremerhaven', ['بريمرهافن', 'bremerhaven']],
  ['Göttingen', ['غوتينغن', 'جوتينجن', 'gottingen', 'goettingen']],
  ['Heilbronn', ['هايلبرون', 'heilbronn']],
  ['Pforzheim', ['بفورتسهايم', 'pforzheim']],
  ['Tübingen', ['توبينغن', 'توبينجن', 'tubingen', 'tuebingen']],
  ['Hanau', ['هاناو', 'hanau']],
  ['Gießen', ['غيسن', 'giessen', 'giessen']],
  ['Kaiserslautern', ['كايزرسلاوترن', 'kaiserslautern']],
  ['Osnabrück', ['اوسنابروك', 'osnabruck', 'osnabrueck']],
  ['Oldenburg', ['اولدنبورغ', 'اولدنبورج', 'oldenburg']],
  ['Hagen', ['هاغن', 'هاجن', 'hagen']],
  ['Hamm', ['هام', 'hamm']],
  ['Leverkusen', ['ليفركوزن', 'leverkusen']],
  ['Halle', ['هاله', 'halle']],
  ['Erlangen', ['ارلانغن', 'ارلانجن', 'erlangen']],
  ['Ingolstadt', ['انغولشتات', 'انجولشتات', 'ingolstadt']],
  ['Paderborn', ['بادربورن', 'paderborn']],
  ['Neuss', ['نويس', 'neuss']],
  ['Recklinghausen', ['ريكلينغهاوزن', 'ريكلينجهاوزن', 'recklinghausen']],
  ['Ludwigshafen', ['لودفيغسهافن', 'لودفيجشافن', 'ludwigshafen']],
  ['Reutlingen', ['رويتلينغن', 'رويتلينجن', 'reutlingen']],
  ['Siegen', ['زيغن', 'زيغن', 'siegen']],
  ['Gütersloh', ['غووترسلوه', 'غوترسلوه', 'guetersloh', 'gutersloh']],
  ['Hildesheim', ['هيلدسهايم', 'hildesheim']],
  ['Salzgitter', ['زالتسغيتر', 'salzgitter']],
  ['Witten', ['فيتن', 'witten']],
  ['Moers', ['مويرس', 'moers']],
  ['Bergisch Gladbach', ['بيرغيش غلادباخ', 'بيرجيش جلادباخ', 'bergisch gladbach']],
  ['Mönchengladbach', ['مونشنغلادباخ', 'مونشنجلادباخ', 'moenchengladbach', 'monchengladbach']],
  ['Oberhausen', ['اوبرهاوزن', 'oberhausen']],
  ['Remscheid', ['رمشايد', 'remscheid']],
  ['Bottrop', ['بوتروب', 'bottrop']],
  ['Gelsenkirchen', ['غلزنكيرشن', 'جيلسنكيرشن', 'gelsenkirchen']],
  ['Herne', ['هيرنه', 'herne']],
  ['Mülheim', ['مولهايم', 'mulheim', 'muelheim']],
  ['Solingen', ['زولينغن', 'زولينجن', 'solingen']],
  ['Neumünster', ['نويمونستر', 'neumunster', 'neumuenster']],
  ['Passau', ['باساو', 'passau']],
  ['Landshut', ['لاندسهوت', 'landshut']],
  ['Rosenheim', ['روزينهايم', 'rosenheim']],
  ['Fürth', ['فورت', 'furth', 'fuerth']],
  ['Weimar', ['فايمار', 'weimar']],
  ['Dessau', ['ديساو', 'dessau']],
  ['Dessau-Roßlau', ['ديساو روسلو', 'ديساو-روسلو', 'dessau-rosslau']],
  ['Zwickau', ['تسفيكاو', 'zwickau']],
  ['Plauen', ['بلاون', 'plauen']],
  ['Görlitz', ['غورليتس', 'جورليتس', 'gorlitz', 'goerlitz']],
  ['Stralsund', ['شترالزوند', 'stralsund']],
  ['Greifswald', ['غرايفسفالد', 'greifswald']],
  ['Neubrandenburg', ['نويبراندنبورغ', 'نويبراندنبورج', 'neubrandenburg']],
  ['Frankfurt (Oder)', ['فرانكفورت اودر', 'frankfurt oder', 'frankfurt (oder)']],
  ['Brandenburg an der Havel', ['براندنبورغ ان در هافل', 'brandenburg an der havel']],
  ['Oranienburg', ['اورانينبورغ', 'اورانينبورج', 'oranienburg']],
  ['Bernau', ['برناو', 'bernau']],
  ['Eberswalde', ['ايبرسفالده', 'eberswalde']],
  ['Falkensee', ['فالكنزيه', 'falkensee']],
  ['Königs Wusterhausen', ['كونيغس فوسترهاوزن', 'كونيجس فوسترهاوزن', 'koenigs wusterhausen', 'konigs wusterhausen']],
  ['Ludwigsfelde', ['لودفيغسفيلده', 'لودفيجسفيلده', 'ludwigsfelde']],
  ['Teltow', ['تيلتو', 'teltow']],
  ['Kleinmachnow', ['كلاينماخنو', 'kleinmachnow']],
  ['Panketal', ['بانكيتال', 'panketal']],
  ['Hennigsdorf', ['هينينغسدورف', 'هينينجسدورف', 'hennigsdorf']],
  ['Strausberg', ['شتراوسبرغ', 'شتراوسبرج', 'strausberg']],
  ['Neuruppin', ['نويروبين', 'neuruppin']],
  ['Rathenow', ['راتينو', 'rathenow']],
  ['Luckenwalde', ['لوكنفالده', 'luckenwalde']],
  ['Zossen', ['توسن', 'zossen']],
  ['Schönefeld', ['شونيفيلد', 'schoenefeld', 'schonefeld']],
  ['Blankenfelde', ['بلانكنفيلده', 'blankenfelde']],
  ['Mahlow', ['مالو', 'mahlow']]
];

const ARABIC = new Map();
const LATIN = new Map();

for (const [german, aliases] of PAIRS) {
  LATIN.set(normLat(german), german);
  for (const alias of aliases) {
    if (/[\u0600-\u06FF]/.test(alias)) ARABIC.set(normAr(alias), german);
    else LATIN.set(normLat(alias), german);
  }
}

export function stadtForTicket(raw) {
  const text = String(raw || '').trim().replace(/\s+/g, ' ');
  if (!text) return '';
  const latin = text.replace(/[\u0600-\u06FF\u064B-\u065F\u0670\u0640]/g, ' ').replace(/\s+/g, ' ').trim();
  const arabic = normAr(text.replace(/[^\u0600-\u06FF\s]/g, ' '));
  if (latin && LATIN.has(normLat(latin))) return LATIN.get(normLat(latin));
  if (arabic && ARABIC.has(arabic)) return ARABIC.get(arabic);
  return null;
}
