/**
 * ⚡ SYNC CATALOG - Cerebro Comics
 * Synchronise l'intégralité du catalogue Comics (Panini, Urban, Carrefour, Star Wars)
 * avec Excalibur Comics, la BnF, Amazon CDN, BDFugue et Cultura.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const auth = require('./auth_system.js');

const CATALOG_FILE = path.join(__dirname, 'all_comics_catalog.json');
const APPLIBD_HTML = path.join(__dirname, 'AppliBD.html');
const INDEX_HTML = path.join(__dirname, 'index.html');
const CONFIG_FILE = path.join(__dirname, 'collections_config.json');
const CONFIG_DATA_FILE = path.join(auth.DATA_DIR, 'collections_config.json');

function getConfigFile() {
  if (fs.existsSync(CONFIG_DATA_FILE)) return CONFIG_DATA_FILE;
  return CONFIG_FILE;
}

function loadCollectionsConfig() {
  const target = getConfigFile();
  if (fs.existsSync(target)) {
    try {
      return JSON.parse(fs.readFileSync(target, 'utf8'));
    } catch (e) {
      console.warn('⚠️ Erreur lecture collections_config.json :', e.message);
    }
  }
  return null;
}

function saveCollectionsConfig(cfg) {
  try {
    if (fs.existsSync(auth.DATA_DIR)) {
      fs.writeFileSync(CONFIG_DATA_FILE, JSON.stringify(cfg, null, 2), 'utf8');
    }
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
    } catch (err) {}
    return true;
  } catch (e) {
    console.error('⚠️ Erreur sauvegarde collections_config.json :', e.message);
    return false;
  }
}

// Rayons Excalibur Comics à aspirer
const EXCALIBUR_CATEGORIES = [
  // Panini / Marvel
  { slug: '1038-marvel-must-have-panini-comics-vf', universe: 'MARVEL', format: 'Marvel Must-Have', publisher: 'Panini Comics' },
  { slug: '518-marvel-anthologie', universe: 'MARVEL', format: 'Marvel Anthologie', publisher: 'Panini Comics' },
  { slug: '528-marvel-omnibus-vf', universe: 'MARVEL', format: 'Marvel Omnibus', publisher: 'Panini Comics' },
  { slug: '1178-omnibus-panini', universe: 'MARVEL', format: 'Marvel Omnibus', publisher: 'Panini Comics' },
  { slug: '520-marvel-deluxe', universe: 'MARVEL', format: 'Marvel Deluxe', publisher: 'Panini Comics' },
  { slug: '501-100-marvel', universe: 'MARVEL', format: '100% Marvel', publisher: 'Panini Comics' },
  { slug: '1127-mighty-marvel', universe: 'MARVEL', format: 'Mighty Marvel', publisher: 'Panini Comics' },
  { slug: '1126-les-tresors-de-marvel', universe: 'MARVEL', format: 'Les Trésors de Marvel', publisher: 'Panini Comics' },
  { slug: '1162-collection-les-legendes-marvel', universe: 'MARVEL', format: 'Les Légendes Marvel', publisher: 'Panini Comics' },
  { slug: '1131-les-icones-marvel', universe: 'MARVEL', format: 'Les Icônes Marvel', publisher: 'Panini Comics' },

  // Urban / DC
  { slug: '511-dc-deluxe', universe: 'DC', format: 'DC Deluxe', publisher: 'Urban Comics' },
  { slug: '508-dc-anthologie', universe: 'DC', format: 'DC Anthologie', publisher: 'Urban Comics' },
  { slug: '1088-dc-chronicles', universe: 'DC', format: 'DC Chronicles', publisher: 'Urban Comics' },
  { slug: '974-dc-black-label', universe: 'DC', format: 'DC Black Label', publisher: 'Urban Comics' },
  { slug: '1339-dc-paperback', universe: 'DC', format: 'DC Nomades', publisher: 'Urban Comics' },
  { slug: '1087-dc-infinite', universe: 'DC', format: 'DC Infinite', publisher: 'Urban Comics' },
  { slug: '959-dc-rebirth', universe: 'DC', format: 'DC Rebirth', publisher: 'Urban Comics' },
  { slug: '512-dc-essentiels', universe: 'DC', format: 'DC Essentiels', publisher: 'Urban Comics' },
  { slug: '515-dc-renaissance', universe: 'DC', format: 'DC Renaissance', publisher: 'Urban Comics' },
  { slug: '510-dc-classiques', universe: 'DC', format: 'DC Classiques', publisher: 'Urban Comics' },
  { slug: '1166-dawn-of-dc', universe: 'DC', format: 'Dawn of DC', publisher: 'Urban Comics' },
  { slug: '1333-comics-dc-absolute', universe: 'DC', format: 'DC Absolute', publisher: 'Urban Comics' },

  // Star Wars
  { slug: '1169-star-wars-omnibus', universe: 'STAR_WARS', format: 'Star Wars Omnibus', publisher: 'Panini Comics' },
  { slug: '1018-star-wars-deluxe', universe: 'STAR_WARS', format: 'Star Wars Deluxe', publisher: 'Panini Comics' }
];

// BnF SRU queries
const BNF_QUERIES = [
  { query: 'bib.publisher all "Panini comics" and bib.title all "Must-Have"', universe: 'MARVEL', format: 'Marvel Must-Have', publisher: 'Panini Comics' },
  { query: 'bib.publisher all "Panini comics" and bib.title all "Je suis"', universe: 'MARVEL', format: 'Marvel Anthologie', publisher: 'Panini Comics' },
  { query: 'bib.publisher all "Panini comics" and bib.title all "Omnibus"', universe: 'MARVEL', format: 'Marvel Omnibus', publisher: 'Panini Comics' },
  { query: 'bib.publisher all "Urban comics" and bib.title all "Deluxe"', universe: 'DC', format: 'DC Deluxe', publisher: 'Urban Comics' },
  { query: 'bib.publisher all "Urban comics" and bib.title all "Chronicles"', universe: 'DC', format: 'DC Chronicles', publisher: 'Urban Comics' },
  { query: 'bib.publisher all "Urban comics" and bib.title all "Anthologie"', universe: 'DC', format: 'DC Anthologie', publisher: 'Urban Comics' }
];

// Collections Carrefour Panini officielles (grandes fresques)
const CARREFOUR_COLLECTIONS = [
  // 1. Marvel : Le Côté Obscur (2020)
  { isbn: '9782809497694', title: 'Black Widow : Ce qu\'ils disent d\'elle', series: 'Black Widow', tome: 'Tome 1', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2021, price: 2.99 },
  { isbn: '9782809497700', title: 'Daredevil : L\'Homme sans peur', series: 'Daredevil', tome: 'Tome 2', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2021, price: 2.99 },
  { isbn: '9782809497717', title: 'Deadpool : Il faut soigner le soldat Wilson', series: 'Deadpool', tome: 'Tome 3', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2021, price: 2.99 },
  { isbn: '9782809497724', title: 'Doctor Strange : Au cœur des ténèbres', series: 'Doctor Strange', tome: 'Tome 4', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2021, price: 2.99 },
  { isbn: '9782809497731', title: 'Ghost Rider : La route de la vengeance', series: 'Ghost Rider', tome: 'Tome 5', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2021, price: 2.99 },
  { isbn: '9782809497748', title: 'Jessica Jones : Angle mort', series: 'Jessica Jones', tome: 'Tome 6', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2021, price: 2.99 },
  { isbn: '9782809497755', title: 'Punisher : Cercle de sang', series: 'Punisher', tome: 'Tome 7', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2021, price: 2.99 },
  { isbn: '9782809497762', title: 'Thanos : Révélation', series: 'Thanos', tome: 'Tome 8', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2021, price: 2.99 },
  { isbn: '9782809497779', title: 'Venom : Métamorphose', series: 'Venom', tome: 'Tome 9', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2021, price: 2.99 },
  { isbn: '9782809497786', title: 'Wolverine : L\'Arme X', series: 'Wolverine', tome: 'Tome 10', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2021, price: 2.99 },

  // 2. Marvel : Les Grandes Alliances (2022)
  { isbn: '9791039106405', title: 'Spider-Man & Fantastic Four', series: 'Spider-Man & Fantastic Four', tome: 'Tome 1', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2022, price: 2.99 },
  { isbn: '9791039106412', title: 'Avengers & X-Men', series: 'Avengers & X-Men', tome: 'Tome 2', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2022, price: 2.99 },
  { isbn: '9791039106429', title: 'Deadpool & Cable', series: 'Deadpool & Cable', tome: 'Tome 3', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2022, price: 2.99 },
  { isbn: '9791039106436', title: 'Daredevil & Elektra', series: 'Daredevil & Elektra', tome: 'Tome 4', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2022, price: 2.99 },
  { isbn: '9791039106443', title: 'Doctor Strange & Spider-Man', series: 'Doctor Strange & Spider-Man', tome: 'Tome 5', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2022, price: 2.99 },
  { isbn: '9791039106450', title: 'Thor & Iron Man', series: 'Thor & Iron Man', tome: 'Tome 6', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2022, price: 2.99 },
  { isbn: '9791039106467', title: 'Iron Man & Captain America', series: 'Iron Man & Captain America', tome: 'Tome 7', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2022, price: 2.99 },
  { isbn: '9791039106474', title: 'Wanda & La Vision', series: 'Wanda & La Vision', tome: 'Tome 8', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2022, price: 2.99 },
  { isbn: '9791039106481', title: 'Wolverine & Spider-Man', series: 'Wolverine & Spider-Man', tome: 'Tome 9', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2022, price: 2.99 },
  { isbn: '9791039106498', title: 'Falcon & Winter Soldier', series: 'Falcon & Winter Soldier', tome: 'Tome 10', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2022, price: 2.99 },

  // 3. Marvel : Les Grandes Batailles (2020)
  { isbn: '9782809489033', title: 'Avengers vs Ultron', series: 'Avengers', tome: 'Tome 1', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2020, price: 2.99 },
  { isbn: '9782809489040', title: 'Les Gardiens de la Galaxie vs Thanos', series: 'Gardiens de la Galaxie', tome: 'Tome 2', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2020, price: 2.99 },
  { isbn: '9782809489057', title: 'Deadpool vs Deadpool', series: 'Deadpool', tome: 'Tome 3', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2020, price: 2.99 },
  { isbn: '9782809489064', title: 'X-Men vs Magneto', series: 'X-Men', tome: 'Tome 4', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2020, price: 2.99 },
  { isbn: '9782809489071', title: 'Spider-Man vs Mysterio', series: 'Spider-Man', tome: 'Tome 5', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2020, price: 2.99 },
  { isbn: '9782809489088', title: 'Wolverine vs Dents de sabre', series: 'Wolverine', tome: 'Tome 6', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2020, price: 2.99 },
  { isbn: '9782809489095', title: 'Venom vs Spider-Man', series: 'Venom', tome: 'Tome 7', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2020, price: 2.99 },
  { isbn: '9782809489101', title: 'Thor vs Loki', series: 'Thor', tome: 'Tome 8', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2020, price: 2.99 },
  { isbn: '9782809489118', title: 'Captain America vs Crâne rouge', series: 'Captain America', tome: 'Tome 9', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2020, price: 2.99 },
  { isbn: '9782809489125', title: 'Iron Man vs Whiplash', series: 'Iron Man', tome: 'Tome 10', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2020, price: 2.99 },

  // 4. Spider-Man vs Les Sinister Six (2024)
  { isbn: '9791039104326', title: 'Spider-Man vs Docteur Octopus', series: 'Spider-Man', tome: 'Tome 1', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2024, price: 3.00 },
  { isbn: '9791039104333', title: 'Spider-Man vs Le Vautour', series: 'Spider-Man', tome: 'Tome 2', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2024, price: 3.00 },
  { isbn: '9791039104340', title: 'Spider-Man vs Kraven', series: 'Spider-Man', tome: 'Tome 3', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2024, price: 3.00 },
  { isbn: '9791039104357', title: 'Spider-Man vs Mystério', series: 'Spider-Man', tome: 'Tome 4', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2024, price: 3.00 },
  { isbn: '9791039104364', title: 'Spider-Man vs L\'Homme-Sable', series: 'Spider-Man', tome: 'Tome 5', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2024, price: 3.00 },
  { isbn: '9791039104371', title: 'Spider-Man vs Electro', series: 'Spider-Man', tome: 'Tome 6', universe: 'MARVEL', format: 'Marvel Carrefour', publisher: 'Panini Comics', year: 2024, price: 3.00 }
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchUrl(url, redirectCount = 0) {
  return new Promise((resolve) => {
    if (redirectCount > 5) return resolve('');
    const client = url.startsWith('http:') ? http : https;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      timeout: 15000
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let loc = res.headers.location;
        if (!loc.startsWith('http')) {
          const u = new URL(url);
          loc = `${u.protocol}//${u.host}${loc}`;
        }
        return fetchUrl(loc, redirectCount + 1).then(resolve);
      }
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    });
    req.on('error', () => resolve(''));
    req.on('timeout', () => { req.destroy(); resolve(''); });
  });
}

function isbn13to10(isbn13) {
  if (!isbn13 || isbn13.length !== 13 || !isbn13.startsWith('978')) return null;
  const core = isbn13.slice(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(core[i], 10) * (10 - i);
  }
  const rem = (11 - (sum % 11)) % 11;
  const check = rem === 10 ? 'X' : rem.toString();
  return core + check;
}

// Multi-tier cover resolver: ePagine HD -> Amazon CDN -> Cultura JPG -> BDFugue WebP
async function findHighResCover(isbn13) {
  if (!isbn13 || isbn13.length !== 13) return null;

  // 1. ePagine HD CDN (Base officielle des libraires français)
  const epagineUrl = `https://images.epagine.fr/${isbn13.slice(-3)}/${isbn13}_1_75.jpg`;
  const epagineOk = await new Promise(res => {
    https.get(epagineUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 4000 }, r => {
      const len = parseInt(r.headers['content-length'] || '0', 10);
      res(r.statusCode === 200 && len > 1500);
    }).on('error', () => res(false));
  });
  if (epagineOk) return epagineUrl;

  // 2. Amazon CDN
  const isbn10 = isbn13to10(isbn13);
  if (isbn10) {
    const amzUrl = `https://images-na.ssl-images-amazon.com/images/P/${isbn10}.01._SCLZZZZZZZ_.jpg`;
    const amzOk = await new Promise(res => {
      https.get(amzUrl, { timeout: 4000 }, r => {
        const len = parseInt(r.headers['content-length'] || '0', 10);
        res(r.statusCode === 200 && len > 1500);
      }).on('error', () => res(false));
    });
    if (amzOk) return amzUrl;
  }

  // 2. BDFugue WebP CDN
  const bdfUrl = `https://www.bdfugue.com/media/catalog/product/cache/0d950bd4d3aaddc02a824ea154d9c41e/${isbn13[0]}/${isbn13[1]}/${isbn13}_1_75.webp`;
  const bdfOk = await new Promise(res => {
    https.get(bdfUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 4000 }, r => {
      const len = parseInt(r.headers['content-length'] || '0', 10);
      res(r.statusCode === 200 && len > 1500);
    }).on('error', () => res(false));
  });
  if (bdfOk) return bdfUrl;

  // 3. Cultura CDN
  const cultUrl = `https://cdn.cultura.com/cdn-cgi/image/width=830/media/pim/TITELIVE/66_${isbn13}_1_75.jpg`;
  const cultOk = await new Promise(res => {
    https.get(cultUrl, { timeout: 4000 }, r => {
      const len = parseInt(r.headers['content-length'] || '0', 10);
      res(r.statusCode === 200 && len > 1500);
    }).on('error', () => res(false));
  });
  if (cultOk) return cultUrl;

  return null;
}

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTitleAndSeries(rawTitle, rawFormat) {
  let title = decodeHtmlEntities(rawTitle);

  title = title
    .replace(/\s*-\s*Must\s*Have/gi, '')
    .replace(/\s*-\s*Marvel\s*Must\s*Have/gi, '')
    .replace(/\s*-\s*Anthologie(?:\s*Marvel)?/gi, '')
    .replace(/\s*-\s*DC\s*Deluxe/gi, '')
    .replace(/\s*-\s*Marvel\s*Deluxe/gi, '')
    .replace(/\s*-\s*Marvel\s*Omnibus/gi, '')
    .replace(/\s*-\s*Omnibus(?:\s*VF)?/gi, '')
    .replace(/\s*-\s*Edition\s*(?:Collector|Prestige|Limitee|Noir et Blanc)/gi, '')
    .replace(/^Omnibus\s*:\s*/gi, '')
    .replace(/^Omnibus\s+/gi, '')
    .trim();

  // Strip reseller & bookstore search trailer keywords (Excalibur, Panini Comics, Urban Comics)
  const RESELLER_RX = /(?:\s*-\s*|\s+)(?:panini\s*comics\s*excalibur(?:\s*comics)?(?:\s*vf)?|excalibur\s*comics\s*panini(?:\s*comics)?(?:\s*vf)?|urban\s*comics\s*excalibur(?:\s*comics)?(?:\s*vf)?|excalibur\s*urban\s*comics(?:\s*vf)?|panini\s*excalibur\s*comics(?:\s*vf)?|excalibur\s*panini(?:\s*comics)?(?:\s*vf)?|excalibur\s*comics(?:\s*vf)?|urban\s*comics\s*blast\s*excalibur|urban\s*excalibur|panini\s*comics(?:\s*vf)?|urban\s*comics(?:\s*vf)?|excalibur(?:\s*vf)?)\s*$/i;
  const FORMAT_TRAILERS = /(?:\s*-\s*|\s+)(?:Marvel\s*Pocket(?:\s*panini\s*comics)?|Nomad(?:\s*Urban\s*Comics)?(?:\s*Excalibur)?|Poche(?:\s*Excalibur\s*Comics\s*Panini)?|Édition\s+Prestige\s+Panini\s+Comics|Edition\s+Collector\s+Panini\s+Comics(?:\s*Excalibur)?)\s*$/i;

  title = title.replace(RESELLER_RX, '').replace(FORMAT_TRAILERS, '').replace(RESELLER_RX, '').trim();

  let tome = 'One-Shot';
  const tomeMatch = title.match(/(?:Tome|Vol(?:\.|ume)?)\s*([0-9]+)/i);
  if (tomeMatch) {
    tome = 'Tome ' + parseInt(tomeMatch[1], 10);
  } else {
    // If title ends with a standalone number, like "Ultimate Universe 12" or "Fall of X 03"
    const endNumMatch = title.match(/\b([0-9]{1,2})\b(?:\s*\([0-9]{4}\))?$/i);
    if (endNumMatch) {
      tome = 'Tome ' + parseInt(endNumMatch[1], 10);
    }
  }

  // Franchise extraction without breaking hyphenated names (X-Factor, Spider-Man, X-Men)
  const FRANCHISES = [
    'Ultimate Fantastic Four', 'Fantastic Four', 'Quatre Fantastiques',
    'X-Factor', 'X-Men', 'X-Force', 'X-Statix', 'X-Treme X-Men',
    'Spider-Man', 'Spider-Gwen', 'Spider-Woman', 'Ant-Man', 'Shang-Chi',
    'Iron Man', 'Captain America', 'Predator', 'Aliens',
    'Avengers', 'Doctor Strange', 'Docteur Strange', 'Daredevil', 'Deadpool',
    'Wolverine', 'Hulk', 'Thor', 'Batman', 'Superman', 'Wonder Woman',
    'Flash', 'Green Lantern', 'Justice League', 'Harley Quinn', 'Nightwing', 'Catwoman', 'Star Wars'
  ];
  let series = '';
  for (const f of FRANCHISES) {
    const rx = new RegExp('^' + f.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'i');
    if (rx.test(title)) {
      series = f;
      break;
    }
  }
  if (!series) {
    if (rawFormat && rawFormat.includes('Anthologie') && title.toLowerCase().startsWith('je suis ')) {
      series = title.replace(/^Je suis /i, '').trim();
    } else {
      series = title.split(/\s+[-–—]\s+|[:•\/]/)[0].trim();
    }
  }
  series = series.replace(/\s*(?:Tome|Vol(?:\.|ume)?)\s*[0-9]+/i, '').trim();
  series = series.replace(RESELLER_RX, '').replace(FORMAT_TRAILERS, '').trim();
  if (!series || series.length > 35) {
    series = title;
  }

  return { title, series, tome };
}

