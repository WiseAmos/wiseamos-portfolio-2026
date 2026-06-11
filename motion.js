// ============================================================
// v8 — motion layer
// - Hero line-by-line reveal on page load
// - Work cards stagger-in as the grid scrolls into view
// - Process timeline steps + bullets stagger-in as they enter
// - Custom cursor (desktop, fine pointer only)
// - Grain overlay parallaxes against scroll
// - Marquee: pause-on-hover + scroll-velocity speed ramp
// All animations honor prefers-reduced-motion (CSS handles that).
// ============================================================

(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ------------------------------------------------------------
  // HERO LINE REVEAL — staggered fade-up after splash settles.
  // We don't trigger until the splash has had a chance to fade in
  // (~700ms) so the first frame the user sees has the splash, then
  // the headline, in that order. Triggers early if the user dismisses
  // the splash by clicking/scrolling.
  // ------------------------------------------------------------
  (function heroLines() {
    const lines = Array.from(document.querySelectorAll('.hero__line'));
    if (!lines.length) return;

    function reveal() {
      lines.forEach((el, i) => {
        setTimeout(() => el.classList.add('is-in'), i * 90);
      });
    }
    if (reduceMotion) {
      lines.forEach(el => el.classList.add('is-in'));
      return;
    }
    // Trigger after splash fade-in completes.
    setTimeout(reveal, 700);
    // Also trigger on first interaction (early splash dismiss).
    const early = () => {
      window.removeEventListener('click', early);
      window.removeEventListener('scroll', early);
      window.removeEventListener('keydown', early);
      reveal();
    };
    window.addEventListener('click', early, { once: true, passive: true });
    window.addEventListener('scroll', early, { once: true, passive: true });
    window.addEventListener('keydown', early, { once: true, passive: true });
  })();

  // ------------------------------------------------------------
  // WORK CARDS — stagger-in as the grid enters view.
  // Each card gets an additional delay based on its index, so the
  // first row reveals first, then the second, etc. We use a simple
  // IntersectionObserver and only stagger cards that are within the
  // initially visible region (so the cascade doesn't take 720ms for
  // a 9-card stack when only 3 are visible at a time).
  // ------------------------------------------------------------
  (function workCards() {
    const grid = document.querySelector('.work-grid');
    if (!grid) return;
    const cards = Array.from(grid.querySelectorAll('.card'));
    if (!cards.length) return;

    if (reduceMotion) {
      cards.forEach(c => c.classList.add('is-in'));
      return;
    }

    // Default per-card transition delay is 0; we set it inline based
    // on position so the cascade reads left→right, top→bottom.
    const STEP = 90; // ms between cards
    cards.forEach((c, i) => {
      c.style.transitionDelay = `${(i % 3) * STEP}ms`;
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const card = e.target;
        // Delay by row position so the cascade reads top-down.
        const idx = cards.indexOf(card);
        const row = Math.floor(idx / 2); // 2-col grid
        const col = idx % 2;
        const delay = row * 160 + col * 90;
        setTimeout(() => card.classList.add('is-in'), delay);
        io.unobserve(card);
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -8% 0px' });

    cards.forEach(c => io.observe(c));
  })();

  // ------------------------------------------------------------
  // TIMELINE STEPS + BULLETS — stagger-in as the process section
  // enters view. Each step is one IntersectionObserver target; the
  // bullets inside the step cascade on a fixed delay once the step
  // itself becomes visible.
  // ------------------------------------------------------------
  (function timelineStagger() {
    const steps = Array.from(document.querySelectorAll('.timeline__step'));
    if (!steps.length) return;

    if (reduceMotion) {
      steps.forEach(s => s.classList.add('is-in'));
      steps.forEach(s => s.querySelectorAll('.timeline__bullets li').forEach(li => li.classList.add('is-in')));
      return;
    }

    // Stagger the steps themselves.
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const step = e.target;
        const idx = steps.indexOf(step);
        setTimeout(() => {
          step.classList.add('is-in');
          // After the step lands, cascade its bullets.
          const bullets = step.querySelectorAll('.timeline__bullets li');
          bullets.forEach((li, i) => {
            setTimeout(() => li.classList.add('is-in'), 200 + i * 70);
          });
        }, idx * 120);
        io.unobserve(step);
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -5% 0px' });

    steps.forEach(s => io.observe(s));
  })();

  // ------------------------------------------------------------
  // CUSTOM CURSOR — only on devices with a fine pointer (mouse,
  // trackpad). Disabled on touch + small screens.
  // ------------------------------------------------------------
  (function cursor() {
    if (reduceMotion) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.innerWidth < 900) return;

    const dot = document.querySelector('.cursor');
    const ring = document.querySelector('.cursor__ring');
    if (!dot || !ring) return;

    document.documentElement.classList.add('has-cursor');

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let raf = null;
    let active = false;

    function loop() {
      // Ring lags behind the dot slightly (lerp) for the trailing effect.
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      if (active) raf = requestAnimationFrame(loop);
    }

    addEventListener('pointermove', (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (!active) { active = true; loop(); }
    }, { passive: true });

    addEventListener('pointerleave', () => {
      active = false;
      if (raf) cancelAnimationFrame(raf);
      dot.style.transform = `translate3d(-100px, -100px, 0)`;
      ring.style.transform = `translate3d(-100px, -100px, 0)`;
    });

    // Grow the ring when hovering interactive elements.
    const selector = 'a, button, [role="button"], [data-cursor="hover"]';
    document.addEventListener('pointerover', (e) => {
      if (e.target.closest(selector)) {
        document.documentElement.classList.add('is-hovering');
      }
    });
    document.addEventListener('pointerout', (e) => {
      if (e.target.closest(selector)) {
        document.documentElement.classList.remove('is-hovering');
      }
    });
  })();

  // ------------------------------------------------------------
  // GRAIN PARALLAX — the fixed grain layer moves at 0.05x scroll
  // so it feels like it's slightly behind the page.
  // ------------------------------------------------------------
  (function grainParallax() {
    if (reduceMotion) return;
    const grain = document.querySelector('.grain');
    if (!grain) return;
    let ticking = false;
    function update() {
      grain.style.transform = `translate3d(0, ${window.scrollY * 0.05}px, 0)`;
      ticking = false;
    }
    addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  })();

  // ------------------------------------------------------------
  // MARQUEE — adds pause-on-hover to the scroll-tied marquee and
  // ramps the speed by current scroll velocity (subtle, capped).
  // We hook into the existing marquee.js by wrapping its scroll
  // handler: we set CSS custom properties the marquee.js already
  // reads indirectly, but here we just override with a multiplier.
  //
  // Approach: hijack the marquee row's transform directly with
  // our own scroll handler. We duplicate the seam from marquee.js
  // (which uses 0.45x scroll) and add velocity-based scaling on top.
  // ------------------------------------------------------------
  (function marqueePolish() {
    if (reduceMotion) return;
    const row = document.getElementById('marqueeRow');
    const wrap = document.querySelector('.marquee');
    if (!row || !wrap) return;

    // Pause-on-hover via CSS class on the wrapper.
    wrap.addEventListener('pointerenter', () => wrap.classList.add('marquee--paused'));
    wrap.addEventListener('pointerleave', () => wrap.classList.remove('marquee--paused'));

    // Velocity-based speed ramp: we keep a running offset exactly
    // like marquee.js, but scale the per-event delta by a factor
    // derived from |scroll velocity|. 1.0x when still, up to 1.6x
    // when scrolling fast.
    let lastY = window.scrollY;
    let lastT = performance.now();
    let offset = parseFloat(row.style.transform.match(/-?\d+(\.\d+)?/)?.[0] || '0');
    if (Number.isNaN(offset)) offset = 0;

    addEventListener('scroll', () => {
      if (wrap.classList.contains('marquee--paused')) {
        // Update bookkeeping but don't move the marquee.
        lastY = window.scrollY;
        lastT = performance.now();
        return;
      }
      const now = performance.now();
      const y = window.scrollY;
      const dt = Math.max(1, now - lastT);
      const dy = y - lastY;
      // px/ms → scale
      const velocity = Math.abs(dy) / dt; // 0..~3 typically
      const ramp = Math.min(1.6, 1 + velocity * 0.6);
      offset -= dy * 0.45 * ramp;
      row.style.transform = `translate3d(${offset}px, 0, 0)`;
      lastY = y;
      lastT = now;
    }, { passive: true });
  })();
})();
