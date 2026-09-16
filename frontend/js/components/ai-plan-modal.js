/**
 * AI Study Plan Modal: Generates and displays structured study schedules for playlists.
 * Polished with UI/UX Pro Max standards.
 */
import { api } from '../services/api-client.js';
import { bus } from '../core/event-bus.js';
import { i18n } from '../i18n/translator.js';
import { renderBasicMarkdown } from '../utils/sanitize.js';
import { toast } from '../utils/toast.js';
import { $ } from '../utils/dom.js';

export class AIPlanModalComponent {
  constructor() {
    this.modal = $('#modal-ai-plan');
    this.contentEl = $('#ai-plan-content');
    this.currentPlanText = '';
    this.currentPlaylist = null;
    this.init();
  }

  init() {
    const closeModal = () => {
      this.modal?.classList.remove('open');
    };

    bus.on('ai:plan:request', async (playlist) => {
      this.currentPlaylist = playlist;
      this.modal?.classList.add('open');
      await this.generatePlan(playlist);
    });

    $('#btn-close-ai-modal')?.addEventListener('click', closeModal);
    $('#btn-cancel-ai-modal')?.addEventListener('click', closeModal);
    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) closeModal();
    });

    // Save plan to notebook
    $('#btn-save-plan-to-notebook')?.addEventListener('click', async () => {
      if (!this.currentPlanText || !this.currentPlaylist) return;
      try {
        await api.createNote({
          title: `خطة مذاكرة: ${this.currentPlaylist.title}`,
          content: this.currentPlanText,
          playlist_id: this.currentPlaylist.id
        });
        closeModal();
        toast.success(i18n.lang === 'ar' ? 'تم حفظ خطة المذاكرة في النوت بوك بنجاح' : 'Study plan saved to notebook');
        bus.emit('drawer:notebook:open', {
          playlistId: this.currentPlaylist.id,
          playlistTitle: this.currentPlaylist.title
        });
      } catch (err) {
        toast.error(err.message);
      }
    });
  }

  async generatePlan(playlist) {
    if (!this.contentEl) return;

    this.contentEl.innerHTML = `
      <div style="text-align: center; padding: 3rem 1.5rem;">
        <div class="spinner" style="width: 36px; height: 36px; margin-bottom: 1.25rem; border-top-color: var(--accent-purple);"></div>
        <p style="color: var(--text-main); font-size: 1rem; font-weight: 600; margin-bottom: 6px;">
          ${i18n.lang === 'ar' ? 'جاري تحليل القائمة وصياغة الخطة عبر Gemini AI...' : 'Analyzing playlist with Gemini AI...'}
        </p>
        <p style="color: var(--text-muted); font-size: 0.85rem;">
          ${i18n.lang === 'ar' ? 'يتم تقسيم الفيديوهات إلى مراحل تعليمية وجدول زمني متوازن' : 'Dividing videos into learning milestones and balanced pacing'}
        </p>
      </div>
    `;

    try {
      const planMarkdown = await api.generateStudyPlan(playlist.id, 14);
      this.currentPlanText = planMarkdown;
      this.contentEl.innerHTML = `
        <div style="line-height: 1.85; color: var(--text-main); font-size: 0.95rem;">
          ${renderBasicMarkdown(planMarkdown)}
        </div>
      `;
    } catch (err) {
      this.contentEl.innerHTML = `
        <div style="padding: 1.5rem; background: rgba(244, 63, 94, 0.1); border: 1px solid var(--accent-rose); border-radius: var(--radius-md); color: var(--accent-rose);">
          <p>⚠️ ${err.message}</p>
        </div>
      `;
    }
  }
}