function generateBookId(universe, format, isbn) {
  const u = (universe || 'BD').toLowerCase().slice(0, 2);
  const f = (format || 'cat').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
  return `${u}-${f}-${isbn}`;
}

function parseExcaliburPage(html, defaultUniverse, defaultFormat, defaultPublisher) {
  let containerHtml = html;
  const listMatch = html.match(/<section\s+id="products"[\s\S]*?<\/section>/i) ||
                    html.match(/<div\s+id="js-product-list"[\s\S]*?<\/div>/i);
  if (listMatch) {
    containerHtml = listMatch[0];
  }
  const articles = containerHtml.match(/<article class="product-miniature[^>]*>[\s\S]*?<\/article>/gi) || [];
  const results = [];

  for (let i = 0; i < articles.length; i++) {
    const item = articles[i];

    const linkMatch = item.match(/class="product-title"[^>]*>\s*<a href="([^"]+)"[^>]*>(.*?)<\/a>/i) ||
                      item.match(/<a href="([^"]+)"[^>]*class="[^"]*thumbnail/i);
    const link = linkMatch ? linkMatch[1] : '';
    let rawTitle = linkMatch && linkMatch[2] ? linkMatch[2] : '';
    if (!rawTitle) {
      const altMatch = item.match(/alt\s*=\s*"([^"]+)"/i);
      rawTitle = altMatch ? altMatch[1] : '';
    }

    // Extraction robuste de l'ISBN (dans le lien ou dans l'article)
    const isbnMatch = link.match(/-([0-9]{13})\.html$/) || link.match(/([0-9]{13})/);
    const isbn = isbnMatch ? isbnMatch[1] : '';
    if (!isbn) continue;

    const imgMatch = item.match(/data-full-size-image-url\s*=\s*"([^"]+)"/i) || item.match(/src\s*=\s*"([^"]+)"/i);
    let cover = imgMatch ? imgMatch[1] : '';
    if (cover.includes('home_default')) {
      cover = cover.replace('home_default', 'large_default');
    }

    const priceMatch = item.match(/<span class="price">([0-9]+[,\.][0-9]{2})\s*€<\/span>/i);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : null;

    const { title, series, tome } = cleanTitleAndSeries(rawTitle, defaultFormat);

    results.push({
      id: generateBookId(defaultUniverse, defaultFormat, isbn),
      universe: defaultUniverse,
      publisher: defaultPublisher,
      format: defaultFormat,
      series,
      tome,
      title,
      isbn,
      writer: '',
      artist: '',
      year: new Date().getFullYear(),
      price: price || 0,
      usIssues: '',
      cover,
      synopsis: ''
    });
  }
  return results;
}

