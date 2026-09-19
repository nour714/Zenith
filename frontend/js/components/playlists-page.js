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
import { attachPullToRefresh } from '../utils/gestures.js';
import { bottomSheet } from './bottom-sheet.js';
import { $ } from '../utils/dom.js';

export class PlaylistsPageComponent {
  constructor() {
    this.filter = 'all'; // 'all' | 'in_progress' | 'completed'
    this.bindEvents();
    this.render();
  }

  bindEvents() {
    // Toggle collapsible add playlist form
    $('#btn-toggle-playlists-form')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleForm();
    });
    $('#header-playlists-toggle')?.addEventListener('click', () => this.toggleForm());
    $('#btn-cancel-playlists-form')?.addEventListener('click', () => this.toggleForm(false));

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
    bus.on('modal:playlist:open', () => this.toggleForm(true));
    window.addEventListener('langchanged', () => this.render());

    // Pull-to-refresh on mobile
    const pageEl = $('#view-playlists');
    if (pageEl) {
      attachPullToRefresh(pageEl, async () => {
        await store.refreshPlaylists();
        toast.info(i18n.lang === 'ar' ? 'تم تحديث المسارات التعليمية' : 'Playlists refreshed');
      });
    }
  }

  toggleForm(forceOpen = null) {
    const collapseEl = $('#playlists-form-collapse');
    const toggleBtn = $('#btn-toggle-playlists-form');
    if (!collapseEl) return;

    const isCurrentlyOpen = collapseEl.style.display !== 'none';
    const shouldOpen = forceOpen !== null ? forceOpen : !isCurrentlyOpen;

    if (shouldOpen) {
      collapseEl.style.display = 'block';
      collapseEl.classList.add('open');
      toggleBtn?.classList.add('active');
      $('#input-page-playlist-name')?.focus();
    } else {
      collapseEl.style.display = 'none';
      collapseEl.classList.remove('open');
      toggleBtn?.classList.remove('active');
    }
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
      this.toggleForm(false);
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
      if (emptyState) {
        emptyState.style.display = 'block';
        const isAr = i18n.lang === 'ar';
        emptyState.innerHTML = `
          <div style="font-size: 2.4rem; margin-bottom: 10px;">🎓</div>
          <p style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">${i18n.t('empty_playlists_title') || 'No learning tracks yet'}</p>
          <p style="font-size: 0.9rem; color: var(--text-dim); max-width: 400px; margin: 0 auto 16px;">${i18n.t('empty_playlists_desc') || 'Add your first track above.'}</p>
          <button type="button" class="btn btn-primary btn-empty-add-playlist" style="padding: 8px 20px;">
            <span>+ ${isAr ? 'إضافة أول مسار تعليمي' : 'Add First Course'}</span>
          </button>
        `;
        emptyState.querySelector('.btn-empty-add-playlist')?.addEventListener('click', () => {
          this.openMobileAddSheet();
        });
      }
    } else {
      if (emptyState) emptyState.style.display = 'none';
      filtered.forEach(p => {
        grid.appendChild(renderPlaylistCard(p));
      });
    }
  }

  openMobileAddSheet() {
    const isAr = i18n.lang === 'ar';
    const content = document.createElement('form');
    content.className = 'auth-form';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.gap = '12px';
    content.innerHTML = `
      <div class="form-group">
        <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">${isAr ? 'اسم الكورس / المسار' : 'Course / Track Name'}</label>
        <input id="sheet-input-playlist-name" type="text" placeholder="${isAr ? 'مثال: كورس بايثون للمبتدئين' : 'e.g. Python for Beginners'}" style="width: 100%;" required>
      </div>
      <div class="form-group">
        <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">${isAr ? 'اسم القناة (اختياري)' : 'Channel Name (Optional)'}</label>
        <input id="sheet-input-channel-name" type="text" placeholder="${isAr ? 'مثال: Codezilla' : 'e.g. Traversy Media'}" style="width: 100%;">
      </div>
      <div style="text-align: center; color: var(--text-dim); font-size: 0.8rem;">— ${isAr ? 'أو الصق الرابط المباشر' : 'or direct URL'} —</div>
      <div class="form-group">
        <input id="sheet-input-direct-url" type="url" placeholder="https://www.youtube.com/playlist?list=..." style="width: 100%;">
      </div>
      <button type="submit" class="btn btn-primary" style="margin-top: 6px; padding: 12px; width: 100%;">
        <span>${isAr ? 'بحث واستخراج المسار' : 'Search & Extract Track'}</span>
      </button>
    `;

    content.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pName = content.querySelector('#sheet-input-playlist-name').value.trim();
      const cName = content.querySelector('#sheet-input-channel-name').value.trim();
      const uUrl = content.querySelector('#sheet-input-direct-url').value.trim();

      if (!pName && !uUrl) {
        toast.info(isAr ? 'يرجى إدخال اسم الكورس أو الرابط' : 'Please enter course name or URL');
        return;
      }

      const btn = content.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner" style="width: 14px; height: 14px;"></span> ${isAr ? 'جاري الاستخراج...' : 'Extracting...'}`;

      try {
        await api.importPlaylist({
          playlist_name: pName || null,
          channel_name: cName || null,
          direct_url: uUrl || null
        });
        toast.success(isAr ? 'تم استيراد المسار بنجاح 🎯' : 'Course imported successfully');
        bottomSheet.close();
        await store.refreshPlaylists();
      } catch (err) {
        toast.error(err.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = `<span>${isAr ? 'بحث واستخراج المسار' : 'Search & Extract Track'}</span>`;
      }
    });

    bottomSheet.open(
      `<span>✦</span> <span>${isAr ? 'إضافة مسار تعليمي جديد' : 'Add Course Track'}</span>`,
      content,
      () => {
        content.querySelector('#sheet-input-playlist-name')?.focus();
      }
    );
  }
}
