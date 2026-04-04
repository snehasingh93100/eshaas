/**
 * dashboard.js — Analytics and session tracking for Eshaas
 */

// ===== STATE =====
let allSessions = [];
let filteredSessions = [];
let emotionChart = null;
let timelineChart = null;
let currentPage = 1;
const PAGE_SIZE = 10;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  setupUserInfo();
  setupEventListeners();
  await loadDashboard();
});

function setupUserInfo() {
  const user = getUserData();
  if (!user) return;
  const el = document.getElementById('user-name');
  const avatarEl = document.getElementById('user-avatar');
  if (el) el.textContent = user.name || 'User';
  if (avatarEl) avatarEl.textContent = getInitials(user.name || 'U');
}

async function loadDashboard() {
  showLoadingState();
  try {
    const [sessionsData, analyticsData] = await Promise.all([
      getSessions().catch(() => ({ sessions: [] })),
      getAnalytics().catch(() => null),
    ]);

    allSessions = sessionsData.sessions || [];
    filteredSessions = [...allSessions];

    renderStats(allSessions, analyticsData);
    renderSessions(filteredSessions);
    renderEmotionChart(analyticsData || buildLocalAnalytics(allSessions));
    renderTimelineChart(allSessions);
  } catch (err) {
    showNotification('Could not load dashboard: ' + err.message, 'error');
    renderEmptyState();
  } finally {
    hideLoadingState();
  }
}

// ===== STATS OVERVIEW =====

function renderStats(sessions, analytics) {
  const total = sessions.length;
  const totalMessages = sessions.reduce((sum, s) => sum + (s.messageCount || 0), 0);
  const totalSeconds = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);

  // Top emotion
  let topEmotion = 'neutral';
  if (analytics && analytics.emotionDistribution) {
    const entries = Object.entries(analytics.emotionDistribution);
    if (entries.length) {
      topEmotion = entries.sort((a, b) => b[1] - a[1])[0][0];
    }
  } else {
    const local = buildLocalAnalytics(sessions);
    const entries = Object.entries(local.emotionDistribution);
    if (entries.length) topEmotion = entries.sort((a, b) => b[1] - a[1])[0][0];
  }

  const cfg = getEmotionConfig(topEmotion);

  setStatValue('stat-total-sessions', total);
  setStatValue('stat-total-messages', totalMessages);
  setStatValue('stat-top-emotion', `${cfg.emoji} ${cfg.label}`);
  setStatValue('stat-total-time', formatDuration(totalSeconds));
}

function setStatValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ===== RENDER SESSIONS TABLE =====

function renderSessions(sessions) {
  const tbody = document.getElementById('sessions-tbody');
  const countEl = document.getElementById('sessions-count');
  if (!tbody) return;

  if (countEl) countEl.textContent = `(${sessions.length})`;

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageSessions = sessions.slice(start, start + PAGE_SIZE);

  if (pageSessions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <div class="empty-state-icon">💬</div>
            <div class="empty-state-title">No sessions found</div>
            <div class="empty-state-text">Start a conversation with Eshaas to see your sessions here.</div>
            <a href="chat.html" class="btn btn-primary btn-sm" style="margin-top:1rem">Start Chatting</a>
          </div>
        </td>
      </tr>
    `;
    renderPagination(0);
    return;
  }

  tbody.innerHTML = pageSessions.map(session => buildSessionRow(session)).join('');

  // Attach event handlers
  tbody.querySelectorAll('.view-session-btn').forEach(btn => {
    btn.addEventListener('click', () => viewSession(btn.dataset.id));
  });
  tbody.querySelectorAll('.delete-session-btn').forEach(btn => {
    btn.addEventListener('click', () => handleDeleteSession(btn.dataset.id));
  });

  renderPagination(sessions.length);
  updatePageInfo(start, Math.min(start + PAGE_SIZE, sessions.length), sessions.length);
}

function buildSessionRow(session) {
  const id = session.id || session._id || '';
  const startTime = session.startTime || session.createdAt;
  const duration = formatDuration(session.duration || 0);
  const msgCount = session.messageCount || 0;
  const emotion = session.topEmotion || 'neutral';
  const status = session.status || 'ended';
  const cfg = getEmotionConfig(emotion);

  return `
    <tr>
      <td>
        <span class="session-date">${formatDate(startTime)}</span>
        <span class="session-time">${formatTime(startTime)}</span>
      </td>
      <td><span class="session-duration">⏱ ${duration}</span></td>
      <td><span class="session-messages-count">💬 ${msgCount}</span></td>
      <td><span class="emotion-badge ${emotion.toLowerCase()}">${cfg.emoji} ${cfg.label}</span></td>
      <td>
        <span class="session-status-badge ${status}">
          ${status === 'active' ? '🟢 Active' : '⚪ Ended'}
        </span>
      </td>
      <td>
        <div class="table-actions">
          <button class="action-btn view view-session-btn" data-id="${escapeHtml(id)}" title="View session">👁️</button>
          <button class="action-btn delete delete-session-btn" data-id="${escapeHtml(id)}" title="Delete session">🗑️</button>
        </div>
      </td>
    </tr>
  `;
}

// ===== PAGINATION =====

function renderPagination(total) {
  const paginationEl = document.getElementById('pagination');
  if (!paginationEl) return;

  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) {
    paginationEl.innerHTML = '';
    return;
  }

  let html = `<button class="page-btn" id="prev-page" ${currentPage === 1 ? 'disabled' : ''}>‹</button>`;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) {
      html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    } else if (Math.abs(i - currentPage) === 2) {
      html += `<span style="padding:0 0.25rem;color:var(--color-gray-400)">…</span>`;
    }
  }

  html += `<button class="page-btn" id="next-page" ${currentPage === totalPages ? 'disabled' : ''}>›</button>`;
  paginationEl.innerHTML = html;

  paginationEl.querySelectorAll('.page-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPage = parseInt(btn.dataset.page);
      renderSessions(filteredSessions);
    });
  });

  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');
  if (prevBtn) prevBtn.addEventListener('click', () => { currentPage--; renderSessions(filteredSessions); });
  if (nextBtn) nextBtn.addEventListener('click', () => { currentPage++; renderSessions(filteredSessions); });
}

function updatePageInfo(from, to, total) {
  const el = document.getElementById('page-info');
  if (el) {
    el.textContent = total > 0
      ? `Showing ${from + 1}–${to} of ${total} sessions`
      : 'No sessions';
  }
}

// ===== CHARTS =====

function renderEmotionChart(analytics) {
  const ctx = document.getElementById('emotion-chart');
  if (!ctx) return;

  const distribution = (analytics && analytics.emotionDistribution) || {};
  const emotionOrder = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'neutral'];
  const labels = emotionOrder.map(e => {
    const cfg = getEmotionConfig(e);
    return `${cfg.emoji} ${cfg.label}`;
  });
  const data = emotionOrder.map(e => distribution[e] || 0);
  const colors = emotionOrder.map(e => getEmotionConfig(e).color);

  if (emotionChart) emotionChart.destroy();

  emotionChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.map(c => c + 'CC'),
        borderColor: colors,
        borderWidth: 2,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${ctx.raw} message${ctx.raw !== 1 ? 's' : ''}`,
          },
        },
      },
      cutout: '65%',
    },
  });

  renderEmotionLegend(emotionOrder, colors, data);
}

