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

    // Safety net: if IO doesn't fire (headless, no scroll, no time
    // advance, whatever), reveal everything after 1.2s. By then a
    // real browser has already faded cards in via the IO; headless
    // screenshots won't stay blank.
    setTimeout(() => {
      cards.forEach(c => {
        if (c.classList.contains('is-in')) return;
        const idx = cards.indexOf(c);
        const row = Math.floor(idx / 2);
        const col = idx % 2;
        const delay = row * 160 + col * 90;
        setTimeout(() => c.classList.add('is-in'), delay);
      });
    }, 1200);
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

    // Safety net — same as cards. Reveal any step the IO missed after 1.2s.
    setTimeout(() => {
      steps.forEach((step, idx) => {
        if (step.classList.contains('is-in')) return;
        setTimeout(() => {
          step.classList.add('is-in');
          const bullets = step.querySelectorAll('.timeline__bullets li');
          bullets.forEach((li, i) => {
            if (li.classList.contains('is-in')) return;
            setTimeout(() => li.classList.add('is-in'), 200 + i * 70);
          });
        }, idx * 120);
      });
    }, 1200);
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
  // SPLIT-FLAP TEXT — wrap each character of a [data-flap] heading
  // in <span class="flap" data-final="X">X</span>, then on trigger
  // scramble the char through random letters/symbols before
  // settling on data-final. The .is-flipping class on each flap
  // drives a horizontal seam-sweep CSS animation (see styles.css).
  //
  // Text inside .fill-accent is left alone — the lime wipe is the
  // only animation those chars get.
  //
  // Triggers:
  //   - Hero: starts on page load (after splash settles)
  //   - Section h2s: on first IntersectionObserver intersection
  // ------------------------------------------------------------
  (function splitFlap() {
    if (reduceMotion) return;
    const SAMPLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*+=<>?/\\';
    const SCRAMBLE_TICKS = 6;   // number of random chars per flip
    const SCRAMBLE_MS = 35;     // ms between random char swaps
    const FLAP_MS = 280;        // matches CSS @keyframes flap-sweep
    const PER_CHAR_DELAY = 28;  // stagger between adjacent chars

    function wrapChars(root) {
      // Walk text nodes. Skip .fill-accent (the lime wipe owns that).
      // Skip .hero__line, .cta__line etc. inner spans — they hold the
      // text and we want chars to be split ACROSS them, not per-line.
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
          // Skip text inside .fill-accent.
          if (node.parentElement.closest('.fill-accent')) return NodeFilter.FILTER_REJECT;
          // Skip text inside the .flap spans themselves (idempotent guard).
          if (node.parentElement.classList && node.parentElement.classList.contains('flap')) return NodeFilter.FILTER_REJECT;
          // Skip empty / whitespace-only nodes.
          return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      });
      const textNodes = [];
      let n;
      while ((n = walker.nextNode())) textNodes.push(n);
      textNodes.forEach(node => {
        const text = node.textContent;
        const frag = document.createDocumentFragment();
        for (const ch of text) {
          if (ch === '\n' || ch === '\r') {
            frag.appendChild(document.createTextNode(ch));
            continue;
          }
          // Preserve explicit spaces as plain text so word wrap still works.
          if (ch === ' ') {
            frag.appendChild(document.createTextNode(' '));
            continue;
          }
          const span = document.createElement('span');
          span.className = 'flap';
          span.dataset.final = ch;
          // Start the char hidden behind a final-state same char so the
          // first paint doesn't show a flash of " ".
          span.textContent = ch;
          frag.appendChild(span);
        }
        node.parentNode.replaceChild(frag, node);
      });
    }

    function pickRandom() {
      return SAMPLE[Math.floor(Math.random() * SAMPLE.length)];
    }

    function flipChar(span, idx) {
      const final = span.dataset.final;
      if (!final) return;
      // For whitespace / punctuation we don't animate; just settle.
      if (final === ' ' || final === '.' || final === ',' || final === '!' || final === '?') return;
      setTimeout(() => {
        span.classList.add('is-flipping');
        let i = 0;
        const tick = () => {
          if (i < SCRAMBLE_TICKS) {
            span.textContent = pickRandom();
            i += 1;
            setTimeout(tick, SCRAMBLE_MS);
          } else {
            span.textContent = final;
            setTimeout(() => span.classList.remove('is-flipping'), 40);
          }
        };
        tick();
      }, idx * PER_CHAR_DELAY);
    }

    function trigger(root) {
      // If the root itself is in a hero__line / cta__line, also reveal
      // the line by adding is-in (the line-by-line fade-up uses .is-in).
      root.classList.add('is-in');
      const flaps = Array.from(root.querySelectorAll('.flap'));
      flaps.forEach(flipChar);
    }

    // Find all [data-flap] elements.
    const targets = Array.from(document.querySelectorAll('[data-flap]'));
    if (!targets.length) return;

    // First, wrap the chars. This mutates the DOM but the visible text
    // doesn't change (we set textContent = final char), so the user
    // never sees a "before wrap" state.
    targets.forEach(wrapChars);

    // Then set up triggers. Hero (h1.hero__title) gets the page-load
    // trigger (after the splash); section h2s get an IO trigger.
    const hero = document.querySelector('h1.hero__title[data-flap]');
    const sections = targets.filter(t => t !== hero);

    if (hero) {
      // Match the heroLines reveal — start after splash settles
      // (700ms after page load), and also on first interaction.
      const start = () => trigger(hero);
      setTimeout(start, 700);
      const early = () => {
        window.removeEventListener('click', early);
        window.removeEventListener('scroll', early);
        window.removeEventListener('keydown', early);
        start();
      };
      window.addEventListener('click', early, { once: true, passive: true });
      window.addEventListener('scroll', early, { once: true, passive: true });
      window.addEventListener('keydown', early, { once: true, passive: true });
    }

    if (sections.length) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          trigger(e.target);
          io.unobserve(e.target);
        });
      }, { threshold: 0.4, rootMargin: '0px 0px -10% 0px' });
      sections.forEach(s => io.observe(s));
    }
  })();

  // ------------------------------------------------------------
  // MARQUEE — pure CSS infinite scroll. Pause-on-hover is handled
  // in styles.css (.marquee:hover .marquee__inner { animation-play-state:
  // paused }). Nothing to do in JS, but we keep this IIFE as a
  // hook in case we want to wire up scrub-speed or other behavior
  // later. The .marquee--paused class is also exposed for any
  // future JS-driven pause (e.g. when a modal opens).
  // ------------------------------------------------------------
  (function marqueePolish() {
    if (reduceMotion) return;
    const wrap = document.querySelector('.marquee');
    if (!wrap) return;
    // Expose a JS toggle (CSS handles hover-pause automatically).
    // No-op for now; kept for parity with the previous behavior
    // and as a hook for future work.
    wrap.addEventListener('pointerenter', () => wrap.classList.add('marquee--paused'));
    wrap.addEventListener('pointerleave', () => wrap.classList.remove('marquee--paused'));
  })();
})();
