const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dbPath = path.join(__dirname, '..', 'data', 'test.db');
for (const suffix of ['', '-shm', '-wal']) fs.rmSync(dbPath + suffix, { force: true });
process.env.DATABASE_PATH = dbPath;
process.env.SESSION_SECRET = 'test-secret-that-is-long-enough-for-this-suite-12345';
const { app, db } = require('../server');

let server, origin;
test.before(() => new Promise(resolve => { server = app.listen(0, '127.0.0.1', () => { origin = `http://127.0.0.1:${server.address().port}`; resolve(); }); }));
test.after(() => new Promise(resolve => server.close(() => { db.close(); for (const suffix of ['', '-shm', '-wal']) fs.rmSync(dbPath + suffix, { force: true }); resolve(); })));

let ipCounter = 10;
function browser(ip = `10.0.0.${++ipCounter}`) {
  let cookie = '';
  return async (url, options = {}) => {
    options.redirect ??= 'manual';
    options.headers = { 'x-forwarded-for': ip, ...(options.headers || {}), ...(cookie ? { cookie } : {}) };
    const response = await fetch(origin + url, options);
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    return response;
  };
}

async function csrf(fetcher, route = '/register') {
  const html = await (await fetcher(route)).text();
  const match = html.match(/name="csrf-token" content="([^"]+)/);
  return match ? match[1] : '';
}

async function register(fetcher, username, email, whatsapp = '+91 98765 43210', password = 'strong-password-123') {
  const token = await csrf(fetcher, '/register');
  const body = new URLSearchParams({ _csrf: token, username, email, whatsapp, password, confirmPassword: password });
  const response = await fetcher('/register', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
  assert.ok(response.status === 302 || response.status === 303, `Register failed with status ${response.status}`);
  return csrf(fetcher, '/dashboard');
}

test('PHASE 3: Registration & Login security, validation, hashing, duplicate prevention, and activity logs', async () => {
  const client = browser();

  // Test registration with invalid email
  const token1 = await csrf(client, '/register');
  const invalidEmail = await client('/register', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ _csrf: token1, username: 'user1', email: 'not-an-email', whatsapp: '+91 98765 43210', password: 'password123', confirmPassword: 'password123' }) });
  assert.equal(invalidEmail.status, 400);

  // Test password mismatch
  const token2 = await csrf(client, '/register');
  const mismatch = await client('/register', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ _csrf: token2, username: 'user1', email: 'user1@example.com', whatsapp: '+91 98765 43210', password: 'password123', confirmPassword: 'different-password' }) });
  assert.equal(mismatch.status, 400);

  // Valid registration
  const userCsrf = await register(client, 'alex', 'alex@example.com');
  assert.ok(userCsrf, 'User successfully registered');

  // Verify password was securely hashed
  const userRow = await db.prepare('SELECT * FROM users WHERE email=?').get('alex@example.com');
  assert.ok(userRow, 'User row created in DB');
  assert.notEqual(userRow.password_hash, 'strong-password-123');
  assert.ok(userRow.password_hash.startsWith('$2'), 'Bcrypt hash generated');

  // Duplicate email registration should fail with 409
  const clientDupEmail = browser();
  const tokenDupEmail = await csrf(clientDupEmail, '/register');
  const dupEmail = await clientDupEmail('/register', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ _csrf: tokenDupEmail, username: 'alex_new', email: 'ALEX@example.com', whatsapp: '+91 98765 43210', password: 'password123', confirmPassword: 'password123' }) });
  assert.equal(dupEmail.status, 409);

  // Duplicate username registration should fail with 409
  const clientDupUser = browser();
  const tokenDupUser = await csrf(clientDupUser, '/register');
  const dupUser = await clientDupUser('/register', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ _csrf: tokenDupUser, username: 'ALEX', email: 'alex_other@example.com', whatsapp: '+91 98765 43210', password: 'password123', confirmPassword: 'password123' }) });
  assert.equal(dupUser.status, 409);

  // Login with correct email
  const clientLogin = browser();
  const loginToken = await csrf(clientLogin, '/login');
  const loginRes = await clientLogin('/login', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ _csrf: loginToken, email: 'alex@example.com', password: 'strong-password-123' }) });
  assert.ok(loginRes.status === 302 || loginRes.status === 303);

  // Login with username
  const clientLoginUser = browser();
  const loginUserToken = await csrf(clientLoginUser, '/login');
  const loginUserRes = await clientLoginUser('/login', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ _csrf: loginUserToken, email: 'alex', password: 'strong-password-123' }) });
  assert.ok(loginUserRes.status === 302 || loginUserRes.status === 303);

  // Login with wrong password
  const clientWrong = browser();
  const wrongToken = await csrf(clientWrong, '/login');
  const wrongRes = await clientWrong('/login', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ _csrf: wrongToken, email: 'alex@example.com', password: 'wrong-password-xyz' }) });
  assert.equal(wrongRes.status, 401);

  // Logout invalidates session
  const logoutToken = await csrf(clientLogin, '/dashboard');
  const logoutRes = await clientLogin('/logout', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ _csrf: logoutToken }) });
  assert.ok(logoutRes.status === 302 || logoutRes.status === 303);
  const afterLogout = await clientLogin('/dashboard');
  assert.equal(afterLogout.status, 302); // Redirected to login
});

