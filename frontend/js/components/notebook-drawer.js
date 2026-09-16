/**
 * Notebook Drawer Component: Slide-over drawer with Markdown editor,
 * video linkage, AI note enhancement, and export capability.
 * Enhanced with Toast notifications and accessible confirm dialogs (UI/UX Pro Max).
 */
import { api } from '../services/api-client.js';
import { store } from '../core/store.js';
import { bus } from '../core/event-bus.js';
import { i18n } from '../i18n/translator.js';
import { escapeHTML } from '../utils/sanitize.js';
import { toast } from '../utils/toast.js';
import { $ } from '../utils/dom.js';

export class NotebookDrawerComponent {
  constructor() {
    this.drawer = $('#notebook-drawer');
    this.backdrop = $('#notebook-drawer-backdrop');
    this.activeNoteId = null;
    this.linkedContext = null; // { playlistId, playlistTitle, videoId, videoTitle }
    this.init();
  }

  init() {
    // Open/Close triggers
    bus.on('drawer:notebook:open', (context) => {
      this.linkedContext = context || null;
      this.open();
      if (context) {
        this.createNewLinkedNote(context);
      } else {
        this.loadNotesList();
      }
    });

    $('#btn-close-notebook')?.addEventListener('click', () => this.close());
    this.backdrop?.addEventListener('click', () => this.close());

    // Create New Note button
    $('#btn-new-note')?.addEventListener('click', () => {
      this.resetEditor();
    });

    // Save note
    $('#btn-save-note')?.addEventListener('click', () => this.saveCurrentNote());

    // AI Enhance Note
    $('#btn-ai-enhance-note')?.addEventListener('click', () => this.aiEnhanceNote());

    // Export Note
    $('#btn-export-note')?.addEventListener('click', () => this.exportNote());

    // Markdown Quick formatting toolbar
    this.setupToolbar();
  }

  open() {
    this.drawer?.classList.add('open');
    this.backdrop?.classList.add('open');
    this.loadNotesList();
  }

  close() {
    this.drawer?.classList.remove('open');
    this.backdrop?.classList.remove('open');
  }

  async loadNotesList() {
    const listContainer = $('#notebook-notes-list');
    if (!listContainer) return;

    try {
      const notes = await api.getNotes();
      store.state.notes = notes;

      if (notes.length === 0) {
        listContainer.innerHTML = `<p style="padding: 1rem; color: var(--text-dim); text-align: center; font-size: 0.85rem;">${i18n.lang === 'ar' ? 'لا توجد ملاحظات محفوظة بعد. اضغط ملاحظة جديدة.' : 'No notes saved yet. Click New Note.'}</p>`;
        return;
      }

      listContainer.innerHTML = '';
      notes.forEach(note => {
        const item = document.createElement('div');
        item.className = `note-nav-item ${this.activeNoteId === note.id ? 'active' : ''}`;
        const isActive = this.activeNoteId === note.id;
        item.style.cssText = `
          padding: 9px 14px;
          border-radius: var(--radius-sm);
          background: ${isActive ? 'rgba(99, 102, 241, 0.18)' : 'rgba(255, 255, 255, 0.035)'};
          border: 1px solid ${isActive ? 'rgba(99, 102, 241, 0.45)' : 'rgba(255, 255, 255, 0.06)'};
          margin-bottom: 6px;
          cursor: pointer;
          transition: all var(--transition-fast);
          display: flex;
          justify-content: space-between;
          align-items: center;
        `;

        item.innerHTML = `
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; font-size: 0.88rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-main);">
              ${escapeHTML(note.title || 'Untitled Note')}
            </div>
            ${note.video_title ? `
              <div style="font-size: 0.72rem; color: var(--accent-primary); display: flex; align-items: center; gap: 4px; margin-top: 2px;">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                ${escapeHTML(note.video_title)}
              </div>
            ` : ''}
          </div>
          <button class="btn-delete-single-note" style="color: var(--text-dim); opacity: 0.6; padding: 4px; border-radius: 4px; transition: all 0.15s;" title="${i18n.t('btn_delete')}" aria-label="Delete Note">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        `;

        item.addEventListener('click', (e) => {
          if (!e.target.closest('.btn-delete-single-note')) {
            this.selectNote(note);
          }
        });

        item.querySelector('.btn-delete-single-note').addEventListener('click', async (e) => {
          e.stopPropagation();
          const confirmed = await toast.confirm(
            i18n.lang === 'ar' ? 'حذف الملاحظة' : 'Delete Note',
            i18n.lang === 'ar' ? `هل أنت متأكد من حذف ملاحظة "${note.title}"؟` : `Delete note "${note.title}"?`
          );

          if (confirmed) {
            await api.deleteNote(note.id);
            if (this.activeNoteId === note.id) {
              this.resetEditor();
            }
            this.loadNotesList();
            toast.info(i18n.lang === 'ar' ? 'تم حذف الملاحظة' : 'Note deleted');
            store.refreshNotes();
          }
        });

        listContainer.appendChild(item);
      });
    } catch (err) {
      console.error('Failed to load notes:', err);
    }
  }

