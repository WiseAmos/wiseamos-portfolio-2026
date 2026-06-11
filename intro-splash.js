// ============================================================
// INTRO SPLASH
// Shows a brief logo + wordmark + "scroll to begin" hint, then
// dismisses on first user interaction OR 2.5s timeout.
// Respects prefers-reduced-motion (skips the splash entirely).
// ============================================================

(function () {
  const intro = document.getElementById('intro');
  if (!intro) return;

  // Reduced motion: skip splash immediately
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    intro.classList.add('is-gone');
    return;
  }

  let dismissed = false;
  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    intro.classList.add('is-gone');
    // Remove from DOM after the fade
    setTimeout(() => intro.remove(), 800);
    // Remove the listeners
    window.removeEventListener('wheel', dismiss);
    window.removeEventListener('touchstart', dismiss);
    window.removeEventListener('keydown', dismiss);
    window.removeEventListener('click', dismiss);
  }

  // First user interaction OR 2.5s
  window.addEventListener('wheel', dismiss, { passive: true, once: true });
  window.addEventListener('touchstart', dismiss, { passive: true, once: true });
  window.addEventListener('keydown', dismiss, { once: true });
  window.addEventListener('click', dismiss, { once: true });
  setTimeout(dismiss, 2500);
})();