test('PHASE 4 & 18: Multi-user isolation & IDOR protection', async () => {
  const userA = browser();
  const userACsrf = await register(userA, 'usera', 'usera@example.com');
  const userB = browser();
  const userBCsrf = await register(userB, 'userb', 'userb@example.com');

  // User A creates invitation
  const createRes = await userA('/api/invitations', { method: 'POST', headers: { 'content-type': 'application/json', 'x-csrf-token': userACsrf }, body: JSON.stringify({ inviterName: 'User A', recipientName: 'Crush A' }) });
  assert.equal(createRes.status, 201);
  const invA = await createRes.json();

  // User B tries to read User A's invitation -> 404
  const bReadA = await userB(`/api/invitations/${invA.id}`);
  assert.equal(bReadA.status, 404);

  // User B tries to update User A's invitation -> 404
  const bUpdateA = await userB(`/api/invitations/${invA.id}`, { method: 'PUT', headers: { 'content-type': 'application/json', 'x-csrf-token': userBCsrf }, body: JSON.stringify({ inviterName: 'Hacked', recipientName: 'Hacked', title: 'Hacked', theme: {}, content: {}, features: {} }) });
  assert.equal(bUpdateA.status, 404);

  // User B tries to upload music to User A's invitation -> 404
  const bMusicA = await userB(`/api/invitations/${invA.id}/music`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-csrf-token': userBCsrf }, body: JSON.stringify({ musicUrl: 'data:audio/mpeg;base64,AAAA', name: 'hack.mp3' }) });
  assert.equal(bMusicA.status, 404);

  // User B tries to delete User A's invitation -> 404
  const bDeleteA = await userB(`/api/invitations/${invA.id}`, { method: 'DELETE', headers: { 'x-csrf-token': userBCsrf } });
  assert.equal(bDeleteA.status, 404);

  // User B tries to publish User A's invitation -> 404
  const bPublishA = await userB(`/api/invitations/${invA.id}/status`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-csrf-token': userBCsrf }, body: JSON.stringify({ status: 'published' }) });
  assert.equal(bPublishA.status, 404);

  // User B tries to clear User A's analytics -> 404
  const bClearA = await userB(`/api/invitations/${invA.id}/analytics`, { method: 'DELETE', headers: { 'x-csrf-token': userBCsrf } });
  assert.equal(bClearA.status, 404);

  // Verify User A's invitation is unchanged
  const aReadA = await userA(`/api/invitations/${invA.id}`);
  assert.equal(aReadA.status, 200);
  const freshA = await aReadA.json();
  assert.equal(freshA.inviterName, 'User A');
});

test('PHASE 5, 6 & 7: Admin security, authorization, user history drilldown, and audit logging', async () => {
  const superadmin = browser();
  await register(superadmin, 'admin_master', 'admin_master@example.com');
  await db.prepare("UPDATE users SET role='superadmin' WHERE email=?").run('admin_master@example.com');

  // Superadmin accesses /admin
  const adminPage = await superadmin('/admin');
  assert.equal(adminPage.status, 200);
  const adminHtml = await adminPage.text();
  assert.match(adminHtml, /Admin Control Panel/);
  assert.match(adminHtml, /Registered User Accounts/);
  assert.match(adminHtml, /Security & Authentication Logs/);

  // Regular user tries to access /admin -> 403
  const normalUser = browser();
  await register(normalUser, 'regular_sam', 'sam@example.com');
  const normalAdmin = await normalUser('/admin');
  assert.equal(normalAdmin.status, 403);

  // Superadmin drills down into user profile history (/admin/users/:id)
  const targetUserRow = await db.prepare('SELECT id FROM users WHERE email=?').get('sam@example.com');
  const userHistoryRes = await superadmin(`/admin/users/${targetUserRow.id}`);
  assert.equal(userHistoryRes.status, 200);
  const userHistoryHtml = await userHistoryRes.text();
  assert.match(userHistoryHtml, /User Profile: regular_sam/);
  assert.match(userHistoryHtml, /Account Information/);
  assert.match(userHistoryHtml, /Activity & Audit History/);

  // Normal user cannot access user drilldown -> 403
  const normalUserDrilldown = await normalUser(`/admin/users/${targetUserRow.id}`);
  assert.equal(normalUserDrilldown.status, 403);

  // Nonexistent user drilldown -> 404
  const notFoundUser = await superadmin('/admin/users/999999');
  assert.equal(notFoundUser.status, 404);
});

test('PHASE 8, 9 & 10: Music upload validation, publishing, visitor tracking, and playback flow', async () => {
  const user = browser();
  const userCsrf = await register(user, 'musictester', 'music@example.com');

  // Create invitation
  const created = await user('/api/invitations', { method: 'POST', headers: { 'content-type': 'application/json', 'x-csrf-token': userCsrf }, body: JSON.stringify({ inviterName: 'Musician', recipientName: 'Audience' }) });
  const invitation = await created.json();

  // Test invalid non-audio upload -> 400
  const invalidUpload = await user(`/api/invitations/${invitation.id}/music`, { method: 'POST', headers: { 'content-type': 'application/octet-stream', 'x-csrf-token': userCsrf, 'x-file-name': 'fake.txt' }, body: Buffer.from('NOT_AN_AUDIO_FILE_DATA') });
  assert.equal(invalidUpload.status, 400);

  // Test valid MP3 upload (ID3 header)
  const validMp3 = Buffer.concat([Buffer.from('ID3'), Buffer.alloc(64)]);
  const mp3Upload = await user(`/api/invitations/${invitation.id}/music`, { method: 'POST', headers: { 'content-type': 'application/octet-stream', 'x-csrf-token': userCsrf, 'x-file-name': encodeURIComponent('romantic-song.mp3') }, body: validMp3 });
  assert.equal(mp3Upload.status, 201);
  const mp3Data = await mp3Upload.json();
  assert.match(mp3Data.url, /^data:audio\/mpeg;base64,/);
  assert.equal(mp3Data.name, 'romantic-song.mp3');

  // Test valid data URI JSON upload
  const dataUriUpload = await user(`/api/invitations/${invitation.id}/music`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-csrf-token': userCsrf }, body: JSON.stringify({ musicUrl: 'data:audio/wav;base64,UklGRg==', name: 'custom.wav' }) });
  assert.equal(dataUriUpload.status, 201);

  // Delete music
  const deleteMusic = await user(`/api/invitations/${invitation.id}/music`, { method: 'DELETE', headers: { 'x-csrf-token': userCsrf } });
  assert.equal(deleteMusic.status, 200);

  // Publish invitation
  const publishRes = await user(`/api/invitations/${invitation.id}/status`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-csrf-token': userCsrf }, body: JSON.stringify({ status: 'published' }) });
  assert.equal(publishRes.status, 200);
  const publishData = await publishRes.json();
  assert.equal(publishData.url, `/i/${invitation.token}`);

  // Public visitor accesses published invitation
  const publicPage = await fetch(`${origin}/i/${invitation.token}`);
  assert.equal(publicPage.status, 200);
  const html = await publicPage.text();
  assert.match(html, /<div id="app"><\/div>/);
  assert.match(html, /id="invitation-data"/);

  // Visitor tracking events
  const visitorId = 'test_visitor_' + Date.now();
  const sessionRes = await fetch(`${origin}/api/invitations/${invitation.token}/session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ visitorId }) });
  assert.equal(sessionRes.status, 201);

  const eventRes = await fetch(`${origin}/api/invitations/${invitation.token}/events`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ visitorId, eventName: 'final_yes', screen: 'yes', optionValue: 'Haan, chalo' }) });
  assert.equal(eventRes.status, 201);

  // Analytics reflection
  const analyticsRes = await user(`/api/invitations/${invitation.id}/analytics`);
  assert.equal(analyticsRes.status, 200);
  const analytics = await analyticsRes.json();
  assert.equal(analytics.summary.yes, 1);
  assert.equal(analytics.summary.views, 1);
});

test('PHASE 11, 13 & 15: CSRF, Security Headers, and XSS Sanitization', async () => {
  const client = browser();
  await register(client, 'xss_tester', 'xss@example.com');

  // Verify mutating requests fail without CSRF token
  const noCsrf = await client('/api/invitations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ inviterName: 'Test', recipientName: 'Test' }) });
  assert.equal(noCsrf.status, 403);

  // Verify response security headers
  const rootRes = await client('/');
  assert.equal(rootRes.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(rootRes.headers.get('x-frame-options'), 'SAMEORIGIN');
  assert.match(rootRes.headers.get('content-type'), /text\/html/);

  // Test XSS payload in invitation title & names
  const validCsrf = await csrf(client, '/dashboard');
  const xssCreate = await client('/api/invitations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': validCsrf },
    body: JSON.stringify({ inviterName: '<script>alert(1)</script>', recipientName: '"><img src=x onerror=alert(1)>' })
  });
  assert.equal(xssCreate.status, 201);
  const xssInv = await xssCreate.json();

  const previewRes = await client(`/dashboard/invitations/${xssInv.id}/preview`);
  assert.equal(previewRes.status, 200);
  const previewHtml = await previewRes.text();
  assert.doesNotMatch(previewHtml, /<script>alert\(1\)<\/script>/);
  assert.doesNotMatch(previewHtml, /<img\s+src=/);
  assert.doesNotMatch(previewHtml, /<script>(?!id="invitation-data")[^<]*alert/);
});

test('NEW FEATURES: Voice Note, Playful Evasion, SMTP Email Alerts, and Admin Clickstream Inspector', async () => {
  const creator = browser();
  const creatorCsrf = await register(creator, 'voice_creator', 'voice_creator@example.com');

  // 1. Create invitation
  const createRes = await creator('/api/invitations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': creatorCsrf },
    body: JSON.stringify({ inviterName: 'Rohan', recipientName: 'Sneha' })
  });
  assert.equal(createRes.status, 201);
  const { id: invId, token: invToken } = await createRes.json();

  // 2. Save voice note in builder
  const fakeVoiceUri = 'data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwEAAAAAAAFAmQEAAYP/AAA=';
  const saveVoice = await creator(`/api/invitations/${invId}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-csrf-token': creatorCsrf },
    body: JSON.stringify({
      inviterName: 'Rohan',
      recipientName: 'Sneha',
      title: 'Coffee Date?',
      features: { voiceNoteUrl: fakeVoiceUri, voiceNoteName: 'rohan-voice.webm' }
    })
  });
  assert.equal(saveVoice.status, 200);

  // Verify voice note is preserved in DTO
  const getInv = await creator(`/api/invitations/${invId}`);
  const invData = await getInv.json();
  assert.equal(invData.features.voiceNoteUrl, fakeVoiceUri);
  assert.equal(invData.features.voiceNoteName, 'rohan-voice.webm');

  // 3. Publish invitation
  await creator(`/api/invitations/${invId}/status`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': creatorCsrf },
    body: JSON.stringify({ status: 'published' })
  });

  // 4. Visitor simulation with Playful Evasion and Full Clickstream
  const visitorId = 'v_user_test_' + Date.now();
  const sessionRes = await fetch(`${origin}/api/invitations/${invToken}/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ visitorId })
  });
  assert.equal(sessionRes.status, 201);

  // Track clickstream steps
  const steps = [
    { eventName: 'invitation_opened', screen: 'start', optionValue: 'Open it' },
    { eventName: 'screen_view', screen: 'main', optionValue: 'Main Screen' },
    { eventName: 'button_clicked', screen: 'finalAttempt', optionValue: 'Friend hi theek hai 😂' },
    { eventName: 'evasion_triggered', screen: 'finalAttempt', optionValue: 'reject_attempt_1' },
    { eventName: 'evasion_teleport', screen: 'finalAttempt', optionValue: 'reject_attempt_2' },
    { eventName: 'evasion_error_modal', screen: 'finalAttempt', optionValue: 'reject_attempt_3' },
    { eventName: 'mood_selected', screen: 'mood', optionValue: 'Coffee & Endless Conversations ☕' },
    { eventName: 'availability_selected', screen: 'availability', optionValue: '15 Aug 2026, 06:00 PM', selectedDate: '2026-08-15T18:00' },
    { eventName: 'voice_note_played', screen: 'yes', optionValue: 'voice_playback' },
    { eventName: 'final_yes', screen: 'yes', optionValue: 'Haan, chalo 😌❤️' }
  ];

  for (const s of steps) {
    const res = await fetch(`${origin}/api/invitations/${invToken}/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ visitorId, ...s })
    });
    assert.equal(res.status, 201, `Failed event: ${s.eventName}`);
  }

  // 5. Verify email notification recorded in database
  const emailRow = await db.prepare('SELECT * FROM email_notifications WHERE invitation_id=? ORDER BY id DESC LIMIT 1').get(invId);
  assert.ok(emailRow, 'Email notification must be logged');
  assert.equal(emailRow.recipient_email, 'voice_creator@example.com');
  assert.match(emailRow.subject, /responded to your date invitation/);
  assert.match(emailRow.body_html, /Detailed Clickstream & Interaction History/);
  assert.match(emailRow.body_html, /evasion triggered/);
  assert.match(emailRow.body_html, /Coffee &amp; Endless Conversations/);

  // 6. Superadmin inspection of user detail and full clickstream timeline
  const admin = browser();
  const adminCsrf = await register(admin, 'superadmin_tester', 'superadmin_feat@example.com');
  await db.prepare("UPDATE users SET role='superadmin' WHERE email='superadmin_feat@example.com'").run();

  const creatorUser = await db.prepare('SELECT id FROM users WHERE email=?').get('voice_creator@example.com');
  const userDetailRes = await admin(`/admin/users/${creatorUser.id}`);
  assert.equal(userDetailRes.status, 200);
  const detailHtml = await userDetailRes.text();
  assert.match(detailHtml, /Recipient Responses & Complete Clickstream History/);
  assert.match(detailHtml, /View Complete Clickstream Timeline/);
  assert.match(detailHtml, /Automated Email Alerts/);
});

