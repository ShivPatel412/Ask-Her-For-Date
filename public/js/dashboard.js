const csrf = document.querySelector('meta[name="csrf-token"]').content;
document.addEventListener('click', async event => {
  const copy = event.target.closest('.copy');
  if (copy) { if (!copy.dataset.url) return alert('Publish this invitation first.'); await navigator.clipboard.writeText(location.origin + copy.dataset.url); copy.textContent='Copied ✓'; return; }
  const button = event.target.closest('[data-action]'); if (!button) return;
  const action=button.dataset.action,id=button.dataset.id;
  if (action==='delete' && !confirm('Delete this invitation and all of its analytics? This cannot be undone.')) return;
  const options={headers:{'content-type':'application/json','x-csrf-token':csrf}};
  if(action==='duplicate'){options.method='POST';await fetch(`/api/invitations/${id}/duplicate`,options);}
  if(action==='toggle'){options.method='POST';options.body=JSON.stringify({status:button.textContent.includes('Enable')?'draft':'disabled'});await fetch(`/api/invitations/${id}/status`,options);}
  if(action==='delete'){options.method='DELETE';await fetch(`/api/invitations/${id}`,options);}
  location.reload();
});
