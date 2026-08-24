
async function addPresetSoundscape(presetKey, presetName) {
  document.querySelector('#save-status').textContent = 'Adding song…';
  try {
    let r = await fetch(`/api/invitations/${id}/tracks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-csrf-token': csrf },
      body: JSON.stringify({
        title: presetName,
        name: presetName,
        url: presetKey,
        sourceType: 'preset',
        startTime: 0,
        endTime: null
      })
    });
    let out = await r.json().catch(() => ({}));
    if (!r.ok) return toast(out.error || 'Could not add preset song.');
    state.features.music = true;
    state.features.playlist = out.playlist || out.tracks || [];
    state.features.tracks = state.features.playlist;
    const defaultTrack = state.features.playlist.find(s => s.default) || state.features.playlist[0];
    if (defaultTrack) {
      state.features.musicUrl = defaultTrack.url;
      state.features.musicName = defaultTrack.name || defaultTrack.title;
      state.features.musicStartOffset = defaultTrack.startTime;
    }
    document.querySelector('#save-status').textContent = '✓ Saved just now';
    render();
    preview.src = preview.src.split('?')[0] + `?embed=1&t=${Date.now()}`;
    toast(`Added "${presetName}" to playlist ♫`);
  } catch {
    toast('Failed to add preset song.');
  }
}

const root = document.querySelector('#builder');
const id = root.dataset.id;
const controls = document.querySelector('#controls');
const preview = document.querySelector('#preview-iframe') || document.querySelector('iframe');
const csrf = document.querySelector('meta[name="csrf-token"]').content;

let state;
let timer;
let saveVersion = 0;
let saveQueue = Promise.resolve();

// In-Memory Undo / Redo State Stacks
let historyStack = [];
let futureStack = [];
let previewZoom = 1.0;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function pushHistorySnapshot() {
  if (!state) return;
  if (historyStack.length >= 25) historyStack.shift();
  historyStack.push(JSON.stringify(state));
  futureStack = [];
  updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
  const undoBtn = document.querySelector('#btn-undo');
  const redoBtn = document.querySelector('#btn-redo');
  if (undoBtn) undoBtn.disabled = historyStack.length === 0;
  if (redoBtn) redoBtn.disabled = futureStack.length === 0;
}

function performUndo() {
  if (historyStack.length === 0) return;
  futureStack.push(JSON.stringify(state));
  const prevSnapshot = historyStack.pop();
  state = JSON.parse(prevSnapshot);
  render();
  updateThemePreview();
  scheduleSave();
  updateUndoRedoButtons();
  toast('Undone ↶');
}

function performRedo() {
  if (futureStack.length === 0) return;
  historyStack.push(JSON.stringify(state));
  const nextSnapshot = futureStack.pop();
  state = JSON.parse(nextSnapshot);
  render();
  updateThemePreview();
  scheduleSave();
  updateUndoRedoButtons();
  toast('Redone ↷');
}

// Form component helpers
const formField = (label, path, value, helper = '', type = 'text', placeholder = '', extraAttrs = '') => `
  <div class="form-group">
    <label class="form-label">
      <span class="label-title">${label}</span>
      ${helper ? `<small class="label-helper">${helper}</small>` : ''}
    </label>
    <div class="input-wrap">
      <input data-path="${path}" type="${type}" value="${esc(value)}" class="form-input" placeholder="${esc(placeholder)}" ${type === 'text' ? 'maxlength="1000"' : ''} ${extraAttrs}>
    </div>
  </div>
`;

const formTextarea = (label, path, value, helper = '', placeholder = '', rows = 3) => `
  <div class="form-group">
    <label class="form-label">
      <span class="label-title">${label}</span>
      ${helper ? `<small class="label-helper">${helper}</small>` : ''}
    </label>
    <div class="input-wrap">
      <textarea data-path="${path}" class="form-textarea" placeholder="${esc(placeholder)}" rows="${rows}" maxlength="1000">${esc(value)}</textarea>
    </div>
  </div>
`;

const customToggle = (label, path, value, subtitle = '') => `
  <label class="modern-toggle-card">
    <div class="toggle-text">
      <strong>${label}</strong>
      ${subtitle ? `<small>${subtitle}</small>` : ''}
    </div>
    <div class="toggle-switch">
      <input data-path="${path}" type="checkbox" ${value ? 'checked' : ''}>
      <span class="toggle-slider" aria-hidden="true"></span>
    </div>
  </label>
`;

const featureInfo = {
  Mascots: ['🐻', 'Display animated characters throughout the invitation.'],
  'Tiny Mode': ['⌗', 'Enable a compact and minimal layout for a cute vibe.'],
  'Cute-item collection': ['♡', 'Show hidden interactive easter-egg items for your recipient to discover.'],
  Confetti: ['⌁', 'Celebrate the YES moment with a burst of romantic confetti.'],
  'Funny Back buttons': ['‹', 'Replace standard back buttons with playful teasing alternatives.']
};

const featureToggleCard = (label, path, value) => {
  const [icon, description] = featureInfo[label] || ['✨', 'Feature toggle'];
  return `
    <label class="feature-toggle-card">
      <span class="feature-icon" aria-hidden="true">${icon}</span>
      <div class="feature-text">
        <strong>${label}</strong>
        <small>${description}</small>
      </div>
      <div class="toggle-switch">
        <input data-path="${path}" type="checkbox" ${value ? 'checked' : ''}>
        <span class="toggle-slider" aria-hidden="true"></span>
      </div>
    </label>
  `;
};

const BUILDER_STEPS = [
  { id: 1, key: 'basics', title: 'Basics', subtitle: 'Names & title', icon: '1' },
  { id: 2, key: 'design', title: 'Design', subtitle: 'Colors & theme', icon: '2' },
  { id: 3, key: 'content', title: 'Content', subtitle: 'Questions & copy', icon: '3' },
  { id: 4, key: 'photos', title: 'Story', subtitle: 'Memories timeline', icon: '4' },
  { id: 5, key: 'features', title: 'Features', subtitle: 'Dates & mascots', icon: '5' },
  { id: 6, key: 'music', title: 'Music', subtitle: 'Soundtrack playlist', icon: '6' },
  { id: 7, key: 'publish', title: 'Review', subtitle: 'Finalize invite', icon: '7' }
];

const CONTENT_SCREENS = [
  { key: 'intro', label: '1. Intro', icon: '💌', desc: 'Opening invitation card' },
  { key: 'main', label: '2. Main Ask', icon: '❤️', desc: 'Primary date question & copy' },
  { key: 'thinking', label: '3. Thinking', icon: '🥺', desc: 'Playful hesitation banter' },
  { key: 'convince', label: '4. Convince', icon: '🍕', desc: 'Reasons why you should say yes' },
  { key: 'benefits', label: '5. Benefits', icon: '🍰', desc: 'Perks & stats of going on this date' },
  { key: 'mood', label: '6. Date Vibe', icon: '✨', desc: 'Date vibe & ideas prompt' },
  { key: 'finalAttempt', label: '7. Final Evasion', icon: '😂', desc: 'Playful evasive NO button banter' },
  { key: 'secret', label: '8. Secret Note', icon: '🔒', desc: 'Hidden easter-egg letter' }
];

let currentStep = 1;
let activeContentScreen = 'intro';

fetch(`/api/invitations/${id}`)
  .then(async r => {
    if (r.status === 401) { window.location.href = '/login'; return null; }
    const data = await r.json().catch(() => null);
    if (!r.ok || !data || data.error || !data.content) {
      const msg = data?.error || 'Failed to load invitation data. Please refresh.';
      toast(msg);
      console.error('API Error:', msg);
      return null;
    }
    return data;
  })
  .then(data => {
    if (!data) return;
    state = data;
    render();
    updateUndoRedoButtons();
    if (new URLSearchParams(location.search).has('created')) toast('Invitation created 🎉 — customize or publish when ready.');
  })
  .catch(err => {
    console.error('Failed to load invitation data:', err);
    toast('Error loading invitation data. Please refresh.');
  });

const themeColorSpecs = [
  { key: 'background', label: 'Background', desc: 'Page background & ambient surface', defaultVal: '#13111C' },
  { key: 'primary', label: 'Primary Accent', desc: 'Main buttons & important highlights', defaultVal: '#FF4D7D' },
  { key: 'secondary', label: 'Secondary Blush', desc: 'Soft blush & ambient accents', defaultVal: '#2A1E2E' },
  { key: 'accent', label: 'Accent Glow', desc: 'Badges, glows & gradient accents', defaultVal: '#7B61FF' },
  { key: 'headingColor', label: 'Heading Color', desc: 'Main title & question headings', defaultVal: '#FFFFFF' },
  { key: 'text', label: 'Body Text', desc: 'Normal body copy & descriptions', defaultVal: '#E7E2E8' },
  { key: 'muted', label: 'Muted Text', desc: 'Subtitles & secondary notes', defaultVal: '#7E7275' },
  { key: 'card', label: 'Card Surface', desc: 'Glass panels & cards (supports alpha)', defaultVal: '#201C30EE' },
  { key: 'buttonText', label: 'Button Text', desc: 'Text inside primary buttons', defaultVal: '#FFFFFF' },
  { key: 'border', label: 'Border & Lines', desc: 'Separators, chips & card borders', defaultVal: '#38324F' }
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
      <div class="color-palette-row">
        <div class="color-row-meta">
          <strong class="color-row-title">${spec.label}</strong>
          <small class="color-row-desc">${spec.desc}</small>
        </div>
        <div class="color-row-controls">
          <label class="color-swatch-box" style="background-color: ${solidHex};" title="Click to pick ${spec.label}">
            <input type="color" value="${solidHex}" data-color-picker="${spec.key}" aria-label="${spec.label} color picker">
          </label>
          <input type="text" class="color-hex-field" data-color-hex="${spec.key}" data-path="theme.${spec.key}" value="${esc(rawVal)}" maxlength="9" placeholder="#RRGGBB" aria-label="${spec.label} hex code">
        </div>
      </div>
    `;
  }).join('');
}

