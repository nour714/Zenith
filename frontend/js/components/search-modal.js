/**
 * Search Modal Component: Handles YouTube playlist search and import.
 * Polished with UI/UX Pro Max standards.
 */
import { api } from '../services/api-client.js';
import { store } from '../core/store.js';
import { bus } from '../core/event-bus.js';
import { i18n } from '../i18n/translator.js';
import { triggerConfetti } from '../utils/confetti.js';
import { toast } from '../utils/toast.js';
import { $ } from '../utils/dom.js';

export class SearchModalComponent {
  constructor() {
    this.modal = $('#modal-search-playlist');
    this.form = $('#form-search-playlist');
    this.statusBox = $('#search-status-box');
    this.submitBtn = $('#btn-submit-search');
    this.init();
  }

  init() {
    const closeModal = () => {
      this.modal?.classList.remove('open');
      this.form?.reset();
      if (this.statusBox) this.statusBox.style.display = 'none';
      if (this.submitBtn) this.submitBtn.disabled = false;
    };

    bus.on('modal:search:open', () => {
      this.modal?.classList.add('open');
      $('#input-playlist-name')?.focus();
    });

    $('#btn-close-search-modal')?.addEventListener('click', closeModal);
    $('#btn-cancel-search-modal')?.addEventListener('click', closeModal);
    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) closeModal();
    });

    this.form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const playlistName = $('#input-playlist-name').value.trim();
      const channelName = $('#input-channel-name').value.trim();
      const directUrl = $('#input-direct-url').value.trim();

      if (!playlistName && !directUrl) {
        toast.info(i18n.lang === 'ar' ? 'يرجى إدخال اسم قائمة التشغيل أو الرابط المباشر.' : 'Please enter playlist name or direct URL.');
        return;
      }

      this.setLoading(true);

      try {
        const payload = {
          playlist_name: playlistName || null,
          channel_name: channelName || null,
          direct_url: directUrl || null,
        };

        const imported = await api.importPlaylist(payload);
        this.setLoading(false);
        closeModal();
        triggerConfetti();
        toast.success(i18n.lang === 'ar' ? `تم استيراد قائمة "${imported.title}" بنجاح (${imported.total_videos} فيديو)` : `Imported "${imported.title}" successfully`);
        await store.refreshPlaylists();
      } catch (err) {
        this.setLoading(false);
        if (this.statusBox) {
          this.statusBox.style.display = 'block';
          this.statusBox.style.background = 'rgba(244, 63, 94, 0.12)';
          this.statusBox.style.border = '1px solid rgba(244, 63, 94, 0.4)';
          this.statusBox.style.color = 'var(--accent-rose)';
          this.statusBox.textContent = `⚠️ ${err.message || 'فشل استيراد قائمة التشغيل.'}`;
        }
      }
    });
  }

  setLoading(isLoading) {
    if (this.submitBtn) {
      this.submitBtn.disabled = isLoading;
      if (isLoading) {
        this.submitBtn.innerHTML = `
          <div class="spinner" style="width: 16px; height: 16px;"></div>
          <span>${i18n.t('searching_youtube')}</span>
        `;
      } else {
        this.submitBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span>${i18n.t('btn_search')}</span>
        `;
      }
    }

    if (this.statusBox) {
      if (isLoading) {
        this.statusBox.style.display = 'block';
        this.statusBox.style.background = 'rgba(6, 182, 212, 0.1)';
        this.statusBox.style.border = '1px solid rgba(6, 182, 212, 0.3)';
        this.statusBox.style.color = '#38bdf8';
        this.statusBox.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px; justify-content: center;">
            <div class="spinner"></div>
            <span>${i18n.t('searching_youtube')}</span>
          </div>
        `;
      }
    }
  }
}
