/**
 * Quick Switcher / Universal Search Component (UI/UX Pro Max).
 * Keyboard shortcut: Ctrl+K / Cmd+K
 * Instant search across playlists, tasks, notes, and direct actions.
 */
import { store } from '../core/store.js';
import { bus } from '../core/event-bus.js';
import { i18n } from '../i18n/translator.js';
import { escapeHTML } from '../utils/sanitize.js';
import { $ } from '../utils/dom.js';

export class QuickSwitcherComponent {
  constructor() {
    this.backdrop = $('#quick-switcher-modal');
    this.input = $('#quick-switcher-input');
    this.resultsContainer = $('#quick-switcher-results');
    this.selectedIndex = 0;
    this.currentResults = [];
    this.isOpen = false;

    this.init();
  }

  init() {
    if (!this.backdrop) return;

    // Listen for global shortcut Ctrl+K / Cmd+K
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.toggle();
      } else if (e.key === 'Escape' && this.isOpen) {
        this.close();
      } else if (this.isOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.moveSelection(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.moveSelection(-1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          this.selectCurrent();
        }
      }
    });

    // Listen for bus event
    bus.on('quick-switcher:open', () => this.open());

    // Backdrop click
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) this.close();
    });

    // Live search input
    if (this.input) {
      this.input.addEventListener('input', () => {
        this.performSearch(this.input.value.trim());
      });
    }
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    if (!this.backdrop) return;
    this.isOpen = true;
    this.backdrop.classList.add('open');
    if (this.input) {
      this.input.value = '';
      this.input.focus();
    }
    this.performSearch('');
  }

  close() {
    if (!this.backdrop) return;
    this.isOpen = false;
    this.backdrop.classList.remove('open');
  }

  performSearch(query) {
    const q = query.toLowerCase();
    const results = [];

    const isAr = i18n.lang === 'ar';

    // 1. Core Quick Actions
    const actions = [
      { id: 'act-dash', title: isAr ? 'لوحة المتابعة الرئيسية' : 'Dashboard Command Center', category: isAr ? 'صفحة' : 'Page', icon: '📊', type: 'view', target: 'dashboard' },
      { id: 'act-play', title: isAr ? 'مسارات يوتيوب التعليمية' : 'YouTube Learning Playlists', category: isAr ? 'صفحة' : 'Page', icon: '▶', type: 'view', target: 'playlists' },
      { id: 'act-task', title: isAr ? 'إدارة المهام اليومية' : 'Daily Tasks Board', category: isAr ? 'صفحة' : 'Page', icon: '✓', type: 'view', target: 'tasks' },
      { id: 'act-note', title: isAr ? 'دفتر الملاحظات الذكي' : 'Smart Notebook', category: isAr ? 'صفحة' : 'Page', icon: '📝', type: 'view', target: 'notebook' },
      { id: 'act-sett', title: isAr ? 'الإعدادات والحساب' : 'Settings & Account', category: isAr ? 'صفحة' : 'Page', icon: '⚙', type: 'view', target: 'settings' }
    ];

    actions.forEach(a => {
      if (!q || a.title.toLowerCase().includes(q)) {
        results.push(a);
      }
    });

    // 2. Search Playlists
    const playlists = store.playlists || [];
    playlists.forEach(p => {
      if (!q || (p.title && p.title.toLowerCase().includes(q)) || (p.channel_title && p.channel_title.toLowerCase().includes(q))) {
        results.push({
          id: `playlist-${p.id}`,
          title: p.title,
          subtitle: p.channel_title || 'YouTube',
          category: isAr ? 'مسار تعليمي' : 'Course Track',
          icon: '🎓',
          type: 'playlist',
          target: p
        });
      }
    });

    // 3. Search Tasks
    const tasks = store.tasks || [];
    tasks.forEach(t => {
      if (!q || (t.title && t.title.toLowerCase().includes(q)) || (t.description && t.description.toLowerCase().includes(q))) {
        results.push({
          id: `task-${t.id}`,
          title: t.title,
          subtitle: t.category ? `${t.category} • ${t.priority || 'medium'}` : '',
          category: isAr ? 'مهمة' : 'Task',
          icon: t.is_completed ? '✅' : '⏳',
          type: 'task',
          target: t
        });
      }
    });

    // 4. Search Notes
    const notes = store.notes || [];
    notes.forEach(n => {
      if (!q || (n.title && n.title.toLowerCase().includes(q)) || (n.content && n.content.toLowerCase().includes(q))) {
        results.push({
          id: `note-${n.id}`,
          title: n.title || (isAr ? 'ملاحظة بدون عنوان' : 'Untitled Note'),
          subtitle: n.video_title ? `🔗 ${n.video_title}` : '',
          category: isAr ? 'ملاحظة' : 'Note',
          icon: '📝',
          type: 'note',
          target: n
        });
      }
    });

    this.currentResults = results.slice(0, 15);
    this.selectedIndex = 0;
    this.renderResults();
  }

  renderResults() {
    if (!this.resultsContainer) return;

    if (this.currentResults.length === 0) {
      this.resultsContainer.innerHTML = `
        <div style="padding: 2rem 1rem; text-align: center; color: var(--text-dim); font-size: 0.92rem;">
          ${i18n.t('quick_switcher_no_results') || 'No matching results'}
        </div>
      `;
      return;
    }

    this.resultsContainer.innerHTML = this.currentResults.map((item, index) => `
      <div class="quick-switcher-item ${index === this.selectedIndex ? 'active' : ''}" data-index="${index}">
        <div class="quick-switcher-item-icon">${item.icon}</div>
        <div class="quick-switcher-item-info">
          <div class="quick-switcher-item-title">${escapeHTML(item.title)}</div>
          ${item.subtitle ? `<div class="quick-switcher-item-category">${escapeHTML(item.subtitle)}</div>` : ''}
        </div>
        <span class="badge badge-neutral" style="font-size: 0.72rem; padding: 2px 8px;">${escapeHTML(item.category)}</span>
      </div>
    `).join('');

    // Click events
    const itemEls = this.resultsContainer.querySelectorAll('.quick-switcher-item');
    itemEls.forEach(el => {
      el.addEventListener('click', () => {
        const index = parseInt(el.dataset.index, 10);
        this.selectedIndex = index;
        this.selectCurrent();
      });
      el.addEventListener('mouseenter', () => {
        this.selectedIndex = parseInt(el.dataset.index, 10);
        this.updateItemActiveState();
      });
    });
  }

  moveSelection(delta) {
    if (this.currentResults.length === 0) return;
    this.selectedIndex = (this.selectedIndex + delta + this.currentResults.length) % this.currentResults.length;
    this.updateItemActiveState();

    const activeEl = this.resultsContainer.querySelector(`.quick-switcher-item[data-index="${this.selectedIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }

  updateItemActiveState() {
    const itemEls = this.resultsContainer.querySelectorAll('.quick-switcher-item');
    itemEls.forEach((el, idx) => {
      el.classList.toggle('active', idx === this.selectedIndex);
    });
  }

  selectCurrent() {
    const item = this.currentResults[this.selectedIndex];
    if (!item) return;

    this.close();

    if (item.type === 'view') {
      bus.emit('navigation:change', item.target);
    } else if (item.type === 'playlist') {
      bus.emit('navigation:change', 'playlists');
    } else if (item.type === 'task') {
      bus.emit('navigation:change', 'tasks');
    } else if (item.type === 'note') {
      bus.emit('navigation:change', 'notebook');
      setTimeout(() => {
        bus.emit('notebook:open', {
          noteId: item.target.id,
          videoTitle: item.target.video_title,
          playlistTitle: item.target.playlist_title
        });
      }, 100);
    }
  }
}

export const quickSwitcher = new QuickSwitcherComponent();
