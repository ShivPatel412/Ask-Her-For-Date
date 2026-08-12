const csrf = document.querySelector('meta[name="csrf-token"]').content;
document.querySelectorAll('#quick-form,#custom-form').forEach(form => form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('button'), data = Object.fromEntries(new FormData(form));
  button.disabled = true; button.textContent = 'Creating…';
  const response = await fetch('/api/invitations', { method:'POST', headers:{'content-type':'application/json','x-csrf-token':csrf}, body:JSON.stringify(data) });
  const result = await response.json();
  if (!response.ok) { alert(result.error); button.disabled=false; button.textContent='Try again'; return; }
  location.href = form.id === 'quick-form' ? `/dashboard/invitations/${result.id}/edit?created=1` : `/dashboard/invitations/${result.id}/edit`;
}));
