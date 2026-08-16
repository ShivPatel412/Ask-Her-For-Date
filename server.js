require('dotenv').config();
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const fs = require('node:fs');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const db = require('./lib/db');
const { createSessionStore } = require('./lib/session');
const { defaultConfig, themes, fonts, favoriteMood, musicPresets, invitationTemplates } = require('./src/template');

const root = process.cwd();
const isVercel = !!(process.env.VERCEL || process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NOW_REGION);
const defaultDataPath = isVercel ? path.join(os.tmpdir(), 'ask-her-out', 'app.db') : 'data/app.db';
const rawPath = process.env.DATABASE_PATH || defaultDataPath;
const dataPath = (isVercel && !rawPath.startsWith(os.tmpdir())) ? path.join(os.tmpdir(), 'ask-her-out', 'app.db') : path.resolve(root, rawPath);
const uploadsPath = path.join(path.dirname(dataPath), 'uploads');
try { fs.mkdirSync(uploadsPath, { recursive: true }); } catch {}

const production = process.env.NODE_ENV === 'production';
const SESSION_SECRET = process.env.SESSION_SECRET || (production ? null : 'development-only-change-this-secret-now');
if (production && (!SESSION_SECRET || SESSION_SECRET === 'development-only-change-this-secret-now')) {
  throw new Error('SESSION_SECRET environment variable must be configured with a secure random key in production.');
}

async function seedSuperadminIfEmpty() {
  try {
    const userCountRow = await db.prepare('SELECT COUNT(*) c FROM users').get();
    const userCount = userCountRow?.c || 0;
    if (userCount === 0) {
      const email = (process.env.SUPERADMIN_EMAIL || 'info@shivpatel.in').toLowerCase();
      const username = process.env.SUPERADMIN_USERNAME || 'sastatengo';
      const defaultPassword = process.env.SUPERADMIN_PASSWORD;
      if (production && !defaultPassword) {
        console.warn('[SEED WARNING] SUPERADMIN_PASSWORD is not set. Skipping default superadmin seeding in production.');
        return;
      }
      const passwordToUse = defaultPassword || 'Shiv@412';
      const whatsapp = process.env.SUPERADMIN_WHATSAPP || '6351149722';
      const hash = bcrypt.hashSync(passwordToUse, 12);
      const result = await db.prepare('INSERT INTO users (email, username, password_hash, whatsapp_number, role) VALUES (?, ?, ?, ?, ?)').run(
        email, username, hash, whatsapp, 'superadmin'
      );
      try {
        await db.prepare('INSERT INTO user_logs (user_id, email, action, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)').run(result.lastInsertRowid, email, 'REGISTER', '127.0.0.1', 'System Seed');
      } catch (e) {}
    }
  } catch (err) {
    console.error('[SEED ERROR] Failed to seed superadmin:', err);
  }
}
seedSuperadminIfEmpty();

function signSessionState(data) {
  try {
    const payloadStr = JSON.stringify(data);
    const signature = crypto.createHmac('sha256', SESSION_SECRET || 'dev-secret').update(payloadStr).digest('base64url');
    return Buffer.from(payloadStr).toString('base64url') + '.' + signature;
  } catch {
    return '';
  }
}

function verifySessionState(tokenStr) {
  try {
    if (!tokenStr || typeof tokenStr !== 'string' || !tokenStr.includes('.')) return null;
    const parts = tokenStr.split('.');
    if (parts.length !== 2) return null;
    const [payloadB64, signature] = parts;
    const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET || 'dev-secret').update(payloadStr).digest('base64url');
    if (signature.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) return null;
    return JSON.parse(payloadStr);
  } catch {
    return null;
  }
}

class SQLiteSessionStore extends session.Store {
  get(sid, callback) {
    try {
      const sqliteDb = db.getSQLiteDb();
      const row = sqliteDb.prepare('SELECT data_json FROM web_sessions WHERE sid=? AND expires_at>?').get(sid, Date.now());
      if (!row) return callback(null, null);
      const data = JSON.parse(row.data_json);
      if (data.cookie && data.cookie.expires) {
        data.cookie.expires = new Date(data.cookie.expires);
      }
      callback(null, data);
    } catch (error) {
      callback(error);
    }
  }
  set(sid, value, callback = () => {}) {
    try {
      const sqliteDb = db.getSQLiteDb();
      const rawExpires = value.cookie?.expires ? new Date(value.cookie.expires).getTime() : null;
      const expires = (rawExpires && !isNaN(rawExpires)) ? rawExpires : Date.now() + (1000 * 60 * 60 * 24 * 7);
      sqliteDb.prepare('INSERT INTO web_sessions(sid,data_json,expires_at) VALUES(?,?,?) ON CONFLICT(sid) DO UPDATE SET data_json=excluded.data_json,expires_at=excluded.expires_at').run(sid, JSON.stringify(value), expires);
      callback();
    } catch (error) {
      callback(error);
    }
  }
  destroy(sid, callback = () => {}) {
    try {
      const sqliteDb = db.getSQLiteDb();
      sqliteDb.prepare('DELETE FROM web_sessions WHERE sid=?').run(sid);
      callback();
    } catch (error) {
      callback(error);
    }
  }
  touch(sid, value, callback = () => {}) {
    try {
      const sqliteDb = db.getSQLiteDb();
      const rawExpires = value.cookie?.expires ? new Date(value.cookie.expires).getTime() : null;
      const expires = (rawExpires && !isNaN(rawExpires)) ? rawExpires : Date.now() + (1000 * 60 * 60 * 24 * 7);
      sqliteDb.prepare('UPDATE web_sessions SET expires_at=? WHERE sid=?').run(expires, sid);
      callback();
    } catch (error) {
      callback(error);
    }
  }
}

const app = express();
app.set('trust proxy', 1);

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: { directives: {
  defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com'], imgSrc: ["'self'", 'data:'], mediaSrc: ["'self'", 'blob:', 'data:'],
  connectSrc: ["'self'"], objectSrc: ["'none'"], baseUri: ["'self'"], frameAncestors: ["'self'"]
} } }));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: false, limit: '15mb' }));
app.use(session({
  store: createSessionStore(SQLiteSessionStore),
  name: 'heartlink.sid',
  secret: SESSION_SECRET || 'dev-secret-key-12345',
  resave: false,
  saveUninitialized: false,
  rolling: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: production && !process.env.DATABASE_PATH?.includes('test'),
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

app.use((req, res, next) => {
  if (!req.path.startsWith('/assets/') && !req.path.startsWith('/media/')) {
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Vary', 'Cookie, Authorization');
  }
  next();
});

app.use((req, res, next) => {
  if (!req.path.startsWith('/api/') && !req.path.startsWith('/media/')) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
  }
  const origSend = res.send;
  if (typeof origSend === 'function') {
    res.send = function (body) {
      if (typeof body === 'string' && !res.getHeader('content-type')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
      }
      return origSend.call(this, body);
    };
  }
  const origEnd = res.end;
  if (typeof origEnd === 'function') {
    res.end = function (chunk, encoding, cb) {
      if (typeof chunk === 'string' && !res.getHeader('content-type') && (chunk.trimStart().startsWith('<') || chunk.trimStart().startsWith('<!'))) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
      }
      return origEnd.call(this, chunk, encoding, cb);
    };
  }
  next();
});
app.use('/assets', express.static(path.join(root, 'public', 'assets'), { maxAge: production ? '1d' : 0, etag: true }));
app.use('/assets', express.static(path.join(root, 'public'), { maxAge: production ? '1d' : 0, etag: true }));
app.use('/media', express.static(uploadsPath, { maxAge: '1d', immutable: true, fallthrough: false }));

const authLimit = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });
const publicLimit = rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false });
const now = () => new Date().toISOString();
const clean = (value, max = 500) => String(value ?? '').replace(/[<>\u0000-\u001F]/g, '').trim().slice(0, max);
const json = (value, fallback = {}) => { try { return JSON.parse(value); } catch { return fallback; } };
const token = (bytes = 9) => crypto.randomBytes(bytes).toString('base64url');
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
const normalizeWhatsApp = value => { const raw=String(value??'').trim(),digits=raw.replace(/\D/g,''); return /^\+?[\d\s().-]+$/.test(raw)&&/^[1-9]\d{7,14}$/.test(digits)?digits:''; };
const validColor = value => /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value);

app.get('/health', async (req, res) => {
  const dbHealth = await db.healthCheck();
  const statusCode = dbHealth.healthy ? 200 : 500;
  res.status(statusCode).json({
    status: dbHealth.healthy ? 'ok' : 'error',
    environment: process.env.NODE_ENV || 'development',
    database: dbHealth.driver,
    healthy: dbHealth.healthy,
    missingTables: dbHealth.missingTables || [],
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7) : '836dc74',
  });
});

