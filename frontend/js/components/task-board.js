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
import { attachSwipeAction } from '../utils/gestures.js';
import { $ } from '../utils/dom.js';

export class TaskBoardComponent {
  constructor() {
    this.initModal();
  }

  static renderTaskCard(task) {
    const isCompleted = !!task.is_completed;
    const wrapper = document.createElement('div');
    wrapper.className = 'swipe-item-container animate-float';
    wrapper.dataset.id = task.id;

    const priorityMap = {
      high: { label: i18n.lang === 'ar' ? 'عالية' : 'High', color: 'var(--accent-rose)', bg: 'rgba(244, 63, 94, 0.12)' },
      medium: { label: i18n.lang === 'ar' ? 'متوسطة' : 'Medium', color: 'var(--accent-amber)', bg: 'rgba(245, 158, 11, 0.12)' },
      low: { label: i18n.lang === 'ar' ? 'منخفضة' : 'Low', color: 'var(--accent-emerald)', bg: 'rgba(16, 185, 129, 0.12)' },
    };
    const pInfo = priorityMap[task.priority] || priorityMap.medium;

    const categoryLabels = {
      general: i18n.lang === 'ar' ? 'عام' : 'General',
      study: i18n.lang === 'ar' ? 'مذاكرة' : 'Study',
      work: i18n.lang === 'ar' ? 'عمل' : 'Work',
      personal: i18n.lang === 'ar' ? 'شخصي' : 'Personal',
    };
    const catLabel = categoryLabels[task.category] || task.category || 'General';

    wrapper.innerHTML = `
      <div class="swipe-action-reveal"></div>
      <div class="swipe-content glass-card task-card task-item-card ${isCompleted ? 'is-completed completed' : ''}" style="margin-bottom: 0;">
        <div class="task-card-main">
          <!-- Custom Modern Checkbox -->
          <label class="task-custom-checkbox" title="${isCompleted ? (i18n.lang === 'ar' ? 'إلغاء الإنجاز' : 'Mark Incomplete') : (i18n.lang === 'ar' ? 'إتمام المهمة' : 'Mark Completed')}">
            <input type="checkbox" class="task-board-checkbox" ${isCompleted ? 'checked' : ''} aria-label="${escapeHTML(task.title)}">
            <span class="checkbox-visual">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </span>
          </label>

          <!-- Task Body -->
          <div class="task-card-body">
            <div class="task-header-line">
              <h4 class="task-card-title ${isCompleted ? 'completed-text' : ''}">${escapeHTML(task.title)}</h4>
              <div class="task-badges-row">
                <span class="badge priority-badge priority-${task.priority || 'medium'}">
                  <span class="priority-dot"></span>
                  ${pInfo.label}
                </span>
                <span class="badge category-badge">🏷️ ${catLabel}</span>
              </div>
            </div>

            ${task.description ? `<p class="task-card-desc">${escapeHTML(task.description)}</p>` : ''}

            ${task.due_date ? `
              <div class="task-card-footer">
                <span class="task-due-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  ${i18n.lang === 'ar' ? 'الاستحقاق:' : 'Due:'} ${escapeHTML(task.due_date)}
                </span>
              </div>
            ` : ''}
          </div>

          <!-- Action Buttons (Edit + Delete) -->
          <div class="task-card-actions">
            <button type="button" class="btn-task-action btn-task-edit" title="${i18n.lang === 'ar' ? 'تعديل المهمة' : 'Edit Task'}" aria-label="Edit Task">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button type="button" class="btn-task-action btn-task-delete" title="${i18n.t('btn_delete')}" aria-label="Delete Task">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

    const card = wrapper.querySelector('.swipe-content');
    const cb = wrapper.querySelector('input[type="checkbox"]');

    const toggleCompletion = async () => {
      try {
        await api.toggleTask(task.id);
        const isComp = !card.classList.contains('is-completed');
        card.classList.toggle('is-completed', isComp);
        card.classList.toggle('completed', isComp);
        const titleEl = card.querySelector('.task-card-title');
        if (titleEl) titleEl.classList.toggle('completed-text', isComp);
        cb.checked = isComp;
        if (isComp) {
          triggerConfetti();
          toast.success(i18n.lang === 'ar' ? 'تم إنجاز المهمة بنجاح! 🎯' : 'Task completed!');
        }
        await store.refreshTasks();
      } catch (err) {
        toast.error(err.message);
      }
    };

    cb.addEventListener('change', toggleCompletion);

    // Edit task handler -> switches view to tasks and triggers edit
    wrapper.querySelector('.btn-task-edit')?.addEventListener('click', (e) => {
      e.stopPropagation();
      bus.emit('view:switch', 'tasks');
      bus.emit('task:edit', task);
    });

    const deleteTaskWithUndo = () => {
      wrapper.style.display = 'none';
      const isAr = i18n.lang === 'ar';
      toast.undo(
        isAr ? `تم حذف "${task.title}"` : `Deleted "${task.title}"`,
        () => {
          wrapper.style.display = '';
        },
        async () => {
          try {
            await api.deleteTask(task.id);
            wrapper.remove();
            await store.refreshTasks();
          } catch (err) {
            wrapper.style.display = '';
            toast.error(err.message);
          }
        },
        5000
      );
    };

    wrapper.querySelector('.btn-task-delete')?.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTaskWithUndo();
    });

    attachSwipeAction(wrapper, {
      onSwipeComplete: toggleCompletion,
      onSwipeDelete: deleteTaskWithUndo
    });

    return wrapper;
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
