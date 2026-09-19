/**
 * Header Component: Controls brand, global navigation across 5 full pages,
 * user profile chip, language switcher, logout, and stats synchronization.
 */
import { store } from '../core/store.js';
import { bus } from '../core/event-bus.js';
import { i18n } from '../i18n/translator.js';
import { authService } from '../services/auth-service.js';
import { toast } from '../utils/toast.js';
import { $ } from '../utils/dom.js';

export class HeaderComponent {
  constructor() {
    this.initTheme();
    this.bindEvents();
    this.renderUser();
    this.updateStats(store.getState().stats);
  }

  initTheme() {
    const savedTheme = localStorage.getItem('zenith_theme') || 'dark';
    this.applyTheme(savedTheme, false);

    bus.on('theme:change', (newTheme) => {
      this.applyTheme(newTheme, false);
    });
  }

  applyTheme(theme, notify = true) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('zenith_theme', theme);

    if (notify) {
      bus.emit('theme:changed', theme);
      toast.info(theme === 'dark' ? (i18n.lang === 'ar' ? 'الوضع الليلي 🌙' : 'Dark Mode 🌙') : (i18n.lang === 'ar' ? 'الوضع النهاري ☀️' : 'Light Mode ☀️'));
    }
  }

  bindEvents() {
    // Brand click returns to dashboard
    $('.header-brand')?.addEventListener('click', () => {
      if (authService.isAuthenticated()) {
        bus.emit('view:switch', 'dashboard');
      }
    });

    // Top Header Navigation (5 Full Pages)
    const pageKeys = ['dashboard', 'playlists', 'tasks', 'notebook', 'settings'];
    pageKeys.forEach(page => {
      $(`#nav-btn-${page}`)?.addEventListener('click', () => bus.emit('view:switch', page));
      $(`#mobile-nav-${page}`)?.addEventListener('click', () => bus.emit('view:switch', page));
    });

    // User Profile Mini Chip click navigates directly to Settings
    $('#header-user-chip')?.addEventListener('click', () => bus.emit('view:switch', 'settings'));

    // Mobile FAB button handler
    $('#btn-mobile-fab')?.addEventListener('click', () => {
      const currentView = store.getState().currentView || 'dashboard';
      if (currentView === 'playlists') {
        bus.emit('modal:playlist:open');
      } else if (currentView === 'notebook') {
        bus.emit('notebook:new-note');
      } else {
        bus.emit('modal:task:open');
      }
    });

    // View switched listener
    bus.on('view:switched', (viewName) => {
      pageKeys.forEach(page => {
        const desktopBtn = $(`#nav-btn-${page}`);
        const mobileBtn = $(`#mobile-nav-${page}`);
        const isActive = page === viewName;

        desktopBtn?.classList.toggle('active', isActive);
        mobileBtn?.classList.toggle('active', isActive);
      });

      // Highlight user profile chip when viewing settings
      const userChip = $('#header-user-chip');
      userChip?.classList.toggle('active', viewName === 'settings');

      // Show/hide header and mobile nav depending on auth state
      const isAuthView = viewName === 'auth';
      const headerEl = $('.app-header');
      const mobileNav = $('.mobile-bottom-nav');
      if (headerEl) headerEl.style.display = isAuthView ? 'none' : '';
      if (mobileNav) mobileNav.style.display = isAuthView ? 'none' : '';

      // Reset notebook editor body class if navigated away
      if (viewName !== 'notebook') {
        document.body.classList.remove('nb-editor-active');
      }
    });

    // Auth state changes
    bus.on('auth:state-changed', () => this.renderUser());
    bus.on('auth:profile-updated', () => this.renderUser());

    // Stats updates
    bus.on('stats:updated', stats => this.updateStats(stats));
    bus.on('state:changed', state => this.updateStats(state.stats));
  }

  renderUser() {
    const userChip = $('#header-user-chip');
    const userAvatar = $('#header-user-avatar');
    const userName = $('#header-user-name');
    const settingsBtn = $('#nav-btn-settings');

    if (!authService.isAuthenticated()) {
      if (userChip) userChip.style.display = 'none';
      if (settingsBtn) settingsBtn.style.display = 'none';
      return;
    }

    const user = authService.getUser();
    if (userChip) userChip.style.display = 'inline-flex';
    if (settingsBtn) settingsBtn.style.display = 'inline-flex';

    if (userName) {
      userName.textContent = user?.full_name || user?.email?.split('@')[0] || 'User';
    }

    if (userAvatar) {
      if (user?.avatar_url) {
        userAvatar.innerHTML = `<img src="${user.avatar_url}" alt="${user.full_name || ''}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
      } else {
        const initial = (user?.full_name || user?.email || 'Z')[0].toUpperCase();
        userAvatar.textContent = initial;
      }
    }
  }

  updateStats(stats) {
    if (!stats) return;

    const elTotalVideos = $('#stat-val-total-videos');
    const elCompVideos = $('#stat-val-completed-videos');
    const elTotalTasks = $('#stat-val-total-tasks');
    const elOverallProgress = $('#stat-val-overall-progress');
    const headerNotesCount = $('#header-notes-count');
    const mobileNotesCount = $('#mobile-notes-count');

    if (elTotalVideos) elTotalVideos.textContent = stats.total_videos || 0;
    if (elCompVideos) elCompVideos.textContent = stats.completed_videos || 0;
    if (elTotalTasks) elTotalTasks.textContent = `${stats.completed_tasks || 0}/${stats.total_tasks || 0}`;
    if (elOverallProgress) elOverallProgress.textContent = `${stats.overall_progress_percentage || 0}%`;
    if (headerNotesCount) headerNotesCount.textContent = stats.total_notes || 0;
    if (mobileNotesCount) mobileNotesCount.textContent = stats.total_notes || 0;
  }
}