function csrf(req) {
  if (!req?.session) return '';
  if (!req.session.csrf) req.session.csrf = token(24);
  return req.session.csrf;
}
function requireCsrf(req, res, next) {
  const supplied = req.get('x-csrf-token') || req.body?._csrf;
  const sessionCsrf = req.session?.csrf;
  let failureReason = '';

  if (!supplied) failureReason = 'Missing CSRF token in request';
  else if (!req.session) failureReason = 'Missing session object';
  else if (!sessionCsrf) failureReason = 'Session missing CSRF token';
  else if (supplied.length !== sessionCsrf.length || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(sessionCsrf))) {
    failureReason = 'CSRF token mismatch';
  }

  if (failureReason) {
    console.warn(`[CSRF WARNING] Security verification failed for path=${req.path} ip=${req.ip}: ${failureReason}`);
    if (req.accepts('html') && !req.path.startsWith('/api/')) {
      const mode = req.path.includes('register') ? 'register' : 'login';
      const title = mode === 'register' ? 'Create your account' : 'Welcome back';
      return authPage(title, mode, req, 'Security verification failed. Please refresh the page and try again.')
        .then(html => res.status(403).send(html))
        .catch(() => res.status(403).send('Security verification failed. Please refresh the page and try again.'));
    }
    return res.status(403).json({ error: 'Security verification failed. Please refresh the page and try again.' });
  }
  next();
}
async function requireUser(req, res, next) {
  if (!req.session?.userId) return req.accepts('html') ? res.redirect('/login') : res.status(401).json({ error: 'Please log in.' });
  const user = await db.prepare('SELECT id FROM users WHERE id=?').get(req.session.userId);
  if (!user) {
    req.session.userId = null;
    return req.accepts('html') ? res.redirect('/login') : res.status(401).json({ error: 'Please log in.' });
  }
  next();
}
async function ownedInvitation(id, userId) {
  if (!id || !userId) return null;
  const user = await db.prepare('SELECT role FROM users WHERE id=?').get(userId);
  if (!user) return null;
  const isSuper = user.role === 'superadmin';
  const num = Number(id);
  if (!Number.isNaN(num) && num > 0) {
    return isSuper
      ? await db.prepare('SELECT i.*,u.whatsapp_number FROM invitations i JOIN users u ON u.id=i.owner_user_id WHERE i.id=?').get(num)
      : await db.prepare('SELECT i.*,u.whatsapp_number FROM invitations i JOIN users u ON u.id=i.owner_user_id WHERE i.id=? AND i.owner_user_id=?').get(num, userId);
  }
  const tokenStr = String(id);
  return isSuper
    ? await db.prepare('SELECT i.*,u.whatsapp_number FROM invitations i JOIN users u ON u.id=i.owner_user_id WHERE i.public_token=?').get(tokenStr)
    : await db.prepare('SELECT i.*,u.whatsapp_number FROM invitations i JOIN users u ON u.id=i.owner_user_id WHERE i.public_token=? AND i.owner_user_id=?').get(tokenStr, userId);
}
function normalizeInvitationContent(rawContent) {
  const content = (rawContent && typeof rawContent === 'object') ? rawContent : {};
  let screens = {};
  if (content.screens && typeof content.screens === 'object') {
    screens = { ...content.screens };
  } else {
    screens = { ...content };
    delete screens.moods;
  }
  const fallbackScreens = defaultConfig('Inviter', 'Recipient').content;
  screens = { ...fallbackScreens, ...screens };

  const moods = Array.isArray(content.moods) ? content.moods : (Array.isArray(rawContent?.moods) ? rawContent.moods : []);
  let favorite = moods.find(m => m.favorite);
  if (!favorite) {
    favorite = moods.find(m => m.title?.startsWith('Long Drive + Food'));
    if (favorite) favorite.favorite = true;
    else moods.unshift(structuredClone(favoriteMood));
  }

  return { screens, moods };
}
function invitationDTO(row) {
  const rawContent = json(row.content_config_json);
  const normalizedContent = normalizeInvitationContent(rawContent);
  return { id: row.id, token: row.public_token, templateKey: row.template_key, inviterName: row.inviter_name, recipientName: row.recipient_name, whatsappNumber: row.whatsapp_number || '', title: row.title, status: row.status, theme: json(row.theme_config_json), content: normalizedContent, features: json(row.feature_config_json), createdAt: row.created_at, updatedAt: row.updated_at, publishedAt: row.published_at };
}
async function page(title, body, req, script = '') {
  const user = req.session?.userId ? await db.prepare('SELECT username, role FROM users WHERE id=?').get(req.session.userId) : null;
  const adminBtn = user?.role === 'superadmin' ? `<a class="button ghost small nav-admin" href="/admin" title="Admin Control Panel">👑 Admin</a>` : '';
  const nav = user ? `<nav class="topbar app-topbar"><a class="brand" href="/">Ask Her Out <span>♡</span></a><a class="user-dashboard-link" href="/dashboard" aria-label="Open dashboard"><span class="user-avatar" aria-hidden="true">${escapeHtml(user.username.slice(0,1).toUpperCase())}</span><span class="nav-user">${escapeHtml(user.username)}</span><span class="nav-dashboard-label">Dashboard</span></a>${adminBtn}<form method="post" action="/logout"><input type="hidden" name="_csrf" value="${csrf(req)}"><button class="link-button">Log out</button></form></nav>` : `<nav class="topbar marketing-topbar"><a class="brand" href="/">Ask Her Out <span>♡</span></a><div class="marketing-links"><a href="/#how-it-works">How it works</a><a href="/#template">Template</a><a href="/#features">Features</a><a href="/#contact">Contact</a></div><div class="marketing-actions"><a class="nav-login" href="/login">Login</a><a class="nav-register" href="/register">Register</a></div></nav>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#fff8f5"><meta name="csrf-token" content="${csrf(req)}"><title>${escapeHtml(title)} · Heartlink</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Fredoka:wght@500;600&family=Inter:wght@400;500;600;700&family=Manrope:wght@500;700&family=Nunito:wght@500;700&family=Playfair+Display:wght@600&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="/assets/css/app.css"></head><body>${nav}${body}<footer class="site-credit">© ${new Date().getFullYear()} Ask Her Out · Designed and developed by <a href="https://shivpatel.in" target="_blank" rel="noopener noreferrer">SastaTengo</a></footer>${script ? `<script src="${script}" defer></script>` : ''}</body></html>`;
}
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c])); }
function safeJSON(value) { return JSON.stringify(value).replace(/</g, '\\u003c'); }

async function marketingFooter(req) {
  const contact = escapeHtml(process.env.SUPERADMIN_EMAIL || 'info@shivpatel.in');
  const user = req?.session?.userId ? await db.prepare('SELECT id FROM users WHERE id=?').get(req.session.userId) : null;
  const accountLinks = user ? '<a href="/dashboard">Dashboard</a>' : '<a href="/login">Login</a><a href="/register">Register</a>';
  return `<footer class="marketing-footer" id="contact"><div><a class="brand" href="/">Ask Her Out <span>♡</span></a><p>Make the question memorable.</p></div><div><b>Account</b>${accountLinks}</div><div><b>Contact</b><a href="mailto:${contact}">${contact}</a><a href="https://github.com/ShivPatel412/Ask-Her-Out">GitHub</a></div></footer>`;
}

async function landingPage(req) {
  const footerHtml = await marketingFooter(req);
  return await page('Make the question memorable', `<main class="marketing-home">
    <section class="marketing-hero">
      <div class="hero-copy"><span class="hero-kicker">♡ Made for the question you're overthinking</span><h1>Don't just text them.<br><em>Make it memorable.</em></h1><p>Create a beautiful, personalized interactive invitation and ask them out in a way they'll actually remember.</p><div class="hero-actions"><a class="button primary" href="/register">Create Your Invitation <span>→</span></a><a class="button ghost" href="#how-it-works">See how it works</a></div><div class="hero-proof"><span>♡ No coding required</span><span>♡ Ready in minutes</span><span>♡ 100% yours</span></div></div>
      <div class="hero-visual" aria-label="Invitation preview"><i class="float-heart h1">♥</i><i class="float-heart h2">♥</i><div class="preview-phone hero-phone"><span class="phone-notch"></span><b>Tanvi👀</b><small>I made something for you…</small><span class="phone-cta">Open it ♥</span><img class="hero-couple-image" src="/assets/images/landing/hero-couple.png" alt="Cute couple holding a heart"></div></div>
    </section>
    <section class="marketing-section steps-section" id="how-it-works"><header><span>How it works</span><h2>From idea to invitation in 3 simple steps.</h2></header><div class="steps-grid"><article><b>01</b><img class="landing-icon" src="/assets/images/landing/icons/love-letter.png" alt=""><div><h3>Pick a template</h3><p>Start with a beautifully designed invitation.</p></div></article><article><b>02</b><img class="landing-icon" src="/assets/images/landing/icons/edit-pencil.png" alt=""><div><h3>Make it yours</h3><p>Add names, questions, colors, fonts, music, and more.</p></div></article><article><b>03</b><img class="landing-icon" src="/assets/images/landing/icons/link.png" alt=""><div><h3>Send the link</h3><p>Share your unique link and see their response.</p></div></article></div></section>
    <section class="marketing-section template-showcase" id="template"><div class="template-copy"><span>Featured template</span><h2>Best Friend → Date ♥</h2><p>Funny, cute, and slightly chaotic—perfect when “just asking normally” feels too boring.</p><div class="feature-chips"><i>Direct question</i><i>Funny reactions</i><i>Exact date & time</i><i>Cute mascots</i><i>Confetti</i><i>Hinglish</i></div><a class="button primary" href="/register">Use this template →</a></div><div class="template-phones"><div class="preview-phone mini-phone"><span class="phone-notch"></span><b>Will you go on a date with me? ♥</b><i class="filled">Haan 😌♥</i><i>Sochne do 🤭</i></div><div class="preview-phone mini-phone"><span class="phone-notch"></span><b>Pick our date & time ♥</b><i>Choose date</i><i>Choose time</i></div><div class="preview-phone mini-phone celebration-phone"><span class="phone-notch"></span><b>IT'S A DATE ♥</b><div>♡ ♡</div><small>SUCCESSFUL ✅😂</small></div></div></section>
    <section class="marketing-section customization" id="features"><div class="custom-preview"><div class="mini-controls"><b>Make it yours</b><label>Primary color <span class="swatches">● ● ● ● ●</span></label><label>Exact date <span>On</span></label><label>Mascots <span>On</span></label><label>Music <span>On</span></label></div><div class="preview-phone feature-phone"><span class="phone-notch"></span><b>Will you go on a date with me? ♥</b><i>Haan 😌♥</i><i>Sochne do 🤭</i><img class="feature-couple-image" src="/assets/images/landing/hero-couple.png" alt="Cute couple holding a heart"></div></div><div class="custom-copy"><span>Make it yours</span><h2>Their invitation.<br>Your personality.</h2><p>Change everything that matters without writing a single line of code.</p><div class="detail-grid"><article><img class="landing-icon" src="/assets/images/landing/icons/heart.png" alt=""><div><b>Colors</b><small>Choose a palette or create your own.</small></div></article><article><img class="landing-icon" src="/assets/images/landing/icons/calendar.png" alt=""><div><b>Date & time</b><small>Let them choose one exact moment.</small></div></article><article><img class="landing-icon" src="/assets/images/landing/icons/typography.png" alt=""><div><b>Typography</b><small>Romantic, cute, elegant, or modern.</small></div></article><article><img class="landing-icon" src="/assets/images/landing/icons/calendar.png" alt=""><div><b>Date ideas</b><small>Coffee, dinner, movie, drive, or your own idea.</small></div></article><article><img class="landing-icon" src="/assets/images/landing/icons/question-chat.png" alt=""><div><b>Questions</b><small>Rewrite every message and button.</small></div></article><article><img class="landing-icon" src="/assets/images/landing/icons/celebration.png" alt=""><div><b>Cute details</b><small>Mascots, music, collectibles, and confetti.</small></div></article></div></div></section>
    <section class="marketing-cta"><div class="cta-heart"><img src="/assets/images/landing/icons/heart.png" alt=""></div><div><h2>You've already thought about asking them.</h2><p>Now make it worth opening.</p></div><div><a class="button primary" href="/register">Create Your Invitation ♥</a><small>Start with the Best Friend → Date template</small></div></section>
    ${footerHtml}
  </main>`, req);
}
app.get('/', async (req, res) => res.send(await landingPage(req)));

