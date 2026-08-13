const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dbPath = path.join(__dirname, '..', 'data', 'test.db');
for (const suffix of ['', '-shm', '-wal']) fs.rmSync(dbPath + suffix, { force: true });
process.env.DATABASE_PATH = dbPath;
process.env.SESSION_SECRET = 'test-secret-that-is-long-enough-for-this-suite';
const { app, db } = require('../server');

let server, origin;
test.before(() => new Promise(resolve => { server = app.listen(0, '127.0.0.1', () => { origin = `http://127.0.0.1:${server.address().port}`; resolve(); }); }));
test.after(() => new Promise(resolve => server.close(() => { db.close(); for (const suffix of ['', '-shm', '-wal']) fs.rmSync(dbPath + suffix, { force: true }); resolve(); })));

function browser() {
  let cookie = '';
  return async (url, options = {}) => {
    options.redirect ??= 'manual'; options.headers = { ...(options.headers || {}), ...(cookie ? { cookie } : {}) };
    const response = await fetch(origin + url, options), setCookie = response.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    return response;
  };
}
async function csrf(fetcher, route = '/register') { const html = await (await fetcher(route)).text(); return html.match(/name="csrf-token" content="([^"]+)/)[1]; }
async function register(fetcher, username, email) {
  const token = await csrf(fetcher);
  const body = new URLSearchParams({ _csrf: token, username, email, whatsapp:'+91 98765 43210', password: 'strong-password-123', confirmPassword:'strong-password-123' });
  const response = await fetcher('/register', { method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'}, body });
  assert.ok(response.status === 302 || response.status === 303, 'Register redirects to dashboard'); return csrf(fetcher, '/dashboard');
}

test('auth, ownership, publishing, visitor events, and analytics work end to end', async () => {
  const owner = browser(), ownerCsrf = await register(owner, 'rahul', 'rahul@example.com');
  const dashboardHtml = await (await owner('/dashboard')).text();
  assert.match(dashboardHtml, /class="brand" href="\/"/);
  assert.match(dashboardHtml, /class="user-dashboard-link" href="\/dashboard"/);
  assert.doesNotMatch(dashboardHtml, /class="whatsapp-setup"/);
  const created = await owner('/api/invitations', { method:'POST', headers:{'content-type':'application/json','x-csrf-token':ownerCsrf}, body:JSON.stringify({inviterName:'Rahul',recipientName:'Priya'}) });
  assert.equal(created.status, 201); const invitation = await created.json();
  const initialInvitationResponse = await owner(`/api/invitations/${invitation.id}`); assert.equal(initialInvitationResponse.status, 200);
  const initialInvitation = await initialInvitationResponse.json();
  assert.equal(initialInvitation.content.moods[0].title, 'Long Drive + Food 🚗🍟'); assert.equal(initialInvitation.content.moods[0].favorite, true);
  assert.equal(initialInvitation.features.nickname, undefined); assert.equal(initialInvitation.features.analysis, undefined);
  const exactTheme={...initialInvitation.theme,preset:'midnight',background:'#171329',primary:'#3A86FF',secondary:'#725AC1',text:'#FFF7FC',muted:'#CBBFD0',card:'#2A2342E6'};
  const themed = await owner(`/api/invitations/${invitation.id}`, { method:'PUT', headers:{'content-type':'application/json','x-csrf-token':ownerCsrf}, body:JSON.stringify({inviterName:initialInvitation.inviterName,recipientName:initialInvitation.recipientName,title:initialInvitation.title,theme:exactTheme,content:initialInvitation.content,features:initialInvitation.features}) });
  assert.equal(themed.status, 200); const savedTheme = await (await owner(`/api/invitations/${invitation.id}`)).json(); for(const key of ['preset','background','primary','secondary','text','muted','card'])assert.equal(savedTheme.theme[key],exactTheme[key]);
  const fakeMp3 = Buffer.concat([Buffer.from('ID3'), Buffer.alloc(32)]);
  const musicUpload = await owner(`/api/invitations/${invitation.id}/music`, { method:'POST', headers:{'content-type':'application/octet-stream','x-file-name':encodeURIComponent('favorite.mp3'),'x-csrf-token':ownerCsrf}, body:fakeMp3 });
  assert.equal(musicUpload.status, 201); const uploadedMusic = await musicUpload.json();
  assert.match(uploadedMusic.url, /^\/media\/[a-f0-9]{32}\.mp3$/); assert.equal((await fetch(origin + uploadedMusic.url)).status, 200);
  const autosave = await owner(`/api/invitations/${invitation.id}`, { method:'PUT', headers:{'content-type':'application/json','x-csrf-token':ownerCsrf}, body:JSON.stringify({inviterName:initialInvitation.inviterName,recipientName:initialInvitation.recipientName,title:initialInvitation.title,theme:exactTheme,content:initialInvitation.content,features:{...initialInvitation.features,music:true}}) });
  assert.equal(autosave.status, 200); const musicAfterAutosave = await (await owner(`/api/invitations/${invitation.id}`)).json(); assert.equal(musicAfterAutosave.features.musicUrl,uploadedMusic.url); assert.equal(musicAfterAutosave.features.musicName,'favorite.mp3');

  const stranger = browser(), strangerCsrf = await register(stranger, 'aman', 'aman@example.com');
  assert.equal((await stranger(`/api/invitations/${invitation.id}`)).status, 404);
  assert.equal((await stranger(`/api/invitations/${invitation.id}/status`, { method:'POST', headers:{'content-type':'application/json','x-csrf-token':strangerCsrf}, body:'{"status":"published"}' })).status, 404);

  const published = await owner(`/api/invitations/${invitation.id}/status`, { method:'POST', headers:{'content-type':'application/json','x-csrf-token':ownerCsrf}, body:'{"status":"published"}' });
  assert.equal(published.status, 200); const publicPage = await fetch(`${origin}/i/${invitation.token}`); assert.equal(publicPage.status, 200); assert.match(publicPage.headers.get('cache-control'), /no-store/); const publicHtml=await publicPage.text(), publicData=JSON.parse(publicHtml.match(/<script id="invitation-data" type="application\/json">(.*?)<\/script>/s)[1]); assert.equal(publicData.whatsappNumber,'919876543210'); for(const key of ['preset','background','primary','secondary','text','muted','card'])assert.equal(publicData.theme[key],exactTheme[key]);
  const invitationJsPath = fs.existsSync(path.join(__dirname,'..','public','assets','js','invitation.js')) ? path.join(__dirname,'..','public','assets','js','invitation.js') : path.join(__dirname,'..','public','js','invitation.js');
  const invitationSource=fs.readFileSync(invitationJsPath,'utf8'); assert.match(invitationSource,/class="calendar"/); assert.match(invitationSource,/data-action="selectDate"/); assert.match(invitationSource,/data-time type="radio"/); assert.match(invitationSource,/\[data-time\]:checked/); assert.match(invitationSource,/length: 11/); assert.match(invitationSource,/i \+ 10/); assert.match(invitationSource,/go\("main", "button_clicked", value\)/); assert.doesNotMatch(invitationSource,/action === "pickNickname"/); assert.doesNotMatch(invitationSource,/action === "pickAvailability"/);
  const visitorId = 'visitor_session_1234567890';
  assert.equal((await fetch(`${origin}/api/invitations/${invitation.token}/session`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({visitorId}) })).status, 201);
  const journey = [
    { eventName:'main_question_view', screen:'main', optionValue:'' },
    { eventName:'final_yes', screen:'yes', optionValue:'Haan, chalo' },
    { eventName:'availability_selected', screen:'availability', optionValue:'Aug 15, 2026, 7:30 PM', selectedDate:'2026-08-15T19:30' },
    { eventName:'completion', screen:'success', optionValue:'Done' }
  ];
  for (const step of journey) {
    const event = await fetch(`${origin}/api/invitations/${invitation.token}/events`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({visitorId,...step}) }); assert.equal(event.status, 201);
  }
  const analytics = await (await owner(`/api/invitations/${invitation.id}/analytics`)).json();
  assert.equal(analytics.summary.yes, 1); assert.equal(analytics.summary.views, 1); assert.equal(analytics.events.length, 4); assert.equal(analytics.sessions[0].selected_nickname, null); assert.equal(analytics.sessions[0].selected_date, '2026-08-15T19:30');
  assert.equal((await owner(`/api/invitations/${invitation.id}/music`, { method:'DELETE', headers:{'x-csrf-token':ownerCsrf} })).status, 200);
  const logs = db.prepare('SELECT * FROM user_logs WHERE email=?').all('rahul@example.com');
  assert.ok(logs.length > 0); assert.equal(logs[0].action, 'REGISTER');
});

