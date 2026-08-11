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
  const body = new URLSearchParams({ _csrf: token, username, email, password: 'strong-password-123', confirmPassword:'strong-password-123' });
  const response = await fetcher('/register', { method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'}, body });
  assert.equal(response.status, 302); return csrf(fetcher, '/dashboard');
}

test('auth, ownership, publishing, visitor events, and analytics work end to end', async () => {
  const owner = browser(), ownerCsrf = await register(owner, 'rahul', 'rahul@example.com');
  const created = await owner('/api/invitations', { method:'POST', headers:{'content-type':'application/json','x-csrf-token':ownerCsrf}, body:JSON.stringify({inviterName:'Rahul',recipientName:'Priya'}) });
  assert.equal(created.status, 201); const invitation = await created.json();
  const initialInvitationResponse = await owner(`/api/invitations/${invitation.id}`); assert.equal(initialInvitationResponse.status, 200);
  const initialInvitation = await initialInvitationResponse.json();
  assert.equal(initialInvitation.content.moods[0].title, 'Long Drive + Food 🚗🍟'); assert.equal(initialInvitation.content.moods[0].favorite, true);
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
  assert.equal(published.status, 200); const publicPage = await fetch(`${origin}/i/${invitation.token}`); assert.equal(publicPage.status, 200); assert.match(publicPage.headers.get('cache-control'), /no-store/); const publicHtml=await publicPage.text(), publicData=JSON.parse(publicHtml.match(/<script id="invitation-data" type="application\/json">(.*?)<\/script>/s)[1]); for(const key of ['preset','background','primary','secondary','text','muted','card'])assert.equal(publicData.theme[key],exactTheme[key]);
  const visitorId = 'visitor_session_1234567890';
  assert.equal((await fetch(`${origin}/api/invitations/${invitation.token}/session`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({visitorId}) })).status, 201);
  for (const [eventName,screen,optionValue] of [['nickname_selected','nickname','Madam Ji 😌'],['main_question_view','main',''],['final_yes','yes','Haan, chalo'],['availability_selected','availability','Next week 😌'],['completion','success','Done']]) {
    const event = await fetch(`${origin}/api/invitations/${invitation.token}/events`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({visitorId,eventName,screen,optionValue}) }); assert.equal(event.status, 201);
  }
  const analytics = await (await owner(`/api/invitations/${invitation.id}/analytics`)).json();
  assert.equal(analytics.summary.yes, 1); assert.equal(analytics.summary.views, 1); assert.equal(analytics.events.length, 5); assert.equal(analytics.sessions[0].selected_nickname, 'Madam Ji 😌');
  assert.equal((await owner(`/api/invitations/${invitation.id}/music`, { method:'DELETE', headers:{'x-csrf-token':ownerCsrf} })).status, 200);
});

test('invalid login and invalid CSRF are rejected', async () => {
  const client = browser(), token = await csrf(client, '/login');
  const landing = await (await client('/')).text(); for(const href of ['/#how-it-works','/#template','/#features','/login','/register'])assert.match(landing,new RegExp(`href="${href.replace('/','\\/')}"`));
  const login = await client('/login', { method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'}, body:new URLSearchParams({_csrf:token,email:'nobody@example.com',password:'wrong-password'}) });
  assert.equal(login.status, 401);
  const bad = await client('/register', { method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'}, body:new URLSearchParams({_csrf:'bad',username:'x',email:'x@y.com',password:'12345678'}) });
  assert.equal(bad.status, 403);
  const registerToken=await csrf(client,'/register'); const mismatch=await client('/register',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({_csrf:registerToken,username:'mismatch-user',email:'mismatch@example.com',password:'12345678',confirmPassword:'87654321'})}); assert.equal(mismatch.status,400); assert.match(await mismatch.text(),/Passwords do not match/);
});
