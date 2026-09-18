/**
 * Playlists Page Component: Dedicated full page for exploring, adding,
 * and managing YouTube learning courses and video curricula.
 */
import { api } from '../services/api-client.js';
import { store } from '../core/store.js';
import { bus } from '../core/event-bus.js';
import { renderPlaylistCard } from './playlist-card.js';
import { toast } from '../utils/toast.js';
import { i18n } from '../i18n/translator.js';
import { $ } from '../utils/dom.js';

export class PlaylistsPageComponent {
  constructor() {
    this.filter = 'all'; // 'all' | 'in_progress' | 'completed'
    this.bindEvents();
    this.render();
  }

  bindEvents() {
    // Form submit for adding playlist
    const form = $('#form-playlists-page-add');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleAddPlaylist();
    });

    // Filter tabs
    const filterButtons = document.querySelectorAll('.playlists-filter-pill');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.filter = btn.dataset.filter || 'all';
        this.render();
      });
    });

    // Reactive store listeners
    bus.on('playlists:updated', () => this.render());
    bus.on('state:changed', () => this.render());
    window.addEventListener('langchanged', () => this.render());
  }

  async handleAddPlaylist() {
    const inputName = $('#input-page-playlist-name');
    const inputChannel = $('#input-page-channel-name');
    const inputUrl = $('#input-page-direct-url');
    const statusBox = $('#playlists-page-status-box');
    const submitBtn = $('#btn-playlists-page-submit');

    const playlistName = inputName?.value.trim() || '';
    const channelName = inputChannel?.value.trim() || '';
    const directUrl = inputUrl?.value.trim() || '';

    if (!directUrl && !playlistName) {
      this.setStatus(statusBox, i18n.lang === 'ar' ? 'يرجى إدخال اسم الكورس أو رابط يوتيوب المباشر' : 'Please enter course title or YouTube URL', 'error');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="spinner" style="width: 14px; height: 14px; display: inline-block;"></span> ${i18n.lang === 'ar' ? 'جاري الاستخراج...' : 'Extracting...'}`;
    }

    this.setStatus(statusBox, i18n.lang === 'ar' ? 'جاري الاتصال بـ YouTube واستخراج قائمة الفيديوهات...' : 'Fetching playlist and videos from YouTube...', 'info');

    try {
      const result = await api.importPlaylist({
        playlist_name: playlistName || null,
        channel_name: channelName || null,
        direct_url: directUrl || null,
      });

      this.setStatus(statusBox, i18n.lang === 'ar' ? `تم استيراد "${result.title}" بنجاح!` : `Imported "${result.title}" successfully!`, 'success');
      toast.success(i18n.lang === 'ar' ? 'تمت إضافة المسار التعليمي بنجاح 🎯' : 'Course path added successfully');

      if (inputName) inputName.value = '';
      if (inputChannel) inputChannel.value = '';
      if (inputUrl) inputUrl.value = '';

      await store.refreshPlaylists();
      setTimeout(() => {
        if (statusBox) statusBox.style.display = 'none';
      }, 4000);
    } catch (err) {
      this.setStatus(statusBox, err.message || (i18n.lang === 'ar' ? 'تعذر استخراج المسار. تأكد من الرابط أو الكلمات المفتاحية' : 'Failed to import playlist'), 'error');
      toast.error(err.message);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>${i18n.lang === 'ar' ? 'بحث واستخراج المسار' : 'Search & Import Course'}</span>
        `;
      }
    }
  }

  setStatus(box, msg, type) {
    if (!box) return;
    box.style.display = 'block';
    box.textContent = msg;
    box.style.border = '1px solid';
    if (type === 'error') {
      box.style.background = 'rgba(244, 63, 94, 0.12)';
      box.style.borderColor = 'rgba(244, 63, 94, 0.35)';
      box.style.color = '#fda4af';
    } else if (type === 'success') {
      box.style.background = 'rgba(16, 185, 129, 0.12)';
      box.style.borderColor = 'rgba(16, 185, 129, 0.35)';
      box.style.color = '#6ee7b7';
    } else {
      box.style.background = 'rgba(168, 85, 247, 0.12)';
      box.style.borderColor = 'rgba(168, 85, 247, 0.35)';
      box.style.color = '#d8b4fe';
    }
  }

  render() {
    const grid = $('#page-playlists-grid');
    const emptyState = $('#page-playlists-empty');
    const badgeCount = $('#page-playlists-count-badge');
    if (!grid) return;

    const playlists = store.getState().playlists || [];
    let filtered = playlists;

    if (this.filter === 'in_progress') {
      filtered = playlists.filter(p => (p.completed_videos || 0) < (p.total_videos || 0));
    } else if (this.filter === 'completed') {
      filtered = playlists.filter(p => p.total_videos > 0 && p.completed_videos === p.total_videos);
    }

    if (badgeCount) {
      badgeCount.textContent = playlists.length;
    }

    grid.innerHTML = '';
    if (filtered.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
    } else {
      if (emptyState) emptyState.style.display = 'none';
      filtered.forEach(p => {
        grid.appendChild(renderPlaylistCard(p));
      });
    }
  }
}