test('invalid login and invalid CSRF are rejected', async () => {
  const client = browser(), token = await csrf(client, '/login');
  const landing = await (await client('/')).text(); for(const href of ['/#how-it-works','/#template','/#features','/login','/register'])assert.match(landing,new RegExp(`href="${href.replace('/','\\/')}"`));
  const login = await client('/login', { method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'}, body:new URLSearchParams({_csrf:token,email:'nobody@example.com',password:'wrong-password'}) });
  assert.equal(login.status, 401);
  const bad = await client('/register', { method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'}, body:new URLSearchParams({_csrf:'bad',username:'x',email:'x@y.com',password:'12345678'}) });
  assert.equal(bad.status, 403);
  const registerToken=await csrf(client,'/register'); const mismatch=await client('/register',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({_csrf:registerToken,username:'mismatch-user',email:'mismatch@example.com',whatsapp:'+91 98765 43210',password:'12345678',confirmPassword:'87654321'})}); assert.equal(mismatch.status,400); assert.match(await mismatch.text(),/Passwords do not match/);
});

test('legacy accounts can add WhatsApp from the dashboard', async () => {
  const client=browser(), token=await register(client,'legacy','legacy@example.com');
  db.prepare('UPDATE users SET whatsapp_number=NULL WHERE email=?').run('legacy@example.com');
  const dashboard=await (await client('/dashboard')).text(); assert.match(dashboard,/class="whatsapp-setup"/);
  const saved=await client('/dashboard/whatsapp',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({_csrf:token,whatsapp:'+91 99887 76655'})}); assert.equal(saved.status,302);
  assert.equal(db.prepare('SELECT whatsapp_number FROM users WHERE email=?').get('legacy@example.com').whatsapp_number,'919988776655');
});

test('superadmin can access admin control panel and view user details and logs', async () => {
  const adminClient = browser();
  await register(adminClient, 'admin_boss', 'admin_boss@example.com');
  db.prepare("UPDATE users SET role='superadmin' WHERE email=?").run('admin_boss@example.com');
  const adminPage = await adminClient('/admin');
  assert.equal(adminPage.status, 200);
  const html = await adminPage.text();
  assert.match(html, /Admin Control Panel/);
  assert.match(html, /Registered User Accounts/);
  assert.match(html, /Security & Authentication Logs/);

  const userClient = browser();
  await register(userClient, 'regular_user', 'regular@example.com');
  const regularAdminAccess = await userClient('/admin');
  assert.equal(regularAdminAccess.status, 403);
});
