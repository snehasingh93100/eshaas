/**
 * Eshaas - Dashboard JS
 */

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const analytics = await API.getAnalytics();
    if (analytics) {
      document.getElementById('totalSessions').textContent = analytics.totalSessions || 0;
      document.getElementById('totalMessages').textContent = analytics.totalMessages || 0;
      document.getElementById('topEmotion').textContent = analytics.topEmotion || '—';
    }
  } catch (error) {
    console.error('Analytics error:', error);
  }
});
