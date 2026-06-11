// ============================================================
// MARQUEE — single row, scroll-tied
// Moves with page scroll, not time. Hard ticks. No animation library.
// ============================================================

(function () {
  const row = document.getElementById('marqueeRow');
  if (!row) return;
  // We translate row itself, not the inner. Inner is duplicated in HTML
  // for a seamless wrap. We just slide left = positive scroll = row moves right? No.
  // Convention: scroll DOWN (positive y delta) → row moves LEFT (negative translateX).
  let lastY = window.scrollY;
  let offset = 0;
  addEventListener('scroll', () => {
    const y = window.scrollY;
    const delta = y - lastY;
    lastY = y;
    offset -= delta * 0.45;  // 0.45x scroll speed
    row.style.transform = `translate3d(${offset}px, 0, 0)`;
  }, { passive: true });
})();