function renderStepper() {
  const stepperEl = document.querySelector('#builder-stepper');
  if (stepperEl) {
    stepperEl.innerHTML = `
      <div class="stepper-track" role="tablist" aria-label="Editor Step Navigation">
        ${BUILDER_STEPS.map((s, i) => {
          const isActive = currentStep === s.id;
          const isCompleted = currentStep > s.id;
          return `
            <button type="button" 
                    class="step-btn ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}" 
                    data-step="${s.id}" 
                    role="tab" 
                    aria-selected="${isActive}" 
                    aria-controls="step-panel-${s.id}" 
                    id="step-tab-${s.id}" 
                    ${isActive ? 'aria-current="step"' : ''}
                    tabindex="${isActive ? '0' : '-1'}">
              <span class="step-badge">${isCompleted ? '✓' : s.id}</span>
              <span class="step-meta">
                <strong class="step-name">${s.title}</strong>
                <small class="step-sub">${s.subtitle}</small>
              </span>
            </button>
            ${i < BUILDER_STEPS.length - 1 ? '<span class="step-divider" aria-hidden="true"></span>' : ''}
          `;
        }).join('')}
      </div>
    `;
  }

  const counterText = document.querySelector('#step-counter-text');
  const counterFill = document.querySelector('#step-progress-fill');
  if (counterText) counterText.textContent = `${currentStep} / 7`;
  if (counterFill) counterFill.style.width = `${(currentStep / 7) * 100}%`;
}

function goToStep(stepId, smooth = true) {
  const next = Math.max(1, Math.min(BUILDER_STEPS.length, Number(stepId)));
  currentStep = next;
  renderStepper();

  document.querySelectorAll('.step-panel').forEach(panel => {
    const isTarget = Number(panel.dataset.step) === currentStep;
    panel.classList.toggle('active', isTarget);
    panel.hidden = !isTarget;
  });

  const activeBtn = document.querySelector(`.step-btn[data-step="${currentStep}"]`);
  if (activeBtn) {
    activeBtn.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'nearest', inline: 'center' });
  }

  const controlsEl = document.querySelector('#controls');
  if (controlsEl) {
    controlsEl.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
  }

  if (currentStep === 6 && state?.features?.musicPlayerPosition === 'custom') {
    setTimeout(setupPositionCanvas, 50);
  }
}

function renderContentScreenFields(s) {
  if (activeContentScreen === 'secret') {
    return `
      <div class="content-screen-card active">
        <div class="screen-card-header">
          <span class="screen-kicker">🔒 Secret Note</span>
          <h3>Hidden Final Message</h3>
          <p>This note is revealed when the recipient explores the final screen.</p>
        </div>
        <div class="screen-fields-grid">
          ${formField('Secret Heading', 'content.screens.secret.heading', s.secret?.heading || '', 'Heading shown when secret note opens', 'text', 'A little note for you…')}
          ${formTextarea('Secret Message Body', 'content.screens.secret.body', s.secret?.body || '', 'The heartfelt note or inside joke to share', 'I just wanted to say that having you in my life makes every day brighter...', 4)}
          ${formField('Primary Button Label', 'content.screens.secret.primary', s.secret?.primary || 'Aww, thanks! ❤️', 'Button text to dismiss secret note')}
        </div>
      </div>
    `;
  }

  const screenObj = s[activeContentScreen];
  if (!screenObj) return '<p class="hint">Select a screen above to edit its copy.</p>';

  const currentMeta = CONTENT_SCREENS.find(sc => sc.key === activeContentScreen) || { icon: '✨', label: activeContentScreen, desc: 'Customize copy' };

  return `
    <div class="content-screen-card active">
      <div class="screen-card-header">
        <span class="screen-kicker">${currentMeta.icon} Screen: ${currentMeta.label}</span>
        <h3>${currentMeta.desc}</h3>
      </div>
      <div class="screen-fields-grid">
        ${Object.entries(screenObj).map(([k, val]) => {
          const isLong = k === 'body' || String(val).length > 60 || val.includes('\n');
          const title = k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          return isLong
            ? formTextarea(title, `content.screens.${activeContentScreen}.${k}`, val, `Screen ${activeContentScreen} · ${k}`)
            : formField(title, `content.screens.${activeContentScreen}.${k}`, val, `Screen ${activeContentScreen} · ${k}`);
        }).join('')}
      </div>
    </div>
  `;
}

