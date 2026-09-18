/**
 * Continue Learning Hero Component: Highlights the last accessed video/track (UI/UX Pro Max).
 * Allows 1-click direct resume of learning from the top of the dashboard.
 */
import { store } from '../core/store.js';
import { bus } from '../core/event-bus.js';
import { i18n } from '../i18n/translator.js';
import { escapeHTML } from '../utils/sanitize.js';
import { $ } from '../utils/dom.js';

const STORAGE_KEY = 'zenith_last_watched_item';

export function recordLastWatched(item) {
  if (!item || !item.videoTitle) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...item,
      updatedAt: Date.now()
    }));
    bus.emit('continue-learning:updated');
  } catch (err) {
    console.warn('Could not save last watched video to localStorage', err);
  }
}

export function getLastWatched() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

export class ContinueLearningComponent {
  constructor() {
    this.container = $('#dashboard-continue-learning-slot');
    this.init();
    this.render();
  }

  init() {
    bus.on('continue-learning:updated', () => this.render());
    bus.on('playlists:updated', () => this.render());
    bus.on('i18n:changed', () => this.render());
    bus.on('view:switched', (view) => {
      if (view === 'dashboard') {
        this.render();
      }
    });
  }

  render() {
    if (!this.container) return;

    let item = getLastWatched();

    // Fallback to first playlist's first video if nothing recorded yet
    if (!item && store.playlists && store.playlists.length > 0) {
      const firstPlaylist = store.playlists[0];
      item = {
        playlistId: firstPlaylist.id,
        playlistTitle: firstPlaylist.title,
        videoTitle: firstPlaylist.title,
        channelTitle: firstPlaylist.channel_title || 'YouTube',
        thumbnailUrl: firstPlaylist.thumbnail_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
        videoUrl: `https://www.youtube.com/playlist?list=${firstPlaylist.youtube_id || ''}`
      };
    }

    if (!item) {
      this.container.style.display = 'none';
      this.container.innerHTML = '';
      return;
    }

    this.container.style.display = 'block';
    const isAr = i18n.lang === 'ar';

    this.container.innerHTML = `
      <div class="continue-learning-card animate-float">
        <div class="continue-learning-thumb-wrap">
          <img class="continue-learning-thumb" src="${escapeHTML(item.thumbnailUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80')}" alt="${escapeHTML(item.videoTitle)}" loading="lazy">
          <div class="continue-learning-play-overlay">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
        </div>

        <div class="continue-learning-info">
          <div class="continue-learning-tag">
            <span>✦</span>
            <span>${i18n.t('continue_learning_tag') || 'Continue Learning'}</span>
          </div>
          <h3 class="continue-learning-title" title="${escapeHTML(item.videoTitle)}">${escapeHTML(item.videoTitle)}</h3>
          <div class="continue-learning-subtitle">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
            <span>${escapeHTML(item.playlistTitle || item.channelTitle || 'YouTube')}</span>
          </div>
        </div>

        <div class="continue-learning-cta">
          <a href="${escapeHTML(item.videoUrl || '#')}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="text-decoration: none; padding: 10px 22px; font-weight: 700; white-space: nowrap;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <span>${i18n.t('continue_learning_btn') || 'Resume Watching ↗'}</span>
          </a>
        </div>
      </div>
    `;

    // Track click
    const btn = this.container.querySelector('a');
    if (btn) {
      btn.addEventListener('click', () => {
        recordLastWatched(item);
      });
    }
  }
}