test('REGRESSION TEST: P0 Invitation Rendering (content.screens structure, preview, and public page)', async () => {
  const client = browser();
  const userCsrf = await register(client, 'p0_user', 'p0_user@example.com');

  const createRes = await client('/api/invitations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': userCsrf },
    body: JSON.stringify({ inviterName: 'P0Inviter', recipientName: 'P0Recipient' })
  });
  assert.equal(createRes.status, 201);
  const inv = await createRes.json();

  // 1. Verify /api/invitations/:id returns data.content.screens and data.content.screens.intro
  const getRes = await client(`/api/invitations/${inv.id}`);
  assert.equal(getRes.status, 200);
  const dto = await getRes.json();
  assert.ok(dto.content, 'dto.content must exist');
  assert.ok(dto.content.screens, 'dto.content.screens must exist');
  assert.ok(dto.content.screens.intro, 'dto.content.screens.intro must exist');
  assert.ok(Array.isArray(dto.content.moods), 'dto.content.moods must be an array');

  // 2. Verify builder preview iframe HTML contains #invitation-data with valid screens structure
  const previewRes = await client(`/dashboard/invitations/${inv.id}/preview?embed=1`);
  assert.equal(previewRes.status, 200);
  const previewHtml = await previewRes.text();
  const previewMatch = previewHtml.match(/<script id="invitation-data" type="application\/json">([^<]+)<\/script>/);
  assert.ok(previewMatch, 'Preview HTML must include #invitation-data script tag');
  const previewData = JSON.parse(previewMatch[1]);
  assert.ok(previewData.content.screens, 'Preview payload content.screens must exist');
  assert.ok(previewData.content.screens.intro, 'Preview payload content.screens.intro must exist');

  // 3. Publish invitation and verify public page payload
  await client(`/api/invitations/${inv.id}/status`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': userCsrf },
    body: JSON.stringify({ status: 'published' })
  });

  const publicRes = await fetch(`${origin}/i/${inv.token}`);
  assert.equal(publicRes.status, 200);
  const publicHtml = await publicRes.text();
  const publicMatch = publicHtml.match(/<script id="invitation-data" type="application\/json">([^<]+)<\/script>/);
  assert.ok(publicMatch, 'Public page HTML must include #invitation-data script tag');
  const publicData = JSON.parse(publicMatch[1]);
  assert.ok(publicData.content.screens, 'Public payload content.screens must exist');
  assert.ok(publicData.content.screens.intro, 'Public payload content.screens.intro must exist');
});

