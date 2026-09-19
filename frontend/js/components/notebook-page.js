/**
 * Notebook Page Component: Dedicated full-screen study notebook workspace.
 * Features: Master-detail notes directory, live search, filter pills,
 * rich Markdown toolbar, live preview (split/preview/edit), AI polishing,
 * YouTube video deep-linkage, and markdown export.
 */
import { api } from '../services/api-client.js';
import { authService } from '../services/auth-service.js';
import { store } from '../core/store.js';
import { bus } from '../core/event-bus.js';
import { i18n } from '../i18n/translator.js';
import { escapeHTML } from '../utils/sanitize.js';
import { toast } from '../utils/toast.js';
import { attachSwipeAction } from '../utils/gestures.js';
import { $ } from '../utils/dom.js';

export class NotebookPageComponent {
  constructor() {
    this.activeNoteId = null;
    this.linkedContext = null;
    this.filterType = 'all'; // 'all' | 'linked' | 'general'
    this.searchQuery = '';
    this.currentMode = 'edit'; // 'edit' | 'preview' | 'split'
    this.mobileTab = 'list'; // 'list' | 'editor'
    this.notes = [];

    this.init();
  }

  async init() {
    this.bindEvents();
    this.setupToolbar();
    this.setupModeSwitch();
    if (authService.isAuthenticated()) {
      await this.loadNotes();
    }
  }

