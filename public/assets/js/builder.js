const root=document.querySelector('#builder'),id=root.dataset.id,controls=document.querySelector('#controls'),preview=document.querySelector('iframe'),csrf=document.querySelector('meta[name="csrf-token"]').content;
let state,timer,saveVersion=0,saveQueue=Promise.resolve();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const field=(label,path,value,type='text')=>`<label>${label}<input data-path="${path}" type="${type}" value="${esc(value)}" ${type==='text'?'maxlength="1000"':''}></label>`;
const toggle=(label,path,value)=>`<label class="toggle"><input data-path="${path}" type="checkbox" ${value?'checked':''}><span></span>${label}</label>`;
const featureInfo={Mascots:['🐻','Display adorable mascots throughout the invitation.'],'Tiny Mode':['⌗','Enable a compact and minimal layout for a cute vibe.'],'Cute-item collection':['♡','Show a collection of cute items to charm your recipient.'],Confetti:['⌁','Celebrate moments with a burst of confetti.'],'Funny Back buttons':['‹','Replace standard back buttons with fun alternatives.']};
const featureToggle=(label,path,value)=>{const [icon,description]=featureInfo[label];return `<label class="feature-toggle"><i>${icon}</i><span><b>${label}</b><small>${description}</small></span><input data-path="${path}" type="checkbox" ${value?'checked':''}><em aria-hidden="true"></em></label>`;};