function render() {
  if (!state) return;
  const c = state.content;
  const s = c.screens;
  const t = state.theme;
  const f = state.features;
  

  renderStepper();

  const titleHeader = document.querySelector('#header-recipient-title');
  if (titleHeader) titleHeader.textContent = state.recipientName || 'Your Date';

  controls.innerHTML = `
    <!-- STEP 1: BASICS -->
    <section class="step-panel ${currentStep === 1 ? 'active' : ''}" id="step-panel-1" data-step="1" role="tabpanel" aria-labelledby="step-tab-1" ${currentStep === 1 ? '' : 'hidden'}>
      <div class="step-panel-header">
        <span class="step-kicker">Step 1 of 7 · Basics</span>
        <h2>Invitation Basics</h2>
        <p>Set your name, your recipient's name, and an inviting title.</p>
      </div>
      <div class="step-panel-body">
        <div class="sub-panel">
          <h3>Essential Details</h3>
          ${formField('Your Name', 'inviterName', state.inviterName, 'Displayed in the invitation as the sender', 'text', 'e.g. Alex')}
          ${formField("Recipient's Name", 'recipientName', state.recipientName, 'Personalizes greetings and question screens', 'text', 'e.g. Maya')}
          ${formField('Invitation Title', 'title', state.title, 'Appears on browser tabs and sharing cards', 'text', 'e.g. Coffee Date?')}
        </div>
      </div>
      <div class="step-panel-footer">
        <div></div>
        <button type="button" class="button primary step-nav-btn" data-nav-step="2">Next: Design →</button>
      </div>
    </section>

    <!-- STEP 2: DESIGN (THEME & COLORS) -->
    <section class="step-panel ${currentStep === 2 ? 'active' : ''}" id="step-panel-2" data-step="2" role="tabpanel" aria-labelledby="step-tab-2" ${currentStep === 2 ? '' : 'hidden'}>
      <div class="step-panel-header with-action">
        <div>
          <span class="step-kicker">Step 2 of 7 · Design</span>
          <h2>Theme Colors & Styling</h2>
          <p>Pick a theme or fine-tune your colors to match your invitation.</p>
        </div>
        <button type="button" class="button ghost small btn-reset-preset" data-action="reset-theme">↺ Reset to preset</button>
      </div>
      <div class="step-panel-body">
        <div class="editor-section-card">
          <div class="editor-section-card-header">
            <h3>Preset Color Themes</h3>
            <button type="button" class="link-action-btn" data-action="view-all-presets">View all</button>
          </div>
          <div class="theme-presets-card-grid">
            ${Object.entries(state.presets?.themes || {
              strawberry: { name: 'Warm Minimal ✨', background: '#FCFAF6', primary: '#E6496F', secondary: '#F4E9DD', accent: '#FF7B94' },
              blue: { name: 'Blue Trouble 💙', background: '#F4FAFF', primary: '#3B82F6', secondary: '#E8DEFF', accent: '#60A5FA' },
              yellow: { name: 'Yellow Chaos 💛', background: '#FFFDF2', primary: '#D97706', secondary: '#FEF3C7', accent: '#F59E0B' },
              midnight: { name: 'Midnight Date 🌙', background: '#13111C', primary: '#F43F5E', secondary: '#312E4A', accent: '#FB7185' },
              rose: { name: 'Rose Gold 🌹', background: '#FFF8F5', primary: '#C95A72', secondary: '#F9E4DE', accent: '#DE758C' }
            }).map(([k, v]) => {
              const isSelected = t.preset === k;
              return `
                <button type="button" class="theme-preset-tile ${isSelected ? 'active' : ''}" data-theme-preset="${k}">
                  <div class="theme-tile-preview" style="background: linear-gradient(135deg, ${v.primary} 0%, ${v.accent || v.primary} 50%, ${v.secondary} 100%);">
                    ${isSelected ? '<span class="tile-check-icon">✓</span>' : ''}
                  </div>
                  <div class="theme-tile-footer">
                    <strong class="theme-tile-name">${v.name}</strong>
                    ${isSelected ? '<span class="theme-tile-active-label">Active</span>' : ''}
                  </div>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <div class="editor-section-card">
          <div class="editor-section-card-header">
            <h3>Fine-Tune Palette Colors</h3>
            <button type="button" class="link-action-btn" data-action="reset-theme">Reset colors</button>
          </div>
          <div class="palette-rows-container">
            ${renderColorCards(t)}
          </div>
        </div>
      </div>
      <div class="step-panel-footer">
        <button type="button" class="button ghost step-nav-btn" data-nav-step="1">← Previous</button>
        <button type="button" class="button primary step-nav-btn" data-nav-step="3">Next: Content →</button>
      </div>
    </section>

    <!-- STEP 3: CONTENT -->
    <section class="step-panel ${currentStep === 3 ? 'active' : ''}" id="step-panel-3" data-step="3" role="tabpanel" aria-labelledby="step-tab-3" ${currentStep === 3 ? '' : 'hidden'}>
      <div class="step-panel-header">
        <span class="step-kicker">Step 3 of 7 · Content</span>
        <h2>Questions & Screen Copy</h2>
        <p>Select a screen below to edit its words, questions, and buttons.</p>
      </div>
      <div class="step-panel-body">
        <div class="content-screen-tabs-wrap">
          <div class="content-screen-tabs" role="tablist" aria-label="Invitation Screens">
            ${CONTENT_SCREENS.map(sc => `
              <button type="button" 
                      class="content-screen-tab ${activeContentScreen === sc.key ? 'active' : ''}" 
                      data-content-tab="${sc.key}"
                      role="tab"
                      aria-selected="${activeContentScreen === sc.key}">
                <span class="tab-icon">${sc.icon}</span>
                <span class="tab-label">${sc.label}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <div id="content-screen-fields-container">
          ${renderContentScreenFields(s)}
        </div>
      </div>
      <div class="step-panel-footer">
        <button type="button" class="button ghost step-nav-btn" data-nav-step="2">← Previous</button>
        <button type="button" class="button primary step-nav-btn" data-nav-step="4">Next: Story →</button>
      </div>
    </section>

    <!-- STEP 4: OUR STORY & MEMORIES -->
    <section class="step-panel ${currentStep === 4 ? 'active' : ''}" id="step-panel-4" data-step="4" role="tabpanel" aria-labelledby="step-tab-4" ${currentStep === 4 ? '' : 'hidden'}>
      <div class="step-panel-header">
        <span class="step-kicker">Step 4 of 7 · Memories Timeline</span>
        <h2>Our Story & Memories</h2>
        <p>Add memorable moments, photos, and milestone dates leading up to your date ask.</p>
      </div>
      <div class="step-panel-body">
        <div class="editor-section-card">
          <div class="editor-section-card-header">
            <h3>Our Story & Memories Scrapbook</h3>
          </div>
          ${customToggle('Enable Our Story timeline section', 'features.memories', f.memories, 'Showcase milestone dates, photos, and memories leading up to your date ask')}
          <div class="memories-builder-list">
            ${(f.memoriesList || []).map((m, idx) => `
              <div class="memory-builder-item-card">
                <div class="memory-card-topbar">
                  <span class="memory-pos-badge">Position #${idx + 1}</span>
                  <div class="memory-card-actions">
                    <button type="button" class="button ghost small move-memory" data-memory-move="up" data-memory-idx="${idx}" ${idx === 0 ? 'disabled style="opacity:0.4;"' : ''}>▲ Up</button>
                    <button type="button" class="button ghost small move-memory" data-memory-move="down" data-memory-idx="${idx}" ${idx === (f.memoriesList.length - 1) ? 'disabled style="opacity:0.4;"' : ''}>▼ Down</button>
                    <button class="button danger small remove-memory" data-memory-idx="${idx}" type="button">Delete</button>
                  </div>
                </div>
                <div class="memory-card-fields">
                  ${formField('Title', '', m.title || '', '', 'text', 'e.g. First Coffee Together', `data-memory-idx="${idx}" data-memory-field="title"`)}
                  ${formField('Date / Milestone (optional)', '', m.date || '', '', 'text', 'e.g. 12 March 2024', `data-memory-idx="${idx}" data-memory-field="date"`)}
                  <div class="form-group">
                    <label class="form-label"><span class="label-title">Caption / Note</span></label>
                    <textarea data-memory-idx="${idx}" data-memory-field="caption" class="form-textarea" placeholder="The day everything started..." rows="2" maxlength="400">${esc(m.caption || '')}</textarea>
                  </div>
                  <label class="memory-mini-upload">
                    <span class="upload-icon">📷</span>
                    <div class="mini-upload-text">
                      <b>${m.photoUrl ? 'Replace Memory Photo' : 'Upload Memory Photo'}</b>
                      <small>JPG, PNG, WebP or GIF · max 5 MB</small>
                    </div>
                    <input class="memory-photo-file" data-memory-idx="${idx}" type="file" accept=".jpg,.jpeg,.png,.webp,.gif,image/*" hidden>
                  </label>
                  ${m.photoUrl ? `
                    <div class="cover-current-card mini">
                      <img src="${esc(m.photoUrl)}" alt="Memory" class="cover-thumbnail">
                      <div class="cover-meta">
                        <b>Photo Attached</b>
                        <small>Visible in Our Story timeline</small>
                      </div>
                      <button class="icon-button remove-memory-photo danger-icon" data-memory-idx="${idx}" type="button" aria-label="Remove photo">×</button>
                    </div>
                  ` : ''}
                </div>
              </div>
            `).join('')}
            <button class="button ghost add-memory" type="button" style="width:100%;min-height:46px;margin-top:8px;" ${(f.memoriesList || []).length >= 12 ? 'disabled' : ''}>
              + Add Memory Card ${(f.memoriesList || []).length >= 12 ? '(Max 12 reached)' : ''}
            </button>
          </div>
        </div>
      </div>
      <div class="step-panel-footer">
        <button type="button" class="button ghost step-nav-btn" data-nav-step="3">← Previous</button>
        <button type="button" class="button primary step-nav-btn" data-nav-step="5">Next: Features →</button>
      </div>
    </section>

    <!-- STEP 5: DATE OPTIONS & FEATURES -->
    <section class="step-panel ${currentStep === 5 ? 'active' : ''}" id="step-panel-5" data-step="5" role="tabpanel" aria-labelledby="step-tab-5" ${currentStep === 5 ? '' : 'hidden'}>
      <div class="step-panel-header">
        <span class="step-kicker">Step 5 of 7 · Features & Dates</span>
        <h2>Date Ideas & Playful Touches</h2>
        <p>Set date choices, mascots, confetti celebrations, and playful surprises.</p>
      </div>
      <div class="step-panel-body">
        <div class="editor-section-card">
          <div class="editor-section-card-header">
            <h3>Date Ideas / Moods</h3>
          </div>
          <p class="hint">Choose one featured date idea. Your recipient can also select their preferred date and time.</p>
          <div class="mood-cards-list">
            ${c.moods.map((m, i) => `
              <div class="mood-builder-item-card ${m.favorite ? 'favorite-active' : ''}">
                <div class="mood-item-header">
                  <span class="mood-badge">${m.favorite ? '★ Featured & Selected' : `Option ${i + 1}`}</span>
                  <div style="display:flex;gap:6px;">
                    <button type="button" class="favorite-option button small ${m.favorite ? 'primary' : 'ghost'}" data-favorite-index="${i}">
                      ${m.favorite ? '★ Selected' : '☆ Make Favorite'}
                    </button>
                    ${c.moods.length > 1 ? `<button class="icon-button danger-icon remove" data-list="moods" data-index="${i}" type="button" aria-label="Remove option">×</button>` : ''}
                  </div>
                </div>
                ${formField('Title', `content.moods.${i}.title`, m.title, '', 'text', 'e.g. Cozy Coffee & Conversations ☕')}
                ${formField('Description', `content.moods.${i}.description`, m.description, '', 'text', 'e.g. Warm drinks, quiet cafe, unlimited banter.')}
              </div>
            `).join('')}
          </div>
          <button class="button ghost add" data-list="moods" style="width:100%;min-height:44px;margin-top:8px;">+ Add Date Option</button>
        </div>

        <div class="editor-section-card" style="margin-top:20px;">
          <div class="editor-section-card-header">
            <h3>Playful Touches & Mascots</h3>
          </div>
          <div class="feature-toggles-grid">
            ${[['Mascots', 'mascots'], ['Tiny Mode', 'tinyMode'], ['Cute-item collection', 'collection'], ['Confetti', 'confetti'], ['Funny Back buttons', 'funnyBack']].map(([l, k]) => featureToggleCard(l, `features.${k}`, f[k])).join('')}
          </div>
          
          <div class="form-group" style="margin-top:16px;">
            <label class="form-label">
              <span class="label-title">Mascot Character Pack</span>
              <small class="label-helper">Choose the animated characters shown throughout the invitation</small>
            </label>
            <select data-path="features.mascotPack" class="form-select">
              ${['original', 'yellow', 'blue', 'pink', 'bears', 'cats', 'bunnies', 'none'].map(x => `<option ${f.mascotPack === x ? 'selected' : ''} value="${x}">${x[0].toUpperCase() + x.slice(1)}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
      <div class="step-panel-footer">
        <button type="button" class="button ghost step-nav-btn" data-nav-step="4">← Previous</button>
        <button type="button" class="button primary step-nav-btn" data-nav-step="6">Next: Music →</button>
      </div>
    </section>

    <!-- STEP 6: MUSIC & SOUND -->
    <section class="step-panel ${currentStep === 6 ? 'active' : ''}" id="step-panel-6" data-step="6" role="tabpanel" aria-labelledby="step-tab-6" ${currentStep === 6 ? '' : 'hidden'}>
      <div class="step-panel-header">
        <span class="step-kicker">Step 6 of 7 · Music & Sound</span>
        <h2>Background Soundtrack & Voice Note</h2>
        <p>Add multiple romantic songs, custom uploads, soundscape presets, and your personal voice note.</p>
      </div>
      <div class="step-panel-body">
        <div class="editor-section-card">
          <div class="editor-section-card-header">
            <h3>Background Soundtrack</h3>
          </div>
          ${customToggle('Enable background music', 'features.music', f.music, 'Starts gracefully when the invitation is opened (never forceful autoplay)')}

          <!-- Volume & Settings -->
          <div class="form-group" style="margin-top:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <span class="label-title">Default Playback Volume</span>
              <span id="music-volume-label" style="font-size:0.82rem;font-weight:700;color:var(--color-primary);">${f.musicVolume !== undefined ? f.musicVolume : 35}%</span>
            </div>
            <input data-path="features.musicVolume" type="range" min="5" max="100" value="${f.musicVolume !== undefined ? f.musicVolume : 35}" class="form-range" id="music-volume-slider">
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
            <div class="form-group">
              <label class="form-label"><span class="label-title">Playback Mode</span></label>
              <select data-path="features.musicPlaybackMode" class="form-select">
                <option value="playlist" ${(f.musicPlaybackMode || 'playlist') === 'playlist' ? 'selected' : ''}>🔁 Loop Entire Playlist</option>
                <option value="loop-track" ${f.musicPlaybackMode === 'loop-track' ? 'selected' : ''}>🔂 Loop Single Song</option>
                <option value="once" ${f.musicPlaybackMode === 'once' ? 'selected' : ''}>⏹ Play Once & Stop</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label"><span class="label-title">Player Style</span></label>
              <select data-path="features.musicPlayerStyle" class="form-select">
                <option value="romantic" ${(f.musicPlayerStyle || 'romantic') === 'romantic' ? 'selected' : ''}>💖 Floating Romantic Dock</option>
                <option value="pill" ${f.musicPlayerStyle === 'pill' ? 'selected' : ''}>💊 Modern Sleek Pill</option>
                <option value="minimal" ${f.musicPlayerStyle === 'minimal' ? 'selected' : ''}>🎵 Minimal Icon</option>
                <option value="ambient" ${f.musicPlayerStyle === 'ambient' ? 'selected' : ''}>✨ Ambient Icon</option>
              </select>
            </div>
          </div>

          <div class="form-group" style="margin-top:10px;">
            <label class="form-label"><span class="label-title">Player Position</span></label>
            <select data-path="features.musicPlayerPosition" class="form-select">
              <option value="bottom-right" ${(f.musicPlayerPosition || 'bottom-right') === 'bottom-right' ? 'selected' : ''}>↘ Bottom Right</option>
              <option value="bottom-left" ${f.musicPlayerPosition === 'bottom-left' ? 'selected' : ''}>↙ Bottom Left</option>
              <option value="top-right" ${f.musicPlayerPosition === 'top-right' ? 'selected' : ''}>↗ Top Right</option>
              <option value="bottom-center" ${f.musicPlayerPosition === 'bottom-center' ? 'selected' : ''}>⬇ Bottom Center</option>
            </select>
          </div>

          <!-- Multi-Song Playlist -->
          <div class="playlist-manager" style="margin-top:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <span class="label-title" style="font-size:0.92rem;font-weight:700;">Songs Playlist (${(f.playlist || []).length} song${(f.playlist || []).length === 1 ? '' : 's'})</span>
              <span style="font-size:0.75rem;color:var(--color-text-muted);">Supports multiple songs</span>
            </div>

            <!-- Upload Custom Song Card -->
            <div class="modern-upload-card mini" style="margin-bottom:14px;">
              <div class="upload-icon-circle mini">🎵</div>
              <h4>Upload Audio Song</h4>
              <p>MP3, M4A, OGG, WAV · max 15 MB</p>
              <label class="button primary small upload-btn-label">
                <span id="music-upload-copy">+ Add Audio File</span>
                <input id="music-file" type="file" accept=".mp3,.m4a,.ogg,.wav,audio/*" hidden>
              </label>
            </div>

            <!-- Preset Soundscapes Quick Add -->
            <div class="presets-quick-add" style="margin-bottom:16px;">
              <span class="label-helper" style="display:block;margin-bottom:6px;font-weight:600;">Or add romantic preset soundscapes:</span>
              <div class="presets-chip-grid" style="display:flex;gap:6px;flex-wrap:wrap;">
                ${[
                  { key: 'preset:piano', name: 'Piano Serenade 🎹' },
                  { key: 'preset:acoustic', name: 'Acoustic Sunset 🎸' },
                  { key: 'preset:jazz', name: 'Midnight Jazz 🎷' },
                  { key: 'preset:lofi', name: 'Lo-fi Romance 🎧' },
                  { key: 'preset:ukulele', name: 'Sweet Ukulele ☀️' },
                  { key: 'preset:ballad', name: 'Emotional Strings 🎻' },
                  { key: 'preset:dreamy', name: 'Celestial Starlight ✨' }
                ].map(p => `
                  <button type="button" class="button small ghost add-preset-track-btn" data-preset-key="${p.key}" data-preset-name="${p.name}">
                    + ${p.name}
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Track List items -->
            <div class="playlist-items-list" id="playlist-tracks-container">
              ${(f.playlist || []).map((t, idx) => `
                <div class="playlist-track-item ${t.default ? 'is-default' : ''}" data-track-id="${t.id}" data-track-idx="${idx}" style="padding:12px;background:var(--color-card-bg,#fff);border:1px solid var(--color-border,#e5e7eb);border-radius:12px;margin-bottom:8px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                    <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
                      <span class="track-number-badge" style="font-size:0.75rem;font-weight:700;color:var(--color-primary);background:var(--color-primary-soft, rgba(230,73,111,0.1));padding:2px 8px;border-radius:20px;">#${idx + 1}</span>
                      <div style="min-width:0;flex:1;">
                        <b style="display:block;font-size:0.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(t.name || t.title || 'Song')}</b>
                        <small style="color:var(--color-text-muted);font-size:0.75rem;">${t.url?.startsWith('preset:') ? 'Preset Soundscape' : 'Uploaded Audio'} ${t.default ? '· ★ Starting Song' : ''}</small>
                      </div>
                    </div>
                    <div style="display:flex;gap:4px;align-items:center;">
                      <button type="button" class="button small ${t.default ? 'primary' : 'ghost'} set-default-track-btn" data-track-idx="${idx}">
                        ${t.default ? '★ Active' : 'Set Default'}
                      </button>
                      <button type="button" class="button small ghost move-track-btn" data-track-move="up" data-track-idx="${idx}" ${idx === 0 ? 'disabled style="opacity:0.3;"' : ''}>▲</button>
                      <button type="button" class="button small ghost move-track-btn" data-track-move="down" data-track-idx="${idx}" ${idx === ((f.playlist || []).length - 1) ? 'disabled style="opacity:0.3;"' : ''}>▼</button>
                      <button type="button" class="icon-button danger-icon remove-track-btn" data-track-idx="${idx}" data-track-id="${t.id}" aria-label="Remove song">×</button>
                    </div>
                  </div>
                </div>
              `).join('')}
              ${(f.playlist || []).length === 0 ? `
                <div style="padding:16px;text-align:center;background:var(--color-secondary,#f9fafb);border-radius:12px;border:1px dashed var(--color-border,#e5e7eb);color:var(--color-text-muted);font-size:0.85rem;">
                  No songs in playlist yet. Upload an audio song above or pick a romantic preset soundscape! 🎶
                </div>
              ` : ''}
            </div>
          </div>
        </div>

        <div class="editor-section-card" style="margin-top:20px;">
          <div class="editor-section-card-header">
            <h3>Personal Voice Note 🎙️</h3>
          </div>
          <p class="hint">Record with your microphone or upload an audio file. The background music automatically ducks when your voice note plays!</p>
          <div style="display:flex;gap:10px;align-items:center;margin-bottom:12px;">
            <button id="record-voice-btn" type="button" class="button primary small">🎙️ Start Recording</button>
            <span id="recording-timer" style="font-weight:700;font-size:0.85rem;display:none;color:#ff625f;">● 0:00</span>
          </div>
          
          <div class="modern-upload-card mini">
            <div class="upload-icon-circle mini">🎤</div>
            <h4>Upload recorded voice note</h4>
            <p>MP3, M4A, OGG, WAV, or AAC · max 10 MB</p>
            <label class="button ghost small upload-btn-label">
              <span id="voice-upload-copy">Choose Voice File</span>
              <input id="voice-file" type="file" accept=".mp3,.m4a,.ogg,.wav,.webm,.aac,audio/*" hidden>
            </label>
          </div>

          ${f.voiceNoteUrl ? `
            <div class="cover-current-card mini" style="margin-top:12px;">
              <span style="font-size:1.4rem;">🎙️</span>
              <div class="cover-meta">
                <b>${esc(f.voiceNoteName || 'Personal Voice Note')}</b>
                <small>Ready to play in invitation</small>
              </div>
              <button id="remove-voice" class="icon-button danger-icon" type="button" aria-label="Remove voice note">×</button>
            </div>
          ` : ''}
        </div>
      </div>
      <div class="step-panel-footer">
        <button type="button" class="button ghost step-nav-btn" data-nav-step="5">← Previous</button>
        <button type="button" class="button primary step-nav-btn" data-nav-step="7">Next: Review →</button>
      </div>
    </section>

    <!-- STEP 7: REVIEW & PUBLISH -->
    <section class="step-panel ${currentStep === 7 ? 'active' : ''}" id="step-panel-7" data-step="7" role="tabpanel" aria-labelledby="step-tab-7" ${currentStep === 7 ? '' : 'hidden'}>
      <div class="step-panel-header">
        <span class="step-kicker">Step 7 of 7 · Final Review</span>
        <h2>Review & Share</h2>
        <p>Publish your date invitation and get your private share link.</p>
      </div>
      <div class="step-panel-body">
        <div class="publish-status-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-weight:700;font-size:0.95rem;">Publication Status</span>
            <span class="status ${state.status === 'published' ? 'published' : 'draft'}">${state.status}</span>
          </div>
          <p style="margin:0;font-size:0.85rem;color:var(--color-text-muted);">
            ${state.status === 'published' ? 'Your invitation is live and ready to be opened by your recipient.' : 'Your invitation is currently in draft mode. Click Publish below to make the link live.'}
          </p>
        </div>

        <button class="button primary" id="publish-inline" style="width:100%;min-height:50px;font-size:1.02rem;margin-bottom:16px;">
          ${state.status === 'published' ? 'Update & Re-Publish Invitation 🚀' : 'Publish Invitation 🚀'}
        </button>

        ${state.status === 'published' ? `
          <div class="share-box-panel">
            <h4 style="margin:0 0 8px;font-size:0.9rem;">Your Private Invitation Link:</h4>
            <div class="share-box">
              <input readonly value="${location.origin}/i/${state.token}" id="publish-link-input" class="form-input" style="flex:1;">
              <button type="button" class="button small copy-link">Copy Link</button>
            </div>
            <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;">
              <a class="button small ghost" target="_blank" href="/i/${state.token}">↗ Open Public Link</a>
              <a class="button small ghost" target="_blank" href="/dashboard/invitations/${id}/preview">◉ Editor Preview</a>
            </div>
          </div>
        ` : ''}
      </div>
      <div class="step-panel-footer">
        <button type="button" class="button ghost step-nav-btn" data-nav-step="6">← Previous</button>
        <button type="button" class="button primary" id="publish-bottom-btn">Publish Invitation 🚀</button>
      </div>
    </section>
  `;

  if (f.musicPlayerPosition === 'custom' && currentStep === 6) {
    setTimeout(setupPositionCanvas, 50);
  }
}

function setPath(path, value) {
  pushHistorySnapshot();
  const bits = path.split('.');
  let obj = state;
  for (let i = 0; i < bits.length - 1; i++) obj = obj[bits[i]];
  obj[bits.at(-1)] = value;
  scheduleSave();
}

controls.addEventListener('input', e => {
  if (e.target.tagName === 'SELECT') return;
  if (e.target.dataset.colorPicker) {
    pushHistorySnapshot();
    const key = e.target.dataset.colorPicker;
    state.theme[key] = e.target.value.toUpperCase();
    const hexInput = controls.querySelector(`[data-color-hex="${key}"]`);
    if (hexInput) hexInput.value = state.theme[key];
    const swatchBox = e.target.closest('.color-swatch-box');
    if (swatchBox) swatchBox.style.backgroundColor = state.theme[key];
    updateThemePreview();
    scheduleSave();
    return;
  }
  if (e.target.dataset.memoryField) {
    pushHistorySnapshot();
    const idx = Number(e.target.dataset.memoryIdx);
    const fld = e.target.dataset.memoryField;
    if (!state.features.memoriesList) state.features.memoriesList = [];
    if (state.features.memoriesList[idx]) {
      state.features.memoriesList[idx][fld] = e.target.value;
      scheduleSave();
    }
    return;
  }
  if (e.target.dataset.path === 'features.musicVolume') {
    const label = controls.querySelector('#music-vol-label');
    if (label) label.textContent = `${e.target.value}%`;
  }
  if (e.target.dataset.path === 'features.coverPhotoOverlay') {
    const label = controls.querySelector('#cover-overlay-label');
    if (label) label.textContent = `${e.target.value}%`;
  }
  if (e.target.classList.contains('track-time-input')) {
    const idx = Number(e.target.dataset.trackIdx);
    const fld = e.target.dataset.timeField;
    const sec = parseTime(e.target.value);
    if (state.features.playlist && state.features.playlist[idx]) {
      if (fld === 'startTime') {
        state.features.playlist[idx].startTime = sec;
      } else if (fld === 'endTime') {
        state.features.playlist[idx].endTime = e.target.value.trim() ? sec : null;
      }
      state.features.tracks = state.features.playlist;
      scheduleSave();
    }
    return;
  }
  if (!e.target.dataset.path) return;
  setPath(e.target.dataset.path, e.target.type === 'checkbox' ? e.target.checked : e.target.value);
  if (e.target.dataset.path === 'features.musicPlayerPosition') {
    render();
    if (e.target.value === 'custom') setupPositionCanvas();
  }
  if (e.target.dataset.path.startsWith('theme.')) {
    const key = e.target.dataset.path.replace('theme.', '');
    const picker = controls.querySelector(`[data-color-picker="${key}"]`);
    if (picker && e.target.value.startsWith('#') && e.target.value.length >= 7) {
      picker.value = e.target.value.slice(0, 7);
      const swatchBox = picker.closest('.color-swatch-box');
      if (swatchBox) swatchBox.style.backgroundColor = e.target.value.slice(0, 7);
    }
    updateThemePreview();
  }
});

controls.addEventListener('change', e => {
  if (e.target.dataset.path && e.target.tagName === 'SELECT') {
    setPath(e.target.dataset.path, e.target.value);
    render();
    preview.src = preview.src.split('?')[0] + `?embed=1&t=${Date.now()}`;
    return;
  }
  if (e.target.id === 'cover-file' && e.target.files[0]) uploadCoverPhoto(e.target.files[0]);
  if (e.target.classList.contains('memory-photo-file') && e.target.files[0]) {
    const idx = Number(e.target.dataset.memoryIdx);
    uploadMemoryPhoto(idx, e.target.files[0]);
  }
  if ((e.target.id === 'music-file' || e.target.classList.contains('music-replace')) && e.target.files[0]) uploadMusic(e.target.files[0]);
  if (e.target.id === 'voice-file' && e.target.files[0]) uploadVoiceNote(e.target.files[0]);
  if (e.target.classList.contains('track-time-input')) {
    const idx = Number(e.target.dataset.trackIdx);
    const fld = e.target.dataset.timeField;
    const sec = parseTime(e.target.value);
    if (state.features.playlist && state.features.playlist[idx]) {
      if (fld === 'startTime') {
        state.features.playlist[idx].startTime = sec;
        e.target.value = formatTime(sec);
      } else if (fld === 'endTime') {
        state.features.playlist[idx].endTime = e.target.value.trim() ? sec : null;
        e.target.value = state.features.playlist[idx].endTime ? formatTime(state.features.playlist[idx].endTime) : '';
      }
      state.features.tracks = state.features.playlist;
      scheduleSave();
      preview.src = preview.src.split('?')[0] + `?embed=1&t=${Date.now()}`;
    }
  }
});

controls.addEventListener('dragover', e => {
  if (e.target.closest('#cover-dropzone')) e.preventDefault();
});

controls.addEventListener('drop', e => {
  const zone = e.target.closest('#cover-dropzone');
  if (!zone) return;
  e.preventDefault();
  const file = e.dataTransfer?.files?.[0];
  if (file) uploadCoverPhoto(file);
});

document.addEventListener('click', async e => {
  // Stepper Tab Click
  const stepBtn = e.target.closest('[data-step]');
  if (stepBtn && stepBtn.closest('#builder-stepper')) {
    goToStep(stepBtn.dataset.step);
    return;
  }

  // Sidebar item click
  const sidebarItem = e.target.closest('[data-sidebar-step]');
  if (sidebarItem) {
    goToStep(sidebarItem.dataset.sidebarStep);
    return;
  }

  // Previous / Next button click
  const navBtn = e.target.closest('[data-nav-step]');
  if (navBtn) {
    goToStep(navBtn.dataset.navStep);
    return;
  }

  // Content Sub-screen Tab Click
  const contentTabBtn = e.target.closest('[data-content-tab]');
  if (contentTabBtn) {
    activeContentScreen = contentTabBtn.dataset.contentTab;
    document.querySelectorAll('.content-screen-tab').forEach(b => {
      const isCur = b === contentTabBtn;
      b.classList.toggle('active', isCur);
      b.setAttribute('aria-selected', isCur);
    });
    const fieldsContainer = document.querySelector('#content-screen-fields-container');
    if (fieldsContainer && state?.content?.screens) {
      fieldsContainer.innerHTML = renderContentScreenFields(state.content.screens);
    }
    return;
  }

  // Quick Edit Recipient Title
  if (e.target.id === 'btn-edit-title' || e.target.closest('#btn-edit-title')) {
    const currentName = state.recipientName || '';
    const newName = prompt("Edit your recipient's name:", currentName);
    if (newName !== null && newName.trim() && newName.trim() !== currentName) {
      pushHistorySnapshot();
      state.recipientName = newName.trim();
      scheduleSave();
      render();
      toast(`Updated recipient name to ${state.recipientName} ❤️`);
    }
    return;
  }

  // Quick Customize Inspiration button
  if (e.target.id === 'btn-quick-customize' || e.target.closest('#btn-quick-customize')) {
    const themeKeys = Object.keys(state.presets?.themes || {});
    if (themeKeys.length > 0) {
      pushHistorySnapshot();
      const currentIdx = themeKeys.indexOf(state.theme.preset || 'strawberry');
      const nextKey = themeKeys[(currentIdx + 1) % themeKeys.length];
      const nextTheme = state.presets.themes[nextKey];
      Object.assign(state.theme, nextTheme, { preset: nextKey });
      goToStep(3);
      render();
      updateThemePreview();
      scheduleSave();
      toast(`Quick customized theme to "${nextTheme.name}" ✨`);
    }
    return;
  }

  // Undo / Redo
  if (e.target.id === 'btn-undo' || e.target.closest('#btn-undo')) {
    performUndo();
    return;
  }
  if (e.target.id === 'btn-redo' || e.target.closest('#btn-redo')) {
    performRedo();
    return;
  }

  // Zoom In / Out
  if (e.target.id === 'btn-zoom-in') {
    previewZoom = Math.min(1.3, Number((previewZoom + 0.05).toFixed(2)));
    applyPreviewZoom();
    return;
  }
  if (e.target.id === 'btn-zoom-out') {
    previewZoom = Math.max(0.7, Number((previewZoom - 0.05).toFixed(2)));
    applyPreviewZoom();
    return;
  }

  // Controls-delegated clicks
  const add = e.target.closest('.add');
  const remove = e.target.closest('.remove');
  const themeButton = e.target.closest('[data-theme-preset]');
  const favoriteButton = e.target.closest('[data-favorite-index]');
  const addMemoryBtn = e.target.closest('.add-memory');

  if (addMemoryBtn) {
    pushHistorySnapshot();
    if (!state.features.memoriesList) state.features.memoriesList = [];
    if (state.features.memoriesList.length < 12) {
      state.features.memoriesList.push({
        id: `mem_${Date.now()}`,
        title: 'New Memory ✨',
        date: '',
        caption: '',
        photoUrl: null
      });
      state.features.memories = true;
      render();
      preview.src = preview.src.split('?')[0] + `?embed=1&t=${Date.now()}`;
      scheduleSave();
      toast('Added new memory card 📸');
    }
    return;
  }

  const removeMemoryBtn = e.target.closest('.remove-memory');
  if (removeMemoryBtn) {
    pushHistorySnapshot();
    const idx = Number(removeMemoryBtn.dataset.memoryIdx);
    if (state.features.memoriesList && state.features.memoriesList[idx]) {
      state.features.memoriesList.splice(idx, 1);
      render();
      preview.src = preview.src.split('?')[0] + `?embed=1&t=${Date.now()}`;
      scheduleSave();
      toast('Memory removed.');
    }
    return;
  }

  const removeMemoryPhotoBtn = e.target.closest('.remove-memory-photo');
  if (removeMemoryPhotoBtn) {
    pushHistorySnapshot();
    const idx = Number(removeMemoryPhotoBtn.dataset.memoryIdx);
    if (state.features.memoriesList && state.features.memoriesList[idx]) {
      state.features.memoriesList[idx].photoUrl = null;
      render();
      preview.src = preview.src.split('?')[0] + `?embed=1&t=${Date.now()}`;
      scheduleSave();
      toast('Memory photo removed.');
    }
    return;
  }

  const moveMemoryBtn = e.target.closest('.move-memory');
  if (moveMemoryBtn) {
    pushHistorySnapshot();
    const idx = Number(moveMemoryBtn.dataset.memoryIdx);
    const dir = moveMemoryBtn.dataset.memoryMove;
    const list = state.features.memoriesList;
    if (dir === 'up' && idx > 0) {
      [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]];
      render();
      preview.src = preview.src.split('?')[0] + `?embed=1&t=${Date.now()}`;
      scheduleSave();
      toast('Memory moved up ⬆️');
    } else if (dir === 'down' && idx < list.length - 1) {
      [list[idx + 1], list[idx]] = [list[idx], list[idx + 1]];
      render();
      preview.src = preview.src.split('?')[0] + `?embed=1&t=${Date.now()}`;
      scheduleSave();
      toast('Memory moved down ⬇️');
    }
    return;
  }

  const templateCard = e.target.closest('[data-template-key]');
  if (templateCard) {
    const key = templateCard.dataset.templateKey;
    const tpl = state.presets?.templates?.[key];
    if (tpl) {
      if (confirm(`Apply "${tpl.name}" template? This will update questions, copy, and date options to match this occasion.`)) {
        pushHistorySnapshot();
        state.templateId = key;
        if (tpl.content) state.content = { screens: structuredClone(tpl.content), moods: structuredClone(tpl.moods || state.content.moods || []) };
        if (tpl.themePreset && state.presets?.themes?.[tpl.themePreset]) {
          Object.assign(state.theme, state.presets.themes[tpl.themePreset], { preset: tpl.themePreset });
        }
        if (tpl.features) Object.assign(state.features, structuredClone(tpl.features));
        render();
        preview.src = preview.src.split('?')[0] + `?embed=1&t=${Date.now()}`;
        scheduleSave();
        toast(`Applied "${tpl.name}" template ✨`);
      }
    }
    return;
  }

  const musicFilterBtn = e.target.closest('[data-music-filter]');
  if (musicFilterBtn) {
    const filter = musicFilterBtn.dataset.musicFilter;
    controls.querySelectorAll('[data-music-filter]').forEach(b => b.classList.toggle('active', b === musicFilterBtn));
    controls.querySelectorAll('[data-music-preset]').forEach(btn => {
      const mood = btn.dataset.presetMood;
      btn.style.display = (filter === 'all' || mood === filter) ? 'flex' : 'none';
    });
    return;
  }

  const musicPresetBtn = e.target.closest('[data-music-preset]');
  if (musicPresetBtn) {
    pushHistorySnapshot();
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
  if (fixBtn) {
    pushHistorySnapshot();
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

  if (actionBtn) {
    const act = actionBtn.dataset.action;
    if (act === 'reset-theme') {
      pushHistorySnapshot();
      const presetKey = state.theme.preset || 'strawberry';
      const preset = state.presets.themes[presetKey] || state.presets.themes.strawberry;
      Object.assign(state.theme, preset, { preset: presetKey });
      render();
      updateThemePreview();
      scheduleSave();
      toast(`Reset theme to ${preset.name} ✓`);
      return;
    }
    if (act === 'restore-template') {
      if (!confirm('Restore the original template?\n\nYour current customizations will be replaced with the original template settings.')) return;
      pushHistorySnapshot();
      document.querySelector('#save-status').textContent = 'Restoring…';
      try {
        await saveQueue;
        const r = await fetch(`/api/invitations/${id}/restore-template`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-csrf-token': csrf },
          body: '{}'
        });
        const out = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(out.error || 'Could not restore template.');
        state = out;
        render();
        updateThemePreview();
        preview.src = preview.src.split('?')[0] + `?embed=1&t=${Date.now()}`;
        document.querySelector('#save-status').textContent = '✓ Template restored';
        toast('Original template restored ✓');
      } catch (err) {
        document.querySelector('#save-status').textContent = 'Restore failed';
        toast(err.message || 'Could not restore template.');
      }
      return;
    }
    if (act === 'autofix-contrast') {
      pushHistorySnapshot();
      const t = state.theme;
      const bg = t.background || '#FCFAF6';
      const card = t.card || '#FFFFFFEE';
      const primary = t.primary || '#FF4D7D';

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

  const sourceTab = e.target.closest('.set-music-source');
  if (sourceTab) {
    pushHistorySnapshot();
    const src = sourceTab.dataset.source;
    state.features.musicSource = src;
    if (src === 'spotify') {
      state.features.musicPlayerStyle = 'spotify';
    } else if (state.features.musicPlayerStyle === 'spotify') {
      state.features.musicPlayerStyle = 'romantic';
    }
    render();
    preview.src = preview.src.split('?')[0] + `?embed=1&t=${Date.now()}`;
    scheduleSave();
    return;
  }

  if (e.target.id === 'apply-spotify-btn') {
    const input = controls.querySelector('#spotify-url-input');
    if (input) applySpotify(input.value);
    return;
  }
  if (e.target.id === 'remove-spotify-btn') {
    removeSpotify();
    return;
  }

  const playlistMoveBtn = e.target.closest('.playlist-move-btn');
  if (playlistMoveBtn) {
    pushHistorySnapshot();
    const dir = playlistMoveBtn.dataset.playlistMove;
    const idx = Number(playlistMoveBtn.dataset.playlistIdx);
    const list = state.features.playlist || [];
    if (dir === 'up' && idx > 0) {
      const temp = list[idx];
      list[idx] = list[idx - 1];
      list[idx - 1] = temp;
    } else if (dir === 'down' && idx < list.length - 1) {
      const temp = list[idx];
      list[idx] = list[idx + 1];
      list[idx + 1] = temp;
    }
    state.features.playlist = list;
    render();
    preview.src = preview.src.split('?')[0] + `?embed=1&t=${Date.now()}`;
    scheduleSave();
    return;
  }

  const playlistDefaultBtn = e.target.closest('.playlist-default-btn');
  if (playlistDefaultBtn) {
    pushHistorySnapshot();
    const idx = Number(playlistDefaultBtn.dataset.playlistIdx);
    const list = state.features.playlist || [];
    list.forEach((s, i) => { s.default = (i === idx); });
    if (list[idx]) {
      state.features.musicUrl = list[idx].url;
      state.features.musicName = list[idx].name;
    }
    state.features.playlist = list;
    render();
    preview.src = preview.src.split('?')[0] + `?embed=1&t=${Date.now()}`;
    scheduleSave();
    toast(`Set "${list[idx]?.name}" as default track ★`);
    return;
  }

  const playlistDelBtn = e.target.closest('.playlist-delete-btn');
  if (playlistDelBtn) {
    pushHistorySnapshot();
    const idx = Number(playlistDelBtn.dataset.playlistIdx);
    const list = state.features.playlist || [];
    const removed = list.splice(idx, 1)[0];
    if (list.length > 0 && !list.some(s => s.default)) {
      list[0].default = true;
      state.features.musicUrl = list[0].url;
      state.features.musicName = list[0].name;
    } else if (list.length === 0) {
      state.features.musicUrl = null;
      state.features.musicName = null;
      state.features.music = false;
    }
    state.features.playlist = list;
    render();
    preview.src = preview.src.split('?')[0] + `?embed=1&t=${Date.now()}`;
    scheduleSave();
    toast(`Removed ${removed?.name || 'song'}`);
    return;
  }

  const previewTrackBtn = e.target.closest('.preview-track-btn');
  if (previewTrackBtn) {
    togglePreviewTrack(previewTrackBtn);
    return;
  }

  if (themeButton) {
    pushHistorySnapshot();
    Object.assign(state.theme, state.presets.themes[themeButton.dataset.themePreset], { preset: themeButton.dataset.themePreset });
    render();
    updateThemePreview();
    scheduleSave();
  }
  if (favoriteButton) {
    pushHistorySnapshot();
    state.content.moods.forEach((m, i) => m.favorite = i === Number(favoriteButton.dataset.favoriteIndex));
    render();
    scheduleSave();
  }
  if (add) {
    e.preventDefault();
    if (add.dataset.list === 'moods' && state.content.moods.length < 10) {
      pushHistorySnapshot();
      state.content.moods.push({ title: 'New date idea ✨', description: 'Add a little description', favorite: false });
      render();
      scheduleSave();
    }
  }
  if (remove) {
    e.preventDefault();
    pushHistorySnapshot();
    state.content[remove.dataset.list].splice(Number(remove.dataset.index), 1);
    if (remove.dataset.list === 'moods' && state.content.moods.length && !state.content.moods.some(m => m.favorite)) {
      state.content.moods[0].favorite = true;
    }
    render();
    scheduleSave();
  }
  if (e.target.id === 'remove-cover') removeCoverPhoto();
  if (e.target.id === 'remove-music') removeMusic();
  if (e.target.id === 'remove-voice') removeVoiceNote();
  if (e.target.id === 'record-voice-btn') toggleRecordVoice();
  if (e.target.id === 'publish' || e.target.id === 'publish-inline' || e.target.id === 'publish-bottom-btn') publish();
  if (e.target.closest('.copy-link')) copyLink();
});

// Keyboard shortcuts for Undo (Ctrl+Z) & Redo (Ctrl+Y / Ctrl+Shift+Z)
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    if (e.shiftKey) {
      e.preventDefault();
      performRedo();
    } else {
      e.preventDefault();
      performUndo();
    }
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    performRedo();
  }
});

// Keyboard navigation for stepper
document.querySelector('#builder-stepper')?.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault();
    goToStep(currentStep + 1);
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault();
    goToStep(currentStep - 1);
  } else if (e.key === 'Home') {
    e.preventDefault();
    goToStep(1);
  } else if (e.key === 'End') {
    e.preventDefault();
    goToStep(BUILDER_STEPS.length);
  }
});

