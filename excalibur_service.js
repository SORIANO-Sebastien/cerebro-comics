/**
 * 🗡️ EXCALIBUR SERVICE - Cerebro Comics
 * Recherche et recoupement en temps réel avec https://www.excalibur-comics.fr/
 * Résout les ISBNs officiels, les rééditions et les couvertures variantes en direct.
 */

const https = require('https');

function computeEan13Check(core12) {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(core12[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  return String((10 - (sum % 10)) % 10);
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

function titleCaseSlug(slug) {
  if (!slug) return '';
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/\bDe\b/gi, 'de')
    .replace(/\bLa\b/gi, 'la')
    .replace(/\bLe\b/gi, 'le')
    .replace(/\bLes\b/gi, 'les')
    .replace(/\bDu\b/gi, 'du')
    .replace(/\bDes\b/gi, 'des')
    .replace(/\bEn\b/gi, 'en')
    .replace(/\bPar\b/gi, 'par')
    .replace(/\bEt\b/gi, 'et')
    .trim();
}

function fetchUrl(url, timeoutMs = 8000, redirectCount = 0) {
  if (redirectCount > 3) return Promise.resolve('');
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const req = https.get({
        hostname: u.hostname,
        path: u.pathname + u.search,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
        },
        timeout: timeoutMs
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let loc = res.headers.location;
          if (!loc.startsWith('http')) {
            loc = `${u.protocol}//${u.host}${loc}`;
          }
          return fetchUrl(loc, timeoutMs, redirectCount + 1).then(resolve);
        }
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => resolve(body));
      });
      req.on('error', () => resolve(''));
      req.on('timeout', () => { req.destroy(); resolve(''); });
    } catch (e) {
      resolve('');
    }
  });
}

function parseProductArticle(art, targetIsbn = '') {
  const linkMatch = art.match(/<a\s+href="([^"]+)"[^>]*class="thumbnail product-thumbnail"/i) ||
                    art.match(/class="product-title"[^>]*>\s*<a href="([^"]+)"/i);
  if (!linkMatch) return null;
  const link = linkMatch[1];
  
  // If targetIsbn is specified, link MUST contain targetIsbn
  if (targetIsbn && !link.includes(targetIsbn)) return null;

  const isbnMatch = link.match(/-([0-9]{13})\.html$/);
  const foundIsbn = isbnMatch ? isbnMatch[1] : (targetIsbn || '');

  const imgMatch = art.match(/data-full-size-image-url\s*=\s*"([^"]+)"/i) || art.match(/<img[^>]*src="([^"]+)"/i);
  const altMatch = art.match(/<img[^>]*alt="([^"]*)"/i);
  const titleMatch = art.match(/<h[23]\s+class="[^"]*product-title"[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/i);
  const priceMatch = art.match(/<span class="price"[^>]*>([0-9,\.]+)\s*€/i);

  let title = '';
  if (titleMatch) {
    title = decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, '').trim());
  }

  // Handle truncation (ellipsis in Prestashop search card)
  if (/[:.]{2,}\s*$/.test(title) || title.endsWith('…')) {
    const slugMatch = link.match(/\/\d+-([^/]+)-\d+\.html/);
    if (slugMatch) {
      let base = title.replace(/\s*[:.…]+\s*$/, '').trim();
      let slugWords = slugMatch[1].split('-').filter(w => !['omnibus', 'tome', 'vol', 'volume'].includes(w.toLowerCase()));
      let missing = slugWords.filter(w => !base.toLowerCase().includes(w.toLowerCase()));
      if (missing.length > 0) {
        let sub = missing.join(' ').replace(/\b\w/g, l => l.toUpperCase());
        title = base + ' : ' + sub;
      } else {
        title = base;
      }
    }
  }

  if (!title && altMatch) {
    title = decodeHtmlEntities(altMatch[1].trim());
  }
  if (!title && link) {
    const slugMatch = link.match(/\/\d+-([^/]+)-\d+\.html/);
    if (slugMatch) {
      title = titleCaseSlug(slugMatch[1]);
    }
  }

  let cover = imgMatch ? imgMatch[1] : '';
  if (cover.includes('home_default')) {
    cover = cover.replace('home_default', 'large_default');
  }

  const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : 0;

  let universe = 'MARVEL';
  let format = 'Album BD';
  let publisher = 'Panini Comics';

  const lowerLink = link.toLowerCase();
  const lowerTitle = title.toLowerCase();

  if (lowerLink.includes('urban') || lowerLink.includes('/dc-') || lowerTitle.includes('dc comics') || lowerTitle.includes('batman') || lowerTitle.includes('superman')) {
    universe = 'DC';
    publisher = 'Urban Comics';
    format = lowerLink.includes('deluxe') ? 'DC Deluxe' : (lowerLink.includes('chronicles') ? 'DC Chronicles' : 'Urban Comics');
  } else if (lowerLink.includes('star-wars') || lowerTitle.includes('star wars')) {
    universe = 'STAR_WARS';
    format = lowerLink.includes('omnibus') ? 'Star Wars Omnibus' : 'Star Wars Deluxe';
  } else if (lowerLink.includes('omnibus') || lowerTitle.includes('omnibus')) {
    format = 'Marvel Omnibus';
  } else if (lowerLink.includes('deluxe') || lowerTitle.includes('deluxe')) {
    format = 'Marvel Deluxe';
  } else if (lowerLink.includes('100-marvel') || lowerTitle.includes('100% marvel')) {
    format = '100% Marvel';
  } else if (lowerLink.includes('must-have') || lowerTitle.includes('must-have')) {
    format = 'Marvel Must-Have';
  }

  // Parse Series & Tome
  let series = title;
  let tome = 'Tome 1';
  const tomeMatch = title.match(/(?:Tome|Vol(?:\.|ume)?|T\.)\s*(\d+)/i);
  if (tomeMatch) {
    tome = 'Tome ' + tomeMatch[1];
    series = title.replace(new RegExp(`(?:Tome|Vol(?:\\.|ume)?|T\\.)\\s*${tomeMatch[1]}`, 'i'), '').trim();
  }
  series = series.replace(/^Omnibus\s+/i, '').replace(/^(?:Marvel Deluxe|100% Marvel|Marvel Must-Have)\s*:\s*/i, '').trim();

  return {
    title,
    series,
    tome,
    isbn: foundIsbn,
    price,
    cover,
    format,
    universe,
    publisher,
    link,
    excaliburUrl: link
  };
}

