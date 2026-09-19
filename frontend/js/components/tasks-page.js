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
    this.editingTaskId = null;
    this.bindEvents();
    this.render();
  }

  bindEvents() {
    // Toggle collapsible add task form
    $('#btn-toggle-tasks-form')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const collapseEl = $('#tasks-form-collapse');
      const isCurrentlyOpen = collapseEl && collapseEl.style.display !== 'none';
      if (isCurrentlyOpen && this.editingTaskId) {
        this.resetForm();
      }
      this.toggleForm();
    });
    $('#header-tasks-toggle')?.addEventListener('click', () => this.toggleForm());
    $('#btn-cancel-tasks-form')?.addEventListener('click', () => {
      this.resetForm();
      this.toggleForm(false);
    });

    // Form submit for adding or updating task
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
    bus.on('task:edit', (task) => this.startEditTask(task));
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

  startEditTask(task) {
    if (!task) return;
    this.editingTaskId = task.id;

    const inputTitle = $('#input-page-task-title');
    const inputDesc = $('#input-page-task-desc');
    const selectPriority = $('#select-page-task-priority');
    const selectCategory = $('#select-page-task-category');
    const inputDueDate = $('#input-page-task-duedate');
    const submitBtn = $('#btn-page-task-submit');
    const actionHeader = $('#header-tasks-toggle .page-action-title span:last-child');
    const toggleBtnSpan = $('#btn-toggle-tasks-form span');

    if (inputTitle) inputTitle.value = task.title || '';
    if (inputDesc) inputDesc.value = task.description || '';
    if (selectPriority) selectPriority.value = task.priority || 'medium';
    if (selectCategory) selectCategory.value = task.category || 'general';
    if (inputDueDate) inputDueDate.value = task.due_date || '';

    const isAr = i18n.lang === 'ar';
    if (submitBtn) {
      const span = submitBtn.querySelector('span');
      if (span) span.textContent = isAr ? 'حفظ التعديلات' : 'Save Changes';
    }
    if (actionHeader) {
      actionHeader.textContent = isAr ? 'تعديل المهمة الحالية ✏️' : 'Edit Current Task ✏️';
    }
    if (toggleBtnSpan) {
      toggleBtnSpan.textContent = isAr ? 'تعديل المهمة' : 'Edit Task';
    }

    this.toggleForm(true);
    $('#card-tasks-add')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    inputTitle?.focus();
  }

  resetForm() {
    this.editingTaskId = null;

    const inputTitle = $('#input-page-task-title');
    const inputDesc = $('#input-page-task-desc');
    const selectPriority = $('#select-page-task-priority');
    const selectCategory = $('#select-page-task-category');
    const inputDueDate = $('#input-page-task-duedate');
    const submitBtn = $('#btn-page-task-submit');
    const actionHeader = $('#header-tasks-toggle .page-action-title span:last-child');
    const toggleBtnSpan = $('#btn-toggle-tasks-form span');

    if (inputTitle) inputTitle.value = '';
    if (inputDesc) inputDesc.value = '';
    if (selectPriority) selectPriority.value = 'medium';
    if (selectCategory) selectCategory.value = 'general';
    if (inputDueDate) inputDueDate.value = '';

    const isAr = i18n.lang === 'ar';
    if (submitBtn) {
      const span = submitBtn.querySelector('span');
      if (span) span.textContent = isAr ? 'حفظ المهمة' : 'Save Task';
    }
    if (actionHeader) {
      actionHeader.textContent = isAr ? 'إضافة مهمة جديدة' : 'Add Quick Task';
    }
    if (toggleBtnSpan) {
      toggleBtnSpan.textContent = isAr ? 'إضافة مهمة جديدة' : 'Add Quick Task';
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
      if (this.editingTaskId) {
        await api.updateTask(this.editingTaskId, {
          title,
          description: inputDesc?.value.trim() || null,
          priority: selectPriority?.value || 'medium',
          category: selectCategory?.value || 'general',
          due_date: inputDueDate?.value || null,
        });
        toast.success(i18n.lang === 'ar' ? 'تم تحديث المهمة بنجاح ✏️' : 'Task updated successfully');
      } else {
        await api.createTask({
          title,
          description: inputDesc?.value.trim() || null,
          priority: selectPriority?.value || 'medium',
          category: selectCategory?.value || 'general',
          due_date: inputDueDate?.value || null,
          is_completed: false,
        });
        toast.success(i18n.lang === 'ar' ? 'تمت إضافة المهمة بنجاح 📋' : 'Task created successfully');
      }

      this.resetForm();
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
          <div class="task-card-main">
            <!-- Custom Modern Checkbox -->
            <label class="task-custom-checkbox" title="${isCompleted ? (i18n.lang === 'ar' ? 'إلغاء الإنجاز' : 'Mark Incomplete') : (i18n.lang === 'ar' ? 'إتمام المهمة' : 'Mark Completed')}">
              <input type="checkbox" class="task-page-checkbox" ${isCompleted ? 'checked' : ''} aria-label="${escapeHTML(task.title)}">
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
                  <span class="badge priority-badge" style="background: ${pInfo.bg}; color: ${pInfo.color};">
                    <span class="priority-dot" style="background: ${pInfo.color};"></span>
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
              <button type="button" class="btn-task-action btn-task-delete" title="${i18n.lang === 'ar' ? 'حذف المهمة' : 'Delete Task'}" aria-label="Delete Task">
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
      const cb = wrapper.querySelector('.task-page-checkbox');

      // Toggle Task logic
      const toggleTaskState = async () => {
        try {
          await api.toggleTask(task.id);
          const comp = !card.classList.contains('is-completed');
          card.classList.toggle('is-completed', comp);
          cb.checked = comp;
          const titleEl = card.querySelector('.task-card-title');
          titleEl?.classList.toggle('completed-text', comp);
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

      // Edit task handler
      wrapper.querySelector('.btn-task-edit')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.startEditTask(task);
      });

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

      wrapper.querySelector('.btn-task-delete')?.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTaskWithUndo();
      });

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
