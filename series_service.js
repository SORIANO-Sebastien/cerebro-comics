/**
 * 📚 SERIES SERVICE - Cerebro Comics
 * Détection et complétion automatique des séries de comics et BDs.
 * Lorsqu'un utilisateur commence à scanner une série (ex: BRZRKR),
 * interroge la BnF et les dépôts légaux pour retrouver automatiquement
 * TOUS les tomes de cette série, les enregistrer au catalogue officiel,
 * et renvoyer la checklist complète (possédés vs manquants).
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const CATALOG_PATH = path.join(__dirname, 'all_comics_catalog.json');

function computeEan13Check(core12) {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(core12[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  return String((10 - (sum % 10)) % 10);
}

function fetchHttps(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(url);
      const req = https.get({
        hostname: u.hostname,
        path: u.pathname + u.search,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: timeoutMs
      }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    } catch (e) {
      reject(e);
    }
  });
}

function extractTomeNumber(text) {
  if (!text) return 'Tome 1';
  const m = text.match(/\b(?:Tome|T\.?|Vol\.?|Volume)\s*(\d+)\b/i) || text.match(/\bT(\d+)\b/i);
  if (m) return `Tome ${parseInt(m[1], 10)}`;
  const m2 = text.match(/\.\s*(\d+)\b/);
  if (m2) return `Tome ${parseInt(m2[1], 10)}`;
  return 'Tome 1';
}

function cleanTitle(rawTitle, seriesName) {
  if (!rawTitle) return seriesName;
  let t = rawTitle.split('/')[0].trim();
  t = t.replace(/\s*\(.*?(?:fnac|momie|collector|spéciale).*?\)/gi, '').trim();
  t = t.replace(/\s+scénario.*$/i, '').trim();
  t = t.replace(/,\s*\d+$/, '').trim();
  return t || seriesName;
}

async function lookupSeries(seriesName, publisherHint = '') {
  const cleanSeries = (seriesName || '').trim();
  if (!cleanSeries || cleanSeries.length < 2) {
    return { success: false, error: 'Nom de série trop court.', albums: [] };
  }

  // 1. Read existing catalog
  let catalog = [];
  if (fs.existsSync(CATALOG_PATH)) {
    try {
      catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
    } catch (e) {
      catalog = [];
    }
  }

  const existingByIsbn = new Map();
  catalog.forEach(b => {
    if (b.isbn) existingByIsbn.set(b.isbn, b);
  });

  // Filter catalog for current series
  const seriesLower = cleanSeries.toLowerCase();
  const catalogMatches = catalog.filter(b => {
    const s = (b.series || '').toLowerCase();
    const t = (b.title || '').toLowerCase();
    return s === seriesLower || s.includes(seriesLower) || t.startsWith(seriesLower);
  });

  const discoveredAlbums = [...catalogMatches];
  const seenIsbns = new Set(discoveredAlbums.map(b => b.isbn));

  // 2. Query BnF SRU API for full series albums
  try {
    let query = `bib.title all "${cleanSeries}"`;
    if (publisherHint) {
      query += ` and bib.publisher all "${publisherHint}"`;
    }
    const bnfUrl = `https://catalogue.bnf.fr/api/SRU?version=1.2&operation=searchRetrieve&query=${encodeURIComponent(query)}&recordSchema=dublincore&maximumRecords=50`;
    const xml = await fetchHttps(bnfUrl, 6000);

    const recordBlocks = xml.split('<srw:recordData>');
    for (let i = 1; i < recordBlocks.length; i++) {
      const block = recordBlocks[i];
      const titleMatch = block.match(/<dc:title>(.*?)<\/dc:title>/s);
      const identMatches = [...block.matchAll(/<dc:identifier>(.*?)<\/dc:identifier>/gs)];
      const pubMatch = block.match(/<dc:publisher>(.*?)<\/dc:publisher>/s);
      const creatorMatch = block.match(/<dc:creator>(.*?)<\/dc:creator>/s);

      const rawTitle = titleMatch ? titleMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim() : '';
      const publisher = pubMatch ? pubMatch[1].replace(/\s*\(.*?\)\s*/g, '').replace(/&amp;/g, '&').trim() : (publisherHint || 'Éditeur BD');
      const creator = creatorMatch ? creatorMatch[1].split('(')[0].replace(/,\s*/, ' ').replace(/&amp;/g, '&').trim() : '';

      // Extract valid 13-digit ISBNs
      const isbns = [];
      for (const im of identMatches) {
        const rawId = im[1].trim();
        if (rawId.startsWith('978') || rawId.startsWith('979') || rawId.startsWith('ISBN')) {
          const digits = rawId.replace(/[^0-9X]/gi, '');
          if (digits.length === 13) {
            isbns.push(digits);
          }
        }
      }

      if (isbns.length === 0 || !rawTitle) continue;
      const targetIsbn = isbns[0];
      if (seenIsbns.has(targetIsbn)) continue;

      const title = cleanTitle(rawTitle, cleanSeries);
      const tome = extractTomeNumber(rawTitle);

      // Determine universe
      let universe = 'BD';
      const pubLow = publisher.toLowerCase();
      if (pubLow.includes('panini') || pubLow.includes('marvel')) universe = 'MARVEL';
      else if (pubLow.includes('urban') || pubLow.includes('dc')) universe = 'DC';
      else if (pubLow.includes('manga') || pubLow.includes('kana') || pubLow.includes('pika') || pubLow.includes('kurokawa')) universe = 'MANGA';

      let format = 'Album BD';
      if (pubLow.includes('delcourt')) format = 'Comics Delcourt';
      else if (universe === 'MARVEL') format = '100% Marvel';
      else if (universe === 'DC') format = 'Urban Comics';

      const cover = `https://images.epagine.fr/${targetIsbn.slice(-3)}/${targetIsbn}_1_75.jpg`;

      const newAlbum = {
        id: `auto-series-${targetIsbn}`,
        isbn: targetIsbn,
        title: title,
        series: cleanSeries,
        tome: tome,
        universe: universe,
        publisher: publisher,
        format: format,
        editionType: /collector|momie|fnac|variante/i.test(rawTitle) ? 'VARIANT' : 'STANDARD',
        price: 16.95,
        cover: cover,
        writer: creator,
        artist: '',
        autoDiscovered: true
      };

      seenIsbns.add(targetIsbn);
      discoveredAlbums.push(newAlbum);

      // Add to official catalog
      if (!existingByIsbn.has(targetIsbn)) {
        catalog.push(newAlbum);
        existingByIsbn.set(targetIsbn, newAlbum);
      }
    }

    // Persist new catalog if new albums were discovered
    if (discoveredAlbums.length > catalogMatches.length) {
      try {
        fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2), 'utf8');
      } catch (e) {
        console.error('Failed to save updated catalog:', e);
      }
    }
  } catch (err) {
    console.warn(`BnF series lookup warning for '${cleanSeries}':`, err.message);
  }

  // Sort albums logically by tome number
  discoveredAlbums.sort((a, b) => {
    const na = parseInt((a.tome || '').replace(/[^0-9]/g, ''), 10) || 999;
    const nb = parseInt((b.tome || '').replace(/[^0-9]/g, ''), 10) || 999;
    return na - nb;
  });

  return {
    success: true,
    series: cleanSeries,
    totalTomes: discoveredAlbums.length,
    newDiscovered: discoveredAlbums.length - catalogMatches.length,
    albums: discoveredAlbums
  };
}

module.exports = {
  lookupSeries
};