function renderEmotionLegend(emotions, colors, data) {
  const legendEl = document.getElementById('emotion-legend');
  if (!legendEl) return;

  legendEl.innerHTML = emotions.map((e, i) => {
    const cfg = getEmotionConfig(e);
    return `
      <div class="legend-item">
        <span class="legend-dot" style="background:${colors[i]}"></span>
        ${cfg.emoji} ${cfg.label} (${data[i]})
      </div>
    `;
  }).join('');
}

function renderTimelineChart(sessions) {
  const ctx = document.getElementById('timeline-chart');
  if (!ctx || !sessions.length) return;

  // Build daily session count for last 30 days
  const days = 14;
  const now = new Date();
  const labels = [];
  const counts = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    labels.push(label);

    const dayStart = new Date(d.setHours(0, 0, 0, 0)).getTime();
    const dayEnd = dayStart + 86400000;
    const count = sessions.filter(s => {
      const t = new Date(s.startTime || s.createdAt).getTime();
      return t >= dayStart && t < dayEnd;
    }).length;
    counts.push(count);
  }

  if (timelineChart) timelineChart.destroy();

  timelineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Sessions',
        data: counts,
        borderColor: '#7C3AED',
        backgroundColor: 'rgba(124, 58, 237, 0.08)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#7C3AED',
        pointRadius: 4,
        pointHoverRadius: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.raw} session${ctx.raw !== 1 ? 's' : ''}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#9CA3AF', font: { size: 11 }, maxRotation: 45 },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: {
            color: '#9CA3AF',
            font: { size: 11 },
            stepSize: 1,
            precision: 0,
          },
        },
      },
    },
  });
}

// ===== FILTERING =====

function setupEventListeners() {
  // Search
  const searchInput = document.getElementById('search-sessions');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(handleFilter, 300));
  }

  // Filter by emotion
  const emotionFilter = document.getElementById('emotion-filter');
  if (emotionFilter) {
    emotionFilter.addEventListener('change', handleFilter);
  }

  // Filter by status
  const statusFilter = document.getElementById('status-filter');
  if (statusFilter) {
    statusFilter.addEventListener('change', handleFilter);
  }

  // Export button
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) exportBtn.addEventListener('click', exportSessions);

  // New session button
  const newSessionBtn = document.getElementById('new-session-btn');
  if (newSessionBtn) {
    newSessionBtn.addEventListener('click', () => {
      window.location.href = 'chat.html';
    });
  }

  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  // Modal close
  document.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', closeModal);
  });
}

