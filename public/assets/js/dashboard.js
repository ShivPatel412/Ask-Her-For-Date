const csrf = document.querySelector('meta[name="csrf-token"]').content;
const search=document.querySelector('#invitation-search'),filter=document.querySelector('#invitation-filter');
function filterInvitations(){const query=search?.value.trim().toLowerCase()||'',status=filter?.value||'all';let visible=0;document.querySelectorAll('.invite-card').forEach(card=>{const show=(!query||card.dataset.search.includes(query))&&(status==='all'||card.dataset.status===status);card.hidden=!show;if(show)visible++;});const empty=document.querySelector('#dashboard-empty-filter');if(empty)empty.hidden=visible>0||!document.querySelector('.invite-card');}
search?.addEventListener('input',filterInvitations);filter?.addEventListener('change',filterInvitations);
document.addEventListener('click', async event => {
  const copy = event.target.closest('.copy');
  if (copy) {
    const card = copy.closest('.invite-card');
    const id = copy.dataset.id || card?.dataset.id;
    const url = copy.dataset.url;
    if (card && card.dataset.status !== 'published' && id) {
      try {
        const res = await fetch(`/api/invitations/${id}/status`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-csrf-token': csrf },
          body: JSON.stringify({ status: 'published' })
        });
        if (res.ok) {
          card.dataset.status = 'published';
          const badge = card.querySelector('.status');
          if (badge) { badge.textContent = 'published'; badge.className = 'status published'; }
        }
      } catch {}
    }
    const fullUrl = location.origin + url;
    await navigator.clipboard.writeText(fullUrl);
    copy.textContent = 'Copied ✓';
    setTimeout(() => { copy.textContent = '⌁ Copy link'; }, 2500);
    return;
  }
  const button = event.target.closest('[data-action]'); if (!button) return;
  const action=button.dataset.action,id=button.dataset.id;
  if (action==='delete' && !confirm('Delete this invitation and all of its analytics? This cannot be undone.')) return;
  const options={headers:{'content-type':'application/json','x-csrf-token':csrf}};
  let res;
  if(action==='duplicate'){options.method='POST'; res = await fetch(`/api/invitations/${id}/duplicate`,options);}
  if(action==='toggle'){options.method='POST';options.body=JSON.stringify({status:button.textContent.includes('Enable')?'draft':'disabled'}); res = await fetch(`/api/invitations/${id}/status`,options);}
  if(action==='delete'){options.method='DELETE'; res = await fetch(`/api/invitations/${id}`,options);}
  
  if (res && !res.ok) {
    let out = {};
    try { out = await res.json(); } catch {}
    alert(out.error || 'Operation failed. Please try again.');
    return;
  }
  location.reload();
});