app.get('/register', async (req, res) => {
  csrf(req);
  const html = await authPage('Create your account', 'register', req);
  req.session.save(() => res.send(html));
});
app.get('/login', async (req, res) => {
  csrf(req);
  const html = await authPage('Welcome back', 'login', req);
  req.session.save(() => res.send(html));
});
async function authPage(title, mode, req, error = '', values = {}) {
  const register = mode === 'register';
  const username=escapeHtml(values.username||''),email=escapeHtml(values.email||''),whatsapp=escapeHtml(values.whatsapp||'');
  const emailInput = register
    ? `<label>Email address<input name="email" type="email" required maxlength="254" autocomplete="email" inputmode="email" value="${email}" placeholder="you@example.com"></label>`
    : `<label>Email address or Username<input name="email" type="text" required maxlength="254" autocomplete="username" value="${email}" placeholder="you@example.com or username"></label>`;
  const footerHtml = await marketingFooter(req);
  return await page(title, `<main class="auth-wrap auth-modern"><section class="auth-showcase"><a class="auth-back" href="/">← Back home</a><span class="auth-kicker">Ask Her Out ♡</span><h2>${register?'Make the question feel unforgettable.':'Welcome back to your invitation studio.'}</h2><p>${register?'Create, personalize, publish, and share—without writing code.':'Your drafts, published links, music, and responses are waiting.'}</p><div class="auth-preview"><div class="preview-phone auth-phone"><span class="phone-notch"></span><b>Hey, favorite human 👀</b><strong>I made something for you…</strong><i>Open it ♥</i><img class="auth-couple-image" src="/assets/images/landing/hero-couple.png" alt="Cute couple holding a heart"></div></div><ul><li>Live visual preview</li><li>Private share link</li><li>Respectful answer flow</li></ul></section><section class="auth-card"><span class="auth-kicker">${register?'Create your account':'Good to see you again'}</span><h1>${title}</h1><p>${register?'Your first invitation is only a few minutes away.':'Log in to continue creating something memorable.'}</p>${error ? `<div class="alert" role="alert">${escapeHtml(error)}</div>` : ''}<form method="post" action="/${mode}" class="stack auth-form" onsubmit="const b=this.querySelector('button[type=submit]'); if(b){b.disabled=true; b.innerText='Processing...';}"><input type="hidden" name="_csrf" value="${csrf(req)}">${register ? `<label>Username<input name="username" required minlength="2" maxlength="40" autocomplete="username" value="${username}" placeholder="Your display name"><small>2–40 characters</small></label>` : ''}${emailInput}${register?`<label>WhatsApp number<input name="whatsapp" type="tel" required maxlength="24" autocomplete="tel" inputmode="tel" value="${whatsapp}" placeholder="+91 98765 43210"><small>Include your country code so they can message you.</small></label>`:''}<label>Password<input name="password" type="password" required minlength="8" maxlength="72" autocomplete="${register?'new-password':'current-password'}" placeholder="At least 8 characters">${register?'<small>Use 8–72 characters</small>':''}</label>${register?'<label>Confirm password<input name="confirmPassword" type="password" required minlength="8" maxlength="72" autocomplete="new-password" placeholder="Type it again"><small class="password-match" aria-live="polite"></small></label>':''}<button class="button primary" type="submit">${register ? 'Create account ♥' : 'Log in →'}</button></form><p class="swap">${register ? 'Already have an account? <a href="/login">Log in</a>' : 'New here? <a href="/register">Create an account</a>'}</p><small class="auth-privacy">By continuing, you agree to use this space kindly and respectfully.</small></section></main>${footerHtml}`, req, '/assets/js/auth.js');
}
async function logUserActivity(userId, email, action, req) {
  try {
    const ip = req.ip || req.get('x-forwarded-for') || req.socket?.remoteAddress || '';
    const ua = clean(req.get('user-agent'), 250);
    await db.prepare('INSERT INTO user_logs (user_id, email, action, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)').run(userId || null, email, action, clean(ip, 50), ua);
  } catch (err) {
    console.error('Failed to log user activity:', err);
  }
}

app.post('/register', authLimit, requireCsrf, async (req, res) => {
  const username = clean(req.body.username, 40), email = clean(req.body.email, 254).toLowerCase(), whatsappInput=clean(req.body.whatsapp,24), whatsapp=normalizeWhatsApp(whatsappInput), password = String(req.body.password || ''), confirmPassword=String(req.body.confirmPassword||'');
  const values={username,email,whatsapp:whatsappInput};
  if (username.length < 2 || !validEmail(email) || !whatsapp || password.length < 8 || password.length > 72) return res.status(400).send(await authPage('Create your account', 'register', req, 'Use a valid email, WhatsApp number with country code, 2+ character username, and an 8–72 character password.',values));
  if(password!==confirmPassword)return res.status(400).send(await authPage('Create your account','register',req,'Passwords do not match.',values));
  try {
    const hash = await bcrypt.hash(password, 12);
    const userCountRow = await db.prepare('SELECT COUNT(*) c FROM users').get();
    const totalUsers = userCountRow?.c || 0;
    const role = (totalUsers === 0 || process.env.SUPERADMIN_EMAIL?.toLowerCase() === email) ? 'superadmin' : 'user';
    const result = await db.prepare('INSERT INTO users (email,username,password_hash,whatsapp_number,role) VALUES (?,?,?,?,?)').run(email, username, hash, whatsapp, role);
    await logUserActivity(result.lastInsertRowid, email, 'REGISTER', req);
    req.session.regenerate(err => {
      if (err) return res.status(500).send('Could not start session.');
      req.session.userId = result.lastInsertRowid;
      csrf(req);
      req.session.save(saveErr => {
        if (saveErr) return res.status(500).send('Could not save session.');
        res.redirect(303, '/dashboard');
      });
    });
  } catch (error) { res.status(409).send(await authPage('Create your account', 'register', req, 'That email or username is already in use.',values)); }
});
app.post('/login', authLimit, requireCsrf, async (req, res) => {
  const loginInput = clean(req.body.email, 254).toLowerCase(), password = String(req.body.password || '');
  const user = loginInput ? await db.prepare('SELECT * FROM users WHERE LOWER(email)=? OR LOWER(username)=?').get(loginInput, loginInput) : null;
  if (!user || password.length < 8 || password.length > 72 || !await bcrypt.compare(password, user.password_hash)) {
    await logUserActivity(null, loginInput, 'FAILED_LOGIN', req);
    return res.status(401).send(await authPage('Welcome back', 'login', req, 'Email or password is incorrect.', { email: loginInput }));
  }
  await logUserActivity(user.id, user.email, 'LOGIN', req);
  req.session.regenerate(err => {
    if (err) return res.status(500).send('Could not start session.');
    req.session.userId = user.id;
    csrf(req);
    req.session.save(saveErr => {
      if (saveErr) return res.status(500).send('Could not save session.');
      res.redirect(303, '/dashboard');
    });
  });
});
app.post('/logout', requireUser, requireCsrf, async (req, res) => {
  const user = await db.prepare('SELECT email FROM users WHERE id=?').get(req.session.userId);
  if (user) await logUserActivity(req.session.userId, user.email, 'LOGOUT', req);
  req.session.userId = null;
  req.session.csrf = null;
  req.session.destroy(() => {
    res.setHeader('Set-Cookie', [
      'heartlink.sid=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax',
      'heartlink.state=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax'
    ]);
    res.redirect(303, '/');
  });
});

app.post('/dashboard', (req, res) => res.redirect(303, '/dashboard'));
app.post('/admin', (req, res) => res.redirect(303, '/admin'));

app.get('/admin', requireUser, async (req,res) => {
  const currentUser = await db.prepare('SELECT role FROM users WHERE id=?').get(req.session.userId);
  if (currentUser?.role !== 'superadmin') {
    return res.status(403).send(await page('Access Denied', '<main class="empty"><h1>👑 Admin access required.</h1><p>Only superadmin accounts can view system intelligence and logs.</p><a class="button primary" href="/dashboard">Back to Dashboard</a></main>', req));
  }

  const stats = await db.prepare(`SELECT (SELECT COUNT(*) FROM users) users, (SELECT COUNT(*) FROM invitations) invitations, (SELECT COUNT(*) FROM invitations WHERE status='published') published, (SELECT COUNT(*) FROM visitor_sessions) visits, (SELECT COUNT(*) FROM user_logs) logs, (SELECT COUNT(*) FROM email_notifications) emails`).get();
  
  const allUsers = await db.prepare(`SELECT id, username, email, whatsapp_number, role, created_at FROM users ORDER BY id DESC`).all();
  const userLogs = await db.prepare(`SELECT id, user_id, email, action, ip_address, user_agent, created_at FROM user_logs ORDER BY id DESC LIMIT 100`).all();
  const recentInvitations = await db.prepare(`SELECT i.id, i.recipient_name, i.inviter_name, i.status, i.updated_at, u.username FROM invitations i JOIN users u ON u.id=i.owner_user_id ORDER BY i.updated_at DESC LIMIT 50`).all();
  const recentEmails = await db.prepare(`SELECT e.*, i.title as invite_title FROM email_notifications e JOIN invitations i ON i.id=e.invitation_id ORDER BY e.id DESC LIMIT 30`).all();

  const userTableRows = allUsers.map(u => `<tr><td>#${u.id}</td><td><b><a href="/admin/users/${u.id}" class="admin-user-link">${escapeHtml(u.username)}</a></b></td><td>${escapeHtml(u.email)}</td><td>${escapeHtml(u.whatsapp_number || '—')}</td><td><span class="role-badge ${u.role}">${escapeHtml(u.role)}</span></td><td><small>${escapeHtml(new Date(u.created_at).toLocaleString())}</small></td><td><a class="button small ghost" href="/admin/users/${u.id}">History 🔍</a></td></tr>`).join('');
  
  const logTableRows = userLogs.map(l => `<tr><td><small>${escapeHtml(new Date(l.created_at).toLocaleString())}</small></td><td><b>${escapeHtml(l.email)}</b></td><td><span class="log-action ${escapeHtml(l.action)}">${escapeHtml(l.action)}</span></td><td><code>${escapeHtml(l.ip_address || '—')}</code></td><td><small title="${escapeHtml(l.user_agent || '')}">${escapeHtml((l.user_agent || '—').slice(0, 40))}</small></td></tr>`).join('');

  const inviteTableRows = recentInvitations.map(r => `<tr><td>${escapeHtml(r.username)}</td><td>${escapeHtml(r.inviter_name)} → ${escapeHtml(r.recipient_name)}</td><td><span class="status ${r.status}">${escapeHtml(r.status)}</span></td><td><small>${escapeHtml(new Date(r.updated_at).toLocaleDateString())}</small></td><td><a class="button small ghost" href="/dashboard/invitations/${r.id}/preview" target="_blank">Preview</a></td></tr>`).join('');

  const emailTableRows = recentEmails.map(em => `<tr><td><small>${escapeHtml(new Date(em.created_at).toLocaleString())}</small></td><td><b>${escapeHtml(em.recipient_email)}</b></td><td>${escapeHtml(em.invite_title)}</td><td><span class="status ${em.status === 'SENT' ? 'published' : em.status === 'SIMULATED' ? 'draft' : 'disabled'}">${escapeHtml(em.status)}</span></td><td><small>${escapeHtml(em.subject)}</small></td></tr>`).join('');

  const adminBody = `
    <main class="analytics admin-panel">
      <header class="page-head">
        <div>
          <span class="eyebrow">System & User Intelligence</span>
          <h1>Admin Control Panel 👑</h1>
          <p>Monitor registered users, security logs, system metrics, recipient responses, and email alerts.</p>
        </div>
      </header>
      <section class="metric-grid">
        <div class="metric"><span>Total Users</span><b>${stats.users}</b></div>
        <div class="metric"><span>Invitations</span><b>${stats.invitations}</b></div>
        <div class="metric"><span>Published</span><b>${stats.published}</b></div>
        <div class="metric"><span>Visitor Sessions</span><b>${stats.visits}</b></div>
        <div class="metric"><span>Email Alerts</span><b>${stats.emails}</b></div>
        <div class="metric"><span>Activity Logs</span><b>${stats.logs}</b></div>
      </section>
      
      <section class="panel">
        <div class="panel-head-flex" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h2>Registered User Accounts (${allUsers.length})</h2>
          <input id="user-search" type="search" placeholder="Filter users…" style="max-width:240px;padding:6px 12px;border:1px solid #dce0e5;border-radius:8px;">
        </div>
        <div class="table-wrap">
          <table id="users-table">
            <thead><tr><th>ID</th><th>Username</th><th>Email</th><th>WhatsApp</th><th>Role</th><th>Registered</th><th>Actions</th></tr></thead>
            <tbody>${userTableRows || '<tr><td colspan="7">No users found.</td></tr>'}</tbody>
          </table>
        </div>
      </section>

      <section class="panel">
        <h2>Automated SMTP Email Notifications (${recentEmails.length})</h2>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Timestamp</th><th>Recipient Email</th><th>Invitation</th><th>Status</th><th>Subject</th></tr></thead>
            <tbody>${emailTableRows || '<tr><td colspan="5">No emails sent yet.</td></tr>'}</tbody>
          </table>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head-flex" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h2>Security & Authentication Logs (${userLogs.length})</h2>
          <input id="log-search" type="search" placeholder="Filter logs…" style="max-width:240px;padding:6px 12px;border:1px solid #dce0e5;border-radius:8px;">
        </div>
        <div class="table-wrap">
          <table id="logs-table">
            <thead><tr><th>Timestamp</th><th>Email</th><th>Action</th><th>IP Address</th><th>User Agent</th></tr></thead>
            <tbody>${logTableRows || '<tr><td colspan="5">No logs recorded yet.</td></tr>'}</tbody>
          </table>
        </div>
      </section>

      <section class="panel">
        <h2>System Invitations (${recentInvitations.length})</h2>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Owner</th><th>Flow</th><th>Status</th><th>Updated</th><th>Preview</th></tr></thead>
            <tbody>${inviteTableRows || '<tr><td colspan="5">No invitations created yet.</td></tr>'}</tbody>
          </table>
        </div>
      </section>
      <script>
        document.querySelector('#user-search')?.addEventListener('input', e => {
          const q = e.target.value.toLowerCase();
          document.querySelectorAll('#users-table tbody tr').forEach(row => {
            row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
          });
        });
        document.querySelector('#log-search')?.addEventListener('input', e => {
          const q = e.target.value.toLowerCase();
          document.querySelectorAll('#logs-table tbody tr').forEach(row => {
            row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
          });
        });
      </script>
    </main>
  `;

  res.send(await page('Admin Control Panel 👑', adminBody, req));
});

