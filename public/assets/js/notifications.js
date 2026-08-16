(function () {
  const toggleBtn = document.getElementById('notif-toggle');
  const dropdown = document.getElementById('notif-dropdown');
  const badge = document.getElementById('notif-badge');
  const list = document.getElementById('notif-list');
  const markReadBtn = document.getElementById('notif-mark-read');

  if (!toggleBtn || !dropdown) return;

  function getCsrf() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
  }

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      const notifs = data.notifications || [];
      const unreadCount = data.unreadCount || 0;

      if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }

      if (notifs.length === 0) {
        list.innerHTML = '<div class="notif-empty">No new activity yet. Share your invitation to receive live updates! 💌</div>';
        return;
      }

      list.innerHTML = notifs.map(n => `
        <a class="notif-item ${n.isRead ? '' : 'unread'}" data-notif-id="${n.id}" href="/dashboard/invitations/${n.invitationId}/analytics">
          <span class="notif-item-icon">${n.icon}</span>
          <div class="notif-item-content">
            <b>${escapeHtml(n.title)}</b>
            <p>${escapeHtml(n.message)}</p>
            <small>${escapeHtml(new Date(n.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))} · ${escapeHtml(n.inviteTitle || '')}</small>
          </div>
        </a>
      `).join('');
    } catch {}
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>'"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c]));
  }

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = dropdown.hasAttribute('hidden');
    if (isHidden) {
      dropdown.removeAttribute('hidden');
      toggleBtn.setAttribute('aria-expanded', 'true');
      fetchNotifications();
    } else {
      dropdown.setAttribute('hidden', '');
      toggleBtn.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && !toggleBtn.contains(e.target)) {
      dropdown.setAttribute('hidden', '');
      toggleBtn.setAttribute('aria-expanded', 'false');
    }
  });

  markReadBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { 'x-csrf-token': getCsrf() }
      });
      badge.style.display = 'none';
      list.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
    } catch {}
  });

  list.addEventListener('click', (e) => {
    const item = e.target.closest('.notif-item');
    if (item && item.dataset.notifId) {
      fetch(`/api/notifications/${item.dataset.notifId}/read`, {
        method: 'POST',
        headers: { 'x-csrf-token': getCsrf() }
      }).catch(() => {});
      item.classList.remove('unread');
    }
  });

  fetchNotifications();
  setInterval(fetchNotifications, 20000);
})();