async function scrapeExcaliburCategory(cat) {
  let page = 1;
  const items = [];
  while (true) {
    const url = `https://www.excalibur-comics.fr/${cat.slug}?page=${page}`;
    const html = await fetchUrl(url);
    if (!html) break;

    const pageItems = parseExcaliburPage(html, cat.universe, cat.format, cat.publisher);
    if (pageItems.length === 0) break;

    items.push(...pageItems);
    if (!html.includes(`page=${page + 1}`)) break;
    page++;
    if (page > 30) break;
    await sleep(150);
  }
  return items;
}

async function scrapeBnfQuery(bnfCat) {
  const items = [];
  const maxRecords = 50;
  let startRecord = 1;

  while (true) {
    const query = encodeURIComponent(bnfCat.query);
    const url = `https://catalogue.bnf.fr/api/SRU?version=1.2&operation=searchRetrieve&query=${query}&recordSchema=dublincore&startRecord=${startRecord}&maximumRecords=${maxRecords}`;
    const xml = await fetchUrl(url);
    if (!xml) break;

    const totalMatch = xml.match(/<srw:numberOfRecords>([0-9]+)<\/srw:numberOfRecords>/);
    const totalRecords = totalMatch ? parseInt(totalMatch[1], 10) : 0;
    if (totalRecords === 0) break;

    const records = xml.split('<srw:record>');
    if (records.length <= 1) break;

    for (let i = 1; i < records.length; i++) {
      const rec = records[i];

      const idMatches = rec.match(/<dc:identifier>([\s\S]*?)<\/dc:identifier>/gi) || [];
      let isbn = '';
      for (const rawId of idMatches) {
        if (rawId.includes('ISBN')) {
          const digits = rawId.replace(/[^0-9X]/gi, '');
          if (digits.length === 13) {
            isbn = digits;
            break;
          }
        }
      }
      if (!isbn) continue;

      const titleMatch = rec.match(/<dc:title>([\s\S]*?)<\/dc:title>/i);
      let rawTitle = titleMatch ? titleMatch[1] : '';
      rawTitle = rawTitle.split(/\s*[\/;]\s*(?:scénario|dessin|texte)/i)[0].trim();

      const creators = (rec.match(/<dc:creator>([\s\S]*?)<\/dc:creator>/gi) || [])
        .map(c => c.replace(/<\/?dc:creator>/gi, '').trim());
      const writer = creators[0] || '';
      const artist = creators[1] || '';

      const dateMatch = rec.match(/<dc:date>([0-9]{4})<\/dc:date>/i);
      const year = dateMatch ? parseInt(dateMatch[1], 10) : new Date().getFullYear();

      const { title, series, tome } = cleanTitleAndSeries(rawTitle, bnfCat.format);

      items.push({
        id: generateBookId(bnfCat.universe, bnfCat.format, isbn),
        universe: bnfCat.universe,
        publisher: bnfCat.publisher,
        format: bnfCat.format,
        series,
        tome,
        title,
        isbn,
        writer,
        artist,
        year,
        price: bnfCat.format.includes('Omnibus') ? 90 : (bnfCat.format.includes('Deluxe') ? 35 : (bnfCat.format.includes('Must-Have') ? 16 : 26)),
        usIssues: '',
        cover: '',
        synopsis: ''
      });
    }

    startRecord += maxRecords;
    if (startRecord > totalRecords || startRecord > 250) break;
    await sleep(200);
  }

  return items;
}


