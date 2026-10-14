const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const COLLECTIONS_DIR = path.join(DATA_DIR, 'user_collections');

// In-memory caches
let users = [];
let settings = {};
let sessions = {};
let pendingOidcStates = new Map();
let oidcConfigCache = { issuer: null, data: null, timestamp: 0 };

const DEFAULT_SETTINGS = {
  geminiApiKey: '',
  appTitle: 'Cerebro Comics',
  allowRegistration: true,
  oidc: {
    enabled: false,
    name: 'Authentik',
    issuerUrl: '',
    clientId: '',
    clientSecret: '',
    redirectUri: ''
  },
  autoSyncIntervalHours: 24
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function init() {
  ensureDir(DATA_DIR);
  ensureDir(COLLECTIONS_DIR);

  // Load or create settings
  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
      settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      settings.oidc = { ...DEFAULT_SETTINGS.oidc, ...(settings.oidc || {}) };
    } catch (e) {
      settings = { ...DEFAULT_SETTINGS };
    }
  } else {
    settings = { ...DEFAULT_SETTINGS };
    saveSettings(settings);
  }

  // Load or create users
  if (fs.existsSync(USERS_FILE)) {
    try {
      users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } catch (e) {
      users = [];
    }
  } else {
    users = [];
    saveUsers();
  }

  // Load or create sessions
  if (fs.existsSync(SESSIONS_FILE)) {
    try {
      sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
      // Clean up expired sessions (30 days)
      const now = Date.now();
      let changed = false;
      for (const [token, sess] of Object.entries(sessions)) {
        if (sess.expiresAt && sess.expiresAt < now) {
          delete sessions[token];
          changed = true;
        }
      }
      if (changed) saveSessions();
    } catch (e) {
      sessions = {};
    }
  } else {
    sessions = {};
    saveSessions();
  }
}

function saveUsers() {
  ensureDir(DATA_DIR);
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function saveSettings(newSettings) {
  ensureDir(DATA_DIR);
  settings = { ...settings, ...newSettings };
  if (newSettings.oidc) {
    settings.oidc = { ...settings.oidc, ...newSettings.oidc };
  }
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
  return settings;
}

function saveSessions() {
  ensureDir(DATA_DIR);
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf8');
}

function hashPassword(password, salt = null) {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  try {
    const check = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(check, 'hex'), Buffer.from(hash, 'hex'));
  } catch (e) {
    return false;
  }
}

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, salt, ...safe } = user;
  return safe;
}

function hasUsers() {
  return users.length > 0;
}

function getUserCount() {
  return users.length;
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days
  sessions[token] = {
    userId,
    createdAt: Date.now(),
    expiresAt
  };
  saveSessions();
  return token;
}

function getUserByToken(token) {
  if (!token) return null;
  const sess = sessions[token];
  if (!sess) return null;
  if (sess.expiresAt && sess.expiresAt < Date.now()) {
    delete sessions[token];
    saveSessions();
    return null;
  }
  const user = users.find(u => u.id === sess.userId);
  return sanitizeUser(user);
}

function logout(token) {
  if (token && sessions[token]) {
    delete sessions[token];
    saveSessions();
    return true;
  }
  return false;
}

function registerUser({ username, password, displayName, email }) {
  const cleanUsername = (username || '').trim().toLowerCase();
  if (!cleanUsername || cleanUsername.length < 3) {
    throw new Error("Le nom d'utilisateur doit contenir au moins 3 caractères.");
  }
  if (!/^[a-z0-9_.-]+$/.test(cleanUsername)) {
    throw new Error("Le nom d'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores.");
  }
  if (!password || password.length < 6) {
    throw new Error('Le mot de passe doit contenir au moins 6 caractères.');
  }

  // Check if first user
  const isFirst = (users.length === 0);
  if (!isFirst && settings.allowRegistration === false) {
    throw new Error("Les nouvelles inscriptions sont actuellement désactivées par l'administrateur.");
  }

  const existing = users.find(u => u.username.toLowerCase() === cleanUsername);
  if (existing) {
    throw new Error("Ce nom d'utilisateur est déjà utilisé.");
  }

  const { salt, hash } = hashPassword(password);
  const newUser = {
    id: 'usr_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'),
    username: cleanUsername,
    displayName: (displayName || username).trim(),
    email: (email || '').trim().toLowerCase(),
    passwordHash: hash,
    salt: salt,
    role: isFirst ? 'admin' : 'user', // FIRST USER IS ALWAYS ADMIN!
    provider: 'local',
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers();

  const token = createSession(newUser.id);
  return { user: sanitizeUser(newUser), token };
}

