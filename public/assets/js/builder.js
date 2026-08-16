const root=document.querySelector('#builder'),id=root.dataset.id,controls=document.querySelector('#controls'),preview=document.querySelector('iframe'),csrf=document.querySelector('meta[name="csrf-token"]').content;
let state,timer,saveVersion=0,saveQueue=Promise.resolve();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const field=(label,path,value,type='text')=>`<label>${label}<input data-path="${path}" type="${type}" value="${esc(value)}" ${type==='text'?'maxlength="1000"':''}></label>`;
const toggle=(label,path,value)=>`<label class="toggle"><input data-path="${path}" type="checkbox" ${value?'checked':''}><span></span>${label}</label>`;
const featureInfo={Mascots:['🐻','Display adorable mascots throughout the invitation.'],'Tiny Mode':['⌗','Enable a compact and minimal layout for a cute vibe.'],'Cute-item collection':['♡','Show a collection of cute items to charm your recipient.'],Confetti:['⌁','Celebrate moments with a burst of confetti.'],'Funny Back buttons':['‹','Replace standard back buttons with fun alternatives.']};
const featureToggle=(label,path,value)=>{const [icon,description]=featureInfo[label];return `<label class="feature-toggle"><i>${icon}</i><span><b>${label}</b><small>${description}</small></span><input data-path="${path}" type="checkbox" ${value?'checked':''}><em aria-hidden="true"></em></label>`;};

fetch(`/api/invitations/${id}`)
  .then(r => {
    if (r.status === 401) { window.location.href = '/login'; return null; }
    return r.json();
  })
  .then(data => {
    if (!data || data.error || !data.content) { if (data?.error) toast(data.error); return; }
    state = data;
    render();
    if (new URLSearchParams(location.search).has('created')) toast('Invitation created 🎉 — customize or publish when ready.');
  })
  .catch(err => console.error('Failed to load invitation data:', err));
const themeColorSpecs = [
  { key: 'background', label: 'Background', desc: 'Page background & ambient surface', defaultVal: '#FCFAF6' },
  { key: 'primary', label: 'Primary', desc: 'Main buttons & important accents', defaultVal: '#E6496F' },
  { key: 'secondary', label: 'Secondary', desc: 'Soft blush & ambient accents', defaultVal: '#F4E9DD' },
  { key: 'accent', label: 'Accent', desc: 'Badges, glows & gradient accents', defaultVal: '#FF7B94' },
  { key: 'headingColor', label: 'Heading', desc: 'Main title & question headings', defaultVal: '#20191B' },
  { key: 'text', label: 'Text', desc: 'Normal readable body text', defaultVal: '#282223' },
  { key: 'muted', label: 'Muted Text', desc: 'Subtitles & secondary information', defaultVal: '#70686A' },
  { key: 'card', label: 'Card', desc: 'Cards and panels with optional alpha', defaultVal: '#FFFFFFEE' },
  { key: 'buttonText', label: 'Button Text', desc: 'Text displayed inside primary buttons', defaultVal: '#FFFFFF' },
  { key: 'border', label: 'Border', desc: 'Separators, chips & card borders', defaultVal: '#EADFE1' }
];

function hexToRgb(hex) {
  let c = String(hex || '').replace('#', '').trim();
  if (c.length === 3 || c.length === 4) c = c.split('').map(x => x + x).join('');
  if (c.length >= 6) {
    return {
      r: parseInt(c.slice(0, 2), 16) || 0,
      g: parseInt(c.slice(2, 4), 16) || 0,
      b: parseInt(c.slice(4, 6), 16) || 0
    };
  }
  return { r: 40, g: 30, b: 35 };
}

