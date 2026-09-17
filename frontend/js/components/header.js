/**
 * Header Component: Controls brand, global stats bar, language switcher and modal triggers.
 */
import { store } from '../core/store.js';
import { bus } from '../core/event-bus.js';
import { i18n } from '../i18n/translator.js';
import { $ } from '../utils/dom.js';

export class HeaderComponent {
  constructor() {
    this.bindEvents();
    this.updateStats(store.getState().stats);
  }

  bindEvents() {
    // Language Switcher
    const langBtn = $('#btn-toggle-lang');
    if (langBtn) {
      langBtn.addEventListener('click', () => {
        const nextLang = i18n.lang === 'ar' ? 'en' : 'ar';
        i18n.setLanguage(nextLang);
        langBtn.textContent = nextLang === 'ar' ? 'EN' : 'عربي';
      });
    }

    // Brand click returns to dashboard
    $('.header-brand')?.addEventListener('click', () => bus.emit('view:switch', 'dashboard'));

    // Navigation Pages (Dashboard vs Dedicated Notebook Page)
    $('#nav-btn-dashboard')?.addEventListener('click', () => bus.emit('view:switch', 'dashboard'));
    $('#nav-btn-notebook')?.addEventListener('click', () => bus.emit('view:switch', 'notebook'));
    $('#mobile-nav-dashboard')?.addEventListener('click', () => bus.emit('view:switch', 'dashboard'));
    $('#mobile-nav-notebook')?.addEventListener('click', () => bus.emit('view:switch', 'notebook'));
    $('#mobile-nav-playlist')?.addEventListener('click', () => bus.emit('modal:search:open'));
    $('#mobile-nav-task')?.addEventListener('click', () => bus.emit('modal:task:open'));
    $('#mobile-nav-settings')?.addEventListener('click', () => bus.emit('modal:settings:open'));

    bus.on('view:switched', (viewName) => {
      const btnDashboard = $('#nav-btn-dashboard');
      const btnNotebook = $('#nav-btn-notebook');

      if (viewName === 'notebook') {
        btnDashboard?.classList.remove('active');
        btnNotebook?.classList.add('active');
      } else {
        btnNotebook?.classList.remove('active');
        btnDashboard?.classList.add('active');
      }

      const mobileDashboard = $('#mobile-nav-dashboard');
      const mobileNotebook = $('#mobile-nav-notebook');
      mobileDashboard?.classList.toggle('active', viewName !== 'notebook');
      mobileNotebook?.classList.toggle('active', viewName === 'notebook');
    });

    // Modal openers
    $('#btn-open-search')?.addEventListener('click', () => bus.emit('modal:search:open'));
    $('#btn-open-task-modal')?.addEventListener('click', () => bus.emit('modal:task:open'));
    $('#btn-open-settings')?.addEventListener('click', () => bus.emit('modal:settings:open'));

    // Listen for state changes
    bus.on('stats:updated', stats => this.updateStats(stats));
    bus.on('state:changed', state => this.updateStats(state.stats));
  }

  updateStats(stats) {
    if (!stats) return;

    const elTotalVideos = $('#stat-val-total-videos');
    const elCompVideos = $('#stat-val-completed-videos');
    const elTotalTasks = $('#stat-val-total-tasks');
    const elOverallProgress = $('#stat-val-overall-progress');
    const mobileNotesCount = $('#mobile-notes-count');

    if (elTotalVideos) elTotalVideos.textContent = stats.total_videos || 0;
    if (elCompVideos) elCompVideos.textContent = stats.completed_videos || 0;
    if (elTotalTasks) elTotalTasks.textContent = `${stats.completed_tasks || 0}/${stats.total_tasks || 0}`;
    if (elOverallProgress) elOverallProgress.textContent = `${stats.overall_progress_percentage || 0}%`;
    if (mobileNotesCount) mobileNotesCount.textContent = stats.total_notes || 0;
  }
}