function applyPreviewZoom() {
  const phone = document.querySelector('#phone-container');
  const label = document.querySelector('#preview-zoom-label');
  if (phone) {
    phone.style.transform = `scale(${previewZoom})`;
    phone.style.transformOrigin = 'top center';
  }
  if (label) label.textContent = `${Math.round(previewZoom * 100)}%`;
}

function updateThemePreview() {
  const shell = preview?.contentDocument?.querySelector('.invite-shell');
  if (!shell) return;
  const t = state.theme;
  shell.style.setProperty('--bg', t.background || '#FCFAF6');
  shell.style.setProperty('--primary', t.primary || '#FF4D7D');
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

function formatTime(sec) {
  if (!sec || isNaN(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function parseTime(str) {
  if (!str) return 0;
  const strClean = String(str).trim();
  const parts = strClean.split(':').map(Number);
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return Math.max(0, parts[0] * 60 + parts[1]);
  }
  return Math.max(0, Number(strClean) || 0);
}

let builderAudioPreview = null;
let builderPreviewTimer = null;
let builderPreviewIdx = null;

function stopBuilderAudioPreview() {
  if (builderAudioPreview) {
    builderAudioPreview.pause();
    builderAudioPreview = null;
  }
  if (builderPreviewTimer) {
    clearInterval(builderPreviewTimer);
    builderPreviewTimer = null;
  }
  builderPreviewIdx = null;
  document.querySelectorAll('.preview-track-btn').forEach(btn => {
    btn.textContent = '▶ Preview Selection';
    btn.classList.remove('primary');
  });
}

function togglePreviewTrack(btn) {
  const idx = Number(btn.dataset.previewIdx);
  const track = state.features.playlist?.[idx];
  if (!track || !track.url) return toast('No audio available for preview.');

  if (builderPreviewIdx === idx && builderAudioPreview && !builderAudioPreview.paused) {
    stopBuilderAudioPreview();
    return;
  }

  stopBuilderAudioPreview();

  const start = Number(track.startTime) || 0;
  const end = (track.endTime !== undefined && track.endTime !== null && Number(track.endTime) > 0) ? Number(track.endTime) : (track.duration || Infinity);

  if (track.url.startsWith('preset:')) {
    toast('Preset soundscape preview is active in the live mockup ♫');
    return;
  }

  try {
    builderAudioPreview = new Audio(track.url);
    builderAudioPreview.currentTime = start;
    builderAudioPreview.volume = (state.features.musicVolume || 35) / 100;
    builderPreviewIdx = idx;
    btn.classList.add('primary');
    btn.textContent = `❚❚ Playing (${formatTime(start)} / ${end !== Infinity ? formatTime(end) : 'End'})`;

    builderAudioPreview.play().catch(() => {
      stopBuilderAudioPreview();
      toast('Could not play audio preview.');
    });

    builderPreviewTimer = setInterval(() => {
      if (!builderAudioPreview) return clearInterval(builderPreviewTimer);
      const cur = builderAudioPreview.currentTime;
      if (cur >= end || builderAudioPreview.ended) {
        stopBuilderAudioPreview();
      } else {
        btn.textContent = `❚❚ Playing (${formatTime(cur)} / ${end !== Infinity ? formatTime(end) : 'End'})`;
      }
    }, 250);

    builderAudioPreview.addEventListener('ended', stopBuilderAudioPreview);
    builderAudioPreview.addEventListener('error', stopBuilderAudioPreview);
  } catch (err) {
    stopBuilderAudioPreview();
    toast('Error starting audio preview.');
  }
}

function setupPositionCanvas() {
  const canvas = document.querySelector('#position-preview-canvas');
  const handle = document.querySelector('#position-drag-handle');
  if (!canvas || !handle) return;

  let isDragging = false;

  const updatePos = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0.08, Math.min(0.92, (clientX - rect.left) / rect.width));
    const y = Math.max(0.08, Math.min(0.92, (clientY - rect.top) / rect.height));
    handle.style.left = `${x * 100}%`;
    handle.style.top = `${y * 100}%`;
    state.features.musicCustomPosition = { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
    scheduleSave();
    preview.src = preview.src.split('?')[0] + `?embed=1&t=${Date.now()}`;
  };

  canvas.addEventListener('pointerdown', e => {
    isDragging = true;
    canvas.setPointerCapture(e.pointerId);
    updatePos(e.clientX, e.clientY);
  });

  canvas.addEventListener('pointermove', e => {
    if (!isDragging) return;
    updatePos(e.clientX, e.clientY);
  });

  const onPointerUp = e => {
    if (!isDragging) return;
    isDragging = false;
    try { canvas.releasePointerCapture(e.pointerId); } catch {}
  };
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
}

async function getAudioDuration(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    return Math.round(audioBuffer.duration);
  } catch (e) {
    return 0;
  }
}

async function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function compressAudioFile(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const sampleRate = 22050;
    const offlineCtx = new OfflineAudioContext(1, Math.floor(sampleRate * audioBuffer.duration), sampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);
    const renderedBuffer = await offlineCtx.startRendering();
    const wavBlob = audioBufferToWavBlob(renderedBuffer);
    return await readFileAsDataUrl(wavBlob);
  } catch (e) {
    return await readFileAsDataUrl(file);
  }
}

