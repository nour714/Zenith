/**
 * Gesture Utility for Mobile Touch Interactions (UI/UX Pro Max).
 * Implements lightweight, non-blocking touch gestures:
 * 1. Swipe-to-action for list items (Complete & Delete)
 * 2. Pull-to-refresh for scrollable containers
 */

export function attachSwipeAction(containerEl, { onSwipeComplete, onSwipeDelete, threshold = 70 } = {}) {
  if (!containerEl) return;

  const contentEl = containerEl.querySelector('.swipe-content') || containerEl;
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let isSwiping = false;
  let isHorizontal = false;

  const handleTouchStart = (e) => {
    if (e.touches.length > 1) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    currentX = startX;
    isSwiping = true;
    isHorizontal = false;
    contentEl.style.transition = 'none';
  };

  const handleTouchMove = (e) => {
    if (!isSwiping) return;
    const touch = e.touches[0];
    const diffX = touch.clientX - startX;
    const diffY = touch.clientY - startY;

    // Determine direction on first significant movement
    if (!isHorizontal) {
      if (Math.abs(diffX) > 10 && Math.abs(diffX) > Math.abs(diffY)) {
        isHorizontal = true;
      } else if (Math.abs(diffY) > 10) {
        isSwiping = false;
        return;
      }
    }

    if (isHorizontal) {
      if (e.cancelable) e.preventDefault();
      currentX = touch.clientX;

      // Apply rubber-band damping
      const damping = 0.65;
      const moveX = diffX * damping;
      contentEl.style.transform = `translateX(${moveX}px)`;

      // Reveal action background
      const revealEl = containerEl.querySelector('.swipe-action-reveal');
      if (revealEl) {
        const isRTL = document.documentElement.dir === 'rtl';
        if (diffX > 20) {
          revealEl.className = 'swipe-action-reveal swipe-action-right';
          revealEl.innerHTML = isRTL 
            ? `<span>✓ إنجاز</span><span></span>` 
            : `<span>✓ Complete</span><span></span>`;
        } else if (diffX < -20) {
          revealEl.className = 'swipe-action-reveal swipe-action-left';
          revealEl.innerHTML = isRTL 
            ? `<span></span><span>حذف ✕</span>` 
            : `<span></span><span>Delete ✕</span>`;
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;
    isSwiping = false;
    contentEl.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';

    const diffX = currentX - startX;

    if (Math.abs(diffX) >= threshold) {
      if (diffX > 0 && typeof onSwipeComplete === 'function') {
        contentEl.style.transform = 'translateX(100%)';
        setTimeout(() => {
          contentEl.style.transform = 'translateX(0)';
          onSwipeComplete();
        }, 220);
        return;
      } else if (diffX < 0 && typeof onSwipeDelete === 'function') {
        contentEl.style.transform = 'translateX(-100%)';
        setTimeout(() => {
          contentEl.style.transform = 'translateX(0)';
          onSwipeDelete();
        }, 220);
        return;
      }
    }

    contentEl.style.transform = 'translateX(0)';
  };

  containerEl.addEventListener('touchstart', handleTouchStart, { passive: true });
  containerEl.addEventListener('touchmove', handleTouchMove, { passive: false });
  containerEl.addEventListener('touchend', handleTouchEnd, { passive: true });
  containerEl.addEventListener('touchcancel', handleTouchEnd, { passive: true });
}

export function attachPullToRefresh(scrollContainer, onRefresh) {
  if (!scrollContainer || typeof onRefresh !== 'function') return;

  let startY = 0;
  let isPulling = false;
  let indicator = scrollContainer.querySelector('.ptr-indicator');

  if (!indicator) {
    indicator = document.createElement('div');
    indicator.className = 'ptr-indicator';
    indicator.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="spinner"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`;
    scrollContainer.style.position = 'relative';
    scrollContainer.prepend(indicator);
  }

  const handleTouchStart = (e) => {
    if (scrollContainer.scrollTop === 0) {
      startY = e.touches[0].clientY;
      isPulling = true;
    }
  };

  const handleTouchMove = (e) => {
    if (!isPulling) return;
    const touch = e.touches[0];
    const diffY = touch.clientY - startY;

    if (diffY > 0 && scrollContainer.scrollTop === 0) {
      const pullDistance = Math.min(diffY * 0.45, 75);
      indicator.style.top = `${pullDistance - 35}px`;
      indicator.style.transform = `translateX(-50%) rotate(${diffY * 3}deg)`;
      if (pullDistance > 50 && e.cancelable) {
        e.preventDefault();
      }
    } else {
      indicator.style.top = '-45px';
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling) return;
    isPulling = false;

    const currentTop = parseInt(indicator.style.top || '-45', 10);
    if (currentTop >= 15) {
      indicator.style.top = '15px';
      try {
        await onRefresh();
      } finally {
        setTimeout(() => {
          indicator.style.top = '-45px';
        }, 300);
      }
    } else {
      indicator.style.top = '-45px';
    }
  };

  scrollContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
  scrollContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
  scrollContainer.addEventListener('touchend', handleTouchEnd, { passive: true });
}