app.get('/admin/users/:id', requireUser, async (req, res) => {
  const currentUser = await db.prepare('SELECT role FROM users WHERE id=?').get(req.session.userId);
  if (currentUser?.role !== 'superadmin') {
    return res.status(403).send(await page('Access Denied', '<main class="empty"><h1>👑 Admin access required.</h1><a class="button primary" href="/dashboard">Back to Dashboard</a></main>', req));
  }
  const targetUser = await db.prepare('SELECT id, username, email, whatsapp_number, role, created_at, updated_at FROM users WHERE id=?').get(Number(req.params.id));
  if (!targetUser) return res.status(404).send(await page('User Not Found', '<main class="empty"><h1>User account not found.</h1><a class="button primary" href="/admin">Back to Admin</a></main>', req));

  const userInvitations = await db.prepare(`SELECT i.*, COUNT(DISTINCT s.id) views, SUM(CASE WHEN s.final_result IS NOT NULL THEN 1 ELSE 0 END) replies, MAX(s.final_result) final_result FROM invitations i LEFT JOIN visitor_sessions s ON s.invitation_id=i.id WHERE i.owner_user_id=? GROUP BY i.id ORDER BY i.updated_at DESC`).all(targetUser.id);
  const userActivityLogs = await db.prepare('SELECT * FROM user_logs WHERE user_id=? OR email=? ORDER BY id DESC LIMIT 100').all(targetUser.id, targetUser.email);
  const userEmails = await db.prepare('SELECT e.*, i.title as invite_title FROM email_notifications e JOIN invitations i ON i.id=e.invitation_id WHERE e.user_id=? OR e.recipient_email=? ORDER BY e.id DESC').all(targetUser.id, targetUser.email);
  
  const userSessions = await db.prepare(`
    SELECT s.*, i.title as invite_title, i.recipient_name as target_name
    FROM visitor_sessions s
    JOIN invitations i ON i.id = s.invitation_id
    WHERE i.owner_user_id = ?
    ORDER BY s.started_at DESC
  `).all(targetUser.id);

  const inviteRows = userInvitations.map(inv => {
    const feat = json(inv.feature_config_json);
    const musicLabel = feat.music && feat.musicUrl ? `🎵 ${escapeHtml(feat.musicName || 'Audio')}` : '';
    const voiceLabel = feat.voiceNoteUrl ? `🎙️ ${escapeHtml(feat.voiceNoteName || 'Voice Note')}` : '';
    const mediaBadge = [musicLabel, voiceLabel].filter(Boolean).join(' + ') || '—';
    return `<tr>
      <td>#${inv.id}</td>
      <td><b>${escapeHtml(inv.title)}</b></td>
      <td>${escapeHtml(inv.inviter_name)} → ${escapeHtml(inv.recipient_name)}</td>
      <td><span class="status ${inv.status}">${escapeHtml(inv.status)}</span></td>
      <td>${inv.views} views / ${inv.replies || 0} replies</td>
      <td><b>${escapeHtml(inv.final_result || '—')}</b></td>
      <td><small>${mediaBadge}</small></td>
      <td><a class="button small ghost" href="/dashboard/invitations/${inv.id}/preview" target="_blank">Preview</a></td>
    </tr>`;
  }).join('');

  const sessionCards = await Promise.all(userSessions.map(async s => {
    const events = await db.prepare('SELECT * FROM events WHERE session_id=? ORDER BY sequence_number ASC').all(s.id);
    const timelineItems = events.map(e => `
      <li style="margin-bottom:6px;font-size:0.84rem;">
        <span style="color:#888;font-family:monospace;font-size:0.75rem;">[${new Date(e.created_at).toLocaleTimeString()}]</span>
        <strong style="color:var(--text);">${escapeHtml(e.screen || e.event_name)}</strong>:
        <span style="color:#555;">${escapeHtml(e.option_value || e.event_name)}</span>
      </li>
    `).join('');

    return `
      <article class="panel" style="margin-bottom:16px;background:#faf8f5;border:1px solid #e8e3dc;border-radius:14px;padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div>
            <b>${escapeHtml(s.invite_title)}</b> · Recipient: <b>${escapeHtml(s.selected_nickname || s.target_name || 'Recipient')}</b>
            <div style="font-size:0.8rem;color:#777;">Started: ${new Date(s.started_at).toLocaleString()} · Visitor ID: <code>${escapeHtml(s.visitor_id.slice(0, 16))}…</code></div>
          </div>
          <div>
            <span class="status ${s.final_result?.startsWith('YES') ? 'published' : 'draft'}" style="font-size:0.9rem;font-weight:700;">${escapeHtml(s.final_result || (s.completed ? 'COMPLETED' : 'INCOMPLETE'))}</span>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;background:#fff;padding:10px 14px;border-radius:10px;margin-bottom:12px;font-size:0.85rem;">
          <div><span style="color:#888;">Chosen Vibe:</span> <b>${escapeHtml(s.selected_mood || 'None')}</b></div>
          <div><span style="color:#888;">Chosen Date/Time:</span> <b>${escapeHtml(s.selected_date || 'None')}</b></div>
          <div><span style="color:#888;">Revisits:</span> <b>${s.main_question_visits}</b></div>
          <div><span style="color:#888;">Total Steps:</span> <b>${events.length}</b></div>
        </div>
        <details>
          <summary style="cursor:pointer;font-weight:600;font-size:0.85rem;color:var(--primary);">View Complete Clickstream Timeline (${events.length} clicks/actions)</summary>
          <ul style="margin:10px 0 0;padding-left:20px;border-left:2px solid var(--primary);">
            ${timelineItems || '<li>No interaction steps recorded.</li>'}
          </ul>
        </details>
      </article>
    `;
  }));

  const emailRows = userEmails.map(em => `<tr>
    <td><small>${escapeHtml(new Date(em.created_at).toLocaleString())}</small></td>
    <td>${escapeHtml(em.invite_title)}</td>
    <td><span class="status ${em.status === 'SENT' ? 'published' : em.status === 'SIMULATED' ? 'draft' : 'disabled'}">${escapeHtml(em.status)}</span></td>
    <td><small>${escapeHtml(em.subject)}</small></td>
  </tr>`).join('');

  const logRows = userActivityLogs.map(l => `<tr>
    <td><small>${escapeHtml(new Date(l.created_at).toLocaleString())}</small></td>
    <td><span class="log-action ${escapeHtml(l.action)}">${escapeHtml(l.action)}</span></td>
    <td><code>${escapeHtml(l.ip_address || '—')}</code></td>
    <td><small>${escapeHtml((l.user_agent || '—').slice(0, 50))}</small></td>
  </tr>`).join('');

  const body = `
    <main class="analytics user-detail-panel">
      <header class="page-head">
        <div>
          <nav class="analytics-breadcrumb" aria-label="Breadcrumb"><a href="/admin">← Back to Admin Panel</a><span>User Intelligence</span></nav>
          <h1>User Profile: ${escapeHtml(targetUser.username)}</h1>
          <p>Account details, created invitations, live recipient responses, full clickstream timelines, and email alerts.</p>
        </div>
      </header>

      <section class="metric-grid">
        <div class="metric"><span>Account ID</span><b>#${targetUser.id}</b></div>
        <div class="metric"><span>Role</span><b>${escapeHtml(targetUser.role)}</b></div>
        <div class="metric"><span>Total Invitations</span><b>${userInvitations.length}</b></div>
        <div class="metric"><span>Total Views</span><b>${userInvitations.reduce((sum, i) => sum + (i.views || 0), 0)}</b></div>
        <div class="metric"><span>Total Responses</span><b>${userInvitations.reduce((sum, i) => sum + (i.replies || 0), 0)}</b></div>
        <div class="metric"><span>Email Alerts</span><b>${userEmails.length}</b></div>
      </section>

      <section class="panel">
        <h2>Account Information</h2>
        <dl style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;padding:12px 0;">
          <div><dt style="color:#777;font-size:0.8rem;">Email Address</dt><dd style="font-weight:600;font-size:1.05rem;">${escapeHtml(targetUser.email)}</dd></div>
          <div><dt style="color:#777;font-size:0.8rem;">Username</dt><dd style="font-weight:600;font-size:1.05rem;">${escapeHtml(targetUser.username)}</dd></div>
          <div><dt style="color:#777;font-size:0.8rem;">WhatsApp Number</dt><dd style="font-weight:600;font-size:1.05rem;">${escapeHtml(targetUser.whatsapp_number || 'Not connected')}</dd></div>
          <div><dt style="color:#777;font-size:0.8rem;">Member Since</dt><dd style="font-weight:600;font-size:1.05rem;">${escapeHtml(new Date(targetUser.created_at).toLocaleDateString())}</dd></div>
        </dl>
      </section>

      <section class="panel">
        <h2>User Invitations (${userInvitations.length})</h2>
        <div class="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Title</th><th>Flow</th><th>Status</th><th>Engagement</th><th>Final Result</th><th>Audio Assets</th><th>Action</th></tr></thead>
            <tbody>${inviteRows || '<tr><td colspan="8">No invitations created by this user yet.</td></tr>'}</tbody>
          </table>
        </div>
      </section>

      <section class="panel">
        <h2>Recipient Responses & Complete Clickstream History (${userSessions.length})</h2>
        ${sessionCards.join('') || '<p style="color:#777;padding:12px 0;">No recipient responses received yet for this user.</p>'}
      </section>

      <section class="panel">
        <h2>Automated Email Alerts (${userEmails.length})</h2>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Timestamp</th><th>Invitation</th><th>Status</th><th>Subject</th></tr></thead>
            <tbody>${emailRows || '<tr><td colspan="4">No emails sent for this user.</td></tr>'}</tbody>
          </table>
        </div>
      </section>

      <section class="panel">
        <h2>Activity & Audit History (${userActivityLogs.length})</h2>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Timestamp</th><th>Action</th><th>IP Address</th><th>Client User Agent</th></tr></thead>
            <tbody>${logRows || '<tr><td colspan="4">No logs found for this user.</td></tr>'}</tbody>
          </table>
        </div>
      </section>
    </main>
  `;

  res.send(await page(`User: ${targetUser.username} · Admin`, body, req));
});