async function searchExcaliburByIsbn(isbn) {
  const url = `https://www.excalibur-comics.fr/recherche?controller=search&s=${encodeURIComponent(isbn)}`;
  const html = await fetchUrl(url);
  if (!html) return null;

  const countMatch = html.match(/Il y a (\d+) produit/i);
  if (!countMatch || parseInt(countMatch[1], 10) === 0) {
    return null;
  }

  const articles = html.match(/<article class="product-miniature[^"]*"[\s\S]*?<\/article>/gi) || [];
  for (const art of articles) {
    const prod = parseProductArticle(art, isbn);
    if (prod) return prod;
  }
  return null;
}

async function searchExcaliburByQuery(query) {
  const url = `https://www.excalibur-comics.fr/recherche?controller=search&s=${encodeURIComponent(query)}`;
  const html = await fetchUrl(url);
  if (!html) return [];

  const countMatch = html.match(/Il y a (\d+) produit/i);
  if (!countMatch || parseInt(countMatch[1], 10) === 0) {
    return [];
  }

  const articles = html.match(/<article class="product-miniature[^"]*"[\s\S]*?<\/article>/gi) || [];
  const results = [];
  for (const art of articles.slice(0, 10)) {
    const prod = parseProductArticle(art, '');
    if (prod) results.push(prod);
  }
  return results;
}

async function lookupExcalibur(query) {
  const raw = String(query || '').trim();
  if (!raw) return { success: false, found: false, error: 'Requête vide.' };

  const clean = raw.replace(/[^0-9X]/gi, '').toUpperCase();
  const isIsbn = (clean.length === 10 || clean.length === 13);

  if (isIsbn) {
    // 1. Direct search by ISBN
    const direct = await searchExcaliburByIsbn(clean);
    if (direct) {
      return {
        success: true,
        found: true,
        matchType: 'EXACT_EXCALIBUR',
        product: direct
      };
    }

    // 2. Proximity variant search (+1, -1, +2, -2) for Panini / Urban sequential codes
    if (clean.length === 13 && (clean.startsWith('97910391') || clean.startsWith('97828094') || clean.startsWith('978236577') || clean.startsWith('97910268'))) {
      const coreNum = parseInt(clean.slice(0, 12), 10);
      for (const delta of [-1, 1, -2, 2]) {
        const adjCore = String(coreNum + delta);
        const adjIsbn = adjCore + computeEan13Check(adjCore);
        const parent = await searchExcaliburByIsbn(adjIsbn);
        if (parent) {
          let varTitle = parent.title;
          if (!/variante|collector|variant/i.test(varTitle)) {
            varTitle += ' (Couverture Variante)';
          }
          return {
            success: true,
            found: true,
            matchType: 'EXCALIBUR_VARIANT_PROXIMITY',
            product: {
              ...parent,
              title: varTitle,
              isbn: clean,
              cover: `https://images.epagine.fr/${clean.slice(-3)}/${clean}_1_75.jpg`,
              parentIsbn: adjIsbn,
              editionType: 'VARIANT',
              isVariant: true,
              source: 'EXCALIBUR_VARIANT'
            }
          };
        }
      }
    }

    return { success: true, found: false };
  }

  // Text search query
  const products = await searchExcaliburByQuery(raw);
  return {
    success: true,
    found: products.length > 0,
    matchType: 'EXCALIBUR_SEARCH',
    count: products.length,
    product: products[0] || null,
    products
  };
}

module.exports = {
  lookupExcalibur,
  searchExcaliburByIsbn,
  searchExcaliburByQuery
};