async function uploadMusic(file) {
  const copy = document.querySelector('#music-upload-copy');
  if (copy) copy.textContent = `Optimizing ${file.name}…`;
  document.querySelector('#save-status').textContent = 'Uploading music…';
  try {
    await saveQueue;
    const duration = await getAudioDuration(file);
    const dataUrl = await compressAudioFile(file);
    let r = await fetch(`/api/invitations/${id}/tracks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-csrf-token': csrf },
      body: JSON.stringify({
        title: file.name.replace(/\.[^/.]+$/, ''),
        name: file.name.replace(/\.[^/.]+$/, ''),
        url: dataUrl,
        duration: duration,
        startTime: 0,
        endTime: null
      })
    });
    let out = {};
    try { out = await r.json(); } catch {}
    if (!r.ok) {
      if (copy) copy.textContent = out.error || 'Could not upload song.';
      document.querySelector('#save-status').textContent = 'Upload failed';
      return toast(copy?.textContent || 'Upload failed');
    }
    state.features.music = true;
    state.features.musicSource = 'upload';
    state.features.playlist = out.playlist || out.tracks || [];
    state.features.tracks = state.features.playlist;
    const defaultTrack = state.features.playlist.find(s => s.default) || state.features.playlist[0];
    if (defaultTrack) {
      state.features.musicUrl = defaultTrack.url;
      state.features.musicName = defaultTrack.name || defaultTrack.title;
      state.features.musicStartOffset = defaultTrack.startTime;
    }
    document.querySelector('#save-status').textContent = '✓ Saved just now';
    render();
    preview.src = preview.src.split('?')[0] + `?embed=1&t=${Date.now()}`;
    toast(`Added "${file.name}" to playlist ♫`);
  } catch (err) {
    if (copy) copy.textContent = 'Upload failed. Check file.';
    document.querySelector('#save-status').textContent = 'Upload failed';
    toast('Upload failed. Check file.');
  }
}

async function removeMusic() {
  if (!confirm('Remove all songs from this invitation?')) return;
  const r = await fetch(`/api/invitations/${id}/music`, { method: 'DELETE', headers: { 'x-csrf-token': csrf } });
  if (r.ok) {
    stopBuilderAudioPreview();
    Object.assign(state.features, { music: false, musicUrl: null, musicName: null, playlist: [], tracks: [] });
    render();
    preview.src = preview.src.split('?')[0] + `?embed=1&t=${Date.now()}`;
    toast('Music removed.');
  }
}

async function applySpotify(spotifyUrl) {
  if (!spotifyUrl || !spotifyUrl.trim()) return toast('Please enter a Spotify URL.');
  document.querySelector('#save-status').textContent = 'Connecting Spotify…';
  try {
    const res = await fetch(`/api/invitations/${id}/spotify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-csrf-token': csrf },
      body: JSON.stringify({ spotifyUrl: spotifyUrl.trim() })
    });
    const out = await res.json();
    if (!res.ok) {
      document.querySelector('#save-status').textContent = 'Spotify link failed';
      return toast(out.error || 'Invalid Spotify URL.');
    }
    state.features.music = true;
    state.features.musicSource = 'spotify';
    state.features.musicPlayerStyle = 'spotify';
    state.features.spotify = out.spotify;
    document.querySelector('#save-status').textContent = '✓ Saved just now';
    render();
    preview.src = preview.src.split('?')[0] + `?embed=1&t=${Date.now()}`;
    toast('Spotify music connected 🟢');
  } catch {
    toast('Failed to connect Spotify.');
  }
}