app.get('/dashboard', requireUser, async (req, res) => {
  const user = await db.prepare('SELECT username,whatsapp_number FROM users WHERE id=?').get(req.session.userId);
  const rows = await db.prepare(`SELECT i.*, COUNT(DISTINCT s.id) views, SUM(CASE WHEN s.final_result IS NOT NULL THEN 1 ELSE 0 END) replies, SUM(CASE WHEN s.final_result LIKE 'YES%' THEN 1 ELSE 0 END) yes_count, SUM(CASE WHEN s.final_result LIKE 'BEST%' THEN 1 ELSE 0 END) no_count, MAX(s.final_result) final_result FROM invitations i LEFT JOIN visitor_sessions s ON s.invitation_id=i.id WHERE i.owner_user_id=? GROUP BY i.id ORDER BY i.updated_at DESC`).all(req.session.userId);
  const totals={all:rows.length,published:rows.filter(r=>r.status==='published').length,draft:rows.filter(r=>r.status==='draft').length,replies:rows.reduce((n,r)=>n+(r.replies||0),0),yes:rows.reduce((n,r)=>n+(Number(r.yes_count)||0),0),no:rows.reduce((n,r)=>n+(Number(r.no_count)||0),0)};
  const cards = rows.map(r => {
    const updated = new Date(r.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const views = Number(r.views || 0);
    const totalReplies = Number(r.replies || 0);
    const yesCount = Number(r.yes_count || 0);
    const noCount = Number(r.no_count || 0);
    const yesRate = totalReplies > 0 ? Math.round((yesCount / totalReplies) * 100) : (views > 0 && yesCount > 0 ? Math.round((yesCount / views) * 100) : 0);
    return `<article class="invite-card" data-id="${r.id}" data-status="${r.status}" data-search="${escapeHtml(`${r.title} ${r.inviter_name} ${r.recipient_name}`.toLowerCase())}"><div class="invite-card-top"><span class="status ${r.status}">${r.status}</span><details><summary aria-label="More actions">•••</summary><div class="menu"><a href="/dashboard/invitations/${r.id}/preview" target="_blank">Preview</a><button data-action="duplicate" data-id="${r.id}">Duplicate</button><button data-action="toggle" data-id="${r.id}">${r.status === 'disabled' ? 'Enable draft' : 'Disable'}</button><button class="danger" data-action="delete" data-id="${r.id}">Delete</button></div></details></div><div><h2>${escapeHtml(r.recipient_name)} <span>♥</span></h2><p>${escapeHtml(r.inviter_name)} → ${escapeHtml(r.recipient_name)}</p><dl class="invite-stats"><div><dt>Views</dt><dd>${views}</dd></div><div><dt>Replies</dt><dd>${totalReplies}</dd></div><div><dt>YES ❤️</dt><dd>${yesCount}</dd></div><div><dt>NO 🤝</dt><dd>${noCount}</dd></div></dl>${totalReplies > 0 ? `<div class="card-yes-rate" aria-label="YES response rate: ${yesRate}%"><div class="yes-rate-bar"><div class="yes-rate-fill" style="width:${yesRate}%"></div></div><small><b>${yesRate}%</b> YES Rate (${yesCount}/${totalReplies})</small></div>` : ''}<small class="card-updated">Updated ${escapeHtml(updated)} · Result: <b>${escapeHtml(r.final_result || 'Pending')}</b></small></div><div class="card-actions"><a class="button small ghost" href="/dashboard/invitations/${r.id}/analytics">▥ Analytics</a><a class="button small ghost" href="/dashboard/invitations/${r.id}/edit">✎ Edit</a><button class="button small ghost copy" data-id="${r.id}" data-url="/i/${r.public_token}">⌁ Copy link</button></div></article>`;
  }).join('');
  const whatsappSetup=!user.whatsapp_number?`<form class="whatsapp-setup" method="post" action="/dashboard/whatsapp"><input type="hidden" name="_csrf" value="${csrf(req)}"><div><b>Connect WhatsApp</b><span>Add your number so their final button opens your chat.</span></div><input name="whatsapp" type="tel" required maxlength="24" inputmode="tel" autocomplete="tel" placeholder="+91 98765 43210"><button class="button primary small">Save number</button></form>`:'';
  res.send(await page('Dashboard', `<main class="dashboard dashboard-studio"><header class="page-head dashboard-hero"><div><span class="eyebrow">Your invitation studio</span><h1>Welcome back, ${escapeHtml(user.username)} 👋</h1><p>Create something personal, then share it when it feels right.</p></div><a class="button primary create-invite" href="/dashboard/invitations/new">＋ Create Invitation ♥</a></header>${whatsappSetup}<section class="dashboard-metrics"><article><i>✉</i><div><span>Total invitations</span><b>${totals.all}</b><small>All time</small></div></article><article><i>✓</i><div><span>Published</span><b>${totals.published}</b><small>Live invitations</small></div></article><article><i>◯</i><div><span>Replies</span><b>${totals.replies}</b><small>Total responses</small></div></article><article><i>✎</i><div><span>Drafts</span><b>${totals.draft}</b><small>Not published yet</small></div></article></section><section class="invitations-section"><div class="dashboard-toolbar"><h2>Your Invitations</h2><div><label class="dashboard-search"><span>⌕</span><input id="invitation-search" type="search" placeholder="Search invitations…" aria-label="Search invitations"></label><select id="invitation-filter" aria-label="Filter invitations"><option value="all">All</option><option value="draft">Drafts</option><option value="published">Published</option><option value="disabled">Disabled</option></select></div></div><section class="invite-grid">${cards || '<div class="empty"><div class="empty-heart">♡</div><h2>No invitations yet</h2><p>Your first thoughtful ask starts here.</p><a class="button primary" href="/dashboard/invitations/new">Create Invitation ♥</a></div>'}</section><p id="dashboard-empty-filter" class="dashboard-empty-filter" hidden>No invitations match that search.</p></section></main>`, req, '/assets/js/dashboard.js'));
});

app.post('/dashboard/whatsapp', requireUser, requireCsrf, async (req,res)=>{
  const whatsapp=normalizeWhatsApp(req.body.whatsapp);
  const user = await db.prepare('SELECT email FROM users WHERE id=?').get(req.session.userId);
  if(!whatsapp)return res.status(400).send(await page('Invalid WhatsApp number','<main class="empty"><h1>Enter a valid WhatsApp number with country code.</h1><a class="button primary" href="/dashboard">Back to dashboard</a></main>',req));
  await db.prepare('UPDATE users SET whatsapp_number=? WHERE id=?').run(whatsapp,req.session.userId);
  if (user) await logUserActivity(req.session.userId, user.email, 'UPDATE_WHATSAPP', req);
  res.redirect('/dashboard');
});

app.get('/dashboard/invitations/new', requireUser, async (req, res) => res.send(await page('New invitation', `<main class="new-wrap"><header><span class="eyebrow">Choose a starting point</span><h1>Create an invitation</h1><p>Quick Setup gets you a polished link in under a minute.</p></header><section class="template-card selected"><div class="template-art"><img src="/assets/images/landing/hero-couple.png" alt="Cute couple holding a heart"></div><div><span class="pill">Recommended</span><h2>Best Friend → Date ❤️</h2><p>Cute, funny Hinglish date invitation with playful choices, exact date planning, and original mascots.</p></div></section><div class="setup-grid"><form id="quick-form" class="panel stack"><h2>Quick Setup ⚡</h2><label>Your Name<input name="inviterName" required maxlength="60"></label><label>Their Name<input name="recipientName" required maxlength="60"></label><button class="button primary">Create Invitation ❤️</button></form><form id="custom-form" class="panel stack"><h2>Customize Everything ✨</h2><p>Start with the same polished template, then edit the flow, colors, date ideas, and cute features.</p><label>Your Name<input name="inviterName" required maxlength="60"></label><label>Their Name<input name="recipientName" required maxlength="60"></label><button class="button ghost">Open visual builder</button></form></div></main>`, req, '/assets/js/new.js')));

app.post('/api/invitations', requireUser, requireCsrf, async (req, res) => {
  const inviterName = clean(req.body.inviterName, 60), recipientName = clean(req.body.recipientName, 60);
  if (!inviterName || !recipientName) return res.status(400).json({ error: 'Both names are required.' });
  const user = await db.prepare('SELECT email FROM users WHERE id=?').get(req.session.userId);
  const cfg = defaultConfig(inviterName, recipientName), publicToken = token();
  const result = await db.prepare(`INSERT INTO invitations (owner_user_id,public_token,inviter_name,recipient_name,title,theme_config_json,content_config_json,feature_config_json) VALUES (?,?,?,?,?,?,?,?)`).run(req.session.userId, publicToken, inviterName, recipientName, cfg.title, JSON.stringify(cfg.theme), JSON.stringify({ screens: cfg.content, moods: cfg.moods }), JSON.stringify(cfg.features));
  if (user) await logUserActivity(req.session.userId, user.email, 'CREATE_INVITATION', req);
  res.status(201).json({ id: result.lastInsertRowid, token: publicToken });
});

app.get('/dashboard/invitations/:id/edit', requireUser, async (req, res) => {
  const row = await ownedInvitation(req.params.id, req.session.userId);
  if (!row) return res.status(404).send(await page('Invitation not found', '<main class="empty"><h1>Invitation not found.</h1><p>The invitation you requested does not exist or you do not have access to it.</p><a class="button primary" href="/dashboard">Return to Dashboard</a></main>', req));
  res.send(await page('Edit invitation', `<main id="builder" class="builder" data-id="${row.id}"><header class="builder-head"><div><a href="/dashboard">← Dashboard</a><h1>${escapeHtml(row.recipient_name)}'s invitation <span aria-hidden="true">✎</span></h1><span id="save-status">✓ All changes saved</span></div><div class="actions"><a class="button ghost small" target="_blank" href="/dashboard/invitations/${row.id}/preview">◉ Preview</a><button id="save-draft" class="button ghost small">▣ Save draft</button><button id="publish" class="button primary small">Publish Invitation ♥</button></div></header><div class="mobile-tabs"><button data-tab="edit" class="active">Edit</button><button data-tab="preview">Preview</button></div><div class="builder-grid"><section id="controls" class="controls"></section><aside id="preview-pane" class="preview-pane"><div class="preview-toolbar" aria-label="Preview size"><button class="active" data-viewport="mobile">▯ Mobile</button><button data-viewport="tablet">▯ Tablet</button><button data-viewport="desktop">▱ Desktop</button></div><div class="phone"><iframe title="Live invitation preview" src="/dashboard/invitations/${row.id}/preview?embed=1"></iframe></div><span class="preview-dots" aria-hidden="true">● ○ ○ ○ ○</span></aside></div></main>`, req, '/assets/js/builder.js'));
});

app.get('/api/invitations/:id', requireUser, async (req, res) => { const row = await ownedInvitation(req.params.id, req.session.userId); if (!row) return res.status(404).json({ error:'Not found.' }); res.json({ ...invitationDTO(row), presets: { themes, music: musicPresets, templates: invitationTemplates }, csrf: csrf(req) }); });
app.put('/api/invitations/:id', requireUser, requireCsrf, async (req, res) => {
  const row = await ownedInvitation(req.params.id, req.session.userId); if (!row) return res.status(404).json({ error:'Not found.' });
  const inviterName = clean(req.body.inviterName,60), recipientName = clean(req.body.recipientName,60), title = clean(req.body.title,100);
  const theme = req.body.theme || {}, content = req.body.content || {}, features = req.body.features || {};
  if (!inviterName || !recipientName || !title) return res.status(400).json({ error:'Names and title are required.' });
  for (const key of ['background','primary','secondary','text','card']) if (theme[key] && !validColor(theme[key])) return res.status(400).json({ error:`Invalid ${key} color.` });
  const currentTheme = json(row.theme_config_json);
  theme.heading = theme.heading || currentTheme.heading || fonts.romantic.heading;
  theme.body = theme.body || currentTheme.body || fonts.romantic.body;
  const allowedFonts = new Set(Object.values(fonts).flatMap(f => [f.heading,f.body]));
  if (!allowedFonts.has(theme.heading) || !allowedFonts.has(theme.body)) return res.status(400).json({ error:'Choose a curated font.' });
  const safeContent = sanitizeObject(content, 1000, 5); const safeFeatures = sanitizeObject(features, 100, 3); const safeTheme = sanitizeObject(theme, 100, 2);
  const storedFeatures = json(row.feature_config_json);
  safeFeatures.musicUrl = ('musicUrl' in features) ? (features.musicUrl || null) : (storedFeatures.musicUrl || null);
  safeFeatures.musicName = ('musicName' in features) ? (features.musicName || null) : (storedFeatures.musicName || null);
  safeFeatures.voiceNoteUrl = ('voiceNoteUrl' in features) ? (features.voiceNoteUrl || null) : (storedFeatures.voiceNoteUrl || null);
  safeFeatures.voiceNoteName = ('voiceNoteName' in features) ? (features.voiceNoteName || null) : (storedFeatures.voiceNoteName || null);
  await db.prepare(`UPDATE invitations SET inviter_name=?,recipient_name=?,title=?,theme_config_json=?,content_config_json=?,feature_config_json=?,updated_at=? WHERE id=? AND owner_user_id=?`).run(inviterName,recipientName,title,JSON.stringify(safeTheme),JSON.stringify(safeContent),JSON.stringify(safeFeatures),now(),row.id,row.owner_user_id);
  const user = await db.prepare('SELECT email FROM users WHERE id=?').get(req.session.userId);
  if (user) await logUserActivity(req.session.userId, user.email, 'UPDATE_INVITATION', req);
  res.json({ ok:true, updatedAt:now() });
});
function detectAudioType(req, buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 10) return null;
  if (buffer.subarray(0, 3).toString() === 'ID3' || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)) return { ext: 'mp3', mime: 'audio/mpeg' };
  if (buffer.subarray(0, 4).toString() === 'OggS') return { ext: 'ogg', mime: 'audio/ogg' };
  if (buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WAVE') return { ext: 'wav', mime: 'audio/wav' };
  if (buffer.includes(Buffer.from('ftyp')) || buffer.includes(Buffer.from('M4A ')) || buffer.includes(Buffer.from('mp42'))) return { ext: 'm4a', mime: 'audio/mp4' };

  let filename = '';
  try { filename = decodeURIComponent(req.get('x-file-name') || '').toLowerCase(); } catch {}
  if (filename.endsWith('.mp3')) return { ext: 'mp3', mime: 'audio/mpeg' };
  if (filename.endsWith('.m4a') || filename.endsWith('.aac') || filename.endsWith('.mp4')) return { ext: 'm4a', mime: 'audio/mp4' };
  if (filename.endsWith('.wav')) return { ext: 'wav', mime: 'audio/wav' };
  if (filename.endsWith('.ogg')) return { ext: 'ogg', mime: 'audio/ogg' };
  if (filename.endsWith('.webm')) return { ext: 'webm', mime: 'audio/webm' };
  if (filename.endsWith('.flac')) return { ext: 'flac', mime: 'audio/flac' };

  const contentType = String(req.get('content-type') || '').toLowerCase();
  if (contentType.includes('audio/mpeg') || contentType.includes('audio/mp3')) return { ext: 'mp3', mime: 'audio/mpeg' };
  if (contentType.includes('audio/mp4') || contentType.includes('audio/x-m4a') || contentType.includes('audio/m4a') || contentType.includes('audio/aac')) return { ext: 'm4a', mime: 'audio/mp4' };
  if (contentType.includes('audio/wav') || contentType.includes('audio/x-wav')) return { ext: 'wav', mime: 'audio/wav' };
  if (contentType.includes('audio/ogg')) return { ext: 'ogg', mime: 'audio/ogg' };

  if (buffer.length >= 100) return { ext: 'mp3', mime: 'audio/mpeg' };
  return null;
}
const audioBody = express.raw({ type: () => true, limit: '15mb' });
async function removeUnusedMusic(url, excludingId) {
  if (!/^\/media\/[a-f0-9]{32}\.(mp3|ogg|wav|m4a)$/.test(url || '')) return;
  const rows = await db.prepare('SELECT id,feature_config_json FROM invitations WHERE id != ?').all(excludingId);
  const used = rows.some(row => json(row.feature_config_json).musicUrl === url);
  if (!used) fs.rmSync(path.join(uploadsPath, path.basename(url)), { force: true });
}
app.post('/api/invitations/:id/music', requireUser, requireCsrf, audioBody, async (req,res) => {
  const row=await ownedInvitation(req.params.id,req.session.userId); if(!row)return res.status(404).json({error:'Not found.'});
  let dataUri = '';
  let original = clean(decodeURIComponent(req.get('x-file-name')||''),100) || 'Favorite song';
  if (req.body && typeof req.body === 'object' && req.body.musicUrl) {
    dataUri = String(req.body.musicUrl);
    if (req.body.name) original = clean(req.body.name, 100);
  } else if (Buffer.isBuffer(req.body)) {
    const type = detectAudioType(req, req.body);
    if (!type) return res.status(400).json({ error: 'Upload a valid MP3, M4A, OGG, or WAV file.' });
    const mime = type.mime || 'audio/mpeg';
    dataUri = `data:${mime};base64,${req.body.toString('base64')}`;
    try {
      const filename=`${crypto.randomBytes(16).toString('hex')}.${type.ext}`;
      await fs.promises.writeFile(path.join(uploadsPath,filename),req.body,{flag:'wx'});
    } catch (err) {}
  }
  if (!dataUri || (!dataUri.startsWith('data:audio/') && !dataUri.startsWith('/media/'))) {
    return res.status(400).json({ error: 'Upload a valid MP3, M4A, OGG, or WAV file.' });
  }
  const features=json(row.feature_config_json),oldUrl=features.musicUrl;
  Object.assign(features,{music:true,musicUrl:dataUri,musicName:original});
  await db.prepare('UPDATE invitations SET feature_config_json=?,updated_at=? WHERE id=? AND owner_user_id=?').run(JSON.stringify(features),now(),row.id,row.owner_user_id);
  await removeUnusedMusic(oldUrl,row.id);
  const user = await db.prepare('SELECT email FROM users WHERE id=?').get(req.session.userId);
  if (user) await logUserActivity(req.session.userId, user.email, 'UPLOAD_MUSIC', req);
  res.status(201).json({url:dataUri,name:original});
});
app.delete('/api/invitations/:id/music',requireUser,requireCsrf,async (req,res)=>{
  const row=await ownedInvitation(req.params.id,req.session.userId);if(!row)return res.status(404).json({error:'Not found.'});
  const features=json(row.feature_config_json),oldUrl=features.musicUrl;Object.assign(features,{music:false,musicUrl:null,musicName:null});
  await db.prepare('UPDATE invitations SET feature_config_json=?,updated_at=? WHERE id=? AND owner_user_id=?').run(JSON.stringify(features),now(),row.id,row.owner_user_id);
  await removeUnusedMusic(oldUrl,row.id);
  const user = await db.prepare('SELECT email FROM users WHERE id=?').get(req.session.userId);
  if (user) await logUserActivity(req.session.userId, user.email, 'DELETE_MUSIC', req);
  res.json({ok:true});
});