function loginUser({ username, password }) {
  const clean = (username || '').trim().toLowerCase();
  if (!clean || !password) {
    throw new Error("Veuillez renseigner un nom d'utilisateur et un mot de passe.");
  }

  const user = users.find(u => u.username.toLowerCase() === clean || (u.email && u.email.toLowerCase() === clean));
  if (!user) {
    throw new Error('Identifiant ou mot de passe incorrect.');
  }

  if (user.provider !== 'local' && !user.passwordHash) {
    throw new Error(`Ce compte est associé à la connexion ${user.provider.toUpperCase()}. Veuillez utiliser le bouton de connexion dédié.`);
  }

  if (!verifyPassword(password, user.salt, user.passwordHash)) {
    throw new Error('Identifiant ou mot de passe incorrect.');
  }

  user.lastLogin = new Date().toISOString();
  saveUsers();

  const token = createSession(user.id);
  return { user: sanitizeUser(user), token };
}

// User collection management
function getUserCollectionPath(userId) {
  return path.join(COLLECTIONS_DIR, `${userId}.json`);
}

function getUserCollection(userId) {
  const colFile = getUserCollectionPath(userId);
  if (fs.existsSync(colFile)) {
    try {
      return JSON.parse(fs.readFileSync(colFile, 'utf8'));
    } catch (e) {
      return [];
    }
  }
  return null;
}

function saveUserCollection(userId, books) {
  const colFile = getUserCollectionPath(userId);
  ensureDir(COLLECTIONS_DIR);
  fs.writeFileSync(colFile, JSON.stringify(books, null, 2), 'utf8');
  return true;
}

function getUserById(userId) {
  const user = users.find(u => u.id === userId);
  return sanitizeUser(user);
}

function getSharedUsersList() {
  return users.map(u => {
    const colFile = getUserCollectionPath(u.id);
    let bookCount = 0;
    let wishlistCount = 0;
    if (fs.existsSync(colFile)) {
      try {
        const books = JSON.parse(fs.readFileSync(colFile, 'utf8'));
        if (Array.isArray(books)) {
          bookCount = books.length;
          wishlistCount = books.filter(b => b.status === 'wishlist').length;
        }
      } catch (e) {}
    }
    return {
      id: u.id,
      username: u.username,
      displayName: u.displayName || u.username,
      role: u.role,
      bookCount: bookCount,
      wishlistCount: wishlistCount
    };
  });
}

// Admin management functions
function listAllUsers() {
  return users.map(u => {
    const safe = sanitizeUser(u);
    const colFile = getUserCollectionPath(u.id);
    let bookCount = 0;
    if (fs.existsSync(colFile)) {
      try {
        const books = JSON.parse(fs.readFileSync(colFile, 'utf8'));
        bookCount = Array.isArray(books) ? books.length : 0;
      } catch (e) {}
    }
    safe.bookCount = bookCount;
    return safe;
  });
}

function updateUserRole(adminUserId, targetUserId, newRole) {
  if (newRole !== 'admin' && newRole !== 'user') {
    throw new Error('Rôle invalide.');
  }
  const target = users.find(u => u.id === targetUserId);
  if (!target) throw new Error('Utilisateur non trouvé.');

  // If demoting an admin, ensure at least one other admin remains
  if (target.role === 'admin' && newRole === 'user') {
    const adminCount = users.filter(u => u.role === 'admin').length;
    if (adminCount <= 1) {
      throw new Error('Impossible de rétrograder le dernier administrateur du système.');
    }
  }

  target.role = newRole;
  saveUsers();
  return sanitizeUser(target);
}

function resetUserPassword(targetUserId, newPassword) {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Le nouveau mot de passe doit comporter au moins 6 caractères.');
  }
  const target = users.find(u => u.id === targetUserId);
  if (!target) throw new Error('Utilisateur non trouvé.');

  const { salt, hash } = hashPassword(newPassword);
  target.passwordHash = hash;
  target.salt = salt;
  target.provider = 'local';
  saveUsers();
  return true;
}