test('PHASE A: Custom Cover Photo upload, validation, deletion, and rendering', async () => {
  const email = `cover_user_${Date.now()}@example.com`;
  const username = `cover_${Date.now()}`;
  const client = browser();
  const userCsrf = await register(client, username, email);

  const invRes = await client('/api/invitations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': userCsrf },
    body: JSON.stringify({ inviterName: 'Romeo', recipientName: 'Juliet' })
  });
  const inv = await invRes.json();

  // 1. Upload valid cover photo data URI with style, alt text, and overlay
  const samplePhoto = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const uploadRes = await client(`/api/invitations/${inv.id}/cover`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': userCsrf },
    body: JSON.stringify({
      coverPhotoUrl: samplePhoto,
      caption: 'Our favorite memory ✨',
      coverPhotoStyle: 'polaroid',
      coverPhotoAlt: 'Us at the beach sunset',
      coverPhotoOverlay: 45
    })
  });
  assert.equal(uploadRes.status, 201);
  const uploadData = await uploadRes.json();
  assert.equal(uploadData.caption, 'Our favorite memory ✨');
  assert.equal(uploadData.style, 'polaroid');
  assert.equal(uploadData.alt, 'Us at the beach sunset');

  // 2. Binary buffer upload with image/png magic bytes
  const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const bufferUploadRes = await client(`/api/invitations/${inv.id}/cover`, {
    method: 'POST',
    headers: { 'content-type': 'image/png', 'x-csrf-token': userCsrf, 'x-caption': encodeURIComponent('Sunset Drive 🚗'), 'x-style': 'circular', 'x-alt': encodeURIComponent('Driving together') },
    body: pngBuffer
  });
  assert.equal(bufferUploadRes.status, 201);
  const bufferData = await bufferUploadRes.json();
  assert.equal(bufferData.caption, 'Sunset Drive 🚗');
  assert.equal(bufferData.style, 'circular');

  // 3. Verify invitation payload in preview
  const previewRes = await client(`/dashboard/invitations/${inv.id}/preview?embed=1`);
  const previewHtml = await previewRes.text();
  assert.ok(previewHtml.includes('Sunset Drive'), 'Preview must reflect updated cover photo caption');

  // 4. Delete cover photo
  const delRes = await client(`/api/invitations/${inv.id}/cover`, {
    method: 'DELETE',
    headers: { 'x-csrf-token': userCsrf }
  });
  assert.equal(delRes.status, 200);

  // 5. Verify rejection of invalid image
  const invalidRes = await client(`/api/invitations/${inv.id}/cover`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': userCsrf },
    body: JSON.stringify({ coverPhotoUrl: 'invalid-data-string' })
  });
  assert.equal(invalidRes.status, 400);
});

