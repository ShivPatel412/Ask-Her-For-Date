require('dotenv').config();
const path = require('node:path');
const crypto = require('node:crypto');
const fs = require('node:fs');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { openDatabase } = require('./src/database');
const { defaultConfig, themes, fonts, favoriteMood } = require('./src/template');

const root = __dirname;
const dataPath = path.resolve(root, process.env.DATABASE_PATH || 'data/app.db');
const uploadsPath = path.join(path.dirname(dataPath), 'uploads');
fs.mkdirSync(uploadsPath, { recursive: true });
const db = openDatabase(dataPath);
class SQLiteSessionStore extends session.Store {
  get(sid, callback) { try { const row=db.prepare('SELECT data_json FROM web_sessions WHERE sid=? AND expires_at>?').get(sid,Date.now()); callback(null,row?JSON.parse(row.data_json):null); } catch(error){ callback(error); } }
  set(sid, value, callback=()=>{}) { try { const expires=value.cookie?.expires?new Date(value.cookie.expires).getTime():Date.now()+43_200_000; db.prepare('INSERT INTO web_sessions(sid,data_json,expires_at) VALUES(?,?,?) ON CONFLICT(sid) DO UPDATE SET data_json=excluded.data_json,expires_at=excluded.expires_at').run(sid,JSON.stringify(value),expires); callback(); } catch(error){ callback(error); } }
  destroy(sid, callback=()=>{}) { try { db.prepare('DELETE FROM web_sessions WHERE sid=?').run(sid); callback(); } catch(error){ callback(error); } }
  touch(sid, value, callback=()=>{}) { try { const expires=value.cookie?.expires?new Date(value.cookie.expires).getTime():Date.now()+43_200_000; db.prepare('UPDATE web_sessions SET expires_at=? WHERE sid=?').run(expires,sid); callback(); } catch(error){ callback(error); } }
}
const app = express();
const production = process.env.NODE_ENV === 'production';
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: { directives: {
  defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", 'https://fonts.googleapis.com'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com'], imgSrc: ["'self'", 'data:'], mediaSrc: ["'self'", 'blob:'],
  connectSrc: ["'self'"], objectSrc: ["'none'"], baseUri: ["'self'"], frameAncestors: ["'self'"]
} } }));
app.use(express.json({ limit: '128kb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));
app.use(session({
  store: new SQLiteSessionStore(),
  name: 'heartlink.sid', secret: process.env.SESSION_SECRET || 'development-only-change-this-secret-now',
  resave: false, saveUninitialized: false, rolling: true,
  cookie: { httpOnly: true, sameSite: 'lax', secure: production, maxAge: 1000 * 60 * 60 * 12 }
}));
app.use('/assets', express.static(path.join(root, 'public'), { maxAge: production ? '1d' : 0, etag: true }));
app.use('/media', express.static(uploadsPath, { maxAge: '1d', immutable: true, fallthrough: false }));

const authLimit = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });
const publicLimit = rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false });
const now = () => new Date().toISOString();
const clean = (value, max = 500) => String(value ?? '').replace(/[<>\u0000-\u001F]/g, '').trim().slice(0, max);
const json = (value, fallback = {}) => { try { return JSON.parse(value); } catch { return fallback; } };
const token = (bytes = 9) => crypto.randomBytes(bytes).toString('base64url');
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
const validColor = value => /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value);

