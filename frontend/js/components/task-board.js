/**
 * Task Board Component: Renders custom daily/study to-do items and modal logic.
 * Enhanced with accessible confirmations and feedback toasts (UI/UX Pro Max).
 */
import { api } from '../services/api-client.js';
import { store } from '../core/store.js';
import { bus } from '../core/event-bus.js';
import { i18n } from '../i18n/translator.js';
import { escapeHTML } from '../utils/sanitize.js';
import { triggerConfetti } from '../utils/confetti.js';
import { toast } from '../utils/toast.js';
import { $ } from '../utils/dom.js';

export class TaskBoardComponent {
  constructor() {
    this.initModal();
  }

  static renderTaskCard(task) {
    const card = document.createElement('div');
    card.className = `task-item-card animate-float ${task.is_completed ? 'completed' : ''}`;
    card.dataset.id = task.id;

    const priorityColors = {
      high: 'var(--accent-rose)',
      medium: 'var(--accent-amber)',
      low: 'var(--accent-cyan)'
    };

    const categoryNames = {
      general: i18n.lang === 'ar' ? 'عام' : 'General',
      study: i18n.lang === 'ar' ? 'مذاكرة' : 'Study',
      work: i18n.lang === 'ar' ? 'عمل' : 'Work',
      personal: i18n.lang === 'ar' ? 'شخصي' : 'Personal'
    };

    card.innerHTML = `
      <input type="checkbox" class="video-checkbox" ${task.is_completed ? 'checked' : ''} style="margin-top: 3px;" aria-label="${escapeHTML(task.title)}">
      <div class="task-content">
        <h4 class="task-title">${escapeHTML(task.title)}</h4>
        ${task.description ? `<p class="task-desc">${escapeHTML(task.description)}</p>` : ''}
        <div class="task-meta-row">
          <span class="badge" style="background: rgba(255,255,255,0.06); color: ${priorityColors[task.priority] || 'var(--text-muted)'}; font-size: 0.72rem;">
            ● ${task.priority ? task.priority.toUpperCase() : 'NORMAL'}
          </span>
          <span class="badge" style="background: rgba(255,255,255,0.06); color: var(--text-dim); font-size: 0.72rem;">
            ${categoryNames[task.category] || task.category || 'General'}
          </span>
          ${task.due_date ? `
            <span style="font-size: 0.75rem; color: var(--text-dim); display: inline-flex; align-items: center; gap: 4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              ${escapeHTML(task.due_date)}
            </span>
          ` : ''}
        </div>
      </div>
      <button class="btn-delete-task" title="${i18n.t('btn_delete')}" aria-label="Delete Task">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    `;

    // Toggle Task
    const cb = card.querySelector('input[type="checkbox"]');
    cb.addEventListener('change', async () => {
      try {
        await api.toggleTask(task.id);
        const isComp = cb.checked;
        card.classList.toggle('completed', isComp);
        if (isComp) {
          triggerConfetti();
          toast.success(i18n.lang === 'ar' ? 'تم إنجاز المهمة بنجاح!' : 'Task completed!');
        }
        await store.refreshTasks();
      } catch (err) {
        cb.checked = !cb.checked;
        toast.error(err.message);
      }
    });

    // Delete Task with accessible dialog
    card.querySelector('.btn-delete-task').addEventListener('click', async () => {
      const confirmed = await toast.confirm(
        i18n.lang === 'ar' ? 'حذف المهمة' : 'Delete Task',
        i18n.lang === 'ar' ? `هل أنت متأكد من حذف المهمة "${task.title}"؟` : `Are you sure you want to delete "${task.title}"?`,
        i18n.lang === 'ar' ? 'نعم، حذف' : 'Delete',
        i18n.lang === 'ar' ? 'إلغاء' : 'Cancel'
      );

      if (confirmed) {
        try {
          await api.deleteTask(task.id);
          card.style.opacity = '0';
          card.style.transform = 'scale(0.95)';
          setTimeout(() => card.remove(), 250);
          toast.info(i18n.lang === 'ar' ? 'تم حذف المهمة' : 'Task deleted');
          await store.refreshTasks();
        } catch (err) {
          toast.error(err.message);
        }
      }
    });

    return card;
  }

  initModal() {
    const modal = $('#modal-task');
    const form = $('#form-create-task');
    const closeBtn = $('#btn-close-task-modal');
    const cancelBtn = $('#btn-cancel-task-modal');

    const closeModal = () => {
      modal?.classList.remove('open');
      form?.reset();
    };

    bus.on('modal:task:open', () => {
      modal?.classList.add('open');
      $('#input-task-title')?.focus();
    });

    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = $('#input-task-title').value.trim();
      if (!title) return;

      const description = $('#input-task-desc').value.trim();
      const priority = $('#select-task-priority').value;
      const category = $('#select-task-category').value;
      const dueDate = $('#input-task-duedate').value;

      try {
        await api.createTask({
          title,
          description: description || null,
          priority,
          category,
          due_date: dueDate || null,
        });
        closeModal();
        toast.success(i18n.lang === 'ar' ? 'تمت إضافة المهمة بنجاح' : 'Task created successfully');
        await store.refreshTasks();
      } catch (err) {
        toast.error(err.message);
      }
    });
  }
}