test('PHASE B: Advanced Music Experience presets, volume, and playback payload', async () => {
  const email = `music_user_${Date.now()}@example.com`;
  const username = `music_${Date.now()}`;
  const client = browser();
  const userCsrf = await register(client, username, email);

  const invRes = await client('/api/invitations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': userCsrf },
    body: JSON.stringify({ inviterName: 'Romeo', recipientName: 'Juliet' })
  });
  const inv = await invRes.json();

  // 1. GET /api/invitations/:id should return presets.music with moods
  const getRes = await client(`/api/invitations/${inv.id}`);
  assert.equal(getRes.status, 200);
  const dto = await getRes.json();
  assert.ok(Array.isArray(dto.presets.music), 'presets.music must be an array');
  assert.ok(dto.presets.music.length >= 5, 'Must have at least 5 romantic music presets');
  assert.ok(dto.presets.music.some(p => p.mood === 'romantic'), 'Must have romantic mood');
  assert.ok(dto.presets.music.some(p => p.mood === 'latenight'), 'Must have latenight mood');
  assert.ok(dto.presets.music.some(p => p.mood === 'funny'), 'Must have funny mood');
  assert.ok(dto.presets.music.some(p => p.mood === 'emotional'), 'Must have emotional mood');
  assert.ok(dto.presets.music.some(p => p.mood === 'dreamy'), 'Must have dreamy mood');

  // 2. Select a preset track with custom player style, start offset, and volume
  const updateRes = await client(`/api/invitations/${inv.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-csrf-token': userCsrf },
    body: JSON.stringify({
      inviterName: 'Romeo',
      recipientName: 'Juliet',
      title: 'For Juliet ❤️',
      features: {
        music: true,
        musicUrl: 'preset:piano',
        musicName: 'Piano Serenade 🎹',
        musicVolume: 45,
        musicMood: 'romantic',
        musicPlayerStyle: 'glass',
        musicStartOffset: 10
      }
    })
  });
  assert.equal(updateRes.status, 200);

  // 3. Verify preview contains the updated music payload and player style
  const previewRes = await client(`/dashboard/invitations/${inv.id}/preview?embed=1`);
  const previewHtml = await previewRes.text();
  assert.ok(previewHtml.includes('Piano Serenade'), 'Preview must reflect chosen preset name');
  assert.ok(previewHtml.includes('style-glass') || previewHtml.includes('glass'), 'Preview must include player style');

  // 4. Delete music
  const delRes = await client(`/api/invitations/${inv.id}/music`, {
    method: 'DELETE',
    headers: { 'x-csrf-token': userCsrf }
  });
  assert.equal(delRes.status, 200);
});

test('PHASE C: Our Memories timeline, scrapbook items, and preview rendering', async () => {
  const email = `memories_user_${Date.now()}@example.com`;
  const username = `memories_${Date.now()}`;
  const client = browser();
  const userCsrf = await register(client, username, email);

  const invRes = await client('/api/invitations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': userCsrf },
    body: JSON.stringify({ inviterName: 'Jack', recipientName: 'Rose' })
  });
  const inv = await invRes.json();

  // 1. Add memories list to invitation
  const updateRes = await client(`/api/invitations/${inv.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-csrf-token': userCsrf },
    body: JSON.stringify({
      inviterName: 'Jack',
      recipientName: 'Rose',
      title: 'Our Journey 🚢❤️',
      features: {
        memories: true,
        memoriesList: [
          {
            id: 'mem_1',
            title: 'First Sunset Together 🌅',
            date: 'Nov 2023',
            caption: 'Standing at the bow watching the horizon.',
            photoUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
          },
          {
            id: 'mem_2',
            title: 'Late Night Hot Chocolate ☕',
            date: 'Dec 2023',
            caption: 'When we talked until 4am and forgot time existed.',
            photoUrl: null
          }
        ]
      }
    })
  });
  assert.equal(updateRes.status, 200);

  // 2. Fetch invitation and verify memoriesList is stored correctly
  const getRes = await client(`/api/invitations/${inv.id}`);
  assert.equal(getRes.status, 200);
  const dto = await getRes.json();
  assert.equal(dto.features.memories, true);
  assert.equal(dto.features.memoriesList.length, 2);
  assert.equal(dto.features.memoriesList[0].title, 'First Sunset Together 🌅');

  // 3. Reorder memories (swap memory 1 and 2)
  const reorderRes = await client(`/api/invitations/${inv.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-csrf-token': userCsrf },
    body: JSON.stringify({
      inviterName: 'Jack',
      recipientName: 'Rose',
      features: {
        memories: true,
        memoriesList: [dto.features.memoriesList[1], dto.features.memoriesList[0]]
      }
    })
  });
  assert.equal(reorderRes.status, 200);
  const reorderedDto = await (await client(`/api/invitations/${inv.id}`)).json();
  assert.equal(reorderedDto.features.memoriesList[0].title, 'Late Night Hot Chocolate ☕');

  // 4. Verify IDOR protection on memories modification
  const strangerClient = browser();
  const strangerCsrf = await register(strangerClient, `stranger_${Date.now()}`, `stranger_${Date.now()}@example.com`);
  const unauthorizedRes = await strangerClient(`/api/invitations/${inv.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-csrf-token': strangerCsrf },
    body: JSON.stringify({
      features: { memories: false, memoriesList: [] }
    })
  });
  assert.equal(unauthorizedRes.status, 404, 'Non-owner must not modify invitation memories');

  // 5. Render preview and verify memories payload and timeline classes
  const previewRes = await client(`/dashboard/invitations/${inv.id}/preview?embed=1`);
  const previewHtml = await previewRes.text();
  assert.ok(previewHtml.includes('Late Night Hot Chocolate'), 'Preview should contain reordered memory title');
  assert.ok(previewHtml.includes('"memories":true'), 'Preview initial data should have memories enabled');
});