function csrf(req) {
  if (!req.session.csrf) req.session.csrf = token(24);
  return req.session.csrf;
}
function requireCsrf(req, res, next) {
  const supplied = req.get('x-csrf-token') || req.body?._csrf;
  if (!supplied || !req.session.csrf || supplied.length !== req.session.csrf.length || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(req.session.csrf))) return res.status(403).json({ error: 'Security token expired. Refresh and try again.' });
  next();
}
function requireUser(req, res, next) {
  if (!req.session.userId) return req.accepts('html') ? res.redirect('/login') : res.status(401).json({ error: 'Please log in.' });
  next();
}
function ownedInvitation(id, userId) {
  return db.prepare('SELECT * FROM invitations WHERE id = ? AND owner_user_id = ?').get(Number(id), userId);
}
function invitationDTO(row) {
  const content=json(row.content_config_json), moods=Array.isArray(content.moods)?content.moods:[];
  let favorite=moods.find(m=>m.favorite); if(!favorite){favorite=moods.find(m=>m.title?.startsWith('Long Drive + Food'));if(favorite)favorite.favorite=true;else moods.unshift(structuredClone(favoriteMood));}
  content.moods=moods;
  return { id: row.id, token: row.public_token, templateKey: row.template_key, inviterName: row.inviter_name, recipientName: row.recipient_name, title: row.title, status: row.status, theme: json(row.theme_config_json), content, features: json(row.feature_config_json), createdAt: row.created_at, updatedAt: row.updated_at, publishedAt: row.published_at };
}
function page(title, body, req, script = '') {
  const user = req.session.userId ? db.prepare('SELECT username FROM users WHERE id=?').get(req.session.userId) : null;
  const nav = user ? `<nav class="topbar"><a class="brand" href="/dashboard">Heartlink <span>♥</span></a><span class="nav-user">${escapeHtml(user.username)}</span><form method="post" action="/logout"><input type="hidden" name="_csrf" value="${csrf(req)}"><button class="link-button">Log out</button></form></nav>` : `<nav class="topbar"><a class="brand" href="/">Heartlink <span>♥</span></a></nav>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#fff8f5"><meta name="csrf-token" content="${csrf(req)}"><title>${escapeHtml(title)} · Heartlink</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Fredoka:wght@500;600&family=Inter:wght@400;500;600;700&family=Manrope:wght@500;700&family=Nunito:wght@500;700&family=Playfair+Display:wght@600&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="/assets/css/app.css"></head><body>${nav}${body}${script ? `<script src="${script}" defer></script>` : ''}</body></html>`;
}
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c])); }
function safeJSON(value) { return JSON.stringify(value).replace(/</g, '\\u003c'); }

app.get('/', (req, res) => res.send(page('Create a thoughtful invitation', `<main class="landing"><section><span class="pill">A tiny invitation studio</span><h1>Ask them in a way that feels <em>made for them.</em></h1><p>Build a playful, private invitation with live preview, a respectful answer flow, and a journey you can revisit.</p><div class="actions"><a class="button primary" href="/register">Create yours ♥</a><a class="button ghost" href="/login">Log in</a></div></section><div class="hero-card"><div class="mascot yellow">✦<i></i></div><span class="eyebrow">Hey, favorite human 👀</span><h2>I made something for you…</h2><button class="button primary">Open it ❤️</button><small>Made with way too much overthinking 😂</small></div></main>`, req)));

app.get('/register', (req, res) => res.send(authPage('Create your account', 'register', req)));
app.get('/login', (req, res) => res.send(authPage('Welcome back', 'login', req)));
function authPage(title, mode, req, error = '') {
  const register = mode === 'register';
  return page(title, `<main class="auth-wrap"><section class="auth-card"><span class="pill">Heartlink ♥</span><h1>${title}</h1><p>${register ? 'Your first invitation is a minute away.' : 'Your invitations missed you.'}</p>${error ? `<div class="alert">${escapeHtml(error)}</div>` : ''}<form method="post" action="/${mode}" class="stack"><input type="hidden" name="_csrf" value="${csrf(req)}">${register ? '<label>Username<input name="username" required minlength="2" maxlength="40" autocomplete="username"></label>' : ''}<label>Email<input name="email" type="email" required maxlength="254" autocomplete="email"></label><label>Password<input name="password" type="password" required minlength="8" maxlength="72" autocomplete="current-password"></label><button class="button primary" type="submit">${register ? 'Create account ♥' : 'Log in'}</button></form><p class="swap">${register ? 'Already have an account? <a href="/login">Log in</a>' : 'New here? <a href="/register">Create an account</a>'}</p></section></main>`, req);
}
app.post('/register', authLimit, requireCsrf, async (req, res) => {
  const username = clean(req.body.username, 40), email = clean(req.body.email, 254).toLowerCase(), password = String(req.body.password || '');
  if (username.length < 2 || !validEmail(email) || password.length < 8 || password.length > 72) return res.status(400).send(authPage('Create your account', 'register', req, 'Use a valid email, a 2+ character username, and an 8+ character password.'));
  try {
    const hash = await bcrypt.hash(password, 12);
    const role = process.env.SUPERADMIN_EMAIL?.toLowerCase() === email ? 'superadmin' : 'user';
    const result = db.prepare('INSERT INTO users (email,username,password_hash,role) VALUES (?,?,?,?)').run(email, username, hash, role);
    req.session.regenerate(err => { if (err) return res.status(500).send('Could not start session.'); req.session.userId = result.lastInsertRowid; csrf(req); res.redirect('/dashboard'); });
  } catch (error) { res.status(409).send(authPage('Create your account', 'register', req, 'That email or username is already in use.')); }
});
app.post('/login', authLimit, requireCsrf, async (req, res) => {
  const email = clean(req.body.email, 254).toLowerCase(), user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!user || !await bcrypt.compare(String(req.body.password || ''), user.password_hash)) return res.status(401).send(authPage('Welcome back', 'login', req, 'Email or password is incorrect.'));
  req.session.regenerate(err => { if (err) return res.status(500).send('Could not start session.'); req.session.userId = user.id; csrf(req); res.redirect('/dashboard'); });
});
app.post('/logout', requireUser, requireCsrf, (req, res) => req.session.destroy(() => res.redirect('/')));