async function removeSpotify() {
  if (!confirm('Remove Spotify music from this invitation?')) return;
  try {
    const res = await fetch(`/api/invitations/${id}/spotify`, {
      method: 'DELETE',
      headers: { 'x-csrf-token': csrf }
    });
    if (res.ok) {
      state.features.spotify = null;
      state.features.musicSource = 'spotify';
      state.features.musicPlayerStyle = 'spotify';
      if (!state.features.musicUrl && (!state.features.playlist || !state.features.playlist.length)) {
        state.features.music = false;
      }
      render();
      preview.src = preview.src.split('?')[0] + `?embed=1&t=${Date.now()}`;
      toast('Spotify music removed.');
    }
  } catch {
    toast('Failed to remove Spotify music.');
  }
}

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
      document.querySelector('#save-status').textContent = '✓ Saved just now';
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
        document.querySelector('#save-status').textContent = '✓ Saved just now';
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

async function uploadMemoryPhoto(idx, file) {
  document.querySelector('#save-status').textContent = 'Uploading memory photo…';
  try {
    await saveQueue;
    const reader = new FileReader();
    reader.onload = async () => {
      if (!state.features.memoriesList) state.features.memoriesList = [];
      if (state.features.memoriesList[idx]) {
        state.features.memoriesList[idx].photoUrl = reader.result;
        const savedOk = await save();
        if (savedOk) {
          document.querySelector('#save-status').textContent = '✓ Saved just now';
          render();
          preview.src = preview.src.split('?')[0] + `?embed=1&t=${Date.now()}`;
          toast('Memory photo uploaded 📷');
        }
      }
    };
    reader.readAsDataURL(file);
  } catch {
    toast('Failed to upload memory photo.');
  }
}