async function lookupBnfByIsbn(isbn) {
  try {
    const url = `https://catalogue.bnf.fr/api/SRU?version=1.2&operation=searchRetrieve&query=bib.isbn%20all%20%22${isbn}%22&recordSchema=dublincore&maximumRecords=1`;
    const xml = await fetchUrl(url);
    if (!xml) return null;
    const titleMatch = xml.match(/<dc:title>([\s\S]*?)<\/dc:title>/i);
    let title = titleMatch ? titleMatch[1].split(/\s*[\/;]\s*(?:scénario|dessin|texte)/i)[0].trim() : '';
    const creators = (xml.match(/<dc:creator>([\s\S]*?)<\/dc:creator>/gi) || [])
      .map(c => c.replace(/<\/?dc:creator>/gi, '').trim());
    const dateMatch = xml.match(/<dc:date>([0-9]{4})<\/dc:date>/i);
    const year = dateMatch ? parseInt(dateMatch[1], 10) : new Date().getFullYear();
    return { title, writer: creators[0] || '', artist: creators[1] || '', year };
  } catch (e) {
    return null;
  }
}

async function runSync() {
  console.log('===============================================================');
  console.log('🚀 DÉMARRAGE DE LA SYNCHRONISATION DU CATALOGUE COMICS COMPLET');
  console.log('===============================================================');

  // 1. Charger le catalogue existant (strictement 100% comics)
  const catalogMap = new Map();
  if (fs.existsSync(CATALOG_FILE)) {
    try {
      const existing = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
      for (const item of existing) {
        if (item && item.isbn && item.universe !== 'BD' && item.format !== 'Cartonné Franco-Belge') {
          catalogMap.set(item.isbn, item);
        }
      }
      console.log(`📁 Catalogue local comics chargé : ${catalogMap.size} albums.`);
    } catch (e) {
      console.warn('⚠️ Impossible de lire le catalogue existant.');
    }
  }

  const config = loadCollectionsConfig();
  const excaliburCats = (config && config.excaliburCategories) ? config.excaliburCategories : EXCALIBUR_CATEGORIES;
  const bnfQueries = (config && config.bnfQueries) ? config.bnfQueries : BNF_QUERIES;
  const customCollections = (config && config.customCollections) ? config.customCollections : null;

  // 2. Intégrer les collections personnalisées / Carrefour
  console.log('\n🛒 Intégration des opérations personnalisées...');
  let customAdded = 0;
  if (customCollections && Array.isArray(customCollections)) {
    for (const group of customCollections) {
      const colName = group.collectionName || 'Collection Spéciale';
      const colFormat = group.format || 'Marvel Carrefour';
      const colUniv = group.universe || 'MARVEL';
      const colPub = group.publisher || 'Panini Comics';
      const colPrice = group.price !== undefined ? group.price : 2.99;
      const books = group.books || [];

      for (const b of books) {
        const item = typeof b === 'string' ? { isbn: b } : { ...b };
        if (!item.isbn) continue;
        item.universe = item.universe || colUniv;
        item.format = item.format || colFormat;
        item.publisher = item.publisher || colPub;
        item.price = item.price !== undefined ? item.price : colPrice;
        item.series = item.series || colName;
        item.tome = item.tome || 'One-Shot';
        item.year = item.year || group.year || new Date().getFullYear();
        item.id = generateBookId(item.universe, item.format, item.isbn);

        if (!catalogMap.has(item.isbn)) {
          catalogMap.set(item.isbn, item);
          customAdded++;
        } else {
          const existing = catalogMap.get(item.isbn);
          if (item.title && !existing.title) existing.title = item.title;
          if (item.format) existing.format = item.format;
        }
      }
    }
    console.log(`   ✅ Collections personnalisées intégrées (+${customAdded} nouveaux).`);
  } else {
    for (const item of CARREFOUR_COLLECTIONS) {
      if (!catalogMap.has(item.isbn)) {
        item.id = generateBookId(item.universe, item.format, item.isbn);
        catalogMap.set(item.isbn, item);
        customAdded++;
      }
    }
    console.log(`   ✅ ${CARREFOUR_COLLECTIONS.length} tomes Carrefour intégrés (+${customAdded} nouveaux).`);
  }

  // 3. Aspiration des rayons Excalibur Comics
  console.log('\n🔍 [1/3] Aspiration des rayons Excalibur Comics...');
  for (const cat of excaliburCats) {
    process.stdout.write(`   ➡️ ${cat.format} (${cat.slug})... `);
    const items = await scrapeExcaliburCategory(cat);
    let newItems = 0;
    for (const item of items) {
      const existing = catalogMap.get(item.isbn);
      if (existing) {
        if (item.cover) existing.cover = item.cover;
        if (item.price && !existing.price) existing.price = item.price;
        if (!existing.format) existing.format = item.format;
      } else {
        catalogMap.set(item.isbn, item);
        newItems++;
      }
    }
    console.log(`${items.length} albums (+${newItems} nouveaux).`);
  }

  // 4. Interrogation BnF
  console.log('\n🏛️ [2/3] Interrogation du dépôt légal de la Bibliothèque nationale de France (BnF)...');
  for (const bnfCat of bnfQueries) {
    process.stdout.write(`   ➡️ BnF: ${bnfCat.format}... `);
    const items = await scrapeBnfQuery(bnfCat);
    let enriched = 0;
    let added = 0;
    for (const item of items) {
      const existing = catalogMap.get(item.isbn);
      if (existing) {
        if (!existing.writer && item.writer) existing.writer = item.writer;
        if (!existing.artist && item.artist) existing.artist = item.artist;
        if (!existing.year && item.year) existing.year = item.year;
        enriched++;
      } else {
        catalogMap.set(item.isbn, item);
        added++;
      }
    }
    console.log(`${items.length} notices (+${added} nouveaux, ${enriched} enrichis).`);
  }

  // 5. Récupération multi-CDN des couvertures manquantes (Amazon, BDFugue, Cultura)
  console.log('\n🖼️ [3/3] Résolution des couvertures manquantes (Amazon, BDFugue, Cultura)...');
  let coverFetched = 0;
  for (const item of catalogMap.values()) {
    if (!item.cover || item.cover === '') {
      const foundCover = await findHighResCover(item.isbn);
      if (foundCover) {
        item.cover = foundCover;
        coverFetched++;
      }
    }
  }
  console.log(`   ✅ ${coverFetched} couvertures complémentaires récupérées !`);

  // 6. Tri et filtrage 100% Comics
  const finalCatalog = Array.from(catalogMap.values()).filter(item => {
    if (item.universe === 'BD' || item.format === 'Cartonné Franco-Belge' || item.publisher === 'Dargaud / Casterman / Dupuis') {
      return false;
    }
    return true;
  });

  finalCatalog.sort((a, b) => {
    const fmtComp = (a.format || '').localeCompare(b.format || '');
    if (fmtComp !== 0) return fmtComp;
    const serComp = (a.series || '').localeCompare(b.series || '');
    if (serComp !== 0) return serComp;
    return (a.title || '').localeCompare(b.title || '');
  });

  // 7. Enregistrement all_comics_catalog.json
  fs.writeFileSync(CATALOG_FILE, JSON.stringify(finalCatalog, null, 2), 'utf8');
  console.log(`\n💾 Fichier "${CATALOG_FILE}" enregistré (${finalCatalog.length} albums).`);

  // 8. Mise à jour HTML embarqué
  updateHtmlFile(APPLIBD_HTML, finalCatalog);
  if (fs.existsSync(INDEX_HTML)) {
    updateHtmlFile(INDEX_HTML, finalCatalog);
  }

  // Stats
  const stats = {};
  for (const item of finalCatalog) {
    stats[item.format] = (stats[item.format] || 0) + 1;
  }

  console.log('\n===============================================================');
  console.log(`🎉 SYNCHRONISATION TERMINÉE : ${finalCatalog.length} COMICS DANS LE CATALOGUE !`);
  console.log('===============================================================');
  for (const [fmt, count] of Object.entries(stats)) {
    console.log(`  • ${fmt.padEnd(25)} : ${count} tomes`);
  }
  console.log('===============================================================\n');

  return {
    success: true,
    total: finalCatalog.length,
    stats
  };
}