app.get('/admin', requireUser, (req,res) => {
  const user=db.prepare('SELECT role FROM users WHERE id=?').get(req.session.userId); if(user?.role!=='superadmin')return res.status(403).send('Superadmin access required.');
  const stats=db.prepare(`SELECT (SELECT COUNT(*) FROM users) users,(SELECT COUNT(*) FROM invitations) invitations,(SELECT COUNT(*) FROM invitations WHERE status='published') published,(SELECT COUNT(*) FROM visitor_sessions) visits`).get();
  const recent=db.prepare(`SELECT i.id,i.recipient_name,i.status,i.updated_at,u.username FROM invitations i JOIN users u ON u.id=i.owner_user_id ORDER BY i.updated_at DESC LIMIT 50`).all();
  res.send(page('Admin',`<main class="analytics"><header class="page-head"><div><span class="eyebrow">Application overview</span><h1>Heartlink admin</h1></div></header><section class="metric-grid">${Object.entries(stats).map(([k,v])=>`<div class="metric"><span>${escapeHtml(k)}</span><b>${v}</b></div>`).join('')}</section><section class="panel"><h2>Recent invitations</h2><div class="table-wrap"><table><thead><tr><th>Owner</th><th>Recipient</th><th>Status</th><th>Updated</th></tr></thead><tbody>${recent.map(r=>`<tr><td>${escapeHtml(r.username)}</td><td>${escapeHtml(r.recipient_name)}</td><td>${escapeHtml(r.status)}</td><td>${escapeHtml(r.updated_at)}</td></tr>`).join('')}</tbody></table></div></section></main>`,req));
});

