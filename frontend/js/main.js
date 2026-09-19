/**
 * Main Application Bootstrapper (ES Modules).
 * Architecture: 5 Full Pages (Dashboard, Playlists, Tasks, Notebook, Settings) + Auth View.
 * Equipped with Route Guards, multi-tenancy auth state, and reactive sync.
 */
import { i18n } from './i18n/translator.js?v=4';
import { store } from './core/store.js';
import { bus } from './core/event-bus.js';
import { authService } from './services/auth-service.js';
import { HeaderComponent } from './components/header.js?v=5';
import { AuthPageComponent } from './components/auth-page.js?v=2';
import { PlaylistsPageComponent } from './components/playlists-page.js?v=2';
import { TasksPageComponent } from './components/tasks-page.js?v=2';
import { NotebookPageComponent } from './components/notebook-page.js?v=4';
import { SettingsPageComponent } from './components/settings-page.js?v=2';
import { AIPlanModalComponent } from './components/ai-plan-modal.js?v=2';
import { renderPlaylistCard } from './components/playlist-card.js';
import { TaskBoardComponent } from './components/task-board.js';
import { ContinueLearningComponent } from './components/continue-learning.js';
import { BottomSheetComponent } from './components/bottom-sheet.js';
import { $ } from './utils/dom.js';

const registerServiceWorker = () => {
  navigator.serviceWorker.register('./sw.js').catch((error) => {
    console.warn('Service worker registration failed:', error);
  });
};

if ('serviceWorker' in navigator) {
  if (document.readyState === 'loading') {
    window.addEventListener('load', registerServiceWorker, { once: true });
  } else {
    registerServiceWorker();
  }
}

class App {
  constructor() {
    this.init();
  }

  async init() {
    // Apply translations & direction
    i18n.applyToDOM();

    // Initialize View Components
    new HeaderComponent();
    new AuthPageComponent();
    new PlaylistsPageComponent();
    new TasksPageComponent();
    new NotebookPageComponent();
    new SettingsPageComponent();
    new AIPlanModalComponent();
    new ContinueLearningComponent();
    new BottomSheetComponent();

    // Setup Page Navigation Routing & Route Guards
    this.setupViewRouting();

    // Dashboard shortcut buttons to navigate to full pages
    $('#btn-dash-goto-playlists')?.addEventListener('click', () => bus.emit('view:switch', 'playlists'));
    $('#btn-dash-goto-tasks')?.addEventListener('click', () => bus.emit('view:switch', 'tasks'));

    // Fallbacks for legacy modal events -> route to corresponding full pages
    bus.on('modal:search:open', () => bus.emit('view:switch', 'playlists'));
    bus.on('modal:task:open', () => bus.emit('view:switch', 'tasks'));
    bus.on('modal:settings:open', () => bus.emit('view:switch', 'settings'));

    // Listen to store updates
    bus.on('state:changed', (state) => this.renderDashboard(state));
    bus.on('playlists:updated', () => this.renderDashboard(store.getState()));
    bus.on('tasks:updated', () => this.renderDashboard(store.getState()));
    window.addEventListener('langchanged', () => this.renderDashboard(store.getState()));

    // Initial Load if authenticated
    if (authService.isAuthenticated()) {
      await store.loadAll();
    }
  }