function updateHtmlFile(filePath, catalog) {
  if (!fs.existsSync(filePath)) return;
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const catalogJson = JSON.stringify(catalog);
    const regex = /(?:const|let)\s+OFFICIAL_CATALOG\s*=\s*\[[\s\S]*?\];/;
    if (regex.test(content)) {
      content = content.replace(regex, `let OFFICIAL_CATALOG = ${catalogJson};`);
      content = content.replace(/<span id="tabCountCatalog">[0-9]+<\/span>/, `<span id="tabCountCatalog">${catalog.length}</span>`);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`📄 Fichier "${path.basename(filePath)}" mis à jour.`);
    }
  } catch (e) {
    console.error(`⚠️ Erreur mise à jour ${filePath} :`, e.message);
  }
}

if (require.main === module) {
  runSync().catch(err => console.error('Erreur :', err));
}


async function syncSingleCategory(cat) {
  console.log(`⚡ Synchronisation ciblée de la catégorie : ${cat.name || cat.format} (${cat.slug})`);
  const catalogMap = new Map();
  if (fs.existsSync(CATALOG_FILE)) {
    const existing = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
    for (const item of existing) {
      if (item && item.isbn && item.universe !== 'BD') catalogMap.set(item.isbn, item);
    }
  }

  const items = await scrapeExcaliburCategory(cat);
  let newItems = 0;
  for (const item of items) {
    const existing = catalogMap.get(item.isbn);
    if (existing) {
      if (item.cover) existing.cover = item.cover;
      if (item.price && !existing.price) existing.price = item.price;
    } else {
      catalogMap.set(item.isbn, item);
      newItems++;
    }
  }

  let coverCount = 0;
  for (const item of items) {
    if (!item.cover) {
      const c = await findHighResCover(item.isbn);
      if (c) {
        item.cover = c;
        coverCount++;
      }
    }
  }

  const finalCatalog = Array.from(catalogMap.values()).filter(item => item.universe !== 'BD' && item.format !== 'Cartonné Franco-Belge');
  finalCatalog.sort((a, b) => (a.format || '').localeCompare(b.format || '') || (a.series || '').localeCompare(b.series || '') || (a.title || '').localeCompare(b.title || ''));
  
  fs.writeFileSync(CATALOG_FILE, JSON.stringify(finalCatalog, null, 2), 'utf8');
  updateHtmlFile(APPLIBD_HTML, finalCatalog);
  if (fs.existsSync(INDEX_HTML)) updateHtmlFile(INDEX_HTML, finalCatalog);

  return { success: true, added: newItems, totalInCat: items.length, coversFetched: coverCount, totalCatalog: finalCatalog.length };
}

