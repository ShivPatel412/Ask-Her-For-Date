const csrf = document.querySelector('meta[name="csrf-token"]').content;
const search=document.querySelector('#invitation-search'),filter=document.querySelector('#invitation-filter');
function filterInvitations(){const query=search?.value.trim().toLowerCase()||'',status=filter?.value||'all';let visible=0;document.querySelectorAll('.invite-card').forEach(card=>{const show=(!query||card.dataset.search.includes(query))&&(status==='all'||card.dataset.status===status);card.hidden=!show;if(show)visible++;});const empty=document.querySelector('#dashboard-empty-filter');if(empty)empty.hidden=visible>0||!document.querySelector('.invite-card');}
search?.addEventListener('input',filterInvitations);filter?.addEventListener('change',filterInvitations);
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
