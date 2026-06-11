// ============================================================
// GIANT MARQUEE
// 3 rows of horizontally scrolling text. The middle row holds
// the giant "AMOS" wordmark, alternating outline/fill. Rows
// 1 and 3 are monospace taglines. Direction alternates.
// Tied to viewport scroll (not time-based) for a physical feel.
// ============================================================

(function () {
  const rows = document.querySelectorAll('.marquee__row');
  if (!rows.length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return; // static layout

  let ticking = false;
  let lastScrollY = window.scrollY;
  // Each row has a data-speed multiplier
  function update() {
    const sy = window.scrollY;
    const delta = sy - lastScrollY;
    lastScrollY = sy;

    rows.forEach((row) => {
      const speed = parseFloat(row.dataset.speed || '0.2');
      const inner = row.querySelector('.marquee__inner');
      if (!inner) return;
      // We track an offset per row
      const current = parseFloat(inner.dataset.offset || '0');
      // Direction: row 1 left, row 2 right, row 3 left
      const direction = row.classList.contains('marquee__row--2') ? -1 : 1;
      let next = current + delta * speed * direction;
      // Wrap modulo width to keep numbers small and prevent drift
      const w = inner.scrollWidth / 2; // doubled content for seamless loop
      if (w > 0) {
        next = ((next % w) + w) % w; // ensure positive
        // Subtract one width so it's centered around 0
        next = next - w;
      }
      inner.dataset.offset = String(next);
      inner.style.transform = `translate3d(${next}px, 0, 0)`;
    });

    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // Initial pass
  update();
})();