app.get('/dashboard', requireUser, (req, res) => {
  const user = db.prepare('SELECT username FROM users WHERE id=?').get(req.session.userId);
  const rows = db.prepare(`SELECT i.*, COUNT(DISTINCT s.id) views, MAX(s.final_result) final_result FROM invitations i LEFT JOIN visitor_sessions s ON s.invitation_id=i.id WHERE i.owner_user_id=? GROUP BY i.id ORDER BY i.updated_at DESC`).all(req.session.userId);
  const cards = rows.map(r => `<article class="invite-card"><div><span class="status ${r.status}">${r.status}</span><h2>${escapeHtml(r.recipient_name)} <span>♥</span></h2><p>${escapeHtml(r.inviter_name)} → ${escapeHtml(r.recipient_name)}</p><dl><div><dt>Views</dt><dd>${r.views}</dd></div><div><dt>Final result</dt><dd>${escapeHtml(r.final_result || '—')}</dd></div></dl></div><div class="card-actions"><a class="button small" href="/dashboard/invitations/${r.id}/analytics">Analytics</a><a class="button small ghost" href="/dashboard/invitations/${r.id}/edit">Edit</a><button class="button small ghost copy" data-url="${r.status === 'published' ? `/i/${r.public_token}` : ''}">Copy link</button><details><summary aria-label="More actions">•••</summary><div class="menu"><a href="/dashboard/invitations/${r.id}/preview" target="_blank">Preview</a><button data-action="duplicate" data-id="${r.id}">Duplicate</button><button data-action="toggle" data-id="${r.id}">${r.status === 'disabled' ? 'Enable draft' : 'Disable'}</button><button class="danger" data-action="delete" data-id="${r.id}">Delete</button></div></details></div></article>`).join('');
  res.send(page('Dashboard', `<main class="dashboard"><header class="page-head"><div><span class="eyebrow">Your invitation studio</span><h1>Welcome back, ${escapeHtml(user.username)} 👋</h1><p>Create something personal, then share it when it feels right.</p></div><a class="button primary" href="/dashboard/invitations/new">+ Create Invitation ❤️</a></header><section class="invite-grid">${cards || '<div class="empty"><div class="empty-heart">♡</div><h2>No invitations yet</h2><p>Your first thoughtful ask starts here.</p><a class="button primary" href="/dashboard/invitations/new">Create Invitation ❤️</a></div>'}</section></main>`, req, '/assets/js/dashboard.js'));
});

app.get('/dashboard/invitations/new', requireUser, (req, res) => res.send(page('New invitation', `<main class="new-wrap"><header><span class="eyebrow">Choose a starting point</span><h1>Create an invitation</h1><p>Quick Setup gets you a polished link in under a minute.</p></header><section class="template-card selected"><div class="template-art"><span>☺</span><b>♥</b><span>✦</span></div><div><span class="pill">Recommended</span><h2>Best Friend → Date ❤️</h2><p>Cute, funny Hinglish date invitation with playful choices, nicknames, date planning, and original mascots.</p></div></section><div class="setup-grid"><form id="quick-form" class="panel stack"><h2>Quick Setup ⚡</h2><label>Your Name<input name="inviterName" required maxlength="60"></label><label>Their Name<input name="recipientName" required maxlength="60"></label><button class="button primary">Create Invitation ❤️</button></form><form id="custom-form" class="panel stack"><h2>Customize Everything ✨</h2><p>Start with the same polished template, then edit the flow, colors, fonts, nicknames, date ideas, and cute features.</p><label>Your Name<input name="inviterName" required maxlength="60"></label><label>Their Name<input name="recipientName" required maxlength="60"></label><button class="button ghost">Open visual builder</button></form></div></main>`, req, '/assets/js/new.js')));

app.post('/api/invitations', requireUser, requireCsrf, (req, res) => {
  const inviterName = clean(req.body.inviterName, 60), recipientName = clean(req.body.recipientName, 60);
  if (!inviterName || !recipientName) return res.status(400).json({ error: 'Both names are required.' });
  const cfg = defaultConfig(inviterName, recipientName), publicToken = token();
  const result = db.prepare(`INSERT INTO invitations (owner_user_id,public_token,inviter_name,recipient_name,title,theme_config_json,content_config_json,feature_config_json) VALUES (?,?,?,?,?,?,?,?)`).run(req.session.userId, publicToken, inviterName, recipientName, cfg.title, JSON.stringify(cfg.theme), JSON.stringify({ screens: cfg.content, nicknames: cfg.nicknames, moods: cfg.moods, availability: cfg.availability }), JSON.stringify(cfg.features));
  res.status(201).json({ id: result.lastInsertRowid, token: publicToken });
});