function handleFilter() {
  const searchTerm = (document.getElementById('search-sessions')?.value || '').toLowerCase().trim();
  const emotionFilter = document.getElementById('emotion-filter')?.value || '';
  const statusFilter = document.getElementById('status-filter')?.value || '';

  filteredSessions = allSessions.filter(session => {
    const matchSearch = !searchTerm ||
      formatDate(session.startTime || session.createdAt).toLowerCase().includes(searchTerm) ||
      (session.id || '').toLowerCase().includes(searchTerm) ||
      (session.topEmotion || '').toLowerCase().includes(searchTerm);

    const matchEmotion = !emotionFilter ||
      (session.topEmotion || '').toLowerCase() === emotionFilter;

    const matchStatus = !statusFilter ||
      (session.status || 'ended') === statusFilter;

    return matchSearch && matchEmotion && matchStatus;
  });

  currentPage = 1;
  renderSessions(filteredSessions);
}

// ===== VIEW SESSION MODAL =====

async function viewSession(sessionId) {
  try {
    const data = await getSessionById(sessionId);
    if (!data) return;

    const session = data.session || {};
    const messages = data.messages || [];

    const modal = document.getElementById('session-modal');
    if (!modal) return;

    // Populate modal
    document.getElementById('modal-session-date').textContent =
      formatDateTime(session.startTime || session.createdAt);
    document.getElementById('modal-session-duration').textContent =
      formatDuration(session.duration || 0);
    document.getElementById('modal-session-messages').textContent =
      messages.length || session.messageCount || 0;

    // Top emotion
    const emotion = session.topEmotion || 'neutral';
    const cfg = getEmotionConfig(emotion);
    document.getElementById('modal-session-emotion').textContent =
      `${cfg.emoji} ${cfg.label}`;

    // Messages preview
    const previewEl = document.getElementById('modal-messages-preview');
    if (previewEl) {
      previewEl.innerHTML = messages.length
        ? messages.slice(0, 20).map(msg => `
            <div class="preview-message ${msg.sender}">
              <div class="preview-message-sender">${msg.sender === 'user' ? 'You' : 'Eshaas'}</div>
              ${escapeHtml(msg.content)}
            </div>
          `).join('')
        : '<p style="color:var(--color-gray-400);text-align:center;font-size:0.875rem;">No messages in this session.</p>';
    }

    // Open modal
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  } catch (err) {
    showNotification('Could not load session details: ' + err.message, 'error');
  }
}

function closeModal() {
  const modal = document.getElementById('session-modal');
  if (modal) modal.classList.add('hidden');
  document.body.style.overflow = '';
}

// ===== DELETE SESSION =====

async function handleDeleteSession(sessionId) {
  if (!confirm('Delete this session? This action cannot be undone.')) return;

  try {
    await deleteSession(sessionId);
    allSessions = allSessions.filter(s => (s.id || s._id) !== sessionId);
    filteredSessions = filteredSessions.filter(s => (s.id || s._id) !== sessionId);
    renderSessions(filteredSessions);
    renderStats(allSessions, null);
    showNotification('Session deleted successfully.', 'success');
  } catch (err) {
    showNotification('Could not delete session: ' + err.message, 'error');
  }
}

// ===== EXPORT =====

function exportSessions() {
  if (!allSessions.length) {
    showNotification('No sessions to export.', 'warning');
    return;
  }

  const format = confirm('Export as CSV?\n\nClick OK for CSV, Cancel for JSON.')
    ? 'csv'
    : 'json';

  if (format === 'csv') {
    const csv = sessionsToCSV(allSessions);
    downloadFile(`eshaas-sessions-${Date.now()}.csv`, csv, 'text/csv');
  } else {
    const json = JSON.stringify(allSessions, null, 2);
    downloadFile(`eshaas-sessions-${Date.now()}.json`, json, 'application/json');
  }

  showNotification('Sessions exported successfully!', 'success');
}

// ===== HELPERS =====

function buildLocalAnalytics(sessions) {
  const distribution = {};
  sessions.forEach(s => {
    const e = (s.topEmotion || 'neutral').toLowerCase();
    distribution[e] = (distribution[e] || 0) + (s.messageCount || 1);
  });
  return { emotionDistribution: distribution };
}

function calculateStats(sessions) {
  return {
    totalSessions: sessions.length,
    totalMessages: sessions.reduce((s, sess) => s + (sess.messageCount || 0), 0),
    totalDuration: sessions.reduce((s, sess) => s + (sess.duration || 0), 0),
    averageDuration: sessions.length
      ? Math.round(sessions.reduce((s, sess) => s + (sess.duration || 0), 0) / sessions.length)
      : 0,
  };
}

function showLoadingState() {
  const tbody = document.getElementById('sessions-tbody');
  if (tbody) {
    tbody.innerHTML = Array(4).fill(`
      <tr>
        <td colspan="6"><div class="skeleton skeleton-row"></div></td>
      </tr>
    `).join('');
  }
}

function hideLoadingState() {
  // Loading state is replaced by renderSessions
}

function renderEmptyState() {
  const tbody = document.getElementById('sessions-tbody');
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <div class="empty-state-icon">⚠️</div>
            <div class="empty-state-title">Could not load sessions</div>
            <div class="empty-state-text">Make sure the backend server is running.</div>
          </div>
        </td>
      </tr>
    `;
  }
}