function deleteUser(adminUserId, targetUserId) {
  if (adminUserId === targetUserId) {
    throw new Error('Vous ne pouvez pas supprimer votre propre compte administrateur.');
  }
  const targetIndex = users.findIndex(u => u.id === targetUserId);
  if (targetIndex === -1) throw new Error('Utilisateur non trouvé.');

  const target = users[targetIndex];
  if (target.role === 'admin') {
    const adminCount = users.filter(u => u.role === 'admin').length;
    if (adminCount <= 1) {
      throw new Error('Impossible de supprimer le dernier administrateur.');
    }
  }

  users.splice(targetIndex, 1);
  saveUsers();

  // Remove their sessions
  for (const [token, sess] of Object.entries(sessions)) {
    if (sess.userId === targetUserId) {
      delete sessions[token];
    }
  }
  saveSessions();

  // Optional: remove collection file
  const colFile = getUserCollectionPath(targetUserId);
  if (fs.existsSync(colFile)) {
    try { fs.unlinkSync(colFile); } catch (e) {}
  }
  return true;
}

function createUserByAdmin({ username, password, displayName, email, role }) {
  const cleanUsername = (username || '').trim().toLowerCase();
  if (!cleanUsername || cleanUsername.length < 3) {
    throw new Error("Le nom d'utilisateur doit contenir au moins 3 caractères.");
  }
  if (!password || password.length < 6) {
    throw new Error('Le mot de passe doit contenir au moins 6 caractères.');
  }
  if (users.find(u => u.username.toLowerCase() === cleanUsername)) {
    throw new Error("Ce nom d'utilisateur est déjà utilisé.");
  }

  const { salt, hash } = hashPassword(password);
  const newUser = {
    id: 'usr_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'),
    username: cleanUsername,
    displayName: (displayName || username).trim(),
    email: (email || '').trim().toLowerCase(),
    passwordHash: hash,
    salt: salt,
    role: role === 'admin' ? 'admin' : 'user',
    provider: 'local',
    createdAt: new Date().toISOString(),
    lastLogin: null
  };

  users.push(newUser);
  saveUsers();
  return sanitizeUser(newUser);
}

function getSettings(isAdmin = false) {
  if (isAdmin) {
    return { ...settings };
  }
  // Public settings only
  return {
    appTitle: settings.appTitle,
    allowRegistration: settings.allowRegistration,
    hasUsers: hasUsers(),
    oidc: {
      enabled: !!(settings.oidc && settings.oidc.enabled),
      name: (settings.oidc && settings.oidc.name) || 'Authentik'
    }
  };
}

// -------------------------------------------------------------
// OpenID Connect (Authentik) Engine
// -------------------------------------------------------------
async function fetchOidcDiscovery(issuerUrl) {
  let cleanUrl = (issuerUrl || '').trim().replace(/\/+$/, '');
  if (cleanUrl.endsWith('/.well-known/openid-configuration')) {
    cleanUrl = cleanUrl.replace(/\/\.well-known\/openid-configuration$/, '');
  }
  const now = Date.now();
  if (oidcConfigCache.issuer === cleanUrl && (now - oidcConfigCache.timestamp < 300000)) {
    return oidcConfigCache.data;
  }

  const discoveryUrl = `${cleanUrl}/.well-known/openid-configuration`;
  const res = await fetch(discoveryUrl, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) {
    throw new Error(`Échec de la découverte OpenID (${res.status} ${res.statusText}) sur ${discoveryUrl}`);
  }
  const data = await res.json();
  oidcConfigCache = { issuer: cleanUrl, data, timestamp: now };
  return data;
}

async function startOidcFlow(hostHeader, protocol = 'http') {
  if (!settings.oidc || !settings.oidc.enabled) {
    throw new Error("L'authentification OpenID Connect / Authentik n'est pas activée.");
  }
  const { issuerUrl, clientId } = settings.oidc;
  if (!issuerUrl || !clientId) {
    throw new Error("La configuration Authentik est incomplète (URL de l'émetteur ou Client ID manquant).");
  }

  const oidcData = await fetchOidcDiscovery(issuerUrl);
  const authEndpoint = oidcData.authorization_endpoint;
  if (!authEndpoint) {
    throw new Error("Impossible de trouver le point d'autorisation (authorization_endpoint) dans la découverte OIDC.");
  }

  const state = crypto.randomBytes(24).toString('hex');
  const nonce = crypto.randomBytes(24).toString('hex');

  // Compute redirect URI
  let redirectUri = settings.oidc.redirectUri;
  if (!redirectUri || redirectUri.trim() === '') {
    redirectUri = `${protocol}://${hostHeader}/api/auth/oidc/callback`;
  }

  pendingOidcStates.set(state, {
    nonce,
    redirectUri,
    createdAt: Date.now()
  });

  // Clean old states after 15 min
  const now = Date.now();
  for (const [st, val] of pendingOidcStates.entries()) {
    if (now - val.createdAt > 900000) pendingOidcStates.delete(st);
  }

  const authUrl = new URL(authEndpoint);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid profile email');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('nonce', nonce);

  return authUrl.toString();
}