  selectNote(note) {
    this.activeNoteId = note.id;
    $('#note-title-input').value = note.title || '';
    $('#note-content-input').value = note.content || '';

    const contextEl = $('#note-context-badge');
    if (contextEl) {
      if (note.video_title || note.playlist_title) {
        contextEl.style.display = 'block';
        contextEl.textContent = `🔗 ${note.video_title || note.playlist_title}`;
      } else {
        contextEl.style.display = 'none';
      }
    }
    this.loadNotesList();
  }

  createNewLinkedNote(context) {
    this.activeNoteId = null;
    $('#note-title-input').value = context.videoTitle ? `ملاحظات: ${context.videoTitle}` : `ملاحظات: ${context.playlistTitle}`;
    $('#note-content-input').value = '';

    const contextEl = $('#note-context-badge');
    if (contextEl) {
      contextEl.style.display = 'block';
      contextEl.textContent = `🔗 ${context.videoTitle || context.playlistTitle}`;
    }
  }

  resetEditor() {
    this.activeNoteId = null;
    this.linkedContext = null;
    $('#note-title-input').value = '';
    $('#note-content-input').value = '';
    const contextEl = $('#note-context-badge');
    if (contextEl) contextEl.style.display = 'none';
    $('#note-title-input').focus();
    this.loadNotesList();
  }

  async saveCurrentNote() {
    const title = $('#note-title-input').value.trim();
    const content = $('#note-content-input').value.trim();

    if (!title && !content) return;

    try {
      if (this.activeNoteId) {
        await api.updateNote(this.activeNoteId, { title: title || 'بدون عنوان', content });
      } else {
        const payload = {
          title: title || 'بدون عنوان',
          content,
          playlist_id: this.linkedContext?.playlistId || null,
          video_id: this.linkedContext?.videoId || null
        };
        const newNote = await api.createNote(payload);
        this.activeNoteId = newNote.id;
      }

      this.loadNotesList();
      store.refreshNotes();
      toast.success(i18n.lang === 'ar' ? 'تم حفظ الملاحظة بنجاح' : 'Note saved successfully');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async aiEnhanceNote() {
    const title = $('#note-title-input').value.trim() || 'ملاحظات مذاكرة';
    const content = $('#note-content-input').value.trim();

    if (!content) {
      toast.info(i18n.lang === 'ar' ? 'اكتب محتوى أولاً في الملاحظة ليتم تحسينه بالذكاء الاصطناعي.' : 'Please write some note content first.');
      return;
    }

    const aiBtn = $('#btn-ai-enhance-note');
    const origHtml = aiBtn.innerHTML;
    aiBtn.innerHTML = '<div class="spinner" style="width: 14px; height: 14px;"></div> ' + (i18n.lang === 'ar' ? 'جاري التحسين...' : 'Polishing...');
    aiBtn.disabled = true;

    try {
      const enhanced = await api.enhanceNote(title, content);
      $('#note-content-input').value = enhanced;
      await this.saveCurrentNote();
      toast.success(i18n.lang === 'ar' ? 'تم تحسين وتنسيق الملاحظة بنجاح ✨' : 'Note polished with AI');
    } catch (err) {
      toast.error(err.message);
    } finally {
      aiBtn.innerHTML = origHtml;
      aiBtn.disabled = false;
    }
  }

  exportNote() {
    const title = $('#note-title-input').value.trim() || 'note';
    const content = $('#note-content-input').value;

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
    toast.success(i18n.lang === 'ar' ? 'تم تصدير الملاحظة بصيغة Markdown' : 'Note exported as Markdown');
  }

  setupToolbar() {
    const textarea = $('#note-content-input');
    if (!textarea) return;

    const insertFormatting = (prefix, suffix = '') => {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selText = textarea.value.substring(start, end);
      const replacement = `${prefix}${selText || 'نص'}${suffix}`;
      textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
      textarea.focus();
      textarea.selectionStart = start + prefix.length;
      textarea.selectionEnd = start + prefix.length + (selText.length || 2);
    };

    $('#tool-bold')?.addEventListener('click', () => insertFormatting('**', '**'));
    $('#tool-h2')?.addEventListener('click', () => insertFormatting('## '));
    $('#tool-code')?.addEventListener('click', () => insertFormatting('`', '`'));
    $('#tool-list')?.addEventListener('click', () => insertFormatting('- '));
  }
}