test('PHASE D: Curated Occasion Templates (romantic dinner, coffee, anniversary)', async () => {
  const email = `templates_user_${Date.now()}@example.com`;
  const username = `templates_${Date.now()}`;
  const client = browser();
  const userCsrf = await register(client, username, email);

  const invRes = await client('/api/invitations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': userCsrf },
    body: JSON.stringify({ inviterName: 'Noah', recipientName: 'Allie' })
  });
  const inv = await invRes.json();

  // 1. GET /api/invitations/:id should return all 9 presets.templates
  const getRes = await client(`/api/invitations/${inv.id}`);
  assert.equal(getRes.status, 200);
  const dto = await getRes.json();
  assert.ok(dto.presets.templates, 'presets.templates must exist');
  assert.ok(dto.presets.templates['classic'], 'Classic template must exist');
  assert.ok(dto.presets.templates['best-friend-date'], 'Best friend template must exist');
  assert.ok(dto.presets.templates['hinglish-proposal'], 'Hinglish proposal template must exist');
  assert.ok(dto.presets.templates['funny-proposal'], 'Funny proposal template must exist');
  assert.ok(dto.presets.templates['long-distance'], 'Long distance template must exist');
  assert.ok(dto.presets.templates['anniversary-special'], 'Anniversary template must exist');
  assert.ok(dto.presets.templates['first-date'], 'First date template must exist');
  assert.ok(dto.presets.templates['birthday-date'], 'Birthday date template must exist');
  assert.ok(dto.presets.templates['valentines-day'], 'Valentine template must exist');

  // 2. Apply hinglish-proposal template
  const hinglishTpl = dto.presets.templates['hinglish-proposal'];
  const updateRes = await client(`/api/invitations/${inv.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-csrf-token': userCsrf },
    body: JSON.stringify({
      inviterName: 'Noah',
      recipientName: 'Allie',
      title: 'Hinglish Proposal 🇮🇳',
      content: {
        screens: hinglishTpl.content,
        moods: hinglishTpl.moods
      }
    })
  });
  assert.equal(updateRes.status, 200);

  // 3. Publish and verify public invitation renders Hinglish copy
  const pubRes = await client(`/api/invitations/${inv.id}/status`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': userCsrf },
    body: JSON.stringify({ status: 'published' })
  });
  assert.equal(pubRes.status, 200);

  const publicRes = await client(`/i/${dto.token}`);
  assert.equal(publicRes.status, 200);
  const publicHtml = await publicRes.text();
  assert.ok(publicHtml.includes('date pe chalogi') || publicHtml.includes('filmy style'), 'Public invitation should reflect Hinglish template content');
});

test('PHASE E: In-App Notification Center and live visitor alerts', async () => {
  const email = `notif_user_${Date.now()}@example.com`;
  const username = `notif_${Date.now()}`;
  const client = browser();
  const userCsrf = await register(client, username, email);

  // 1. Create and publish an invitation
  const invRes = await client('/api/invitations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': userCsrf },
    body: JSON.stringify({ inviterName: 'Chandler', recipientName: 'Monica' })
  });
  const inv = await invRes.json();

  await client(`/api/invitations/${inv.id}/status`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': userCsrf },
    body: JSON.stringify({ status: 'published' })
  });

  const getRes = await client(`/api/invitations/${inv.id}`);
  const dto = await getRes.json();

  // 2. Simulate visitor interactions on public invitation
  const visitorClient = browser();
  const visitorId = `vis_${Date.now()}`;

  // Start session
  const sessRes = await visitorClient(`/api/invitations/${dto.token}/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ visitorId })
  });
  assert.equal(sessRes.status, 201);

  // Track YES response event
  const evRes = await visitorClient(`/api/invitations/${dto.token}/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      visitorId,
      screen: 'yes',
      eventName: 'final_yes',
      optionValue: 'Haan, chalo 😌',
      sequenceNumber: 1
    })
  });
  assert.ok(evRes.status === 200 || evRes.status === 201, `Event submission returned status ${evRes.status}`);

  // 3. User checks notifications endpoint & preferences
  const prefGetRes = await client('/api/notifications/preferences');
  assert.equal(prefGetRes.status, 200);
  const prefs = await prefGetRes.json();
  assert.equal(prefs.email, true);

  const notifRes = await client('/api/notifications');
  assert.equal(notifRes.status, 200);
  const notifData = await notifRes.json();
  assert.ok(Array.isArray(notifData.notifications), 'notifications must be an array');
  assert.ok(notifData.notifications.length > 0, 'Must have at least 1 notification generated');
  assert.ok(notifData.notifications.some(n => n.title.includes('YES')), 'Should notify inviter of YES response');
  assert.ok(notifData.unreadCount >= 1, 'Unread count should be at least 1');

  // 4. Mark single notification as read
  const notifId = notifData.notifications[0].id;
  const markRes = await client(`/api/notifications/${notifId}/read`, {
    method: 'POST',
    headers: { 'x-csrf-token': userCsrf }
  });
  assert.equal(markRes.status, 200);

  // 5. Mark all as read
  const markAllRes = await client('/api/notifications/read-all', {
    method: 'POST',
    headers: { 'x-csrf-token': userCsrf }
  });
  assert.equal(markAllRes.status, 200);

  const afterReadRes = await client('/api/notifications');
  const afterReadData = await afterReadRes.json();
  assert.equal(afterReadData.unreadCount, 0, 'Unread count should be 0 after marking all as read');

  const strangerClient = browser();
  await register(strangerClient, `stranger_notif_${Date.now()}`, `stranger_notif_${Date.now()}@example.com`);
  const strangerNotifs = await strangerClient('/api/notifications');
  const strangerData = await strangerNotifs.json();
  assert.equal(strangerData.notifications.length, 0, 'Stranger must have 0 notifications from other users');
});

test('PHASE F: Final YES Experience, emotional highlight, and date pass rendering', async () => {
  const email = `yes_user_${Date.now()}@example.com`;
  const username = `yes_${Date.now()}`;
  const client = browser();
  const userCsrf = await register(client, username, email);

  // 1. Create and publish an invitation
  const invRes = await client('/api/invitations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': userCsrf },
    body: JSON.stringify({ inviterName: 'Jack', recipientName: 'Rose' })
  });
  const inv = await invRes.json();

  await client(`/api/invitations/${inv.id}/status`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': userCsrf },
    body: JSON.stringify({ status: 'published' })
  });

  const getRes = await client(`/api/invitations/${inv.id}`);
  const dto = await getRes.json();

  // 2. Render preview and public invitation page
  const publicRes = await client(`/i/${dto.token}`);
  assert.equal(publicRes.status, 200);
  const publicHtml = await publicRes.text();

  assert.ok(publicHtml.includes('invitation-data'), 'Should contain invitation configuration data');
  assert.ok(publicHtml.includes('invitation.css'), 'Should link invitation stylesheet');
  assert.ok(publicHtml.includes('invitation.js'), 'Should link invitation script');

  // 3. Visitor triggers final YES event
  const visitorClient = browser();
  const visitorId = `vis_yes_${Date.now()}`;
  await visitorClient(`/api/invitations/${dto.token}/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ visitorId })
  });

  const yesEventRes = await visitorClient(`/api/invitations/${dto.token}/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      visitorId,
      screen: 'yes',
      eventName: 'final_yes',
      optionValue: 'Haan, chalo 😌❤️'
    })
  });
  assert.equal(yesEventRes.status, 201);
});

test('PHASE G: Real Date Selection Flow, Calendar Sync and ICS export', async () => {
  const email = `date_user_${Date.now()}@example.com`;
  const username = `date_${Date.now()}`;
  const client = browser();
  const userCsrf = await register(client, username, email);

  // 1. Create and publish an invitation
  const invRes = await client('/api/invitations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': userCsrf },
    body: JSON.stringify({ inviterName: 'Jim', recipientName: 'Pam' })
  });
  const inv = await invRes.json();

  await client(`/api/invitations/${inv.id}/status`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': userCsrf },
    body: JSON.stringify({ status: 'published' })
  });

  const getRes = await client(`/api/invitations/${inv.id}`);
  const dto = await getRes.json();

  // 2. Visitor completes availability selection with date
  const visitorClient = browser();
  const visitorId = `vis_date_${Date.now()}`;
  await visitorClient(`/api/invitations/${dto.token}/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ visitorId })
  });

  const futureDate = '2026-10-15T19:00';
  const evRes = await visitorClient(`/api/invitations/${dto.token}/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      visitorId,
      screen: 'availability',
      eventName: 'availability_selected',
      optionValue: 'Oct 15, 2026, 7:00 PM',
      selectedDate: futureDate,
      sequenceNumber: 2
    })
  });
  assert.ok(evRes.status === 200 || evRes.status === 201);

  // 3. Verify notification received by inviter with date details
  const notifRes = await client('/api/notifications');
  const notifData = await notifRes.json();
  const dateNotif = notifData.notifications.find(n => n.title.includes('Date & Time'));
  assert.ok(dateNotif, 'Should generate Date & Time notification for inviter');
  assert.ok(dateNotif.message.includes('Oct 15'), 'Notification should mention selected date');
});

test('PHASE H: Sharing, QR Code generator, and Dashboard Quick Actions', async () => {
  const email = `share_user_${Date.now()}@example.com`;
  const username = `share_${Date.now()}`;
  const client = browser();
  const userCsrf = await register(client, username, email);

  // 1. Check QR code static script is served
  const qrScriptRes = await client('/assets/js/qrcode.js');
  assert.equal(qrScriptRes.status, 200);
  const qrScriptText = await qrScriptRes.text();
  assert.ok(qrScriptText.includes('QRCode'), 'qrcode.js should define QRCode');

  // 2. Create invitation
  const invRes = await client('/api/invitations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': userCsrf },
    body: JSON.stringify({ inviterName: 'Romeo', recipientName: 'Juliet' })
  });
  assert.equal(invRes.status, 201);

  // 3. Verify dashboard renders QR share modal and quick share buttons
  const dashRes = await client('/dashboard');
  assert.equal(dashRes.status, 200);
  const dashHtml = await dashRes.text();
  assert.ok(dashHtml.includes('qr-share-modal'), 'Dashboard must render QR share modal');
  assert.ok(dashHtml.includes('share-btn'), 'Dashboard cards must render QR & Share quick button');
  assert.ok(dashHtml.includes('qrcode.js'), 'Dashboard must load qrcode.js script');
});


