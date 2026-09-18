/**
 * Toast Notification & Accessible Confirmation Dialog Utility (UI/UX Pro Max).
 * Replaces intrusive window.alert() and window.confirm() with sleek glassmorphic feedback.
 */
import { $ } from './dom.js';

class ToastManager {
  constructor() {
    this.container = null;
    this.confirmModal = null;
    this.init();
  }

  init() {
    // Ensure toast container exists
    let container = $('#toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    this.container = container;

    // Build confirmation dialog
    this.buildConfirmDialog();
  }

  show(message, type = 'info', duration = 3500) {
    if (!this.container) return;

    const icons = {
      success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
      error: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
      info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
    };

    const toast = document.createElement('div');
    toast.className = `toast-item ${type}`;
    toast.innerHTML = `
      <div style="display: flex; align-items: center;">${icons[type] || icons.info}</div>
      <div style="flex: 1; line-height: 1.4;">${message}</div>
    `;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  success(msg, duration) {
    this.show(msg, 'success', duration);
  }

  error(msg, duration) {
    this.show(msg, 'error', duration || 4500);
  }

  info(msg, duration) {
    this.show(msg, 'info', duration);
  }

  undo(message, onUndo, onDismiss, duration = 5000) {
    if (!this.container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-item toast-undo';

    const isRTL = document.documentElement.dir === 'rtl';
    const undoText = isRTL ? 'تراجع' : 'Undo';

    toast.innerHTML = `
      <div class="toast-undo-content">
        <span style="font-weight: 600; line-height: 1.4;">${message}</span>
        <button type="button" class="toast-undo-btn">${undoText}</button>
      </div>
      <div class="toast-undo-progress">
        <div class="toast-undo-bar" style="animation-duration: ${duration}ms;"></div>
      </div>
    `;

    let undone = false;
    const undoBtn = toast.querySelector('.toast-undo-btn');

    const timer = setTimeout(() => {
      if (!undone) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 250);
        if (typeof onDismiss === 'function') onDismiss();
      }
    }, duration);

    undoBtn.addEventListener('click', () => {
      undone = true;
      clearTimeout(timer);
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
      if (typeof onUndo === 'function') onUndo();
    });

    this.container.appendChild(toast);
  }

  buildConfirmDialog() {
    let modal = $('#modal-custom-confirm');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-custom-confirm';
      modal.className = 'modal-backdrop';
      modal.innerHTML = `
        <div class="modal-card" style="max-width: 440px;">
          <div class="modal-header">
            <h3 id="confirm-title" style="font-size: 1.15rem; font-weight: 700; color: var(--text-main);">تأكيد الإجراء</h3>
            <button id="btn-close-confirm-modal" class="btn-icon">✕</button>
          </div>
          <div class="modal-body">
            <p id="confirm-message" style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.6;"></p>
          </div>
          <div class="modal-footer">
            <button id="btn-confirm-cancel" class="btn btn-secondary">إلغاء</button>
            <button id="btn-confirm-ok" class="btn btn-primary" style="background: var(--accent-rose);">حذف</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    this.confirmModal = modal;
  }

  confirm(title, message, okText = 'تأكيد', cancelText = 'إلغاء') {
    return new Promise((resolve) => {
      const modal = this.confirmModal;
      $('#confirm-title').textContent = title;
      $('#confirm-message').textContent = message;
      $('#btn-confirm-ok').textContent = okText;
      $('#btn-confirm-cancel').textContent = cancelText;

      modal.classList.add('open');

      const cleanup = () => {
        modal.classList.remove('open');
        btnOk.removeEventListener('click', onOk);
        btnCancel.removeEventListener('click', onCancel);
        btnClose.removeEventListener('click', onCancel);
      };

      const onOk = () => {
        cleanup();
        resolve(true);
      };

      const onCancel = () => {
        cleanup();
        resolve(false);
      };

      const btnOk = $('#btn-confirm-ok');
      const btnCancel = $('#btn-confirm-cancel');
      const btnClose = $('#btn-close-confirm-modal');

      btnOk.addEventListener('click', onOk);
      btnCancel.addEventListener('click', onCancel);
      btnClose.addEventListener('click', onCancel);
    });
  }
}

export const toast = new ToastManager();
