const csrf = document.querySelector('meta[name="csrf-token"]').content;
const templates = JSON.parse(document.querySelector('#template-data')?.textContent || '[]');
const form = document.querySelector('#template-form');
const preview = document.querySelector('#template-preview');

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function currentNames() {
  const data = new FormData(form);
  const inv = (data.get('inviterName') || '').trim();
  const rec = (data.get('recipientName') || '').trim();
  return {
    creatorName: inv || 'You',
    inviterName: inv || 'You',
    recipientName: rec || 'Favorite human',
    nickname: rec || 'Favorite human'
  };
}

function fillVars(value) {
  const vars = currentNames();
  return String(value ?? '').replace(/{{\s*(creatorName|inviterName|recipientName|nickname)\s*}}/g, (_, key) => vars[key] || '');
}

function renderPreview() {
  const t = templates[0] || {};
  if (!preview) return;
  const s = t.content?.main || {};
  const intro = t.content?.intro || {};
  const mood = (t.moods || [])[0] || {};

  preview.innerHTML = `
    <div class="preview-template-phone theme-${esc(t.themePreset || 'strawberry')}">
      <div class="phone-notch" aria-hidden="true"></div>
      <div class="phone-screen-inner">
        <span class="preview-card-kicker">${esc(fillVars(intro.eyebrow || 'Hey {{recipientName}} 👀'))}</span>
        <h2 class="preview-card-heading">${esc(fillVars(s.heading || 'Will you go on a date with me?'))}</h2>
        <p class="preview-card-body">${esc(fillVars(s.body || "I really enjoy spending time with you..."))}</p>
        <div class="preview-choices-stack">
          <div class="preview-template-choice primary">${esc(fillVars(s.primary || 'Haan, chalo 😌'))}</div>
          <div class="preview-template-choice">${esc(fillVars(s.secondary || 'Hmm… sochna padega 👀'))}</div>
        </div>
        <div class="preview-template-mood" style="margin-top:14px;">
          <div class="mood-pill-head"><span>✨ Date Plan</span></div>
          <b>${esc(fillVars(mood.title || 'Dinner + Dessert 🍝'))}</b>
          <small>${esc(fillVars(mood.description || 'Food first. Everything else later.'))}</small>
        </div>
      </div>
    </div>
  `;
}

form?.addEventListener('input', renderPreview);
form?.addEventListener('submit', async event => {
  event.preventDefault();
  const submitBtn = form.querySelector('button[type="submit"]');
  const body = Object.fromEntries(new FormData(form));
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating…';
  const response = await fetch('/api/invitations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': csrf },
    body: JSON.stringify(body)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    alert(result.error || 'Could not create invitation.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Continue to Editor ✨';
    return;
  }
  location.href = `/dashboard/invitations/${result.id}/edit?created=1`;
});

renderPreview();
