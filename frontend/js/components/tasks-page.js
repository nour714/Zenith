/**
 * Tasks Page Component: Dedicated full page for task creation,
 * categorization, filtering, and status completion.
 */
import { api } from '../services/api-client.js';
import { store } from '../core/store.js';
import { bus } from '../core/event-bus.js';
import { escapeHTML } from '../utils/sanitize.js';
import { triggerConfetti } from '../utils/confetti.js';
import { toast } from '../utils/toast.js';
import { i18n } from '../i18n/translator.js';
import { $ } from '../utils/dom.js';

export class TasksPageComponent {
  constructor() {
    this.selectedCategory = 'all';
    this.selectedStatus = 'all'; // 'all' | 'pending' | 'completed'
    this.bindEvents();
    this.render();
  }

  bindEvents() {
    // Form submit for adding task
    const form = $('#form-page-create-task');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleCreateTask();
    });

    // Category filter pills
    const catPills = document.querySelectorAll('.task-cat-pill');
    catPills.forEach(pill => {
      pill.addEventListener('click', () => {
        catPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.selectedCategory = pill.dataset.cat || 'all';
        this.render();
      });
    });

    // Status filter pills
    const statusPills = document.querySelectorAll('.task-status-pill');
    statusPills.forEach(pill => {
      pill.addEventListener('click', () => {
        statusPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.selectedStatus = pill.dataset.status || 'all';
        this.render();
      });
    });

    bus.on('tasks:updated', () => this.render());
    bus.on('state:changed', () => this.render());
    window.addEventListener('langchanged', () => this.render());
  }

  async handleCreateTask() {
    const inputTitle = $('#input-page-task-title');
    const inputDesc = $('#input-page-task-desc');
    const selectPriority = $('#select-page-task-priority');
    const selectCategory = $('#select-page-task-category');
    const inputDueDate = $('#input-page-task-duedate');
    const submitBtn = $('#btn-page-task-submit');

    const title = inputTitle?.value.trim();
    if (!title) return;

    if (submitBtn) submitBtn.disabled = true;

    try {
      await api.createTask({
        title,
        description: inputDesc?.value.trim() || null,
        priority: selectPriority?.value || 'medium',
        category: selectCategory?.value || 'general',
        due_date: inputDueDate?.value || null,
        is_completed: false,
      });

      toast.success(i18n.lang === 'ar' ? 'تمت إضافة المهمة بنجاح 📋' : 'Task created successfully');
      if (inputTitle) inputTitle.value = '';
      if (inputDesc) inputDesc.value = '';
      if (inputDueDate) inputDueDate.value = '';

      await store.refreshTasks();
    } catch (err) {
      toast.error(err.message);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  render() {
    const grid = $('#page-tasks-grid');
    const emptyState = $('#page-tasks-empty');
    const badgeCount = $('#page-tasks-count-badge');
    if (!grid) return;

    const tasks = store.getState().tasks || [];
    let filtered = tasks;

    // Filter by Category
    if (this.selectedCategory !== 'all') {
      filtered = filtered.filter(t => (t.category || 'general') === this.selectedCategory);
    }

    // Filter by Status
    if (this.selectedStatus === 'pending') {
      filtered = filtered.filter(t => !t.is_completed);
    } else if (this.selectedStatus === 'completed') {
      filtered = filtered.filter(t => !!t.is_completed);
    }

    if (badgeCount) {
      badgeCount.textContent = tasks.length;
    }

    grid.innerHTML = '';
    if (filtered.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    filtered.forEach(task => {
      const isCompleted = !!task.is_completed;
      const card = document.createElement('div');
      card.className = `glass-card task-card ${isCompleted ? 'is-completed' : ''}`;
      card.dataset.id = task.id;

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

      card.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 12px;">
          <input type="checkbox" class="task-page-checkbox" ${isCompleted ? 'checked' : ''} aria-label="${escapeHTML(task.title)}" style="margin-top: 4px; width: 19px; height: 19px; cursor: pointer; accent-color: var(--accent-purple);">
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px;">
              <span class="task-title ${isCompleted ? 'completed-text' : ''}" style="font-weight: 700; font-size: 1rem; color: var(--text-main);">${escapeHTML(task.title)}</span>
              <span class="badge" style="background: ${pInfo.bg}; color: ${pInfo.color}; font-size: 0.72rem; padding: 2px 8px;">${pInfo.label}</span>
              <span class="badge" style="background: rgba(255, 255, 255, 0.06); color: var(--text-muted); font-size: 0.72rem; padding: 2px 8px;">🏷️ ${catLabel}</span>
            </div>
            ${task.description ? `<p style="font-size: 0.85rem; color: var(--text-dim); margin-top: 4px; line-height: 1.4;">${escapeHTML(task.description)}</p>` : ''}
            ${task.due_date ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 6px; display: flex; align-items: center; gap: 5px;">📅 ${i18n.lang === 'ar' ? 'الاستحقاق' : 'Due'}: ${escapeHTML(task.due_date)}</div>` : ''}
          </div>
          <button class="btn-icon btn-page-delete-task" title="${i18n.t('btn_delete')}" aria-label="Delete Task" style="color: var(--text-dim);">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      `;

      // Checkbox event
      const cb = card.querySelector('.task-page-checkbox');
      cb?.addEventListener('change', async () => {
        try {
          await api.toggleTask(task.id);
          if (cb.checked) {
            triggerConfetti();
            toast.success(i18n.lang === 'ar' ? 'أحسنت! أتممت هذه المهمة 🎯' : 'Task completed!');
          }
          await store.refreshTasks();
        } catch (err) {
          cb.checked = !cb.checked;
          toast.error(err.message);
        }
      });

      // Delete event
      card.querySelector('.btn-page-delete-task')?.addEventListener('click', async () => {
        const confirmed = await toast.confirm(
          i18n.lang === 'ar' ? 'حذف المهمة' : 'Delete Task',
          i18n.lang === 'ar' ? `هل أنت متأكد من حذف المهمة "${task.title}"؟` : `Are you sure you want to delete "${task.title}"?`,
          i18n.lang === 'ar' ? 'نعم، حذف' : 'Delete',
          i18n.lang === 'ar' ? 'إلغاء' : 'Cancel'
        );
        if (confirmed) {
          try {
            await api.deleteTask(task.id);
            toast.success(i18n.lang === 'ar' ? 'تم حذف المهمة' : 'Task deleted');
            await store.refreshTasks();
          } catch (err) {
            toast.error(err.message);
          }
        }
      });

      grid.appendChild(card);
    });
  }
}
