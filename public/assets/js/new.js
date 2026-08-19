const csrf = document.querySelector('meta[name="csrf-token"]').content;
const templates = JSON.parse(document.querySelector('#template-data')?.textContent || '[]');
const form = document.querySelector('#template-form');
const selectedInput = document.querySelector('#selected-template-id');
const selectedLabel = document.querySelector('#selected-template-label');
const preview = document.querySelector('#template-preview');
let selectedId = selectedInput?.value || templates[0]?.id || '';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function currentNames() {
  const data = new FormData(form);
  return {
    creatorName: data.get('inviterName') || 'You',
    inviterName: data.get('inviterName') || 'You',
    recipientName: data.get('recipientName') || 'Favorite human',
    nickname: data.get('recipientName') || 'Favorite human',
    selectedMood: (template()?.moods || [])[0]?.title || 'Food + fun'
  };
}

function fillVars(value) {
  const vars = currentNames();
  return String(value ?? '').replace(/{{\s*(creatorName|inviterName|recipientName|nickname|selectedMood|activity|date|time|location)\s*}}/g, (_, key) => vars[key] || '');
}

function template() {
  return templates.find(t => t.id === selectedId) || templates[0];
}

function renderPreview() {
  const t = template();
  if (!t || !preview) return;
  const s = t.content?.main || {};
  const intro = t.content?.intro || {};
  const mood = (t.moods || [])[0] || {};
  preview.innerHTML = `
    <div class="preview-template-phone theme-${esc(t.themePreset || 'strawberry')}">
      <span class="phone-notch"></span>
      <small>${esc(fillVars(intro.eyebrow || t.name))}</small>
      <h2>${esc(fillVars(s.heading || t.name))}</h2>
      <p>${esc(fillVars(s.body || t.tagline || 'Ready to use.'))}</p>
      <div class="preview-template-choice primary">${esc(fillVars(s.primary || 'Yes ❤️'))}</div>
      <div class="preview-template-choice">${esc(fillVars(s.secondary || mood.title || 'Tell me more'))}</div>
      <div class="preview-template-mood"><b>${esc(fillVars(mood.title || 'Date idea ✨'))}</b><span>${esc(fillVars(mood.description || 'Everything is already filled in.'))}</span></div>
    </div>
    <div class="template-preview-copy">
      <span>Live preview</span>
      <h2>${esc(t.name)}</h2>
      <p>${esc(t.tagline || '')}</p>
    </div>
  `;
}

function selectTemplate(id) {
  if (!templates.some(t => t.id === id)) return;
  selectedId = id;
  selectedInput.value = id;
  const t = template();
  if (selectedLabel) selectedLabel.textContent = t.name;
  document.querySelectorAll('.new-template-card').forEach(card => {
    const active = card.dataset.templateId === id;
    card.classList.toggle('active', active);
    card.setAttribute('aria-pressed', active ? 'true' : 'false');
    const badge = card.querySelector('.template-selected-badge');
    if (badge) badge.textContent = active ? '✓ Selected' : '';
  });
  renderPreview();
}

document.querySelectorAll('[data-template-id]').forEach(card => {
  card.addEventListener('click', () => selectTemplate(card.dataset.templateId));
  card.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectTemplate(card.dataset.templateId);
    }
  });
});

form?.addEventListener('input', renderPreview);
form?.addEventListener('submit', async event => {
  event.preventDefault();
  const submitter = event.submitter;
  const mode = submitter?.dataset.mode || 'customize';
  const body = Object.fromEntries(new FormData(form));
  submitter.disabled = true;
  submitter.textContent = 'Creating…';
  const response = await fetch('/api/invitations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': csrf },
    body: JSON.stringify(body)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    alert(result.error || 'Could not create invitation.');
    submitter.disabled = false;
    submitter.textContent = mode === 'preview' ? 'Use Template As-Is ❤️' : 'Customize Template ✨';
    return;
  }
  location.href = mode === 'preview'
    ? `/dashboard/invitations/${result.id}/preview`
    : `/dashboard/invitations/${result.id}/edit?created=1`;
});

renderPreview();