function rgbToHex(r, g, b) {
  const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
  const h = v => clamp(v).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

function getLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const a = [r / 255, g / 255, b / 255].map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function getContrastRatio(hex1, hex2) {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const bright = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (bright + 0.05) / (dark + 0.05);
}

function getContrastRating(ratio, isLarge = false) {
  const target = isLarge ? 3.0 : 4.5;
  if (ratio >= 7.0) return { label: 'Excellent', class: 'contrast-excellent', symbol: '✓' };
  if (ratio >= target) return { label: 'Good', class: 'contrast-good', symbol: '✓' };
  if (ratio >= 2.5) return { label: 'Low contrast', class: 'contrast-warning', symbol: '⚠' };
  return { label: 'Poor contrast', class: 'contrast-poor', symbol: '✕' };
}

function suggestReadableColor(fgHex, bgHex, minRatio = 4.5) {
  let { r, g, b } = hexToRgb(fgHex);
  const bgLum = getLuminance(bgHex);
  const makeDarker = bgLum > 0.5;

  for (let i = 0; i < 35; i++) {
    const currentHex = rgbToHex(r, g, b);
    if (getContrastRatio(currentHex, bgHex) >= minRatio) {
      return currentHex;
    }
    if (makeDarker) {
      r = Math.max(0, r * 0.82);
      g = Math.max(0, g * 0.82);
      b = Math.max(0, b * 0.82);
    } else {
      r = Math.min(255, r + (255 - r) * 0.22);
      g = Math.min(255, g + (255 - g) * 0.22);
      b = Math.min(255, b + (255 - b) * 0.22);
    }
  }
  return makeDarker ? '#1E1417' : '#FFFFFF';
}

function renderColorCards(t) {
  return themeColorSpecs.map(spec => {
    const rawVal = t[spec.key] || spec.defaultVal;
    const solidHex = String(rawVal).slice(0, 7);
    return `
      <div class="color-card">
        <div class="color-card-head">
          <b>${spec.label}</b>
          <small>${spec.desc}</small>
        </div>
        <div class="color-input-row">
          <div class="color-picker-wrapper" title="Pick ${spec.label}">
            <input type="color" value="${solidHex}" data-color-picker="${spec.key}">
          </div>
          <input type="text" class="color-hex-input" data-color-hex="${spec.key}" data-path="theme.${spec.key}" value="${esc(rawVal)}" maxlength="9" placeholder="#RRGGBB">
        </div>
      </div>
    `;
  }).join('');
}

function renderContrastAudit(t) {
  const bg = t.background || '#FCFAF6';
  const primary = t.primary || '#E6496F';
  const heading = t.headingColor || t.text || '#20191B';
  const text = t.text || '#282223';
  const muted = t.muted || '#70686A';
  const card = t.card || '#FFFFFFEE';
  const btnText = t.buttonText || '#FFFFFF';

  const pairs = [
    { label: 'Text / Background', fgKey: 'text', fg: text, bg: bg, isLarge: false },
    { label: 'Heading / Background', fgKey: 'headingColor', fg: heading, bg: bg, isLarge: true },
    { label: 'Muted Text / Background', fgKey: 'muted', fg: muted, bg: bg, isLarge: false },
    { label: 'Button Text / Primary', fgKey: 'buttonText', fg: btnText, bg: primary, isLarge: true },
    { label: 'Text / Card', fgKey: 'text', fg: text, bg: card, isLarge: false },
    { label: 'Heading / Card', fgKey: 'headingColor', fg: heading, bg: card, isLarge: true }
  ];

  return `
    <div class="contrast-audit-section">
      <h4><span>⚡</span> WCAG Contrast Checker</h4>
      <div class="contrast-audit-table">
        ${pairs.map(p => {
          const ratio = getContrastRatio(p.fg, p.bg);
          const rating = getContrastRating(ratio, p.isLarge);
          const needsFix = ratio < (p.isLarge ? 3.0 : 4.5);
          return `
            <div class="contrast-row">
              <span class="contrast-pair">${p.label}</span>
              <div class="contrast-actions-cell">
                <span class="contrast-badge ${rating.class}">${rating.symbol} ${rating.label} (${ratio.toFixed(1)}:1)</span>
                ${needsFix ? `<button type="button" class="btn-fix-contrast" data-fix-key="${p.fgKey}" data-bg-color="${p.bg}">Fix contrast</button>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <div class="theme-actions-bar">
        <button type="button" class="button ghost small" data-action="autofix-contrast">✨ Auto-fix contrast</button>
        <button type="button" class="button ghost small" data-action="reset-theme">↺ Reset to preset</button>
      </div>
    </div>
  `;
}

function renderLiveThemePreview(t) {
  const primary = t.primary || '#E6496F';
  const accent = t.accent || t.primary || '#FF7B94';
  const heading = t.headingColor || t.text || '#20191B';
  const text = t.text || '#282223';
  const muted = t.muted || '#70686A';
  const card = t.card || '#FFFFFFEE';
  const btnText = t.buttonText || '#FFFFFF';
  const border = t.border || '#EADFE1';

  return `
    <div class="live-theme-preview-wrap">
      <h4>Live Theme Preview</h4>
      <div class="live-theme-card-mockup" style="background: ${card}; border: 1px solid ${border}; color: ${text};">
        <span class="mockup-eyebrow" style="color: ${accent}; background: color-mix(in srgb, ${accent} 12%, transparent); border: 1px solid color-mix(in srgb, ${accent} 25%, transparent);">Recommended</span>
        <h3 class="mockup-heading" style="color: ${heading}; font-family: var(--font-display, Georgia, serif);">Let's make this moment special ❤️</h3>
        <p class="mockup-body" style="color: ${text};">I really enjoy spending time with you. Made with love and a little overthinking.</p>
        <button type="button" class="mockup-btn-primary" style="background: linear-gradient(135deg, ${primary} 0%, ${accent} 100%); color: ${btnText};">Say Yes ❤️</button>
        <button type="button" class="mockup-btn-secondary" style="border: 1.5px solid ${border}; color: ${text};">Maybe later 😏</button>
        <small class="mockup-muted" style="color: ${muted};">Updated just now · 100% Fun guaranteed</small>
      </div>
    </div>
  `;
}

function render(){
  const c=state.content,s=c.screens,t=state.theme,f=state.features;
  const editableScreens=Object.entries(s).filter(([key])=>!['nickname','analysis'].includes(key));
  controls.innerHTML=`
    <details open><summary>1. Basics</summary><div class="section-body">${field('Your Name','inviterName',state.inviterName)}${field('Recipient Name','recipientName',state.recipientName)}${field('Invitation Title','title',state.title)}</div></details>
    <details><summary>2. Template</summary><div class="section-body"><div class="template-mini"><b>Best Friend → Date ❤️</b><span>Active template</span></div></div></details>
    <details open><summary>3. Theme Colors</summary><div class="section-body"><div class="theme-choices">${Object.entries(state.presets.themes).map(([k,v])=>`<button type="button" class="theme-choice ${t.preset===k?'active':''}" data-theme-preset="${k}"><i style="--swatch-a:${v.primary};--swatch-b:${v.secondary};--swatch-bg:${v.background}"></i><span>${v.name}</span></button>`).join('')}</div><p class="hint">Choose a preset or fine-tune the colors below.</p><div class="color-grid">${renderColorCards(t)}</div>${renderContrastAudit(t)}${renderLiveThemePreview(t)}</div></details>
    <details><summary>4. Questions & copy</summary><div class="section-body"><div class="flow-map">${editableScreens.map(([k])=>`<a href="#screen-${k}">${k.replace(/([A-Z])/g,' $1')}</a>`).join('<span>↓</span>')}</div>${editableScreens.map(([key,v])=>`<fieldset id="screen-${key}"><legend>${key.replace(/([A-Z])/g,' $1')}</legend>${Object.entries(v).map(([k,val])=>`<label>${k}<textarea data-path="content.screens.${key}.${k}" maxlength="1000">${esc(val)}</textarea></label>`).join('')}</fieldset>`).join('')}</div></details>
    <details class="cover-section"><summary>5. Cover Photo & Intro Visual 🖼️ <small>Add a personal photo on the first screen.</small></summary><div class="section-body">${toggle('Show cover photo on opening screen', 'features.coverPhoto', f.coverPhoto)}<label>Photo Caption (optional)<input data-path="features.coverPhotoCaption" value="${esc(f.coverPhotoCaption || '')}" placeholder="e.g. Our favorite memory ✨" maxlength="80"></label><label class="music-upload"><span class="upload-icon">🖼️</span><b>Upload cover photo</b><small>JPG, PNG, WebP or GIF · max 5 MB</small><span id="cover-upload-copy" class="button primary small">Choose photo</span><input id="cover-file" type="file" accept=".jpg,.jpeg,.png,.webp,.gif,image/*"></label>${f.coverPhotoUrl ? `<div class="cover-current"><img src="${esc(f.coverPhotoUrl)}" alt="Cover preview" class="cover-thumbnail"><div class="cover-meta"><b>Cover photo active</b><small>Visible on the opening screen</small></div><button id="remove-cover" class="icon-button" type="button" aria-label="Remove cover photo">×</button></div>` : ''}</div></details>
    <details><summary>6. Date Options</summary><div class="section-body"><p class="hint">Choose one featured date idea. The recipient selects the exact date and time after saying yes.</p>${c.moods.map((m,i)=>`<fieldset class="${m.favorite?'favorite-field':''}"><legend>Option ${i+1}${m.favorite?' · My favorite':''}</legend>${field('Title',`content.moods.${i}.title`,m.title)}${field('Description',`content.moods.${i}.description`,m.description)}<button type="button" class="favorite-option ${m.favorite?'active':''}" data-favorite-index="${i}">${m.favorite?'★ Featured & selected':'☆ Make my favorite'}</button></fieldset>`).join('')}<button class="button ghost small add" data-list="moods">+ Add option</button></div></details>
    <details class="feature-section"><summary>7. Cute Features <small>Playful touches for the invitation.</small></summary><div class="section-body feature-list">${[['Mascots','mascots'],['Tiny Mode','tinyMode'],['Cute-item collection','collection'],['Confetti','confetti'],['Funny Back buttons','funnyBack']].map(([l,k])=>featureToggle(l,`features.${k}`,f[k])).join('')}<label class="mascot-select"><span><b>Mascot pack</b><small>Choose the characters shown in the invitation.</small></span><select data-path="features.mascotPack">${['original','yellow','blue','pink','bears','cats','bunnies','none'].map(x=>`<option ${f.mascotPack===x?'selected':''} value="${x}">${x[0].toUpperCase()+x.slice(1)}</option>`).join('')}</select></label></div></details>
    <details class="music-section"><summary>8. Music ♫ <small>Set the mood with preset tracks or your custom song.</small></summary><div class="section-body"><div class="music-enable">${toggle('Enable music','features.music',f.music)}<small>Play your selected song after the invitation is opened.</small></div><p class="hint" style="margin:8px 0 4px;">Choose from romantic soundscapes or upload your own track:</p><div class="music-preset-grid">${(state.presets?.music || [{key:'preset:lofi',name:'Lo-fi Romance 🎧',desc:'Chill beats, warm chords'},{key:'preset:acoustic',name:'Acoustic Sunset 🎸',desc:'Warm fingerstyle melody'},{key:'preset:piano',name:'Piano Serenade 🎹',desc:'Soft emotive piano'},{key:'preset:ukulele',name:'Sweet Ukulele ☀️',desc:'Playful, sunny vibe'},{key:'preset:jazz',name:'Midnight Jazz 🎷',desc:'Cozy late-night jazz'}]).map(p=>`<button type="button" class="music-preset-btn ${f.musicUrl===p.key?'active':''}" data-music-preset="${p.key}" data-music-name="${esc(p.name)}"><b>${p.name}</b><small>${p.desc}</small></button>`).join('')}</div><label class="music-upload"><span class="upload-icon">↥</span><b>Or upload custom song</b><small>MP3, M4A, OGG, or WAV · max 10 MB</small><span id="music-upload-copy" class="button ghost small">Choose custom file</span><input id="music-file" type="file" accept=".mp3,.m4a,.ogg,.wav,audio/*"></label><label style="display:flex;flex-direction:column;gap:4px;margin-top:14px;"><span style="display:flex;justify-content:space-between;font-size:0.8rem;font-weight:600;"><b>Default Volume</b><span id="music-vol-label">${f.musicVolume || 35}%</span></span><input data-path="features.musicVolume" type="range" min="5" max="100" value="${f.musicVolume || 35}"></label><p class="music-safety">♡ Your song never autoplays. It starts only after the recipient interacts.</p>${f.musicUrl?`<div class="music-current"><span class="music-note">♫</span><div><b>${esc(f.musicName||'Selected soundtrack')}</b><small>Ready to play after “Open it”</small></div><button id="remove-music" class="icon-button" aria-label="Remove song">×</button></div>`:''}</div></details>
    <details class="music-section"><summary>9. Personal Voice Note 🎙️ <small>Add your personal voice message.</small></summary><div class="section-body"><p class="hint">Record with your mic or upload an audio file. The background song will automatically duck when your voice note plays!</p><div style="display:flex;gap:10px;align-items:center;margin-bottom:12px;"><button id="record-voice-btn" type="button" class="button primary small">🎙️ Start Recording</button><span id="recording-timer" style="font-weight:700;font-size:0.85rem;display:none;color:#ff625f;">● 0:00</span></div><label class="music-upload"><span class="upload-icon">↥</span><b>Upload recorded voice note</b><small>MP3, M4A, OGG, WAV, or AAC · max 10 MB</small><span id="voice-upload-copy" class="button ghost small">Choose voice file</span><input id="voice-file" type="file" accept=".mp3,.m4a,.ogg,.wav,.webm,.aac,audio/*"></label>${f.voiceNoteUrl?`<div class="music-current" style="margin-top:12px;"><span class="music-note">🎙️</span><div><b>${esc(f.voiceNoteName||'Personal Voice Note')}</b><small>Ready to play in invitation</small></div><button id="remove-voice" class="icon-button" type="button" aria-label="Remove voice note">×</button></div>`:''}</div></details>
    <details><summary>10. Final Message</summary><div class="section-body">${field('Secret heading','content.screens.secret.heading',s.secret.heading)}<label>Secret message<textarea data-path="content.screens.secret.body" maxlength="1000">${esc(s.secret.body)}</textarea></label></div></details>
    <details><summary>11. Publish</summary><div class="section-body"><p>Status: <b>${state.status}</b></p><button class="button primary" id="publish-inline">Publish Invitation ❤️</button>${state.status==='published'?`<div class="share-box"><input readonly value="${location.origin}/i/${state.token}"><button class="button small copy-link">Copy Link</button></div>`:''}</div></details>`;
}
function setPath(path,value){const bits=path.split('.');let obj=state;for(let i=0;i<bits.length-1;i++)obj=obj[bits[i]];obj[bits.at(-1)]=value;scheduleSave();}
controls.addEventListener('input',e=>{
  if (e.target.dataset.colorPicker) {
    const key = e.target.dataset.colorPicker;
    state.theme[key] = e.target.value.toUpperCase();
    const hexInput = controls.querySelector(`[data-color-hex="${key}"]`);
    if (hexInput) hexInput.value = state.theme[key];
    updateThemePreview();
    renderLiveMockupOnly();
    scheduleSave();
    return;
  }
  if (e.target.dataset.path === 'features.musicVolume') {
    const label = controls.querySelector('#music-vol-label');
    if (label) label.textContent = `${e.target.value}%`;
  }
  if(!e.target.dataset.path)return;
  setPath(e.target.dataset.path,e.target.type==='checkbox'?e.target.checked:e.target.value);
  if(e.target.dataset.path.startsWith('theme.')){
    const key = e.target.dataset.path.replace('theme.', '');
    const picker = controls.querySelector(`[data-color-picker="${key}"]`);
    if (picker && e.target.value.startsWith('#') && e.target.value.length >= 7) picker.value = e.target.value.slice(0, 7);
    updateThemePreview();
    renderLiveMockupOnly();
  }
});
controls.addEventListener('change',e=>{
  if(e.target.id==='cover-file'&&e.target.files[0])uploadCoverPhoto(e.target.files[0]);
  if((e.target.id==='music-file'||e.target.classList.contains('music-replace'))&&e.target.files[0])uploadMusic(e.target.files[0]);
  if(e.target.id==='voice-file'&&e.target.files[0])uploadVoiceNote(e.target.files[0]);
});
controls.addEventListener('click',e=>{
  const add=e.target.closest('.add'),remove=e.target.closest('.remove'),themeButton=e.target.closest('[data-theme-preset]'),favoriteButton=e.target.closest('[data-favorite-index]');
  const musicPresetBtn = e.target.closest('[data-music-preset]');
  if(musicPresetBtn) {
    const key = musicPresetBtn.dataset.musicPreset;
    const name = musicPresetBtn.dataset.musicName;
    Object.assign(state.features, { music: true, musicUrl: key, musicName: name });
    render();
    preview.src = preview.src.split('?')[0] + `?embed=1&t=${Date.now()}`;
    scheduleSave();
    toast(`Selected soundtrack: ${name} ♫`);
    return;
  }
  const fixBtn = e.target.closest('[data-fix-key]');
  const actionBtn = e.target.closest('[data-action]');
  if(fixBtn) {
    const key = fixBtn.dataset.fixKey;
    const bg = fixBtn.dataset.bgColor;
    const currentVal = state.theme[key] || '#282223';
    const isLarge = key === 'headingColor' || key === 'buttonText';
    const suggested = suggestReadableColor(currentVal, bg, isLarge ? 4.5 : 4.5);
    state.theme[key] = suggested;
    render();
    updateThemePreview();
    scheduleSave();
    toast(`Adjusted ${key} to ${suggested} for optimal contrast ✓`);
    return;
  }
  if(actionBtn) {
    const act = actionBtn.dataset.action;
    if (act === 'reset-theme') {
      const presetKey = state.theme.preset || 'strawberry';
      const preset = state.presets.themes[presetKey] || state.presets.themes.strawberry;
      Object.assign(state.theme, preset, { preset: presetKey });
      render();
      updateThemePreview();
      scheduleSave();
      toast(`Reset theme to ${preset.name} ✓`);
      return;
    }
    if (act === 'autofix-contrast') {
      const t = state.theme;
      const bg = t.background || '#FCFAF6';
      const card = t.card || '#FFFFFFEE';
      const primary = t.primary || '#E6496F';
      
      if (getContrastRatio(t.text || '#282223', bg) < 4.5) t.text = suggestReadableColor(t.text || '#282223', bg, 4.5);
      if (getContrastRatio(t.headingColor || t.text || '#20191B', bg) < 4.5) t.headingColor = suggestReadableColor(t.headingColor || '#20191B', bg, 4.5);
      if (getContrastRatio(t.muted || '#70686A', bg) < 3.5) t.muted = suggestReadableColor(t.muted || '#70686A', bg, 3.5);
      if (getContrastRatio(t.buttonText || '#FFFFFF', primary) < 4.5) t.buttonText = suggestReadableColor(t.buttonText || '#FFFFFF', primary, 4.5);
      if (getContrastRatio(t.text, card) < 4.5) t.text = suggestReadableColor(t.text, card, 4.5);

      render();
      updateThemePreview();
      scheduleSave();
      toast('Applied optimal contrast adjustments to all theme colors ✓');
      return;
    }
  }
  if(themeButton){Object.assign(state.theme,state.presets.themes[themeButton.dataset.themePreset],{preset:themeButton.dataset.themePreset});render();updateThemePreview();scheduleSave();}
  if(favoriteButton){state.content.moods.forEach((m,i)=>m.favorite=i===Number(favoriteButton.dataset.favoriteIndex));render();scheduleSave();}
  if(add){e.preventDefault();if(add.dataset.list==='moods'&&state.content.moods.length<10)state.content.moods.push({title:'New date idea ✨',description:'Add a little description',favorite:false});render();scheduleSave();}
  if(remove){e.preventDefault();state.content[remove.dataset.list].splice(Number(remove.dataset.index),1);if(remove.dataset.list==='moods'&&state.content.moods.length&&!state.content.moods.some(m=>m.favorite))state.content.moods[0].favorite=true;render();scheduleSave();}
  if(e.target.id==='remove-cover')removeCoverPhoto();
  if(e.target.id==='remove-music')removeMusic();
  if(e.target.id==='remove-voice')removeVoiceNote();
  if(e.target.id==='record-voice-btn')toggleRecordVoice();
  if(e.target.id==='publish-inline')publish();
  if(e.target.closest('.copy-link'))copyLink();
});

function renderLiveMockupOnly() {
  const mockupWrap = controls.querySelector('.live-theme-preview-wrap');
  const auditWrap = controls.querySelector('.contrast-audit-section');
  if (mockupWrap) mockupWrap.outerHTML = renderLiveThemePreview(state.theme);
  if (auditWrap) auditWrap.outerHTML = renderContrastAudit(state.theme);
}

function updateThemePreview(){
  const shell=preview.contentDocument?.querySelector('.invite-shell');
  if(!shell)return;
  const t = state.theme;
  shell.style.setProperty('--bg', t.background || '#FCFAF6');
  shell.style.setProperty('--primary', t.primary || '#E6496F');
  shell.style.setProperty('--secondary', t.secondary || '#F4E9DD');
  shell.style.setProperty('--accent', t.accent || t.primary || '#FF7B94');
  shell.style.setProperty('--heading-color', t.headingColor || t.heading_color || t.text || '#20191B');
  shell.style.setProperty('--text', t.text || '#282223');
  shell.style.setProperty('--muted', t.muted || '#70686A');
  shell.style.setProperty('--card', t.card || '#FFFFFFEE');
  shell.style.setProperty('--button-text', t.buttonText || '#FFFFFF');
  shell.style.setProperty('--border', t.border || '#EADFE1');
}
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
  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const maxDuration = Math.min(audioBuffer.duration, 45);
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

let mediaRecorder = null;
let audioChunks = [];
let recordTimer = null;
let recordSeconds = 0;

async function toggleRecordVoice() {
  const btn = document.querySelector('#record-voice-btn');
  const timerEl = document.querySelector('#recording-timer');
  if (!mediaRecorder || mediaRecorder.state === 'inactive') {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        clearInterval(recordTimer);
        if (timerEl) timerEl.style.display = 'none';
        if (btn) btn.textContent = '🎙️ Start Recording';
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        if (blob.size < 100) return toast('Recording too short.');
        uploadVoiceNote(new File([blob], 'my-voice-note.webm', { type: 'audio/webm' }));
      };
      mediaRecorder.start();
      recordSeconds = 0;
      if (timerEl) { timerEl.style.display = 'inline'; timerEl.textContent = '● 0:00'; }
      if (btn) btn.textContent = '⏹ Stop & Save';
      recordTimer = setInterval(() => {
        recordSeconds++;
        const mins = Math.floor(recordSeconds / 60);
        const secs = recordSeconds % 60;
        if (timerEl) timerEl.textContent = `● ${mins}:${String(secs).padStart(2, '0')}`;
        if (recordSeconds >= 60) {
          mediaRecorder.stop();
        }
      }, 1000);
    } catch (err) {
      toast('Microphone permission required for voice recording.');
    }
  } else {
    mediaRecorder.stop();
  }
}