async function handleOidcCallback(code, state, hostHeader, protocol = 'http') {
  if (!state || !pendingOidcStates.has(state)) {
    throw new Error('Paramètre state OIDC invalide ou expiré. Veuillez rééssayer.');
  }

  const stateData = pendingOidcStates.get(state);
  pendingOidcStates.delete(state);

  const { issuerUrl, clientId, clientSecret } = settings.oidc;
  const oidcData = await fetchOidcDiscovery(issuerUrl);
  const tokenEndpoint = oidcData.token_endpoint;
  const userinfoEndpoint = oidcData.userinfo_endpoint;

  if (!tokenEndpoint) throw new Error("Point d'accès aux tokens introuvable.");

  // Exchange code for token
  const tokenParams = new URLSearchParams();
  tokenParams.append('grant_type', 'authorization_code');
  tokenParams.append('code', code);
  tokenParams.append('redirect_uri', stateData.redirectUri);
  tokenParams.append('client_id', clientId);
  if (clientSecret) tokenParams.append('client_secret', clientSecret);

  const tokenRes = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: tokenParams.toString()
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Échec de l'échange de token Authentik (${tokenRes.status}) : ${errText}`);
  }

  const tokenJson = await tokenRes.json();
  const accessToken = tokenJson.access_token;
  if (!accessToken) throw new Error('Aucun jeton access_token renvoyé par Authentik.');

  // Fetch User Info
  let userInfo = {};
  if (userinfoEndpoint) {
    const userRes = await fetch(userinfoEndpoint, {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
    });
    if (userRes.ok) {
      userInfo = await userRes.json();
    }
  }

  // Fallback to id_token decoding if userinfo is missing fields
  if (!userInfo.sub && tokenJson.id_token) {
    try {
      const parts = tokenJson.id_token.split('.');
      if (parts.length >= 2) {
        userInfo = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      }
    } catch (e) {}
  }

  const oidcSub = userInfo.sub || tokenJson.sub;
  if (!oidcSub) throw new Error("Identifiant unique (sub) introuvable dans le profil Authentik.");

  const preferredUsername = (userInfo.preferred_username || userInfo.nickname || userInfo.name || userInfo.email || 'user').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const email = userInfo.email || '';
  const displayName = userInfo.name || userInfo.preferred_username || preferredUsername;

  // Find or create user
  let user = users.find(u => u.oidcSub === oidcSub);
  if (!user && email) {
    user = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
  }

  if (user) {
    user.oidcSub = oidcSub;
    user.lastLogin = new Date().toISOString();
    if (user.provider === 'local') {
      user.provider = 'hybrid'; // Linked with both!
    }
    saveUsers();
  } else {
    // FIRST USER IS ADMIN!
    const isFirst = (users.length === 0);
    user = {
      id: 'usr_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'),
      username: preferredUsername || `user_${Date.now()}`,
      displayName: displayName,
      email: email,
      passwordHash: null,
      salt: null,
      role: isFirst ? 'admin' : 'user', // First account registered is admin!
      provider: 'authentik',
      oidcSub: oidcSub,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };
    users.push(user);
    saveUsers();
  }

  const sessionToken = createSession(user.id);
  return { user: sanitizeUser(user), token: sessionToken };
}

// Initialize on require
init();

module.exports = {
  init,
  hasUsers,
  getUserCount,
  registerUser,
  loginUser,
  createSession,
  getUserByToken,
  logout,
  sanitizeUser,
  getUserCollection,
  saveUserCollection,
  getUserById,
  getSharedUsersList,
  listAllUsers,
  updateUserRole,
  resetUserPassword,
  deleteUser,
  createUserByAdmin,
  getSettings,
  saveSettings,
  startOidcFlow,
  handleOidcCallback
};