  setupViewRouting() {
    const views = {
      auth: $('#view-auth'),
      dashboard: $('#view-dashboard'),
      playlists: $('#view-playlists'),
      tasks: $('#view-tasks'),
      notebook: $('#view-notebook'),
      settings: $('#view-settings')
    };

    const switchView = (targetView) => {
      let viewKey = views[targetView] ? targetView : 'dashboard';

      // Route Guards: force to auth if unauthenticated; force to dashboard if authenticated and on auth
      const isAuthenticated = authService.isAuthenticated();
      if (!isAuthenticated) {
        viewKey = 'auth';
      } else if (viewKey === 'auth') {
        viewKey = 'dashboard';
      }

      Object.entries(views).forEach(([name, el]) => {
        if (el) {
          el.classList.toggle('active', name === viewKey);
        }
      });

      bus.emit('view:switched', viewKey);
      document.body.classList.toggle('view-auth', viewKey === 'auth');

      if (window.location.hash !== `#${viewKey}`) {
        window.history.replaceState(null, '', `#${viewKey}`);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    bus.on('view:switch', (viewName) => switchView(viewName));

    bus.on('auth:login', async () => {
      await store.loadAll();
      switchView('dashboard');
    });

    bus.on('auth:logout', () => {
      switchView('auth');
    });

    bus.on('auth:unauthorized', () => {
      switchView('auth');
    });

    // Handle hash on load and popstate
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      switchView(hash);
    };

    window.addEventListener('hashchange', handleHash);
    handleHash();
  }

  renderDashboard(state) {
    const playlistsSection = $('#playlists-section');
    const tasksSection = $('#tasks-section');
    const playlistsGrid = $('#playlists-grid');
    const tasksGrid = $('#tasks-grid');
    const emptyStateContainer = $('#dashboard-empty-state');

    if (!playlistsGrid || !tasksGrid) return;

    playlistsGrid.innerHTML = '';
    tasksGrid.innerHTML = '';
    if (emptyStateContainer) emptyStateContainer.innerHTML = '';

    const { playlists, tasks, activeTab } = state;

    const onlyCompleted = activeTab === 'completed';
    const showPlaylists = activeTab === 'all' || activeTab === 'playlists' || onlyCompleted;
    const showTasks = activeTab === 'all' || activeTab === 'tasks' || onlyCompleted;

    // Filter Playlists
    const filteredPlaylists = playlists.filter(p => {
      if (onlyCompleted) {
        return p.total_videos > 0 && p.completed_videos === p.total_videos;
      }
      return true;
    });

    // Filter Tasks
    const filteredTasks = tasks.filter(t => {
      if (onlyCompleted) return Boolean(t.is_completed);
      return true;
    });

    // Render Playlists
    if (showPlaylists && filteredPlaylists.length > 0) {
      playlistsSection.style.display = 'block';
      filteredPlaylists.forEach(p => playlistsGrid.appendChild(renderPlaylistCard(p)));
      $('#section-badge-playlists').textContent = filteredPlaylists.length;
    } else if (activeTab === 'playlists') {
      playlistsSection.style.display = 'block';
      playlistsGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem; color: var(--text-dim);">
          <p>${i18n.lang === 'ar' ? 'لا توجد مسارات يوتيوب مسجلة بعد.' : 'No YouTube courses registered yet.'}</p>
        </div>
      `;
      $('#section-badge-playlists').textContent = '0';
    } else {
      playlistsSection.style.display = 'none';
    }

    // Render Tasks
    if (showTasks && filteredTasks.length > 0) {
      tasksSection.style.display = 'block';
      filteredTasks.forEach(t => tasksGrid.appendChild(TaskBoardComponent.renderTaskCard(t)));
      $('#section-badge-tasks').textContent = filteredTasks.length;
    } else if (activeTab === 'tasks') {
      tasksSection.style.display = 'block';
      tasksGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem; color: var(--text-dim);">
          <p>${i18n.lang === 'ar' ? 'لا توجد مهام يومية حالية.' : 'No active tasks found.'}</p>
        </div>
      `;
      $('#section-badge-tasks').textContent = '0';
    } else {
      tasksSection.style.display = 'none';
    }

    // Global Empty State when everything is empty
    const totalVisible = (playlistsSection.style.display !== 'none' ? filteredPlaylists.length : 0) +
                         (tasksSection.style.display !== 'none' ? filteredTasks.length : 0);

    if (totalVisible === 0) {
      if (emptyStateContainer) {
        emptyStateContainer.style.display = 'block';
        emptyStateContainer.innerHTML = `
          <div class="empty-state animate-float">
            <div class="empty-state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" style="width: 68px; height: 68px;" aria-hidden="true">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h3 style="font-size: 1.3rem; font-weight: 700; margin-bottom: 0.6rem; color: var(--text-main);">
              ${i18n.lang === 'ar' ? 'لا توجد عناصر لعرضها هنا حالياً' : 'No items to display here yet'}
            </h3>
            <p style="color: var(--text-muted); font-size: 0.95rem; max-width: 440px; margin-bottom: 1.75rem; line-height: 1.6;">
              ${i18n.lang === 'ar' ? 'ابدأ بإضافة مسار تعليمي من يوتيوب أو مهمة سريعة لمتابعة تقدمك نحو القمة.' : 'Start by adding a YouTube playlist or a quick task to track your journey.'}
            </p>
            <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;">
              <button class="btn btn-primary btn-empty-add-playlist">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <span>${i18n.t('btn_add_playlist')}</span>
              </button>
              <button class="btn btn-secondary btn-empty-add-task">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                <span>${i18n.t('btn_add_task')}</span>
              </button>
            </div>
          </div>
        `;

        emptyStateContainer.querySelector('.btn-empty-add-playlist')?.addEventListener('click', () => bus.emit('view:switch', 'playlists'));
        emptyStateContainer.querySelector('.btn-empty-add-task')?.addEventListener('click', () => bus.emit('view:switch', 'tasks'));
      }
    } else {
      if (emptyStateContainer) emptyStateContainer.style.display = 'none';
    }

    // Update tab badges
    const totalCount = playlists.length + tasks.length;
    const completedCount = playlists.filter(p => p.total_videos > 0 && p.completed_videos === p.total_videos).length +
                           tasks.filter(t => t.is_completed).length;

    const badgeAll = $('#badge-all');
    const badgePlaylists = $('#badge-playlists');
    const badgeTasks = $('#badge-tasks');
    const badgeCompleted = $('#badge-completed');

    if (badgeAll) badgeAll.textContent = totalCount;
    if (badgePlaylists) badgePlaylists.textContent = playlists.length;
    if (badgeTasks) badgeTasks.textContent = tasks.length;
    if (badgeCompleted) badgeCompleted.textContent = completedCount;
  }
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
