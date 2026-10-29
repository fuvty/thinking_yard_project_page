// Shared controls for static research pages and the React hub.
(() => {
  const topButton = document.getElementById('scrollTop');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let restoreTopFocus = false;
  let cancelSnapReset = () => {};
  const updateTopButton = () => {
    if (!topButton) return;
    const visible = window.scrollY > 500;
    topButton.classList.toggle('is-visible', visible);
    topButton.inert = !visible;
    topButton.setAttribute('aria-hidden', String(!visible));
    if (restoreTopFocus && window.scrollY <= 8) {
      restoreTopFocus = false;
      // Let navigation's own scroll listener finish before focusing Home.
      window.requestAnimationFrame(() => document.querySelector('.sp-home')?.focus({ preventScroll: true }));
    }
  };
  topButton?.addEventListener('click', event => {
    cancelSnapReset();
    restoreTopFocus = event.detail === 0;
    const root = document.documentElement;
    if (window.getComputedStyle(root).scrollSnapType !== 'none' || root.classList.contains('home-free-scroll')) {
      // The hub has mandatory story snapping: preserve its reliable exact return
      // instead of letting an in-flight anchor animation snap to a later chapter.
      const previousSnap = root.style.scrollSnapType;
      const previousBehavior = root.style.scrollBehavior;
      let frame, remaining = 8;
      root.style.scrollSnapType = 'none';
      root.style.scrollBehavior = 'auto';
      cancelSnapReset = () => {
        window.cancelAnimationFrame(frame);
        root.style.scrollSnapType = previousSnap;
        root.style.scrollBehavior = previousBehavior;
        cancelSnapReset = () => {};
      };
      const settle = () => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        if (--remaining > 0) frame = window.requestAnimationFrame(settle);
        else cancelSnapReset();
      };
      settle();
    } else {
      window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    }
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search);
    updateTopButton();
  });
  window.addEventListener('scroll', updateTopButton, { passive: true });
  updateTopButton();

  const fallbackCopy = text => {
    const previousFocus = document.activeElement;
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
    document.body.appendChild(field);
    field.select();
    try {
      if (!document.execCommand('copy')) throw new Error('Copy unavailable');
    } finally {
      field.remove();
      previousFocus?.focus({ preventScroll: true });
    }
  };
  document.querySelectorAll('[data-copy-target]').forEach(button => {
    const label = button.querySelector('[data-copy-label]');
    const status = button.closest('.sp-citation').querySelector('[data-copy-status]');
    let resetTimer;
    button.addEventListener('click', async () => {
      const code = document.getElementById(button.dataset.copyTarget);
      if (!code || button.disabled || !code.textContent.trim()) return;
      window.clearTimeout(resetTimer);
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      status.textContent = '';
      try {
        if (navigator.clipboard?.writeText) {
          try { await navigator.clipboard.writeText(code.textContent); }
          catch { fallbackCopy(code.textContent); }
        } else fallbackCopy(code.textContent);
        button.dataset.state = 'success';
        label.textContent = 'Copied';
        status.textContent = 'BibTeX copied to clipboard.';
      } catch {
        button.dataset.state = 'error';
        label.textContent = 'Try again';
        status.textContent = 'Copy failed. Select the citation text to copy it manually.';
      } finally {
        button.disabled = false;
        button.setAttribute('aria-busy', 'false');
        resetTimer = window.setTimeout(() => {
          delete button.dataset.state;
          label.textContent = 'Copy BibTeX';
          status.textContent = '';
        }, 2400);
      }
    });
  });
})();