  bindEvents() {
    // New Note
    $('#btn-notebook-new-note')?.addEventListener('click', () => {
      this.resetEditor();
      this.setMobileTab('editor');
    });

    // Mobile Workspace View Switcher
    $('#btn-nb-tab-list')?.addEventListener('click', () => this.setMobileTab('list'));
    $('#btn-nb-tab-editor')?.addEventListener('click', () => this.setMobileTab('editor'));
    $('#btn-nb-back-to-list')?.addEventListener('click', () => this.setMobileTab('list'));

    // Listen for mobile FAB new note
    bus.on('notebook:new-note', () => {
      this.resetEditor();
      this.setMobileTab('editor');
    });

    // Save Note
    $('#btn-notebook-save-note')?.addEventListener('click', () => this.saveCurrentNote());

    // AI Enhance
    $('#btn-notebook-ai-enhance')?.addEventListener('click', () => this.aiEnhanceNote());

    // Export Note
    $('#btn-notebook-export')?.addEventListener('click', () => this.exportNote());

    // Search Notes
    const searchInput = $('#notebook-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.renderNotesList();
      });
    }

    // Filter Pills
    const filterPills = document.querySelectorAll('.note-filter-pill');
    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.filterType = pill.dataset.filter || 'all';
        this.renderNotesList();
      });
    });

    // Back to Dashboard button in page
    $('#btn-notebook-back-dashboard')?.addEventListener('click', () => {
      bus.emit('view:switch', 'dashboard');
    });

    // Content live update for split/preview
    const contentTextarea = $('#notebook-content-input');
    if (contentTextarea) {
      contentTextarea.addEventListener('input', () => {
        this.updateMarkdownPreview();
        this.setSaveStatus('unsaved');
      });
    }

    const titleInput = $('#notebook-title-input');
    if (titleInput) {
      titleInput.addEventListener('input', () => {
        this.setSaveStatus('unsaved');
      });
    }

    // External triggers (e.g. from Playlist Video "Take Note" button)
    bus.on('notebook:open', (context) => {
      bus.emit('view:switch', 'notebook');
      if (context && (context.videoId || context.playlistId)) {
        this.createNewLinkedNote(context);
      }
    });

    bus.on('notes:refresh', () => this.loadNotes());

    // Sync with auth lifecycle
    bus.on('auth:state-changed', async ({ isAuthenticated }) => {
      if (isAuthenticated) {
        await this.loadNotes();
      } else {
        this.notes = [];
        this.resetEditor();
        this.renderNotesList();
        this.updateHeaderBadge();
      }
    });

    // Sync with global store state changes
    bus.on('state:changed', (state) => {
      if (state?.notes && state.notes !== this.notes) {
        this.notes = state.notes;
        this.renderNotesList();
        this.updateHeaderBadge();
      }
    });

    window.addEventListener('langchanged', () => {
      this.renderNotesList();
      this.updateHeaderBadge();
    });
  }

  setupModeSwitch() {
    const modeButtons = document.querySelectorAll('.toolbar-mode-btn');
    const workspace = $('#notebook-content-workspace');

    modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.mode;
        this.currentMode = mode;

        if (workspace) {
          workspace.classList.remove('mode-edit', 'mode-preview', 'mode-split');
          workspace.classList.add(`mode-${mode}`);
        }

        if (mode === 'preview' || mode === 'split') {
          this.updateMarkdownPreview();
        }
      });
    });
  }

  setupToolbar() {
    const textarea = $('#notebook-content-input');
    if (!textarea) return;

    const insertFormatting = (prefix, suffix = '') => {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selText = textarea.value.substring(start, end);
      const replacement = `${prefix}${selText || (i18n.lang === 'ar' ? 'نص' : 'text')}${suffix}`;
      textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
      textarea.focus();
      textarea.selectionStart = start + prefix.length;
      textarea.selectionEnd = start + prefix.length + (selText.length || 3);
      this.updateMarkdownPreview();
      this.setSaveStatus('unsaved');
    };

    $('#nb-tool-bold')?.addEventListener('click', () => insertFormatting('**', '**'));
    $('#nb-tool-italic')?.addEventListener('click', () => insertFormatting('*', '*'));
    $('#nb-tool-h1')?.addEventListener('click', () => insertFormatting('# '));
    $('#nb-tool-h2')?.addEventListener('click', () => insertFormatting('## '));
    $('#nb-tool-code')?.addEventListener('click', () => insertFormatting('`', '`'));
    $('#nb-tool-codeblock')?.addEventListener('click', () => insertFormatting('\n```\n', '\n```\n'));
    $('#nb-tool-list')?.addEventListener('click', () => insertFormatting('- '));
    $('#nb-tool-quote')?.addEventListener('click', () => insertFormatting('> '));
  }

  async loadNotes() {
    if (!authService.isAuthenticated()) {
      this.notes = [];
      this.renderNotesList();
      this.updateHeaderBadge();
      return;
    }

    try {
      this.notes = await api.getNotes();
      store.state.notes = this.notes;
      this.renderNotesList();
      this.updateHeaderBadge();

      // If active note exists, re-sync; else select first note if available
      if (this.activeNoteId) {
        const current = this.notes.find(n => n.id === this.activeNoteId);
        if (current) this.selectNote(current, false);
      } else if (this.notes.length > 0 && !this.linkedContext) {
        this.selectNote(this.notes[0], false);
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    }
  }

  updateHeaderBadge() {
    const badge = $('#header-notes-count');
    const topbarCount = $('#notebook-page-total-count');
    const mobileCount = $('#nb-tab-list-count');
    const count = this.notes.length;
    if (badge) badge.textContent = count;
    if (topbarCount) topbarCount.textContent = count;
    if (mobileCount) mobileCount.textContent = count;
  }

  renderNotesList() {
    const listContainer = $('#notebook-items-list');
    if (!listContainer) return;

    let filtered = this.notes.filter(note => {
      // Filter by type
      if (this.filterType === 'linked') {
        if (!note.playlist_id && !note.video_id) return false;
      } else if (this.filterType === 'general') {
        if (note.playlist_id || note.video_id) return false;
      }

      // Filter by search query
      if (this.searchQuery) {
        const titleMatch = (note.title || '').toLowerCase().includes(this.searchQuery);
        const contentMatch = (note.content || '').toLowerCase().includes(this.searchQuery);
        const videoMatch = (note.video_title || '').toLowerCase().includes(this.searchQuery);
        return titleMatch || contentMatch || videoMatch;
      }

      return true;
    });

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-dim);">
          <p style="font-size: 0.9rem;">${i18n.lang === 'ar' ? 'لا توجد ملاحظات مطابقة' : 'No notes found'}</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = '';
    filtered.forEach(note => {
      const card = document.createElement('div');
      card.className = `note-card-item ${this.activeNoteId === note.id ? 'active' : ''}`;

      const dateStr = note.updated_at 
        ? new Date(note.updated_at).toLocaleDateString(i18n.lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' })
        : '';

      const snippet = note.content 
        ? escapeHTML(note.content.replace(/[#*`>-]/g, '').trim()) 
        : (i18n.lang === 'ar' ? 'ملاحظة فارغة...' : 'Empty note...');

      card.innerHTML = `
        <div class="note-card-item-header">
          <div class="note-card-item-title">${escapeHTML(note.title || (i18n.lang === 'ar' ? 'بدون عنوان' : 'Untitled Note'))}</div>
          <button class="note-card-item-delete" title="${i18n.t('btn_delete')}" aria-label="Delete Note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
        <div class="note-card-item-snippet">${snippet}</div>
        <div class="note-card-item-footer">
          ${note.video_title ? `
            <span class="note-card-video-pill" title="${escapeHTML(note.video_title)}">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <span>${escapeHTML(note.video_title)}</span>
            </span>
          ` : `
            <span style="font-size: 0.72rem; color: var(--text-dim);">${i18n.lang === 'ar' ? 'ملاحظة عامة' : 'General Note'}</span>
          `}
          <span class="note-card-date">${dateStr}</span>
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (!e.target.closest('.note-card-item-delete')) {
          this.selectNote(note, true);
        }
      });

      const deleteNoteWithUndo = () => {
        card.style.display = 'none';
        const isAr = i18n.lang === 'ar';
        toast.undo(
          isAr ? `تم حذف ملاحظة "${note.title || 'بدون عنوان'}"` : `Deleted note "${note.title || 'Untitled'}"`,
          () => {
            card.style.display = '';
          },
          async () => {
            try {
              await api.deleteNote(note.id);
              if (this.activeNoteId === note.id) {
                this.resetEditor();
              }
              card.remove();
              await this.loadNotes();
            } catch (err) {
              card.style.display = '';
              toast.error(err.message);
            }
          },
          5000
        );
      };

      card.querySelector('.note-card-item-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteNoteWithUndo();
      });

      listContainer.appendChild(card);
    });
  }

  selectNote(note, shouldSwitchMobileTab = false) {
    this.activeNoteId = note.id;
    this.linkedContext = null;

    $('#notebook-title-input').value = note.title || '';
    $('#notebook-content-input').value = note.content || '';

    // Linked Banner
    const banner = $('#notebook-linked-banner');
    const bannerText = $('#notebook-linked-text');
    const bannerLink = $('#notebook-linked-url');

    if (note.video_title || note.playlist_title) {
      if (banner) banner.style.display = 'flex';
      if (bannerText) {
        bannerText.textContent = note.video_title 
          ? `${note.video_title} (${note.playlist_title || ''})`
          : note.playlist_title;
      }
      if (bannerLink) {
        if (note.video_url) {
          bannerLink.href = note.video_url;
          bannerLink.style.display = 'inline-flex';
        } else {
          bannerLink.style.display = 'none';
        }
      }
    } else {
      if (banner) banner.style.display = 'none';
    }

    this.updateMarkdownPreview();
    this.setSaveStatus('saved');
    this.renderNotesList();

    if (shouldSwitchMobileTab) {
      this.setMobileTab('editor');
    }
  }

  createNewLinkedNote(context) {
    this.activeNoteId = null;
    this.linkedContext = context;

    const defaultTitle = context.videoTitle 
      ? `${i18n.lang === 'ar' ? 'ملاحظات' : 'Notes'}: ${context.videoTitle}`
      : `${i18n.lang === 'ar' ? 'ملاحظات' : 'Notes'}: ${context.playlistTitle}`;

    $('#notebook-title-input').value = defaultTitle;
    $('#notebook-content-input').value = '';

    const banner = $('#notebook-linked-banner');
    const bannerText = $('#notebook-linked-text');
    const bannerLink = $('#notebook-linked-url');

    if (banner) banner.style.display = 'flex';
    if (bannerText) {
      bannerText.textContent = context.videoTitle 
        ? `${context.videoTitle} (${context.playlistTitle || ''})`
        : context.playlistTitle;
    }
    if (bannerLink) {
      if (context.videoUrl) {
        bannerLink.href = context.videoUrl;
        bannerLink.style.display = 'inline-flex';
      } else {
        bannerLink.style.display = 'none';
      }
    }

    this.updateMarkdownPreview();
    this.setSaveStatus('unsaved');
    $('#notebook-content-input').focus();
    this.renderNotesList();
    this.setMobileTab('editor');
  }

  resetEditor() {
    this.activeNoteId = null;
    this.linkedContext = null;

    $('#notebook-title-input').value = '';
    $('#notebook-content-input').value = '';

    const banner = $('#notebook-linked-banner');
    if (banner) banner.style.display = 'none';

    this.updateMarkdownPreview();
    this.setSaveStatus('unsaved');
    $('#notebook-title-input').focus();
    this.renderNotesList();
  }

  async saveCurrentNote() {
    const title = $('#notebook-title-input').value.trim();
    const content = $('#notebook-content-input').value.trim();

    if (!title && !content) {
      toast.info(i18n.lang === 'ar' ? 'يرجى كتابة عنوان أو محتوى للملاحظة أولاً' : 'Please enter a title or content');
      return;
    }

    const saveBtn = $('#btn-notebook-save-note');
    const origBtnHtml = saveBtn?.innerHTML;
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<div class="spinner" style="width: 14px; height: 14px;"></div> ' + (i18n.lang === 'ar' ? 'جاري الحفظ...' : 'Saving...');
    }

    try {
      if (this.activeNoteId) {
        await api.updateNote(this.activeNoteId, {
          title: title || (i18n.lang === 'ar' ? 'بدون عنوان' : 'Untitled Note'),
          content
        });
      } else {
        const payload = {
          title: title || (i18n.lang === 'ar' ? 'بدون عنوان' : 'Untitled Note'),
          content,
          playlist_id: this.linkedContext?.playlistId || null,
          video_id: this.linkedContext?.videoId || null
        };
        const created = await api.createNote(payload);
        this.activeNoteId = created.id;
      }

      this.setSaveStatus('saved');
      toast.success(i18n.lang === 'ar' ? 'تم حفظ الملاحظة بنجاح ✓' : 'Note saved successfully ✓');
      await this.loadNotes();
    } catch (err) {
      toast.error(err.message);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = origBtnHtml;
      }
    }
  }

  async aiEnhanceNote() {
    const title = $('#notebook-title-input').value.trim() || 'Study Notes';
    const content = $('#notebook-content-input').value.trim();

    if (!content) {
      toast.info(i18n.lang === 'ar' ? 'اكتب محتوى أولاً في الملاحظة ليتم تحسينه وتلخيصه بالذكاء الاصطناعي.' : 'Please write note content first.');
      return;
    }

    const aiBtn = $('#btn-notebook-ai-enhance');
    const origHtml = aiBtn.innerHTML;
    aiBtn.innerHTML = '<div class="spinner" style="width: 14px; height: 14px;"></div> ' + (i18n.lang === 'ar' ? 'جاري التنسيق الذكي...' : 'Polishing...');
    aiBtn.disabled = true;

    try {
      const enhanced = await api.enhanceNote(title, content);
      $('#notebook-content-input').value = enhanced;
      this.updateMarkdownPreview();
      document.querySelector('.toolbar-mode-btn[data-mode="preview"]')?.click();
      await this.saveCurrentNote();
      toast.success(i18n.lang === 'ar' ? 'تم تحسين وتنسيق الملاحظة بالذكاء الاصطناعي ✨' : 'Note polished with AI ✨');
    } catch (err) {
      toast.error(err.message);
    } finally {
      aiBtn.innerHTML = origHtml;
      aiBtn.disabled = false;
    }
  }

  exportNote() {
    const title = $('#notebook-title-input').value.trim() || 'zenith-note';
    const content = $('#notebook-content-input').value;

    if (!content) {
      toast.info(i18n.lang === 'ar' ? 'لا يوجد محتوى لتصديره.' : 'No content to export.');
      return;
    }

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[\/\\?%*:|"<>]/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(i18n.lang === 'ar' ? 'تم تصدير الملاحظة بصيغة Markdown (.md)' : 'Note exported as Markdown (.md)');
  }

  setSaveStatus(status) {
    const statusEl = $('#notebook-save-status');
    if (!statusEl) return;

    if (status === 'saved') {
      statusEl.className = 'note-save-status saved';
      statusEl.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <span>${i18n.lang === 'ar' ? 'تم الحفظ' : 'Saved'}</span>
      `;
    } else {
      statusEl.className = 'note-save-status';
      statusEl.innerHTML = `
        <span style="width: 7px; height: 7px; border-radius: 50%; background: var(--accent-amber); display: inline-block;"></span>
        <span>${i18n.lang === 'ar' ? 'تعديلات غير محفوظة' : 'Unsaved changes'}</span>
      `;
    }
  }

  updateMarkdownPreview() {
    const previewContainer = $('#notebook-markdown-preview');
    if (!previewContainer) return;

    const raw = $('#notebook-content-input').value || '';
    if (!raw.trim()) {
      previewContainer.innerHTML = `
        <p style="color: var(--text-dim); font-style: italic;">${i18n.lang === 'ar' ? 'المعاينة فارغة. اكتب نصاً في المحرر لمشاهدة التنسيق المباشر.' : 'Preview is empty. Type in editor to see formatted output.'}</p>
      `;
      return;
    }

    previewContainer.innerHTML = this.renderMarkdown(raw);
  }

  /**
   * Lightweight secure Markdown to HTML renderer.
   */
  renderMarkdown(text) {
    let safe = escapeHTML(text);

    // Code blocks: ```code```
    safe = safe.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Inline code: `code`
    safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headings
    safe = safe.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    safe = safe.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    safe = safe.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold: **text**
    safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic: *text*
    safe = safe.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Blockquote: > text
    safe = safe.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

    // Bullet lists: - item or * item
    safe = safe.replace(/^\s*[-*]\s+(.*$)/gim, '<li>$1</li>');
    safe = safe.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');

    // Paragraph breaks
    safe = safe.replace(/\n\n/g, '</p><p>');
    safe = `<p>${safe.replace(/\n/g, '<br>')}</p>`;

    // Clean up empty paragraphs
    safe = safe.replace(/<p><\/p>/g, '');

    return safe;
  }

  /**
   * Toggle between Notes List and Note Editor on mobile devices.
   */
  setMobileTab(tab) {
    this.mobileTab = tab;
    const workspace = $('.notebook-workspace');
    const tabListBtn = $('#btn-nb-tab-list');
    const tabEditorBtn = $('#btn-nb-tab-editor');

    if (workspace) {
      workspace.classList.remove('nb-view-list', 'nb-view-editor');
      workspace.classList.add(`nb-view-${tab}`);
    }

    if (tabListBtn) tabListBtn.classList.toggle('active', tab === 'list');
    if (tabEditorBtn) tabEditorBtn.classList.toggle('active', tab === 'editor');
    document.body.classList.toggle('nb-editor-active', tab === 'editor');

    if (tab === 'editor') {
      const titleInput = $('#notebook-title-input');
      if (titleInput && !titleInput.value) {
        titleInput.focus();
      }
    }
  }
}
