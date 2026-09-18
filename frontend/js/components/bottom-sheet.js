/**
 * Bottom Sheet Component: Sliding touch-friendly drawer for mobile forms (UI/UX Pro Max).
 * Features:
 * - Swipe-down to dismiss
 * - Backdrop blur & tap to dismiss
 * - Embedded forms with auto-focus
 */
import { $ } from '../utils/dom.js';

export class BottomSheetComponent {
  constructor() {
    this.backdrop = $('#bottom-sheet-modal');
    this.card = $('#bottom-sheet-card');
    this.handle = $('#bottom-sheet-handle-wrap');
    this.titleEl = $('#bottom-sheet-title');
    this.bodyEl = $('#bottom-sheet-body');
    this.closeBtn = $('#bottom-sheet-close-btn');

    this.isOpen = false;
    this.startY = 0;
    this.currentY = 0;
    this.isDragging = false;

    this.init();
  }

  init() {
    if (!this.backdrop) return;

    // Backdrop click
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) {
        this.close();
      }
    });

    // Close button click
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }

    // Drag-to-dismiss handlers on handle
    if (this.handle) {
      this.handle.addEventListener('touchstart', (e) => {
        this.startY = e.touches[0].clientY;
        this.currentY = this.startY;
        this.isDragging = true;
        this.card.style.transition = 'none';
      }, { passive: true });

      this.handle.addEventListener('touchmove', (e) => {
        if (!this.isDragging) return;
        const touchY = e.touches[0].clientY;
        const diffY = touchY - this.startY;

        if (diffY > 0) {
          this.currentY = touchY;
          this.card.style.transform = `translateY(${diffY}px)`;
          if (e.cancelable) e.preventDefault();
        }
      }, { passive: false });

      this.handle.addEventListener('touchend', () => {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.card.style.transition = 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)';

        const diffY = this.currentY - this.startY;
        if (diffY > 100) {
          this.close();
        } else {
          this.card.style.transform = 'translateY(0)';
        }
      }, { passive: true });
    }

    // Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  open(title, contentElementOrHtml, onMount) {
    if (!this.backdrop) return;

    if (this.titleEl) {
      this.titleEl.innerHTML = title;
    }

    if (this.bodyEl) {
      if (typeof contentElementOrHtml === 'string') {
        this.bodyEl.innerHTML = contentElementOrHtml;
      } else if (contentElementOrHtml instanceof HTMLElement) {
        this.bodyEl.innerHTML = '';
        this.bodyEl.appendChild(contentElementOrHtml);
      }
    }

    this.isOpen = true;
    this.backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';

    if (typeof onMount === 'function') {
      onMount(this.bodyEl);
    }
  }

  close() {
    if (!this.backdrop || !this.isOpen) return;

    this.isOpen = false;
    this.backdrop.classList.remove('open');
    document.body.style.overflow = '';
    if (this.card) {
      this.card.style.transform = '';
    }
  }
}

export const bottomSheet = new BottomSheetComponent();