app.get('/dashboard/invitations/:id/edit', requireUser, (req, res) => {
  const row = ownedInvitation(req.params.id, req.session.userId); if (!row) return res.status(404).send('Invitation not found.');
  res.send(page('Edit invitation', `<main id="builder" class="builder" data-id="${row.id}"><header class="builder-head"><div><a href="/dashboard">← Dashboard</a><h1>${escapeHtml(row.recipient_name)}'s invitation</h1><span id="save-status">Saved ✓</span></div><div class="actions"><a class="button ghost small" target="_blank" href="/dashboard/invitations/${row.id}/preview">Preview</a><button id="save-draft" class="button ghost small">Save draft</button><button id="publish" class="button primary small">Publish Invitation ❤️</button></div></header><div class="mobile-tabs"><button data-tab="edit" class="active">Edit</button><button data-tab="preview">Preview</button></div><div class="builder-grid"><section id="controls" class="controls"></section><aside id="preview-pane" class="preview-pane"><div class="phone"><iframe title="Live invitation preview" src="/dashboard/invitations/${row.id}/preview?embed=1"></iframe></div></aside></div></main>`, req, '/assets/js/builder.js'));
});

app.get('/api/invitations/:id', requireUser, (req, res) => { const row = ownedInvitation(req.params.id, req.session.userId); if (!row) return res.status(404).json({ error:'Not found.' }); res.json({ ...invitationDTO(row), presets: { themes }, csrf: csrf(req) }); });
app.put('/api/invitations/:id', requireUser, requireCsrf, (req, res) => {
  const row = ownedInvitation(req.params.id, req.session.userId); if (!row) return res.status(404).json({ error:'Not found.' });
  const inviterName = clean(req.body.inviterName,60), recipientName = clean(req.body.recipientName,60), title = clean(req.body.title,100);
  const theme = req.body.theme || {}, content = req.body.content || {}, features = req.body.features || {};
  if (!inviterName || !recipientName || !title) return res.status(400).json({ error:'Names and title are required.' });
  for (const key of ['background','primary','secondary','text','card']) if (theme[key] && !validColor(theme[key])) return res.status(400).json({ error:`Invalid ${key} color.` });
  const allowedFonts = new Set(Object.values(fonts).flatMap(f => [f.heading,f.body]));
  if (!allowedFonts.has(theme.heading) || !allowedFonts.has(theme.body)) return res.status(400).json({ error:'Choose a curated font.' });
  const safeContent = sanitizeObject(content, 1000, 5); const safeFeatures = sanitizeObject(features, 100, 3); const safeTheme = sanitizeObject(theme, 100, 2);
  const storedFeatures = json(row.feature_config_json);
  safeFeatures.musicUrl = storedFeatures.musicUrl || null;
  safeFeatures.musicName = storedFeatures.musicName || null;
  db.prepare(`UPDATE invitations SET inviter_name=?,recipient_name=?,title=?,theme_config_json=?,content_config_json=?,feature_config_json=?,updated_at=? WHERE id=? AND owner_user_id=?`).run(inviterName,recipientName,title,JSON.stringify(safeTheme),JSON.stringify(safeContent),JSON.stringify(safeFeatures),now(),row.id,req.session.userId);
  res.json({ ok:true, updatedAt:now() });
});
const audioFormats = [
  { ext: 'mp3', valid: b => b.subarray(0,3).toString() === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) },
  { ext: 'ogg', valid: b => b.subarray(0,4).toString() === 'OggS' },
  { ext: 'wav', valid: b => b.subarray(0,4).toString() === 'RIFF' && b.subarray(8,12).toString() === 'WAVE' },
  { ext: 'm4a', valid: b => b.subarray(4,8).toString() === 'ftyp' }
];
const audioBody = express.raw({ type: () => true, limit: '10mb' });
function removeUnusedMusic(url, excludingId) {
  if (!/^\/media\/[a-f0-9]{32}\.(mp3|ogg|wav|m4a)$/.test(url || '')) return;
  const used = db.prepare('SELECT id,feature_config_json FROM invitations WHERE id != ?').all(excludingId).some(row => json(row.feature_config_json).musicUrl === url);
  if (!used) fs.rmSync(path.join(uploadsPath, path.basename(url)), { force: true });
}
app.post('/api/invitations/:id/music', requireUser, requireCsrf, audioBody, async (req,res) => {
  const row=ownedInvitation(req.params.id,req.session.userId); if(!row)return res.status(404).json({error:'Not found.'});
  const type=Buffer.isBuffer(req.body)&&req.body.length>=12?audioFormats.find(format=>format.valid(req.body)):null;
  if(!type)return res.status(400).json({error:'Upload a valid MP3, M4A, OGG, or WAV file.'});
  const filename=`${crypto.randomBytes(16).toString('hex')}.${type.ext}`, url=`/media/${filename}`;
  await fs.promises.writeFile(path.join(uploadsPath,filename),req.body,{flag:'wx'});
  const features=json(row.feature_config_json),oldUrl=features.musicUrl;
  let original='Favorite song'; try{original=clean(decodeURIComponent(req.get('x-file-name')||''),100)||original;}catch{}
  Object.assign(features,{music:true,musicUrl:url,musicName:original});
  db.prepare('UPDATE invitations SET feature_config_json=?,updated_at=? WHERE id=? AND owner_user_id=?').run(JSON.stringify(features),now(),row.id,req.session.userId);
  removeUnusedMusic(oldUrl,row.id); res.status(201).json({url,name:original});
});
app.delete('/api/invitations/:id/music',requireUser,requireCsrf,(req,res)=>{
  const row=ownedInvitation(req.params.id,req.session.userId);if(!row)return res.status(404).json({error:'Not found.'});
  const features=json(row.feature_config_json),oldUrl=features.musicUrl;Object.assign(features,{music:false,musicUrl:null,musicName:null});
  db.prepare('UPDATE invitations SET feature_config_json=?,updated_at=? WHERE id=? AND owner_user_id=?').run(JSON.stringify(features),now(),row.id,req.session.userId);removeUnusedMusic(oldUrl,row.id);res.json({ok:true});
});
function sanitizeObject(value, maxString, depth) {
  if (depth < 0) return null;
  if (Array.isArray(value)) return value.slice(0, 30).map(v => sanitizeObject(v,maxString,depth-1));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).slice(0,100).map(([k,v]) => [clean(k,60),sanitizeObject(v,maxString,depth-1)]));
  if (typeof value === 'string') return clean(value,maxString); if (typeof value === 'boolean' || typeof value === 'number') return value; return null;
}
app.post('/api/invitations/:id/status', requireUser, requireCsrf, (req,res) => {
  const row=ownedInvitation(req.params.id,req.session.userId); if(!row)return res.status(404).json({error:'Not found.'});
  const status=['draft','published','disabled'].includes(req.body.status)?req.body.status:null; if(!status)return res.status(400).json({error:'Invalid status.'});
  db.prepare(`UPDATE invitations SET status=?,published_at=CASE WHEN ?='published' THEN COALESCE(published_at,?) ELSE published_at END,updated_at=? WHERE id=? AND owner_user_id=?`).run(status,status,now(),now(),row.id,req.session.userId);
  res.json({ok:true,url:status==='published'?`/i/${row.public_token}`:null});
});
app.post('/api/invitations/:id/duplicate', requireUser, requireCsrf, (req,res) => {
  const r=ownedInvitation(req.params.id,req.session.userId); if(!r)return res.status(404).json({error:'Not found.'});
  const out=db.prepare(`INSERT INTO invitations(owner_user_id,template_key,public_token,inviter_name,recipient_name,title,status,theme_config_json,content_config_json,feature_config_json) VALUES(?,?,?,?,?,?,?,?,?,?)`).run(req.session.userId,r.template_key,token(),r.inviter_name,r.recipient_name,`${r.title} (copy)`,'draft',r.theme_config_json,r.content_config_json,r.feature_config_json);
  res.status(201).json({id:out.lastInsertRowid});
});
app.delete('/api/invitations/:id', requireUser, requireCsrf, (req,res) => { const r=ownedInvitation(req.params.id,req.session.userId); if(!r)return res.status(404).json({error:'Not found.'}); db.prepare('DELETE FROM invitations WHERE id=? AND owner_user_id=?').run(r.id,req.session.userId); res.json({ok:true}); });