async function uploadVoiceNote(file) {
  const copy = document.querySelector('#voice-upload-copy');
  if (copy) copy.textContent = `Saving ${file.name}…`;
  document.querySelector('#save-status').textContent = 'Uploading voice note…';
  try {
    await saveQueue;
    const dataUrl = await compressAudioFile(file);
    Object.assign(state.features, { voiceNoteUrl: dataUrl, voiceNoteName: file.name });
    const savedOk = await save();
    if (savedOk) {
      document.querySelector('#save-status').textContent = 'Voice note saved ✓';
      render();
      preview.src = preview.src.split('?')[0] + `?embed=1&t=${Date.now()}`;
      toast('Voice note saved 🎙️');
    } else {
      toast('Failed to save voice note.');
    }
  } catch {
    toast('Failed to upload voice note.');
  }
}

async function removeVoiceNote() {
  if (!confirm('Remove this voice note from the invitation?')) return;
  Object.assign(state.features, { voiceNoteUrl: null, voiceNoteName: null });
  await save();
  render();
  preview.src = preview.src.split('?')[0] + `?embed=1&t=${Date.now()}`;
  toast('Voice note removed.');
}

async function uploadCoverPhoto(file) {
  const copy = document.querySelector('#cover-upload-copy');
  if (copy) copy.textContent = `Optimizing ${file.name}…`;
  document.querySelector('#save-status').textContent = 'Uploading cover photo…';
  try {
    await saveQueue;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      Object.assign(state.features, { coverPhoto: true, coverPhotoUrl: dataUrl });
      const savedOk = await save();
      if (savedOk) {
        document.querySelector('#save-status').textContent = 'Cover photo saved ✓';
        render();
        preview.src = preview.src.split('?')[0] + `?embed=1&t=${Date.now()}`;
        toast('Cover photo added 🖼️');
      } else {
        toast('Failed to save cover photo.');
      }
    };
    reader.readAsDataURL(file);
  } catch {
    toast('Failed to upload cover photo.');
  }
}