function scheduleSave() {
  document.querySelector('#save-status').textContent = 'Saving…';
  clearTimeout(timer);
  timer = setTimeout(save, 650);
}

// Serialize autosaves: an older snapshot can never overwrite a newer one.
async function save() {
  clearTimeout(timer);
  const version = ++saveVersion;
  const body = JSON.stringify({
    inviterName: state.inviterName,
    recipientName: state.recipientName,
    title: state.title,
    theme: state.theme,
    content: state.content,
    features: state.features
  });
  const run = async () => {
    try {
      const r = await fetch(`/api/invitations/${id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrf },
        body
      });
      if (version === saveVersion) {
        document.querySelector('#save-status').textContent = r.ok ? '✓ Saved just now' : 'Save failed';
        if (r.ok) preview.src = preview.src.split('?')[0] + `?embed=1&t=${Date.now()}`;
        else toast((await r.json()).error || 'Could not save changes.');
      }
      return r.ok;
    } catch {
      if (version === saveVersion) {
        document.querySelector('#save-status').textContent = 'Save failed';
        toast('Could not save changes.');
      }
      return false;
    }
  };
  saveQueue = saveQueue.then(run, run);
  return saveQueue;
}

async function publish() {
  if (!await save()) return;
  const r = await fetch(`/api/invitations/${id}/status`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': csrf },
    body: JSON.stringify({ status: 'published' })
  });
  let out = {};
  try { out = await r.json(); } catch {}
  if (r.ok) {
    state.status = 'published';
    render();
    toast('Invitation published with your latest theme 🎉');
  } else {
    toast(out.error || 'Could not publish invitation.');
  }
}

function copyLink() {
  navigator.clipboard.writeText(`${location.origin}/i/${state.token}`);
  toast('Private link copied ✓');
}

document.querySelector('#publish')?.addEventListener('click', publish);
document.querySelector('#save-draft')?.addEventListener('click', save);

document.querySelector('.viewport-toggles')?.addEventListener('click', e => {
  const button = e.target.closest('[data-viewport]');
  if (!button) return;
  document.querySelectorAll('.viewport-toggles button').forEach(item => item.classList.toggle('active', item === button));
  document.querySelector('#preview-pane').dataset.viewport = button.dataset.viewport;
});

document.querySelector('.mobile-tabs')?.addEventListener('click', e => {
  const tab = e.target.dataset.tab;
  if (!tab) return;
  document.querySelectorAll('.mobile-tabs button').forEach(b => {
    const isCur = b === e.target;
    b.classList.toggle('active', isCur);
    b.setAttribute('aria-selected', isCur);
  });
  root.classList.toggle('show-preview', tab === 'preview');
});

function toast(message) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.append(el);
  }
  el.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}