async function syncSingleCustom(group) {
  console.log(`⚡ Synchronisation ciblée de l'opération personnalisée : ${group.collectionName}`);
  const catalogMap = new Map();
  if (fs.existsSync(CATALOG_FILE)) {
    const existing = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
    for (const item of existing) {
      if (item && item.isbn && item.universe !== 'BD') catalogMap.set(item.isbn, item);
    }
  }

  const colName = group.collectionName || 'Collection Spéciale';
  const colFormat = group.format || 'Marvel Carrefour';
  const colUniv = group.universe || 'MARVEL';
  const colPub = group.publisher || 'Panini Comics';
  const colPrice = group.price !== undefined ? group.price : 2.99;
  let newItems = 0;

  for (const b of (group.books || [])) {
    const item = typeof b === 'string' ? { isbn: b } : { ...b };
    if (!item.isbn) continue;
    item.universe = item.universe || colUniv;
    item.format = item.format || colFormat;
    item.publisher = item.publisher || colPub;
    item.price = item.price !== undefined ? item.price : colPrice;
    item.series = item.series || colName;
    item.tome = item.tome || 'One-Shot';
    item.year = item.year || group.year || new Date().getFullYear();
    item.id = generateBookId(item.universe, item.format, item.isbn);

    if (!item.title) {
      const meta = await lookupBnfByIsbn(item.isbn);
      if (meta && meta.title) {
        item.title = meta.title;
        if (meta.writer) item.writer = meta.writer;
        if (meta.artist) item.artist = meta.artist;
        if (meta.year) item.year = meta.year;
      } else {
        item.title = item.series;
      }
    }

    if (!item.cover) {
      const cover = await findHighResCover(item.isbn);
      if (cover) item.cover = cover;
    }

    if (!catalogMap.has(item.isbn)) {
      catalogMap.set(item.isbn, item);
      newItems++;
    } else {
      const existing = catalogMap.get(item.isbn);
      if (item.cover) existing.cover = item.cover;
      if (item.title) existing.title = item.title;
    }
  }

  const finalCatalog = Array.from(catalogMap.values()).filter(item => item.universe !== 'BD' && item.format !== 'Cartonné Franco-Belge');
  finalCatalog.sort((a, b) => (a.format || '').localeCompare(b.format || '') || (a.series || '').localeCompare(b.series || '') || (a.title || '').localeCompare(b.title || ''));

  fs.writeFileSync(CATALOG_FILE, JSON.stringify(finalCatalog, null, 2), 'utf8');
  updateHtmlFile(APPLIBD_HTML, finalCatalog);
  if (fs.existsSync(INDEX_HTML)) updateHtmlFile(INDEX_HTML, finalCatalog);

  return { success: true, added: newItems, totalInCat: (group.books || []).length, totalCatalog: finalCatalog.length };
}