async function removeCoverPhoto() {
  if (!confirm('Remove cover photo from the invitation?')) return;
  Object.assign(state.features, { coverPhoto: false, coverPhotoUrl: null, coverPhotoCaption: null });
  await save();
  render();
  preview.src = preview.src.split('?')[0] + `?embed=1&t=${Date.now()}`;
  toast('Cover photo removed.');
}
function scheduleSave(){document.querySelector('#save-status').textContent='Saving…';clearTimeout(timer);timer=setTimeout(save,650);}
// Serialize autosaves: an older theme snapshot can never arrive after a newer one.
async function save(){clearTimeout(timer);const version=++saveVersion,body=JSON.stringify({inviterName:state.inviterName,recipientName:state.recipientName,title:state.title,theme:state.theme,content:state.content,features:state.features});const run=async()=>{try{const r=await fetch(`/api/invitations/${id}`,{method:'PUT',headers:{'content-type':'application/json','x-csrf-token':csrf},body});if(version===saveVersion){document.querySelector('#save-status').textContent=r.ok?'Saved ✓':'Save failed';if(r.ok)preview.src=preview.src.split('?')[0]+`?embed=1&t=${Date.now()}`;else toast((await r.json()).error||'Could not save changes.');}return r.ok;}catch{if(version===saveVersion){document.querySelector('#save-status').textContent='Save failed';toast('Could not save changes.');}return false;}};saveQueue=saveQueue.then(run,run);return saveQueue;}
async function publish(){if(!await save())return;const r=await fetch(`/api/invitations/${id}/status`,{method:'POST',headers:{'content-type':'application/json','x-csrf-token':csrf},body:JSON.stringify({status:'published'})});let out={};try{out=await r.json();}catch{}if(r.ok){state.status='published';render();toast('Invitation published with your latest theme 🎉');}else toast(out.error||'Could not publish invitation.');}
function copyLink(){navigator.clipboard.writeText(`${location.origin}/i/${state.token}`);toast('Private link copied ✓');}
document.querySelector('#publish').onclick=publish;document.querySelector('#save-draft').onclick=save;
document.querySelector('.preview-toolbar')?.addEventListener('click',e=>{const button=e.target.closest('[data-viewport]');if(!button)return;document.querySelectorAll('.preview-toolbar button').forEach(item=>item.classList.toggle('active',item===button));document.querySelector('#preview-pane').dataset.viewport=button.dataset.viewport;});
document.querySelector('.mobile-tabs').onclick=e=>{const tab=e.target.dataset.tab;if(!tab)return;document.querySelectorAll('.mobile-tabs button').forEach(b=>b.classList.toggle('active',b===e.target));root.classList.toggle('show-preview',tab==='preview');};
function toast(message){let el=document.querySelector('.toast');if(!el){el=document.createElement('div');el.className='toast';document.body.append(el);}el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3000);}
