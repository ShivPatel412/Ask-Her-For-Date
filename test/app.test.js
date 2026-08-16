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

function browser() {
  let cookie = '';
  return async (url, options = {}) => {
    options.redirect ??= 'manual';
    options.headers = { ...(options.headers || {}), ...(cookie ? { cookie } : {}) };
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

  // 1. Upload valid cover photo data URI
  const samplePhoto = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const uploadRes = await client(`/api/invitations/${inv.id}/cover`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': userCsrf },
    body: JSON.stringify({ coverPhotoUrl: samplePhoto, caption: 'Our favorite memory ✨' })
  });
  assert.equal(uploadRes.status, 201);
  const uploadData = await uploadRes.json();
  assert.equal(uploadData.caption, 'Our favorite memory ✨');

  // 2. Verify invitation payload in preview
  const previewRes = await client(`/dashboard/invitations/${inv.id}/preview?embed=1`);
  const previewHtml = await previewRes.text();
  assert.ok(previewHtml.includes('Our favorite memory'), 'Preview must reflect cover photo caption');

  // 3. Delete cover photo
  const delRes = await client(`/api/invitations/${inv.id}/cover`, {
    method: 'DELETE',
    headers: { 'x-csrf-token': userCsrf }
  });
  assert.equal(delRes.status, 200);

  // 4. Verify rejection of invalid image
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

  // 1. GET /api/invitations/:id should return presets.music
  const getRes = await client(`/api/invitations/${inv.id}`);
  assert.equal(getRes.status, 200);
  const dto = await getRes.json();
  assert.ok(Array.isArray(dto.presets.music), 'presets.music must be an array');
  assert.ok(dto.presets.music.length >= 3, 'Must have at least 3 romantic music presets');
  assert.equal(dto.presets.music[0].key, 'preset:lofi');

  // 2. Select a preset track with custom default volume
  const updateRes = await client(`/api/invitations/${inv.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-csrf-token': userCsrf },
    body: JSON.stringify({
      inviterName: 'Romeo',
      recipientName: 'Juliet',
      title: 'For Juliet ❤️',
      features: {
        music: true,
        musicUrl: 'preset:lofi',
        musicName: 'Lo-fi Romance 🎧',
        musicVolume: 45
      }
    })
  });
  assert.equal(updateRes.status, 200);

  // 3. Verify preview contains the updated music payload
  const previewRes = await client(`/dashboard/invitations/${inv.id}/preview?embed=1`);
  const previewHtml = await previewRes.text();
  assert.ok(previewHtml.includes('Lo-fi Romance'), 'Preview must reflect chosen preset name');
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

  // 3. Render preview and verify memories button and items are in the HTML payload
  const previewRes = await client(`/dashboard/invitations/${inv.id}/preview?embed=1`);
  const previewHtml = await previewRes.text();
  assert.ok(previewHtml.includes('First Sunset Together'), 'Preview should contain memory title in initial payload');
  assert.ok(previewHtml.includes('"memories":true'), 'Preview initial data should have memories enabled');
});