async function autoDiscoverCategories() {
  console.log('🔍 Scan automatique du catalogue et de l\'arborescence Excalibur Comics...');
  const html = await fetchUrl('https://www.excalibur-comics.fr/');
  if (!html) return [];

  const regex = /<a[^>]+href="https:\/\/www\.excalibur-comics\.fr\/([0-9]+-[a-z0-9\-]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  const discovered = [];
  const seen = new Set();

  while ((m = regex.exec(html)) !== null) {
    const slug = m[1];
    let name = m[2].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
    if (!name || name.length < 2 || seen.has(slug)) continue;
    seen.add(slug);

    const s = slug.toLowerCase();
    const n = name.toLowerCase();
    const full = s + ' ' + n;

    if (full.includes('manga') && !full.includes('marvel') && !full.includes('dc') && !full.includes('star-wars')) continue;
    if (full.includes('goodies') || full.includes('figurine') || full.includes('protection') || full.includes('accessoire')) continue;
    if (full.includes('franco-belge') || full.includes('tintin') || full.includes('asterix')) continue;

    let universe = null;
    let publisher = null;

    if (full.includes('star-wars') || full.includes('star wars')) {
      universe = 'STAR_WARS';
      publisher = 'Panini Comics';
    } else if (full.includes('marvel') || full.includes('panini') || full.includes('x-men') || full.includes('spider-man') || full.includes('avengers') || full.includes('venom')) {
      universe = 'MARVEL';
      publisher = 'Panini Comics';
    } else if (full.includes('dc') || full.includes('urban') || full.includes('batman') || full.includes('superman') || full.includes('supergirl')) {
      universe = 'DC';
      publisher = 'Urban Comics';
    }

    if (!universe) continue;

    let cleanName = name.replace(/&amp;/g, '&').trim();
    if (['Marvel', 'DC Comics', 'Star Wars', 'Albums', 'Periodiques', 'Comics'].includes(cleanName)) continue;

    discovered.push({
      name: cleanName,
      slug,
      universe,
      format: cleanName,
      publisher
    });
  }

  console.log(`✅ ${discovered.length} collections détectées automatiquement sur Excalibur Comics !`);
  return discovered;
}

async function autoDiscoverAndSync() {
  console.log('🤖 Auto-Découverte et Synchronisation Complète en cours...');
  const discovered = await autoDiscoverCategories();
  const config = loadCollectionsConfig() || { excaliburCategories: [], bnfQueries: [], customCollections: [] };
  const existingSlugs = new Set((config.excaliburCategories || []).map(c => c.slug));

  let addedCount = 0;
  for (const cat of discovered) {
    if (!existingSlugs.has(cat.slug)) {
      config.excaliburCategories.push(cat);
      existingSlugs.add(cat.slug);
      addedCount++;
    }
  }

  if (addedCount > 0) {
    saveCollectionsConfig(config);
    console.log(`🎉 ${addedCount} nouvelles collections ajoutées automatiquement à la configuration !`);
  } else {
    console.log('ℹ️ Toutes les collections détectées sont déjà configurées.');
  }

  return await runSync();
}

module.exports = { runSync, autoDiscoverCategories, autoDiscoverAndSync, syncSingleCategory, syncSingleCustom, loadCollectionsConfig, saveCollectionsConfig, lookupBnfByIsbn };
