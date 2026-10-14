const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const auth = require('./auth_system.js');

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
const HOST = process.env.HOST || '0.0.0.0';
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function getAuthUser(req) {
  let token = null;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['cookie']) {
    const match = req.headers['cookie'].match(/applibd_token=([^;]+)/);
    if (match) token = match[1];
  }
  if (!token && req.url && req.url.includes('token=')) {
    try {
      const u = new URL(req.url, 'http://localhost');
      token = u.searchParams.get('token');
    } catch (e) {}
  }
  return auth.getUserByToken(token);
}

function getCollectionsConfigPath() {
  const dataPath = path.join(__dirname, 'data', 'collections_config.json');
  if (fs.existsSync(dataPath)) return dataPath;
  return path.join(__dirname, 'collections_config.json');
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Format JSON invalide dans le corps de la requête.'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const urlPath = urlObj.pathname;

  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  if (urlPath.startsWith('/api/')) {
    console.log(`[API ${req.method}] ${urlPath}`);
  }

  // =========================================================================
  // AUTHENTICATION & PUBLIC SETTINGS ROUTES
  // =========================================================================

  // Public settings
  if (urlPath === '/api/settings/public' && req.method === 'GET') {
    return sendJson(res, 200, auth.getSettings(false));
  }

  // Get current user profile & check auth status
  if (urlPath === '/api/auth/me' && req.method === 'GET') {
    const user = getAuthUser(req);
    const hasUsers = auth.hasUsers();
    const publicSettings = auth.getSettings(false);
    return sendJson(res, 200, {
      authenticated: !!user,
      user: user || null,
      hasUsers: hasUsers,
      isFirstSetup: !hasUsers,
      publicSettings: publicSettings
    });
  }

  // Register new account (First account is automatically ADMIN!)
  if (urlPath === '/api/auth/register' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      const result = auth.registerUser(payload);
      return sendJson(res, 200, {
        success: true,
        message: result.user.role === 'admin' 
          ? 'Compte Administrateur initial créé avec succès !' 
          : 'Compte créé avec succès !',
        user: result.user,
        token: result.token
      });
    } catch (err) {
      return sendJson(res, 400, { success: false, error: err.message });
    }
  }

  // Login
  if (urlPath === '/api/auth/login' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      const result = auth.loginUser(payload);
      return sendJson(res, 200, {
        success: true,
        message: 'Connexion réussie !',
        user: result.user,
        token: result.token
      });
    } catch (err) {
      return sendJson(res, 401, { success: false, error: err.message });
    }
  }

  // Logout
  if (urlPath === '/api/auth/logout' && req.method === 'POST') {
    let token = null;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) token = authHeader.substring(7).trim();
    if (token) auth.logout(token);
    return sendJson(res, 200, { success: true, message: 'Déconnexion effectuée.' });
  }

  // Start OpenID Connect / Authentik flow
  if (urlPath === '/api/auth/oidc/login' && req.method === 'GET') {
    try {
      const authUrl = await auth.startOidcFlow(req.headers.host, 'http');
      res.writeHead(302, { 'Location': authUrl });
      res.end();
      return;
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>Erreur Authentik</title></head>
        <body style="font-family:sans-serif; background:#0f172a; color:#fff; display:flex; align-items:center; justify-content:center; height:100vh; margin:0;">
          <div style="background:#1e293b; padding:24px; border-radius:12px; border:1px solid #ef4444; max-width:500px; text-align:center;">
            <h2 style="color:#ef4444; margin-top:0;">⚠️ Erreur de Connexion Authentik</h2>
            <p>${err.message}</p>
            <p style="font-size:0.85rem; color:#94a3b8;">Vérifiez les paramètres OpenID dans le Panneau d'Administration de Cerebro Comics.</p>
            <a href="/" style="display:inline-block; margin-top:12px; background:#0284c7; color:#fff; padding:10px 18px; border-radius:8px; text-decoration:none;">Retourner à l'accueil</a>
          </div>
        </body>
        </html>
      `);
      return;
    }
  }

  // OpenID Connect Callback from Authentik
  if (urlPath === '/api/auth/oidc/callback' && req.method === 'GET') {
    const code = urlObj.searchParams.get('code');
    const state = urlObj.searchParams.get('state');
    try {
      if (!code) throw new Error('Code d\'autorisation manquant.');
      const result = await auth.handleOidcCallback(code, state, req.headers.host, 'http');
      
      // Send response that stores session token in localStorage and redirects home
      res.writeHead(200, { 
        'Content-Type': 'text/html; charset=utf-8',
        'Set-Cookie': `applibd_token=${result.token}; Path=/; HttpOnly; SameSite=Lax`
      });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Connexion réussie</title>
        </head>
        <body style="font-family:sans-serif; background:#0f172a; color:#fff; display:flex; align-items:center; justify-content:center; height:100vh; margin:0;">
          <div style="background:#1e293b; padding:24px; border-radius:12px; border:1px solid #10b981; max-width:400px; text-align:center;">
            <h2 style="color:#10b981; margin-top:0;">✅ Connexion Authentik réussie !</h2>
            <p>Bonjour <strong>${result.user.displayName || result.user.username}</strong>.</p>
            <p style="font-size:0.85rem; color:#94a3b8;">Redirection vers votre collection...</p>
          </div>
          <script>
            try {
              localStorage.setItem('applibd_token', '${result.token}');
              localStorage.setItem('applibd_user', JSON.stringify(${JSON.stringify(result.user)}));
            } catch(e) {}
            setTimeout(function() { window.location.href = '/'; }, 600);
          </script>
        </body>
        </html>
      `);
      return;
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>Erreur Authentik</title></head>
        <body style="font-family:sans-serif; background:#0f172a; color:#fff; display:flex; align-items:center; justify-content:center; height:100vh; margin:0;">
          <div style="background:#1e293b; padding:24px; border-radius:12px; border:1px solid #ef4444; max-width:500px; text-align:center;">
            <h2 style="color:#ef4444; margin-top:0;">⚠️ Échec de l'authentification</h2>
            <p>${err.message}</p>
            <a href="/" style="display:inline-block; margin-top:12px; background:#0284c7; color:#fff; padding:10px 18px; border-radius:8px; text-decoration:none;">Retourner à l'accueil</a>
          </div>
        </body>
        </html>
      `);
      return;
    }
  }

  // =========================================================================
  // USER COLLECTION PER ACCOUNT & SHARED COLLECTIONS
  // =========================================================================

  // Get shared users list (for family/member collection switcher)
  if (urlPath === '/api/users/shared' && req.method === 'GET') {
    return sendJson(res, 200, {
      success: true,
      users: auth.getSharedUsersList()
    });
  }

  // Get user's collection (self or other member via ?userId=...)
  if (urlPath === '/api/user/collection' && req.method === 'GET') {
    const targetUserId = urlObj.searchParams.get('userId');
    if (targetUserId) {
      const targetUser = auth.getUserById(targetUserId);
      if (!targetUser) {
        return sendJson(res, 404, { success: false, error: 'Utilisateur introuvable.' });
      }
      const collection = auth.getUserCollection(targetUserId);
      return sendJson(res, 200, {
        success: true,
        isOtherUser: true,
        user: targetUser,
        hasCollection: collection !== null,
        books: collection || []
      });
    }

    const user = getAuthUser(req);
    if (!user) {
      return sendJson(res, 401, { success: false, error: 'Connexion requise pour charger la collection du compte.' });
    }
    const collection = auth.getUserCollection(user.id);
    return sendJson(res, 200, {
      success: true,
      hasCollection: collection !== null,
      books: collection || []
    });
  }

  // Save user's collection
  if (urlPath === '/api/user/collection' && req.method === 'POST') {
    const user = getAuthUser(req);
    if (!user) {
      return sendJson(res, 401, { success: false, error: 'Connexion requise pour sauvegarder la collection.' });
    }
    try {
      const payload = await parseJsonBody(req);
      const books = payload.books || [];
      auth.saveUserCollection(user.id, books);
      return sendJson(res, 200, {
        success: true,
        message: 'Collection sauvegardée sur le serveur !',
        count: books.length
      });
    } catch (err) {
      return sendJson(res, 400, { success: false, error: err.message });
    }
  }

  // =========================================================================
  // ADMIN PANEL ROUTES (ADMIN ROLE REQUIRED)
  // =========================================================================

  // Admin: Get all settings (including secrets)
  if (urlPath === '/api/admin/settings' && req.method === 'GET') {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return sendJson(res, 403, { success: false, error: 'Accès réservé aux administrateurs.' });
    }
    return sendJson(res, 200, { success: true, settings: auth.getSettings(true) });
  }

  // Admin: Save settings
  if (urlPath === '/api/admin/settings' && req.method === 'POST') {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return sendJson(res, 403, { success: false, error: 'Accès réservé aux administrateurs.' });
    }
    try {
      const payload = await parseJsonBody(req);
      const updated = auth.saveSettings(payload);
      return sendJson(res, 200, { success: true, message: 'Paramètres enregistrés avec succès !', settings: updated });
    } catch (err) {
      return sendJson(res, 400, { success: false, error: err.message });
    }
  }

  // Admin: List all users
  if (urlPath === '/api/admin/users' && req.method === 'GET') {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return sendJson(res, 403, { success: false, error: 'Accès réservé aux administrateurs.' });
    }
    return sendJson(res, 200, { success: true, users: auth.listAllUsers() });
  }

  // Admin: Create user
  if (urlPath === '/api/admin/users/create' && req.method === 'POST') {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return sendJson(res, 403, { success: false, error: 'Accès réservé aux administrateurs.' });
    }
    try {
      const payload = await parseJsonBody(req);
      const created = auth.createUserByAdmin(payload);
      return sendJson(res, 200, { success: true, message: 'Utilisateur créé !', user: created });
    } catch (err) {
      return sendJson(res, 400, { success: false, error: err.message });
    }
  }

  // Admin: Update user role
  if (urlPath === '/api/admin/users/role' && req.method === 'POST') {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return sendJson(res, 403, { success: false, error: 'Accès réservé aux administrateurs.' });
    }
    try {
      const payload = await parseJsonBody(req);
      const updated = auth.updateUserRole(user.id, payload.userId, payload.newRole);
      return sendJson(res, 200, { success: true, message: 'Rôle mis à jour.', user: updated });
    } catch (err) {
      return sendJson(res, 400, { success: false, error: err.message });
    }
  }

  // Admin: Reset user password
  if (urlPath === '/api/admin/users/password' && req.method === 'POST') {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return sendJson(res, 403, { success: false, error: 'Accès réservé aux administrateurs.' });
    }
    try {
      const payload = await parseJsonBody(req);
      auth.resetUserPassword(payload.userId, payload.newPassword);
      return sendJson(res, 200, { success: true, message: 'Mot de passe réinitialisé avec succès.' });
    } catch (err) {
      return sendJson(res, 400, { success: false, error: err.message });
    }
  }

  // Admin: Delete user
  if (urlPath === '/api/admin/users/delete' && req.method === 'POST') {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return sendJson(res, 403, { success: false, error: 'Accès réservé aux administrateurs.' });
    }
    try {
      const payload = await parseJsonBody(req);
      auth.deleteUser(user.id, payload.userId);
      return sendJson(res, 200, { success: true, message: 'Utilisateur supprimé.' });
    } catch (err) {
      return sendJson(res, 400, { success: false, error: err.message });
    }
  }

  // Admin: System stats
  if (urlPath === '/api/admin/stats' && req.method === 'GET') {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return sendJson(res, 403, { success: false, error: 'Accès réservé aux administrateurs.' });
    }
    const catalogPath = path.join(__dirname, 'all_comics_catalog.json');
    let catalogCount = 0;
    if (fs.existsSync(catalogPath)) {
      try {
        const cat = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
        catalogCount = Array.isArray(cat) ? cat.length : 0;
      } catch (e) {}
    }
    const confPath = getCollectionsConfigPath();
    let collectionsCount = 0;
    if (fs.existsSync(confPath)) {
      try {
        const conf = JSON.parse(fs.readFileSync(confPath, 'utf8'));
        collectionsCount = (conf.excaliburCategories?.length || 0) + (conf.customCollections?.length || 0);
      } catch (e) {}
    }

    return sendJson(res, 200, {
      success: true,
      stats: {
        usersCount: auth.getUserCount(),
        catalogCount: catalogCount,
        collectionsCount: collectionsCount,
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsageMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
        nodeVersion: process.version
      }
    });
  }

  // =========================================================================
  // EXISTING CATALOG & COLLECTIONS API ROUTES
  // =========================================================================

  // API Route: Get fresh catalog
  if (urlPath === '/api/catalog' && req.method === 'GET') {
    const catalogPath = path.join(__dirname, 'all_comics_catalog.json');
    if (fs.existsSync(catalogPath)) {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(catalogPath).pipe(res);
      return;
    }
  }

  // API Route: Get collections config
  if (urlPath === '/api/collections' && req.method === 'GET') {
    const configPath = getCollectionsConfigPath();
    if (fs.existsSync(configPath)) {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(configPath).pipe(res);
      return;
    } else {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ excaliburCategories: [], bnfQueries: [], customCollections: [] }));
      return;
    }
  }

  // API Route: Add or update a collection
  if (urlPath === '/api/collections' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const syncModule = require('./sync_catalog.js');
        const config = syncModule.loadCollectionsConfig() || { excaliburCategories: [], bnfQueries: [], customCollections: [] };
        let syncResult = null;

        if (payload.type === 'excalibur') {
          let slug = (payload.slug || '').trim();
          slug = slug.replace(/^https?:\/\/(?:www\.)?excalibur-comics\.fr\/(?:fr\/)?/, '').replace(/^\//, '').split('?')[0];

          const newEntry = {
            name: payload.name || slug,
            slug: slug,
            universe: payload.universe || 'MARVEL',
            format: payload.format || payload.name || 'Comics',
            publisher: payload.publisher || (payload.universe === 'DC' ? 'Urban Comics' : 'Panini Comics')
          };

          config.excaliburCategories = (config.excaliburCategories || []).filter(c => c.slug !== slug);
          config.excaliburCategories.push(newEntry);
          syncModule.saveCollectionsConfig(config);

          if (payload.syncNow !== false) {
            syncResult = await syncModule.syncSingleCategory(newEntry);
          }
        } else if (payload.type === 'custom') {
          let books = payload.books || [];
          if (typeof payload.isbns === 'string') {
            const rawLines = payload.isbns.split(/\r?\n/);
            for (const line of rawLines) {
              const clean = line.trim();
              if (!clean) continue;
              const match = clean.match(/^(97[89][0-9]{10})(?:\s*[-–:]\s*(.+))?/);
              if (match) {
                books.push({
                  isbn: match[1],
                  title: match[2] ? match[2].trim() : ''
                });
              } else {
                const digits = clean.replace(/[^0-9X]/gi, '');
                if (digits.length === 13) {
                  books.push({ isbn: digits, title: '' });
                }
              }
            }
          }

          const newGroup = {
            collectionName: payload.collectionName || 'Collection Spéciale',
            format: payload.format || payload.collectionName || 'Marvel Carrefour',
            universe: payload.universe || 'MARVEL',
            publisher: payload.publisher || 'Panini Comics',
            price: payload.price !== undefined ? parseFloat(payload.price) : 2.99,
            year: payload.year || new Date().getFullYear(),
            books: books
          };

          config.customCollections = (config.customCollections || []).filter(c => c.collectionName !== newGroup.collectionName);
          config.customCollections.push(newGroup);
          syncModule.saveCollectionsConfig(config);

          if (payload.syncNow !== false) {
            syncResult = await syncModule.syncSingleCustom(newGroup);
          }
        } else if (payload.type === 'bnf') {
          const newBnf = {
            name: payload.name || 'Requête BnF',
            query: payload.query,
            universe: payload.universe || 'MARVEL',
            format: payload.format || payload.name || 'Comics',
            publisher: payload.publisher || 'Panini Comics'
          };
          config.bnfQueries = (config.bnfQueries || []).filter(q => q.query !== newBnf.query);
          config.bnfQueries.push(newBnf);
          syncModule.saveCollectionsConfig(config);

          if (payload.syncNow !== false) {
            syncResult = await syncModule.runSync();
          }
        }

        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({
          success: true,
          message: 'Collection ajoutée avec succès !',
          syncResult
        }));
      } catch (err) {
        res.writeHead(500, {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API Route: Delete a collection
  if (urlPath === '/api/collections' && req.method === 'DELETE') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const syncModule = require('./sync_catalog.js');
        const config = syncModule.loadCollectionsConfig();
        if (config) {
          if (payload.type === 'excalibur' && payload.slug) {
            config.excaliburCategories = (config.excaliburCategories || []).filter(c => c.slug !== payload.slug);
          } else if (payload.type === 'custom' && payload.collectionName) {
            config.customCollections = (config.customCollections || []).filter(c => c.collectionName !== payload.collectionName);
          } else if (payload.type === 'bnf' && payload.query) {
            config.bnfQueries = (config.bnfQueries || []).filter(q => q.query !== payload.query);
          }
          syncModule.saveCollectionsConfig(config);
        }
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ success: true, message: 'Collection supprimée avec succès.' }));
      } catch (e) {
        res.writeHead(500, {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // API Route: Auto-discover all collections from web
  if (urlPath === '/api/autodiscover') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    try {
      const syncModule = require('./sync_catalog.js');
      syncModule.autoDiscoverCategories().then(async discovered => {
        const config = syncModule.loadCollectionsConfig() || { excaliburCategories: [], bnfQueries: [], customCollections: [] };
        const existingSlugs = new Set((config.excaliburCategories || []).map(c => c.slug));
        const newCats = discovered.filter(d => !existingSlugs.has(d.slug));

        for (const nc of newCats) {
          config.excaliburCategories.push(nc);
        }
        if (newCats.length > 0) {
          syncModule.saveCollectionsConfig(config);
        }

        res.end(JSON.stringify({
          success: true,
          totalDiscovered: discovered.length,
          newCount: newCats.length,
          newCategories: newCats
        }));
      }).catch(err => {
        res.end(JSON.stringify({ success: false, error: err.message }));
      });
    } catch (e) {
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  // API Route: Trigger full catalog synchronization
  if (urlPath === '/api/sync') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    try {
      const syncModule = require('./sync_catalog.js');
      syncModule.runSync().then(result => {
        res.end(JSON.stringify(result));
      }).catch(err => {
        res.end(JSON.stringify({ success: false, error: err.message }));
      });
    } catch (e) {
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  // Static File Serving
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : urlPath);
  
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Erreur serveur');
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      res.end(content);
    }
  });
});

server.listen(PORT, HOST, () => {
  const interfaces = os.networkInterfaces();
  let localIp = 'localhost';
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        localIp = net.address;
        break;
      }
    }
  }

  console.log('===============================================================');
  console.log('🚀 SERVEUR LOCAL PWA APPLI BD ACTIF (AVEC AUTH & MULTI-COMPTES) !');
  console.log('===============================================================');
  console.log('');
  console.log('📱 SUR VOTRE TÉLÉPHONE (Même réseau Wi-Fi) :');
  console.log("👉 Ouvrez Chrome ou Safari et tapez l'adresse :");
  console.log(`   http://${localIp}:${PORT}`);
  console.log('');
  console.log('💻 SUR VOTRE PC :');
  console.log(`👉 http://localhost:${PORT}`);
  console.log('');
  console.log('👑 Authentification & OpenID Connect Authentik prêts !');
  console.log('===============================================================');
});

// Planification de fond : Détection et synchronisation quotidienne automatique (toutes les 24h)
const AUTO_SYNC_INTERVAL = 24 * 60 * 60 * 1000;
setInterval(() => {
  console.log('⏰ [AUTO-SCAN QUOTIDIEN] Recherche des nouvelles collections et nouveaux tomes...');
  try {
    const syncModule = require('./sync_catalog.js');
    syncModule.autoDiscoverAndSync().then(res => {
      console.log('⏰ [AUTO-SCAN] Synchronisation terminée ! Total catalogue :', res.total);
    }).catch(e => console.error('Erreur auto-scan :', e.message));
  } catch (err) {}
}, AUTO_SYNC_INTERVAL);