fetch(`/api/invitations/${id}`).then(r=>r.json()).then(data=>{state=data;render();if(new URLSearchParams(location.search).has('created'))toast('Invitation created 🎉 — customize or publish when ready.');});
function render(){
  const c=state.content,s=c.screens,t=state.theme,f=state.features;
  const editableScreens=Object.entries(s).filter(([key])=>!['nickname','analysis'].includes(key));
  controls.innerHTML=`
    <details open><summary>1. Basics</summary><div class="section-body">${field('Your Name','inviterName',state.inviterName)}${field('Recipient Name','recipientName',state.recipientName)}${field('Invitation Title','title',state.title)}</div></details>
    <details><summary>2. Template</summary><div class="section-body"><div class="template-mini"><b>Best Friend → Date ❤️</b><span>Active template</span></div></div></details>
    <details><summary>3. Theme Colors</summary><div class="section-body"><div class="theme-choices">${Object.entries(state.presets.themes).map(([k,v])=>`<button type="button" class="theme-choice ${t.preset===k?'active':''}" data-theme-preset="${k}"><i style="--swatch-a:${v.primary};--swatch-b:${v.secondary};--swatch-bg:${v.background}"></i><span>${v.name}</span></button>`).join('')}</div><p class="hint">Choose a preset or fine-tune the colors below.</p><div class="color-grid">${['background','primary','secondary','text'].map(k=>field(k[0].toUpperCase()+k.slice(1),`theme.${k}`,t[k],'color')).join('')}${field('Card (hex with optional alpha)','theme.card',t.card)}</div></div></details>
    <details><summary>4. Questions & copy</summary><div class="section-body"><div class="flow-map">${editableScreens.map(([k])=>`<a href="#screen-${k}">${k.replace(/([A-Z])/g,' $1')}</a>`).join('<span>↓</span>')}</div>${editableScreens.map(([key,v])=>`<fieldset id="screen-${key}"><legend>${key.replace(/([A-Z])/g,' $1')}</legend>${Object.entries(v).map(([k,val])=>`<label>${k}<textarea data-path="content.screens.${key}.${k}" maxlength="1000">${esc(val)}</textarea></label>`).join('')}</fieldset>`).join('')}</div></details>
    <details><summary>5. Date Options</summary><div class="section-body"><p class="hint">Choose one featured date idea. The recipient selects the exact date and time after saying yes.</p>${c.moods.map((m,i)=>`<fieldset class="${m.favorite?'favorite-field':''}"><legend>Option ${i+1}${m.favorite?' · My favorite':''}</legend>${field('Title',`content.moods.${i}.title`,m.title)}${field('Description',`content.moods.${i}.description`,m.description)}<button type="button" class="favorite-option ${m.favorite?'active':''}" data-favorite-index="${i}">${m.favorite?'★ Featured & selected':'☆ Make my favorite'}</button></fieldset>`).join('')}<button class="button ghost small add" data-list="moods">+ Add option</button></div></details>
    <details class="feature-section"><summary>6. Cute Features <small>Playful touches for the invitation.</small></summary><div class="section-body feature-list">${[['Mascots','mascots'],['Tiny Mode','tinyMode'],['Cute-item collection','collection'],['Confetti','confetti'],['Funny Back buttons','funnyBack']].map(([l,k])=>featureToggle(l,`features.${k}`,f[k])).join('')}<label class="mascot-select"><span><b>Mascot pack</b><small>Choose the characters shown in the invitation.</small></span><select data-path="features.mascotPack">${['original','yellow','blue','pink','bears','cats','bunnies','none'].map(x=>`<option ${f.mascotPack===x?'selected':''} value="${x}">${x[0].toUpperCase()+x.slice(1)}</option>`).join('')}</select></label></div></details>
    <details class="music-section"><summary>7. Music <small>Set the mood after they open the invitation.</small></summary><div class="section-body"><div class="music-enable">${toggle('Enable music','features.music',f.music)}<small>Play your selected song after the invitation is opened.</small></div><label class="music-upload"><span class="upload-icon">↥</span><b>Upload favorite song</b><small>MP3, M4A, OGG, or WAV · max 10 MB</small><span id="music-upload-copy" class="button primary small">Choose file</span><input id="music-file" type="file" accept=".mp3,.m4a,.ogg,.wav,audio/*"></label><p class="music-safety">♡ Your song never autoplays. It starts only after the recipient interacts.</p>${f.musicUrl?`<div class="music-current"><span class="music-note">♫</span><div><b>${esc(f.musicName||'Favorite song')}</b><small>Ready to play after “Open it”</small></div><label class="change-music button ghost small">Change<input class="music-replace" type="file" accept=".mp3,.m4a,.ogg,.wav,audio/*"></label><button id="remove-music" class="icon-button" aria-label="Remove song">×</button></div>`:''}<p class="music-tip"><b>♡ Tip</b><span>Keep it short and sweet—your favorite moment works beautifully.</span></p></div></details>
    <details><summary>8. Final Message</summary><div class="section-body">${field('Secret heading','content.screens.secret.heading',s.secret.heading)}<label>Secret message<textarea data-path="content.screens.secret.body" maxlength="1000">${esc(s.secret.body)}</textarea></label></div></details>
    <details><summary>9. Publish</summary><div class="section-body"><p>Status: <b>${state.status}</b></p><button class="button primary" id="publish-inline">Publish Invitation ❤️</button>${state.status==='published'?`<div class="share-box"><input readonly value="${location.origin}/i/${state.token}"><button class="button small copy-link">Copy Link</button></div>`:''}</div></details>`;
}
function setPath(path,value){const bits=path.split('.');let obj=state;for(let i=0;i<bits.length-1;i++)obj=obj[bits[i]];obj[bits.at(-1)]=value;scheduleSave();}
controls.addEventListener('input',e=>{if(!e.target.dataset.path)return;setPath(e.target.dataset.path,e.target.type==='checkbox'?e.target.checked:e.target.value);if(e.target.dataset.path.startsWith('theme.'))updateThemePreview();});
controls.addEventListener('change',e=>{if((e.target.id==='music-file'||e.target.classList.contains('music-replace'))&&e.target.files[0])uploadMusic(e.target.files[0]);});
controls.addEventListener('click',e=>{const add=e.target.closest('.add'),remove=e.target.closest('.remove'),themeButton=e.target.closest('[data-theme-preset]'),favoriteButton=e.target.closest('[data-favorite-index]');if(themeButton){Object.assign(state.theme,state.presets.themes[themeButton.dataset.themePreset],{preset:themeButton.dataset.themePreset});render();updateThemePreview();scheduleSave();}if(favoriteButton){state.content.moods.forEach((m,i)=>m.favorite=i===Number(favoriteButton.dataset.favoriteIndex));render();scheduleSave();}if(add){e.preventDefault();if(add.dataset.list==='moods'&&state.content.moods.length<10)state.content.moods.push({title:'New date idea ✨',description:'Add a little description',favorite:false});render();scheduleSave();}if(remove){e.preventDefault();state.content[remove.dataset.list].splice(Number(remove.dataset.index),1);if(remove.dataset.list==='moods'&&state.content.moods.length&&!state.content.moods.some(m=>m.favorite))state.content.moods[0].favorite=true;render();scheduleSave();}if(e.target.id==='remove-music')removeMusic();if(e.target.id==='publish-inline')publish();if(e.target.closest('.copy-link'))copyLink();});
function updateThemePreview(){const shell=preview.contentDocument?.querySelector('.invite-shell');if(!shell)return;for(const key of ['background','primary','secondary','text','muted','card'])if(state.theme[key])shell.style.setProperty(`--${key==='background'?'bg':key}`,state.theme[key]);}
function audioBufferToWavBlob(buffer) {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const data = buffer.getChannelData(0);
  const dataLength = data.length * bytesPerSample;
  const bufferLength = 44 + dataLength;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);
  let offset = 44;
  for (let i = 0; i < data.length; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

async function compressAudioFile(file) {
  if (file.size <= 2.2 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const maxDuration = Math.min(audioBuffer.duration, 90);
    const sampleRate = 22050;
    const offlineCtx = new OfflineAudioContext(1, Math.floor(sampleRate * maxDuration), sampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start(0, 0, maxDuration);
    const renderedBuffer = await offlineCtx.startRendering();
    const wavBlob = audioBufferToWavBlob(renderedBuffer);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(wavBlob);
    });
  } catch (e) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

async function uploadMusic(file){const copy=document.querySelector('#music-upload-copy');copy.textContent=`Optimizing ${file.name}…`;document.querySelector('#save-status').textContent='Uploading music…';try{await saveQueue;const dataUrl=await compressAudioFile(file);let r=await fetch(`/api/invitations/${id}/music`,{method:'POST',headers:{'content-type':'application/json','x-csrf-token':csrf},body:JSON.stringify({musicUrl:dataUrl,name:file.name})});let out={};try{out=await r.json();}catch{}if(!r.ok){Object.assign(state.features,{music:true,musicUrl:dataUrl,musicName:file.name});const savedOk=await save();if(!savedOk){copy.textContent=out.error||'Could not upload song.';document.querySelector('#save-status').textContent='Upload failed';return toast(copy.textContent);}}else{Object.assign(state.features,{music:true,musicUrl:out.url||dataUrl,musicName:out.name||file.name});}document.querySelector('#save-status').textContent='Music saved ✓';render();preview.src=preview.src.split('?')[0]+`?embed=1&t=${Date.now()}`;toast('Favorite song added ♫');}catch{copy.textContent='Upload failed. Check file.';document.querySelector('#save-status').textContent='Upload failed';toast(copy.textContent);}}
async function removeMusic(){if(!confirm('Remove this song from the invitation?'))return;const r=await fetch(`/api/invitations/${id}/music`,{method:'DELETE',headers:{'x-csrf-token':csrf}});if(r.ok){Object.assign(state.features,{music:false,musicUrl:null,musicName:null});render();preview.src=preview.src.split('?')[0]+`?embed=1&t=${Date.now()}`;toast('Song removed.');}}
function scheduleSave(){document.querySelector('#save-status').textContent='Saving…';clearTimeout(timer);timer=setTimeout(save,650);}
// Serialize autosaves: an older theme snapshot can never arrive after a newer one.
async function save(){clearTimeout(timer);const version=++saveVersion,body=JSON.stringify({inviterName:state.inviterName,recipientName:state.recipientName,title:state.title,theme:state.theme,content:state.content,features:state.features});const run=async()=>{try{const r=await fetch(`/api/invitations/${id}`,{method:'PUT',headers:{'content-type':'application/json','x-csrf-token':csrf},body});if(version===saveVersion){document.querySelector('#save-status').textContent=r.ok?'Saved ✓':'Save failed';if(r.ok)preview.src=preview.src.split('?')[0]+`?embed=1&t=${Date.now()}`;else toast((await r.json()).error||'Could not save changes.');}return r.ok;}catch{if(version===saveVersion){document.querySelector('#save-status').textContent='Save failed';toast('Could not save changes.');}return false;}};saveQueue=saveQueue.then(run,run);return saveQueue;}
async function publish(){if(!await save())return;const r=await fetch(`/api/invitations/${id}/status`,{method:'POST',headers:{'content-type':'application/json','x-csrf-token':csrf},body:JSON.stringify({status:'published'})});let out={};try{out=await r.json();}catch{}if(r.ok){state.status='published';render();toast('Invitation published with your latest theme 🎉');}else toast(out.error||'Could not publish invitation.');}
function copyLink(){navigator.clipboard.writeText(`${location.origin}/i/${state.token}`);toast('Private link copied ✓');}
document.querySelector('#publish').onclick=publish;document.querySelector('#save-draft').onclick=save;
document.querySelector('.preview-toolbar')?.addEventListener('click',e=>{const button=e.target.closest('[data-viewport]');if(!button)return;document.querySelectorAll('.preview-toolbar button').forEach(item=>item.classList.toggle('active',item===button));document.querySelector('#preview-pane').dataset.viewport=button.dataset.viewport;});
document.querySelector('.mobile-tabs').onclick=e=>{const tab=e.target.dataset.tab;if(!tab)return;document.querySelectorAll('.mobile-tabs button').forEach(b=>b.classList.toggle('active',b===e.target));root.classList.toggle('show-preview',tab==='preview');};
function toast(message){let el=document.querySelector('.toast');if(!el){el=document.createElement('div');el.className='toast';document.body.append(el);}el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3000);}
