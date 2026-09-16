/**
 * Playlist Card Component: Renders glassmorphic card, progress ring, and interactive video accordion.
 * Polished with vector icons, non-intrusive progress ring, and accessible confirmations (UI/UX Pro Max).
 */
import { api } from '../services/api-client.js';
import { store } from '../core/store.js';
import { bus } from '../core/event-bus.js';
import { i18n } from '../i18n/translator.js';
import { escapeHTML } from '../utils/sanitize.js';
import { formatDuration } from '../utils/formatters.js';
import { triggerConfetti } from '../utils/confetti.js';
import { toast } from '../utils/toast.js';

export function renderPlaylistCard(playlist) {
  const card = document.createElement('div');
  card.className = 'glass-card playlist-card animate-float';
  card.dataset.id = playlist.id;

  const total = playlist.total_videos || 0;
  const completed = playlist.completed_videos || 0;
  const percentage = playlist.progress_percentage || (total > 0 ? Math.round((completed / total) * 100) : 0);
  const isAllCompleted = total > 0 && completed === total;
  const isNotStarted = completed === 0;

  let badgeClass = 'badge-neutral';
  let badgeText = i18n.lang === 'ar' ? 'لم يبدأ' : 'Not Started';
  if (isAllCompleted) {
    badgeClass = 'badge-emerald';
    badgeText = '✓ ' + (i18n.lang === 'ar' ? 'مكتمل' : 'Completed');
  } else if (!isNotStarted) {
    badgeClass = 'badge-indigo';
    badgeText = '⚡ ' + (i18n.lang === 'ar' ? 'قيد التعلم' : 'In Progress');
  }

  // SVG Progress Ring calculations (radius = 23, circumference = 2 * PI * 23 ~= 144.5)
  const radius = 23;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  card.innerHTML = `
    <div class="playlist-header">
      <img class="playlist-thumbnail" src="${escapeHTML(playlist.thumbnail_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80')}" alt="${escapeHTML(playlist.title)}" loading="lazy">
      <div class="playlist-header-overlay">
        <div class="playlist-badges-row">
          <span class="badge ${badgeClass}">
            ${badgeText}
          </span>
          <span class="badge badge-neutral" style="background: rgba(0, 0, 0, 0.65); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.12); color: var(--text-main);">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="23 7 16 12 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
            ${total} ${i18n.lang === 'ar' ? 'فيديو' : 'videos'}
          </span>
        </div>
      </div>
    </div>

    <div class="playlist-info">
      <!-- Title & Progress Ring Header -->
      <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;">
        <div style="flex: 1; min-width: 0;">
          <h3 class="playlist-title" title="${escapeHTML(playlist.title)}">${escapeHTML(playlist.title)}</h3>
          <div class="playlist-channel">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
            <span>${escapeHTML(playlist.channel_title || 'YouTube')}</span>
          </div>
        </div>

        <div class="progress-ring-wrapper" style="width: 52px; height: 52px; flex-shrink: 0;" aria-label="Progress: ${percentage}%">
          <svg class="progress-ring-svg" viewBox="0 0 58 58" aria-hidden="true">
            <circle class="progress-ring-bg" cx="29" cy="29" r="${radius}" stroke-width="4.5" />
            <circle class="progress-ring-circle ${isAllCompleted ? 'completed' : ''}" cx="29" cy="29" r="${radius}" stroke-width="4.5"
              stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" />
          </svg>
          <span class="progress-ring-text">${percentage}%</span>
        </div>
      </div>

      <!-- Progress bar & counts -->
      <div>
        <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: var(--text-dim); margin-bottom: 5px;">
          <span>${completed} ${i18n.lang === 'ar' ? 'من أصل' : 'of'} ${total} ${i18n.lang === 'ar' ? 'فيديو مكتمل' : 'videos watched'}</span>
          <span style="color: ${isAllCompleted ? 'var(--accent-emerald)' : 'var(--text-muted)'}; font-weight: 600;">
            ${isAllCompleted ? (i18n.lang === 'ar' ? 'مكتمل 🎉' : 'Done 🎉') : (i18n.lang === 'ar' ? 'مستمر' : 'Active')}
          </span>
        </div>
        <div class="playlist-progress-bar-container">
          <div class="playlist-progress-bar" style="width: ${percentage}%"></div>
        </div>
      </div>

      <!-- Action Buttons Row -->
      <div class="playlist-actions-row">
        <div class="playlist-actions-group">
          <button class="btn btn-secondary btn-toggle-videos" aria-expanded="false">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="chevron-icon"><polyline points="6 9 12 15 18 9"/></svg>
            <span class="videos-count-text">${i18n.lang === 'ar' ? 'الفيديوهات' : 'Videos'} (${total})</span>
          </button>
          <button class="btn btn-secondary btn-ai-plan" title="${i18n.t('btn_ai_plan_tooltip') || i18n.t('btn_ai_plan')}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--accent-purple);" aria-hidden="true"><path d="M12 2l2.4 6.8 6.8 2.4-6.8 2.4L12 20.4l-2.4-6.8L2.8 11.2l6.8-2.4z"/></svg>
            <span class="ai-plan-text">${i18n.t('btn_ai_plan')}</span>
          </button>
        </div>
        <button class="btn-icon btn-delete-playlist" title="${i18n.t('btn_delete')}" aria-label="Delete Playlist">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    </div>

    <div class="videos-accordion" style="display: none;">
      <div class="videos-list-container" style="padding: 4px 0;">
        <div style="text-align: center; padding: 1.5rem;" class="spinner-container">
          <div class="spinner"></div>
        </div>
      </div>
    </div>
  `;

  // Bind Accordion expansion
  const toggleBtn = card.querySelector('.btn-toggle-videos');
  const accordion = card.querySelector('.videos-accordion');
  const chevron = card.querySelector('.chevron-icon');
  let loaded = false;

  toggleBtn.addEventListener('click', async () => {
    const isHidden = accordion.style.display === 'none';
    accordion.style.display = isHidden ? 'block' : 'none';
    if (chevron) {
      chevron.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
      chevron.style.transition = 'transform 0.25s ease';
    }

    if (isHidden && !loaded) {
      await loadVideosList(playlist.id, card);
      loaded = true;
    }
  });

  // Bind AI Plan Button
  card.querySelector('.btn-ai-plan').addEventListener('click', () => {
    bus.emit('ai:plan:request', playlist);
  });

  // Bind Delete Button with accessible dialog
  card.querySelector('.btn-delete-playlist').addEventListener('click', async () => {
    const confirmed = await toast.confirm(
      i18n.lang === 'ar' ? 'حذف قائمة التشغيل' : 'Delete Playlist',
      i18n.lang === 'ar' 
        ? `هل أنت متأكد من حذف قائمة "${playlist.title}" وجميع فيديوهاتها المسجلة؟`
        : `Are you sure you want to delete "${playlist.title}" and its videos?`,
      i18n.lang === 'ar' ? 'نعم، حذف' : 'Delete',
      i18n.lang === 'ar' ? 'إلغاء' : 'Cancel'
    );

    if (confirmed) {
      try {
        await api.deletePlaylist(playlist.id);
        card.style.opacity = '0';
        card.style.transform = 'scale(0.95)';
        setTimeout(() => card.remove(), 250);
        toast.success(i18n.lang === 'ar' ? 'تم حذف قائمة التشغيل بنجاح' : 'Playlist deleted successfully');
        await store.refreshPlaylists();
      } catch (err) {
        toast.error(err.message);
      }
    }
  });

  return card;
}