function detectImageType(req, buffer) {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return { ext: 'jpg', mime: 'image/jpeg' };
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return { ext: 'png', mime: 'image/png' };
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return { ext: 'gif', mime: 'image/gif' };
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && buffer.slice(8, 12).toString() === 'WEBP') return { ext: 'webp', mime: 'image/webp' };
  
  const contentType = String(req.get('content-type') || '').toLowerCase();
  if (contentType.includes('image/jpeg') || contentType.includes('image/jpg')) return { ext: 'jpg', mime: 'image/jpeg' };
  if (contentType.includes('image/png')) return { ext: 'png', mime: 'image/png' };
  if (contentType.includes('image/webp')) return { ext: 'webp', mime: 'image/webp' };
  if (contentType.includes('image/gif')) return { ext: 'gif', mime: 'image/gif' };
  return null;
}

const imageBody = express.raw({ type: () => true, limit: '8mb' });

app.post('/api/invitations/:id/cover', requireUser, requireCsrf, imageBody, async (req, res) => {
  const row = await ownedInvitation(req.params.id, req.session.userId);
  if (!row) return res.status(404).json({ error: 'Not found.' });
  let dataUri = '';
  let caption = clean(decodeURIComponent(req.get('x-caption') || ''), 80) || '';
  if (req.body && typeof req.body === 'object' && req.body.coverPhotoUrl) {
    dataUri = String(req.body.coverPhotoUrl);
    if (req.body.caption) caption = clean(req.body.caption, 80);
  } else if (Buffer.isBuffer(req.body)) {
    const type = detectImageType(req, req.body);
    if (!type) return res.status(400).json({ error: 'Upload a valid JPG, PNG, WebP, or GIF image.' });
    const mime = type.mime || 'image/jpeg';
    dataUri = `data:${mime};base64,${req.body.toString('base64')}`;
    try {
      const filename = `${crypto.randomBytes(16).toString('hex')}.${type.ext}`;
      await fs.promises.writeFile(path.join(uploadsPath, filename), req.body, { flag: 'wx' });
    } catch (err) {}
  }
  if (!dataUri || (!dataUri.startsWith('data:image/') && !dataUri.startsWith('/media/'))) {
    return res.status(400).json({ error: 'Upload a valid JPG, PNG, WebP, or GIF image.' });
  }
  const features = json(row.feature_config_json);
  Object.assign(features, { coverPhoto: true, coverPhotoUrl: dataUri, coverPhotoCaption: caption });
  await db.prepare('UPDATE invitations SET feature_config_json=?,updated_at=? WHERE id=? AND owner_user_id=?').run(JSON.stringify(features), now(), row.id, row.owner_user_id);
  const user = await db.prepare('SELECT email FROM users WHERE id=?').get(req.session.userId);
  if (user) await logUserActivity(req.session.userId, user.email, 'UPLOAD_COVER_PHOTO', req);
  res.status(201).json({ url: dataUri, caption });
});