app.get('/dashboard/invitations/:id/preview', requireUser, (req,res) => { const r=ownedInvitation(req.params.id,req.session.userId); if(!r)return res.status(404).send('Invitation not found.'); res.set('Cache-Control','no-store').send(invitationPage(r,true)); });
app.get('/i/:token', (req,res) => { const r=db.prepare("SELECT * FROM invitations WHERE public_token=? AND status='published'").get(req.params.token); if(!r)return res.status(404).send(page('Invitation unavailable','<main class="empty"><h1>This invitation is unavailable.</h1><p>It may be a draft or temporarily disabled.</p></main>',req)); res.set('Cache-Control','no-store').send(invitationPage(r,false)); });
function invitationPage(row, preview) {
  const cfg=invitationDTO(row), payload={...cfg,preview};
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><meta name="theme-color" content="${escapeHtml(cfg.theme.background)}"><title>${escapeHtml(cfg.title)}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Fredoka:wght@500;600&family=Inter:wght@400;500;600;700&family=Manrope:wght@500;700&family=Nunito:wght@500;700&family=Playfair+Display:wght@600&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="/assets/css/invitation.css"></head><body><div id="app"></div><script id="invitation-data" type="application/json">${safeJSON(payload)}</script><script src="/assets/js/invitation.js" defer></script></body></html>`;
}

app.post('/api/invitations/:token/session', publicLimit, (req,res) => {
  const inv=db.prepare("SELECT id FROM invitations WHERE public_token=? AND status='published'").get(req.params.token); if(!inv)return res.status(404).json({error:'Not found.'});
  const visitorId=/^[A-Za-z0-9_-]{16,80}$/.test(req.body.visitorId||'')?req.body.visitorId:token(16);
  db.prepare('INSERT OR IGNORE INTO visitor_sessions(invitation_id,visitor_id) VALUES(?,?)').run(inv.id,visitorId);
  const s=db.prepare('SELECT id FROM visitor_sessions WHERE invitation_id=? AND visitor_id=?').get(inv.id,visitorId); res.status(201).json({visitorId,sessionId:s.id});
});
const allowedEvents=new Set(['invitation_opened','screen_view','button_clicked','back_to_main','nickname_selected','nickname_changed','mood_selected','mood_changed','availability_selected','main_question_view','final_yes','best_friend_result','completion','cute_item_found','tiny_mode','music_play','music_pause']);
app.post('/api/invitations/:token/events', publicLimit, (req,res) => {
  const inv=db.prepare("SELECT id FROM invitations WHERE public_token=? AND status='published'").get(req.params.token); if(!inv)return res.status(404).json({error:'Not found.'});
  const visitorId=clean(req.body.visitorId,80), eventName=clean(req.body.eventName,50); if(!/^[A-Za-z0-9_-]{16,80}$/.test(visitorId)||!allowedEvents.has(eventName))return res.status(400).json({error:'Invalid event.'});
  const s=db.prepare('SELECT * FROM visitor_sessions WHERE invitation_id=? AND visitor_id=?').get(inv.id,visitorId); if(!s)return res.status(404).json({error:'Session not found.'});
  const sequence=db.prepare('SELECT COALESCE(MAX(sequence_number),0)+1 n FROM events WHERE session_id=?').get(s.id).n;
  const screen=clean(req.body.screen,50),previous=clean(req.body.previousScreen,50),option=clean(req.body.optionValue,100);
  db.transaction(()=>{ db.prepare('INSERT INTO events(invitation_id,session_id,event_name,screen,previous_screen,option_value,sequence_number) VALUES(?,?,?,?,?,?,?)').run(inv.id,s.id,eventName,screen,previous,option,sequence); const updates={}; if(eventName==='nickname_selected')updates.selected_nickname=option;if(eventName==='mood_selected'||eventName==='mood_changed')updates.selected_mood=option;if(eventName==='availability_selected'){updates.selected_availability=option;updates.selected_date=clean(req.body.selectedDate,10)||null;}if(eventName==='final_yes')updates.final_result='YES ❤️';if(eventName==='best_friend_result')updates.final_result='BEST FRIEND 🤝';if(eventName==='completion')updates.completed=1;if(eventName==='main_question_view')updates.main_question_visits=s.main_question_visits+1; const keys=Object.keys(updates); if(keys.length)db.prepare(`UPDATE visitor_sessions SET ${keys.map(k=>`${k}=?`).join(',')},last_activity_at=? WHERE id=?`).run(...keys.map(k=>updates[k]),now(),s.id);else db.prepare('UPDATE visitor_sessions SET last_activity_at=? WHERE id=?').run(now(),s.id); })(); res.status(201).json({ok:true,sequence});
});

app.get('/dashboard/invitations/:id/analytics',requireUser,(req,res)=>{const r=ownedInvitation(req.params.id,req.session.userId);if(!r)return res.status(404).send('Not found.');res.send(page('Analytics',`<main class="analytics" data-id="${r.id}"><header class="page-head"><div><a href="/dashboard">← Dashboard</a><span class="eyebrow">Invitation intelligence</span><h1>${escapeHtml(r.recipient_name)}'s journey</h1></div><div class="actions"><button id="refresh" class="button ghost small">Refresh now</button><button id="reset" class="button danger small">Clear Test Data</button></div></header><div id="analytics-content" aria-live="polite"></div></main>`,req,'/assets/js/analytics.js'));});
app.get('/api/invitations/:id/analytics',requireUser,(req,res)=>{const r=ownedInvitation(req.params.id,req.session.userId);if(!r)return res.status(404).json({error:'Not found.'});const sessions=db.prepare('SELECT * FROM visitor_sessions WHERE invitation_id=? ORDER BY started_at DESC').all(r.id),events=db.prepare('SELECT e.*,s.visitor_id,s.final_result FROM events e JOIN visitor_sessions s ON s.id=e.session_id WHERE e.invitation_id=? ORDER BY e.created_at ASC,e.sequence_number ASC').all(r.id);const yes=sessions.filter(s=>s.final_result?.startsWith('YES')).length,best=sessions.filter(s=>s.final_result?.startsWith('BEST')).length;res.json({summary:{views:sessions.length,uniqueSessions:sessions.length,yes,bestFriend:best,incomplete:sessions.filter(s=>!s.completed).length,revisits:sessions.reduce((n,s)=>n+Math.max(0,s.main_question_visits-1),0),averageSteps:sessions.length?Math.round(events.length/sessions.length):0,lastVisit:sessions[0]?.last_activity_at||null},sessions,events});});
app.delete('/api/invitations/:id/analytics',requireUser,requireCsrf,(req,res)=>{const r=ownedInvitation(req.params.id,req.session.userId);if(!r)return res.status(404).json({error:'Not found.'});db.prepare('DELETE FROM visitor_sessions WHERE invitation_id=?').run(r.id);res.json({ok:true});});
app.get('/dashboard/invitations/:invitationId/sessions/:sessionId',requireUser,(req,res)=>{const r=ownedInvitation(req.params.invitationId,req.session.userId);if(!r)return res.status(404).send('Not found.');const s=db.prepare('SELECT * FROM visitor_sessions WHERE id=? AND invitation_id=?').get(req.params.sessionId,r.id);if(!s)return res.status(404).send('Session not found.');const ev=db.prepare('SELECT * FROM events WHERE session_id=? ORDER BY sequence_number').all(s.id);res.send(page('Session journey',`<main class="analytics"><a href="/dashboard/invitations/${r.id}/analytics">← Analytics</a><header class="page-head"><div><span class="eyebrow">Visitor session</span><h1>${escapeHtml(s.selected_nickname||'Anonymous visitor')}</h1><p>${escapeHtml(s.final_result||'Incomplete')} · ${ev.length} steps</p></div></header><div class="journey">${ev.map(e=>`<div class="journey-node"><b>${escapeHtml(e.screen||e.event_name)}</b><span>${escapeHtml(e.option_value||e.event_name)}</span><time>${escapeHtml(e.created_at)}</time></div>`).join('')}</div></main>`,req));});

app.use((req,res)=>res.status(404).send(page('Not found','<main class="empty"><h1>That page wandered off.</h1><a class="button primary" href="/">Go home</a></main>',req)));
app.use((err,req,res,next)=>{console.error(err);if(res.headersSent)return next(err);res.status(500).json({error:'Something went wrong.'});});

if(require.main===module){const port=Number(process.env.PORT)||3000;app.listen(port,()=>console.log(`Heartlink running at http://localhost:${port}`));}
module.exports={app,db};