async function loadVideosList(playlistId, card) {
  const container = card.querySelector('.videos-list-container');
  try {
    const playlistDetail = await api.getPlaylist(playlistId);
    const videos = playlistDetail.videos || [];

    if (videos.length === 0) {
      container.innerHTML = `<p style="padding: 1.25rem; text-align: center; color: var(--text-dim); font-size: 0.9rem;">${i18n.lang === 'ar' ? 'لا توجد فيديوهات مسجلة في هذه القائمة.' : 'No videos found in this playlist.'}</p>`;
      return;
    }

    container.innerHTML = '';
    videos.forEach(v => {
      const item = document.createElement('div');
      item.className = `video-item ${v.is_completed ? 'is-completed' : ''}`;
      item.dataset.videoId = v.id;

      item.innerHTML = `
        <input type="checkbox" class="video-checkbox" ${v.is_completed ? 'checked' : ''} aria-label="${escapeHTML(v.title)}" title="${i18n.lang === 'ar' ? 'تعليم كمكتمل' : 'Mark as watched'}">
        <div class="video-item-info">
          <span class="video-item-title" title="${escapeHTML(v.title)}">${escapeHTML(v.title)}</span>
          <span class="video-item-duration">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${formatDuration(v.duration)}
          </span>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button class="video-item-action-btn btn-take-note" title="${i18n.t('drawer_notebook_title')}" aria-label="Take note for video">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
          <a href="${escapeHTML(v.webpage_url)}" target="_blank" rel="noopener noreferrer" class="video-item-action-btn" title="${i18n.lang === 'ar' ? 'مشاهدة على يوتيوب' : 'Watch on YouTube'}" aria-label="Watch on YouTube">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
        </div>
      `;

      // Checkbox event
      const cb = item.querySelector('.video-checkbox');
      cb.addEventListener('change', async () => {
        const isCompleted = cb.checked;
        try {
          await api.toggleVideo(v.id, isCompleted);
          item.classList.toggle('is-completed', isCompleted);

          if (isCompleted) {
            triggerConfetti();
            toast.success(i18n.lang === 'ar' ? 'أحسنت! تم إكمال الفيديو بنجاح 🎯' : 'Great job! Video completed');
          }

          // Refresh store
          await store.refreshPlaylists();
        } catch (err) {
          cb.checked = !isCompleted;
          toast.error(err.message);
        }
      });

      // Note button
      item.querySelector('.btn-take-note').addEventListener('click', () => {
        bus.emit('drawer:notebook:open', {
          playlistId: playlistId,
          playlistTitle: playlistDetail.title,
          videoId: v.id,
          videoTitle: v.title
        });
      });

      container.appendChild(item);
    });
  } catch (err) {
    container.innerHTML = `<p style="padding: 1.25rem; color: var(--accent-rose); font-size: 0.9rem;">⚠️ ${escapeHTML(err.message)}</p>`;
  }
}