app.delete('/api/invitations/:id/cover', requireUser, requireCsrf, async (req, res) => {
  const row = await ownedInvitation(req.params.id, req.session.userId);
  if (!row) return res.status(404).json({ error: 'Not found.' });
  const features = json(row.feature_config_json);
  Object.assign(features, { coverPhoto: false, coverPhotoUrl: null, coverPhotoCaption: null });
  await db.prepare('UPDATE invitations SET feature_config_json=?,updated_at=? WHERE id=? AND owner_user_id=?').run(JSON.stringify(features), now(), row.id, row.owner_user_id);
  const user = await db.prepare('SELECT email FROM users WHERE id=?').get(req.session.userId);
  if (user) await logUserActivity(req.session.userId, user.email, 'DELETE_COVER_PHOTO', req);
  res.json({ ok: true });
});
function sanitizeObject(value, maxString, depth) {
  if (depth < 0) return null;
  if (Array.isArray(value)) return value.slice(0, 30).map(v => sanitizeObject(v, maxString, depth - 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).slice(0, 100).map(([k, v]) => {
        const key = clean(k, 60);
        const limit = (key === 'musicUrl' || key === 'voiceNoteUrl' || key === 'url' || key.endsWith('Url') || key.endsWith('URI')) ? 15_000_000 : maxString;
        return [key, sanitizeObject(v, limit, depth - 1)];
      })
    );
  }
  if (typeof value === 'string') return clean(value, maxString);
  if (typeof value === 'boolean' || typeof value === 'number') return value;
  return null;
}
app.post('/api/invitations/:id/status', requireUser, requireCsrf, async (req,res) => {
  const row=await ownedInvitation(req.params.id,req.session.userId); if(!row)return res.status(404).json({error:'Not found.'});
  const status=['draft','published','disabled'].includes(req.body.status)?req.body.status:null; if(!status)return res.status(400).json({error:'Invalid status.'});
  const publishedAt = (status === 'published') ? (row.published_at || now()) : row.published_at;
  await db.prepare(`UPDATE invitations SET status=?,published_at=?,updated_at=? WHERE id=? AND owner_user_id=?`).run(status,publishedAt,now(),row.id,row.owner_user_id);
  const user = await db.prepare('SELECT email FROM users WHERE id=?').get(req.session.userId);
  if (user) await logUserActivity(req.session.userId, user.email, status === 'published' ? 'PUBLISH_INVITATION' : 'STATUS_CHANGE', req);
  res.json({ok:true,url:status==='published'?`/i/${row.public_token}`:null});
});
app.post('/api/invitations/:id/duplicate', requireUser, requireCsrf, async (req,res) => {
  const r=await ownedInvitation(req.params.id,req.session.userId); if(!r)return res.status(404).json({error:'Not found.'});
  const out=await db.prepare(`INSERT INTO invitations(owner_user_id,template_key,public_token,inviter_name,recipient_name,title,status,theme_config_json,content_config_json,feature_config_json) VALUES(?,?,?,?,?,?,?,?,?,?)`).run(req.session.userId,r.template_key,token(),r.inviter_name,r.recipient_name,`${r.title} (copy)`,'draft',r.theme_config_json,r.content_config_json,r.feature_config_json);
  const user = await db.prepare('SELECT email FROM users WHERE id=?').get(req.session.userId);
  if (user) await logUserActivity(req.session.userId, user.email, 'DUPLICATE_INVITATION', req);
  res.status(201).json({id:out.lastInsertRowid});
});
app.delete('/api/invitations/:id', requireUser, requireCsrf, async (req,res) => {
  const r=await ownedInvitation(req.params.id,req.session.userId); if(!r)return res.status(404).json({error:'Not found.'});
  await db.prepare('DELETE FROM invitations WHERE id=? AND owner_user_id=?').run(r.id,r.owner_user_id);
  const user = await db.prepare('SELECT email FROM users WHERE id=?').get(req.session.userId);
  if (user) await logUserActivity(req.session.userId, user.email, 'DELETE_INVITATION', req);
  res.json({ok:true});
});

app.get('/dashboard/invitations/:id/preview', requireUser, async (req,res) => {
  const r = await ownedInvitation(req.params.id, req.session.userId);
  if (!r) return res.status(404).send(await page('Invitation not found', '<main class="empty"><h1>Invitation preview unavailable.</h1><p>This invitation does not exist or you do not have permission to view it.</p><a class="button primary" href="/dashboard">Return to Dashboard</a></main>', req));
  res.set('Cache-Control','no-store').send(invitationPage(r,true));
});
app.get('/i/:token', async (req,res) => { const r=await db.prepare("SELECT i.*,u.whatsapp_number FROM invitations i JOIN users u ON u.id=i.owner_user_id WHERE i.public_token=? AND i.status='published'").get(req.params.token); if(!r)return res.status(404).send(await page('Invitation unavailable','<main class="empty"><h1>This invitation is unavailable.</h1><p>It may be a draft or temporarily disabled.</p></main>',req)); res.set('Cache-Control','no-store').send(invitationPage(r,false)); });
function invitationPage(row, preview) {
  const cfg=invitationDTO(row), payload={...cfg,preview};
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><meta name="theme-color" content="${escapeHtml(cfg.theme.background)}"><title>${escapeHtml(cfg.title)}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Fredoka:wght@500;600&family=Inter:wght@400;500;600;700&family=Manrope:wght@500;700&family=Nunito:wght@500;700&family=Playfair+Display:wght@600&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="/assets/css/invitation.css"></head><body><div id="app"></div><script id="invitation-data" type="application/json">${safeJSON(payload)}</script><script src="/assets/js/invitation.js" defer></script></body></html>`;
}

// SMTP Email Notification Alert System
const nodemailer = require('nodemailer');
let mailTransporter = null;
function getMailer() {
  if (mailTransporter) return mailTransporter;
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    try {
      mailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS || '',
        },
      });
    } catch {}
  }
  return mailTransporter;
}

async function sendInvitationEmailAlert(invitationId, sessionId) {
  try {
    const inv = await db.prepare(`
      SELECT i.*, u.email as owner_email, u.username as owner_username, u.id as owner_id
      FROM invitations i
      JOIN users u ON u.id = i.owner_user_id
      WHERE i.id = ?
    `).get(invitationId);
    if (!inv || !inv.owner_email) return;

    const sessionRow = await db.prepare('SELECT * FROM visitor_sessions WHERE id = ?').get(sessionId);
    if (!sessionRow) return;

    const allEvents = await db.prepare('SELECT * FROM events WHERE session_id = ? ORDER BY sequence_number ASC').all(sessionId);

    const resultLabel = sessionRow.final_result || (sessionRow.completed ? 'COMPLETED' : 'RESPONDED');
    const nickname = sessionRow.selected_nickname || inv.recipient_name || 'Recipient';
    const mood = sessionRow.selected_mood || 'Not specified';
    const dateVal = sessionRow.selected_date || 'Not specified';

    const timelineHtml = allEvents.map((e) => {
      const timeStr = new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return `<li style="margin-bottom:8px;line-height:1.4;">
        <span style="color:#888;font-family:monospace;font-size:12px;">[${timeStr}]</span>
        <strong style="color:#282223;">${escapeHtml(e.event_name.replace(/_/g, ' '))}</strong>:
        <span style="color:#555;">${escapeHtml(e.option_value || e.screen || 'action')}</span>
      </li>`;
    }).join('');

    const subject = `🎉 ${inv.recipient_name} responded to your date invitation! (${resultLabel})`;
    const bodyHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family:'Segoe UI',Roboto,Helvetica,sans-serif;background:#f9f6f2;color:#282223;padding:24px;margin:0;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;padding:28px;box-shadow:0 10px 30px rgba(0,0,0,0.06);border:1px solid #ede8e3;">
          <div style="text-align:center;margin-bottom:20px;">
            <span style="font-size:36px;">💌</span>
            <h1 style="margin:8px 0 4px;font-size:22px;color:#ff625f;">New Date Response!</h1>
            <p style="margin:0;color:#70686a;font-size:14px;">Hey <b>${escapeHtml(inv.owner_username)}</b>, your invitation received a response.</p>
          </div>
          
          <div style="background:#fff3f2;border-radius:14px;padding:16px 20px;margin-bottom:20px;border:1px solid #ffd8d6;text-align:center;">
            <span style="font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:#ff625f;">Final Decision</span>
            <div style="font-size:24px;font-weight:800;color:#282223;margin-top:4px;">${escapeHtml(resultLabel)}</div>
          </div>

          <table style="width:100%;margin-bottom:20px;font-size:14px;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:#888;">Recipient:</td><td style="padding:6px 0;font-weight:700;text-align:right;">${escapeHtml(inv.recipient_name)} (${escapeHtml(nickname)})</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Chosen Vibe:</td><td style="padding:6px 0;font-weight:700;text-align:right;">${escapeHtml(mood)}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Chosen Date & Time:</td><td style="padding:6px 0;font-weight:700;text-align:right;">${escapeHtml(dateVal)}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">Total Clicks/Steps:</td><td style="padding:6px 0;font-weight:700;text-align:right;">${allEvents.length} actions</td></tr>
          </table>

          <div style="border-top:1px dashed #e2ded9;padding-top:16px;margin-top:16px;">
            <h3 style="font-size:14px;color:#70686a;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px;">Detailed Clickstream & Interaction History:</h3>
            <ul style="padding-left:16px;margin:0;font-size:13px;">
              ${timelineHtml || '<li>No interaction steps recorded.</li>'}
            </ul>
          </div>

          <div style="text-align:center;margin-top:28px;padding-top:16px;border-top:1px solid #eee;">
            <small style="color:#aaa;font-size:11px;">Sent automatically by Ask Her For Date / Heartlink</small>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailer = getMailer();
    let status = 'SIMULATED';
    let errorMsg = null;

    if (mailer) {
      try {
        await mailer.sendMail({
          from: process.env.SMTP_FROM || `"Heartlink" <noreply@${process.env.SMTP_HOST || 'heartlink.app'}>`,
          to: inv.owner_email,
          subject,
          html: bodyHtml,
        });
        status = 'SENT';
      } catch (err) {
        status = 'FAILED';
        errorMsg = err.message;
      }
    }

    await db.prepare(`
      INSERT INTO email_notifications (invitation_id, user_id, recipient_email, event_type, subject, body_html, status, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(inv.id, inv.owner_id, inv.owner_email, resultLabel, subject, bodyHtml, status, errorMsg);

    await logUserActivity(inv.owner_id, inv.owner_email, `EMAIL_NOTIFICATION_${status}`, { ip: '127.0.0.1', get: () => 'System' });
  } catch (e) {
    console.error('Error sending invitation email alert:', e);
  }
}

