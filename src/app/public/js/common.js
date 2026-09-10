async function apiGet(url) {
  const r = await fetch(url);
  return r.json();
}
async function apiPost(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });
  return r.json();
}

function renderNav(activePage) {
  const pages = [
    ['index.html', 'Dashboard'],
    ['upload.html', 'Upload Workbook'],
    ['progress.html', 'Progress'],
    ['results.html', 'Results'],
    ['dataset.html', 'Dataset Generator'],
    ['settings.html', 'Settings / About'],
  ];
  const nav = document.getElementById('topnav');
  nav.innerHTML = `
    <div class="brand">BCPS Automation</div>
    <nav>${pages.map(([href, label]) => `<a href="${href}" class="${href === activePage ? 'active' : ''}">${label}</a>`).join('')}</nav>
    <div class="session-info" id="session-info">checking session...</div>
  `;
  refreshSessionBadge();
}

async function refreshSessionBadge() {
  const el = document.getElementById('session-info');
  if (!el) return;
  const session = await apiGet('/api/session');
  el.textContent = session.loggedIn ? `Logged in (${session.userType})` : 'Not logged in';
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
