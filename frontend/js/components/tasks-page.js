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
import { attachSwipeAction, attachPullToRefresh } from '../utils/gestures.js';
import { bottomSheet } from './bottom-sheet.js';
import { $ } from '../utils/dom.js';

export class TasksPageComponent {
  constructor() {
    this.selectedCategory = 'all';
    this.selectedStatus = 'all'; // 'all' | 'pending' | 'completed'
    this.bindEvents();
    this.render();
  }

  bindEvents() {
    // Toggle collapsible add task form
    $('#btn-toggle-tasks-form')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleForm();
    });
    $('#header-tasks-toggle')?.addEventListener('click', () => this.toggleForm());
    $('#btn-cancel-tasks-form')?.addEventListener('click', () => this.toggleForm(false));

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
    bus.on('modal:task:open', () => this.toggleForm(true));
    window.addEventListener('langchanged', () => this.render());

    // Pull to refresh on mobile
    const pageEl = $('#view-tasks');
    if (pageEl) {
      attachPullToRefresh(pageEl, async () => {
        await store.refreshTasks();
        toast.info(i18n.lang === 'ar' ? 'تم تحديث المهام' : 'Tasks refreshed');
      });
    }
  }

  toggleForm(forceOpen = null) {
    const collapseEl = $('#tasks-form-collapse');
    const toggleBtn = $('#btn-toggle-tasks-form');
    if (!collapseEl) return;

    const isCurrentlyOpen = collapseEl.style.display !== 'none';
    const shouldOpen = forceOpen !== null ? forceOpen : !isCurrentlyOpen;

    if (shouldOpen) {
      collapseEl.style.display = 'block';
      collapseEl.classList.add('open');
      toggleBtn?.classList.add('active');
      $('#input-page-task-title')?.focus();
    } else {
      collapseEl.style.display = 'none';
      collapseEl.classList.remove('open');
      toggleBtn?.classList.remove('active');
    }
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
      this.toggleForm(false);
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
      if (emptyState) {
        emptyState.style.display = 'block';
        const isAr = i18n.lang === 'ar';
        emptyState.innerHTML = `
          <div style="font-size: 2.4rem; margin-bottom: 10px;">📋</div>
          <p style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">${i18n.t('empty_tasks_title') || 'No tasks yet'}</p>
          <p style="font-size: 0.9rem; color: var(--text-dim); max-width: 380px; margin: 0 auto 16px;">${i18n.t('empty_tasks_desc') || 'Record your daily tasks.'}</p>
          <button type="button" class="btn btn-primary btn-empty-add-task" style="padding: 8px 20px;">
            <span>+ ${isAr ? 'إضافة أول مهمة' : 'Add First Task'}</span>
          </button>
        `;
        emptyState.querySelector('.btn-empty-add-task')?.addEventListener('click', () => {
          this.openMobileAddTaskSheet();
        });
      }
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    filtered.forEach(task => {
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
        <div class="swipe-content glass-card task-card ${isCompleted ? 'is-completed' : ''}" style="margin-bottom: 0;">
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
        </div>
      `;

      const card = wrapper.querySelector('.swipe-content');
      const cb = wrapper.querySelector('.task-page-checkbox');

      // Toggle Task logic
      const toggleTaskState = async () => {
        try {
          await api.toggleTask(task.id);
          const comp = !card.classList.contains('is-completed');
          card.classList.toggle('is-completed', comp);
          cb.checked = comp;
          if (comp) {
            triggerConfetti();
            toast.success(i18n.lang === 'ar' ? 'أحسنت! أتممت هذه المهمة 🎯' : 'Task completed!');
          }
          await store.refreshTasks();
        } catch (err) {
          toast.error(err.message);
        }
      };

      cb?.addEventListener('change', toggleTaskState);

      // Delete with Undo Toast
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

      wrapper.querySelector('.btn-page-delete-task')?.addEventListener('click', deleteTaskWithUndo);

      // Attach Touch Swipe Gestures
      attachSwipeAction(wrapper, {
        onSwipeComplete: toggleTaskState,
        onSwipeDelete: deleteTaskWithUndo
      });

      grid.appendChild(wrapper);
    });
  }

  openMobileAddTaskSheet() {
    const isAr = i18n.lang === 'ar';
    const content = document.createElement('form');
    content.className = 'auth-form';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.gap = '12px';
    content.innerHTML = `
      <div class="form-group">
        <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">${isAr ? 'عنوان المهمة' : 'Task Title'}</label>
        <input id="sheet-input-task-title" type="text" placeholder="${isAr ? 'مثال: مراجعة وحل تمارين' : 'e.g. Code Review'}" style="width: 100%;" required>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div class="form-group">
          <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">${isAr ? 'الأولوية' : 'Priority'}</label>
          <select id="sheet-select-task-priority" style="width: 100%;">
            <option value="medium">${isAr ? 'متوسطة' : 'Medium'}</option>
            <option value="high">${isAr ? 'عالية' : 'High'}</option>
            <option value="low">${isAr ? 'منخفضة' : 'Low'}</option>
          </select>
        </div>
        <div class="form-group">
          <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">${isAr ? 'التصنيف' : 'Category'}</label>
          <select id="sheet-select-task-category" style="width: 100%;">
            <option value="study">${isAr ? 'مذاكرة' : 'Study'}</option>
            <option value="work">${isAr ? 'عمل' : 'Work'}</option>
            <option value="personal">${isAr ? 'شخصي' : 'Personal'}</option>
            <option value="general">${isAr ? 'عام' : 'General'}</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">${isAr ? 'تفاصيل المهمة (اختياري)' : 'Details (Optional)'}</label>
        <input id="sheet-input-task-desc" type="text" placeholder="${isAr ? 'مراجع، روابط، تفاصيل...' : 'Details...'}" style="width: 100%;">
      </div>
      <div class="form-group">
        <label style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 4px;">${isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</label>
        <input id="sheet-input-task-duedate" type="date" style="width: 100%;">
      </div>
      <button type="submit" class="btn btn-primary" style="margin-top: 6px; padding: 12px; width: 100%;">
        <span>${isAr ? 'حفظ المهمة' : 'Save Task'}</span>
      </button>
    `;

    content.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = content.querySelector('#sheet-input-task-title').value.trim();
      const desc = content.querySelector('#sheet-input-task-desc').value.trim();
      const priority = content.querySelector('#sheet-select-task-priority').value;
      const category = content.querySelector('#sheet-select-task-category').value;
      const duedate = content.querySelector('#sheet-input-task-duedate').value;

      if (!title) return;

      const btn = content.querySelector('button[type="submit"]');
      btn.disabled = true;

      try {
        await api.createTask({
          title,
          description: desc || null,
          priority,
          category,
          due_date: duedate || null,
          is_completed: false
        });
        toast.success(isAr ? 'تمت إضافة المهمة بنجاح 📋' : 'Task added successfully');
        bottomSheet.close();
        await store.refreshTasks();
      } catch (err) {
        toast.error(err.message);
      } finally {
        btn.disabled = false;
      }
    });

    bottomSheet.open(
      `<span>✦</span> <span>${isAr ? 'إضافة مهمة جديدة' : 'Add New Task'}</span>`,
      content,
      () => {
        content.querySelector('#sheet-input-task-title')?.focus();
      }
    );
  }
}