app.post('/api/invitations/:token/session', publicLimit, async (req,res) => {
  const inv = await db.prepare("SELECT id FROM invitations WHERE public_token=? AND status='published'").get(req.params.token);
  if(!inv)return res.status(404).json({error:'Not found.'});
  const visitorId = /^[A-Za-z0-9_-]{16,80}$/.test(req.body.visitorId||'') ? req.body.visitorId : token(16);
  const sessionSql = db.isMySQLConfigured()
    ? 'INSERT INTO visitor_sessions(invitation_id,visitor_id) VALUES(?,?) ON DUPLICATE KEY UPDATE visitor_id=visitor_id'
    : 'INSERT OR IGNORE INTO visitor_sessions(invitation_id,visitor_id) VALUES(?,?)';
  await db.prepare(sessionSql).run(inv.id, visitorId);
  const s = await db.prepare('SELECT id FROM visitor_sessions WHERE invitation_id=? AND visitor_id=?').get(inv.id,visitorId);
  res.status(201).json({visitorId,sessionId:s.id});
});
const allowedEvents=new Set(['invitation_opened','screen_view','button_clicked','back_to_main','nickname_selected','nickname_changed','mood_selected','mood_changed','availability_selected','main_question_view','final_yes','best_friend_result','completion','cute_item_found','tiny_mode','music_play','music_pause','evasion_triggered','evasion_teleport','evasion_error_modal','voice_note_played']);
app.post('/api/invitations/:token/events', publicLimit, async (req,res) => {
  const inv=await db.prepare("SELECT id FROM invitations WHERE public_token=? AND status='published'").get(req.params.token); if(!inv)return res.status(404).json({error:'Not found.'});
  const visitorId=clean(req.body.visitorId,80), eventName=clean(req.body.eventName,50); if(!/^[A-Za-z0-9_-]{16,80}$/.test(visitorId)||!allowedEvents.has(eventName))return res.status(400).json({error:'Invalid event.'});
  const s=await db.prepare('SELECT * FROM visitor_sessions WHERE invitation_id=? AND visitor_id=?').get(inv.id,visitorId); if(!s)return res.status(404).json({error:'Session not found.'});
  const seqRow = await db.prepare('SELECT COALESCE(MAX(sequence_number),0)+1 n FROM events WHERE session_id=?').get(s.id);
  const sequence = seqRow?.n || 1;
  const screen=clean(req.body.screen,50),previous=clean(req.body.previousScreen,50),option=clean(req.body.optionValue,100);
  
  await db.prepare('INSERT INTO events(invitation_id,session_id,event_name,screen,previous_screen,option_value,sequence_number) VALUES(?,?,?,?,?,?,?)').run(inv.id,s.id,eventName,screen,previous,option,sequence);
  const updates={};
  if(eventName==='nickname_selected')updates.selected_nickname=option;
  if(eventName==='mood_selected'||eventName==='mood_changed')updates.selected_mood=option;
  if(eventName==='availability_selected'){updates.selected_availability=option;updates.selected_date=clean(req.body.selectedDate,30)||null;}
  if(eventName==='final_yes')updates.final_result='YES ❤️';
  if(eventName==='best_friend_result')updates.final_result='BEST FRIEND 🤝';
  if(eventName==='completion')updates.completed=1;
  if(eventName==='main_question_view')updates.main_question_visits=s.main_question_visits+1;
  const keys=Object.keys(updates);
  if(keys.length)await db.prepare(`UPDATE visitor_sessions SET ${keys.map(k=>`${k}=?`).join(',')},last_activity_at=? WHERE id=?`).run(...keys.map(k=>updates[k]),now(),s.id);
  else await db.prepare('UPDATE visitor_sessions SET last_activity_at=? WHERE id=?').run(now(),s.id);
  
  if (['final_yes', 'best_friend_result', 'completion', 'availability_selected'].includes(eventName)) {
    sendInvitationEmailAlert(inv.id, s.id).catch(() => {});
  }
  res.status(201).json({ok:true,sequence});
});

app.get('/dashboard/invitations/:id/analytics',requireUser,async (req,res)=>{const r=await ownedInvitation(req.params.id,req.session.userId);if(!r)return res.status(404).send(await page('Not found.'));res.send(await page('Analytics',`<main class="analytics analytics-detail" data-id="${r.id}"><header class="page-head analytics-head"><div><nav class="analytics-breadcrumb" aria-label="Breadcrumb"><a href="/dashboard">← Dashboard</a><span>Invitation intelligence</span></nav><h1>${escapeHtml(r.recipient_name)}'s journey</h1><p>See how visitors move through the invitation and where they respond.</p></div><div class="actions"><button id="refresh" class="button ghost small">↻ Refresh</button><button id="reset" class="button danger small">Clear test data</button></div></header><div id="analytics-content" aria-live="polite"></div></main>`,req,'/assets/js/analytics.js'));});
app.get('/api/invitations/:id/analytics',requireUser,async (req,res)=>{const r=await ownedInvitation(req.params.id,req.session.userId);if(!r)return res.status(404).json({error:'Not found.'});const sessions=await db.prepare('SELECT * FROM visitor_sessions WHERE invitation_id=? ORDER BY started_at DESC').all(r.id),events=await db.prepare('SELECT e.*,s.visitor_id,s.final_result FROM events e JOIN visitor_sessions s ON s.id=e.session_id WHERE e.invitation_id=? ORDER BY e.created_at ASC,e.sequence_number ASC').all(r.id);const yes=sessions.filter(s=>s.final_result?.startsWith('YES')).length,best=sessions.filter(s=>s.final_result?.startsWith('BEST')).length;res.json({summary:{views:sessions.length,uniqueSessions:sessions.length,yes,bestFriend:best,incomplete:sessions.filter(s=>!s.completed).length,revisits:sessions.reduce((n,s)=>n+Math.max(0,s.main_question_visits-1),0),averageSteps:sessions.length?Math.round(events.length/sessions.length):0,lastVisit:sessions[0]?.last_activity_at||null},sessions,events});});
app.delete('/api/invitations/:id/analytics',requireUser,requireCsrf,async (req,res)=>{
  const r=await ownedInvitation(req.params.id,req.session.userId);if(!r)return res.status(404).json({error:'Not found.'});
  await db.prepare('DELETE FROM visitor_sessions WHERE invitation_id=?').run(r.id);
  const user = await db.prepare('SELECT email FROM users WHERE id=?').get(req.session.userId);
  if (user) await logUserActivity(req.session.userId, user.email, 'CLEAR_ANALYTICS', req);
  res.json({ok:true});
});

app.get('/dashboard/invitations/:invitationId/sessions/:sessionId',requireUser,async (req,res)=>{const r=await ownedInvitation(req.params.invitationId,req.session.userId);if(!r)return res.status(404).send(await page('Not found.'));const s=await db.prepare('SELECT * FROM visitor_sessions WHERE id=? AND invitation_id=?').get(req.params.sessionId,r.id);if(!s)return res.status(404).send(await page('Session not found.'));const ev=await db.prepare('SELECT * FROM events WHERE session_id=? ORDER BY sequence_number').all(s.id);res.send(await page('Session journey',`<main class="analytics"><a href="/dashboard/invitations/${r.id}/analytics">← Analytics</a><header class="page-head"><div><span class="eyebrow">Visitor session</span><h1>${escapeHtml(s.selected_nickname||r.recipient_name||'Recipient')}</h1><p>${escapeHtml(s.final_result||'Incomplete')} · ${ev.length} steps</p></div></header><div class="journey">${ev.map(e=>`<div class="journey-node"><b>${escapeHtml(e.screen||e.event_name)}</b><span>${escapeHtml(e.option_value||e.event_name)}</span><time>${escapeHtml(e.created_at)}</time></div>`).join('')}</div></main>`,req));});

app.use(async (req,res)=>res.status(404).send(await page('Not found','<main class="empty"><h1>That page wandered off.</h1><a class="button primary" href="/">Go home</a></main>',req)));
app.use((err,req,res,next)=>{console.error(err);if(res.headersSent)return next(err);res.status(500).json({error:'Something went wrong.'});});

if(require.main===module){const port=Number(process.env.PORT)||3000;app.listen(port,()=>console.log(`Heartlink running at http://localhost:${port}`));}
module.exports={app,db};
