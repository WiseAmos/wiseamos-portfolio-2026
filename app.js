// ============================================================
// v5 — content-first + splash + 2-col card grid (work).
// No 3D. No WebGL. No canvas. All interactions are DOM/CSS.
// ============================================================

(function () {
  'use strict';

  // Mark the page as JS-enabled. The CSS uses .js to switch from
  // the no-JS vertical-list layout to the pinned horizontal scroll.
  // Adding the class ASAP (before the IIFEs run) avoids a flash of
  // wrong layout.
  document.documentElement.classList.add('js');
  document.documentElement.classList.remove('no-js');

  // ------------------------------------------------------------
  // SPLASH — full-viewport overlay. Dismisses on
  //   - 2.5s timeout (default)
  //   - click anywhere
  //   - scroll
  //   - space / enter
  // The element is removed from the DOM after the transition
  // finishes (or after a 600ms hard cap) so it doesn't interfere
  // with the page.
  // ------------------------------------------------------------
  (function splash() {
    const el = document.getElementById('splash');
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.remove();
      return;
    }
    let dismissed = false;
    function dismiss() {
      if (dismissed) return;
      dismissed = true;
      el.classList.add('splash--out');
      setTimeout(() => el.remove(), 600);
    }
    // Dismiss on first interaction
    const opts = { once: true, passive: true };
    window.addEventListener('scroll', dismiss, opts);
    window.addEventListener('click', dismiss, opts);
    window.addEventListener('keydown', dismiss, opts);
    // Auto-dismiss after 2.5s
    setTimeout(dismiss, 2500);
  })();

  // ------------------------------------------------------------
  // WORK CARDS — render curated projects as <li> cards in a
  // 2-col grid (desktop) / 1-col (mobile). Each card has a
  // glyph slot (project-specific typographic mark + pattern)
  // and a meta column. v5 replaces the v4 table.
  // ------------------------------------------------------------
  const grid = document.querySelector('#workGrid');
  if (grid && window.PROJECTS) {
    const gh = 'https://github.com/WiseAmos';
    const total = String(window.PROJECTS.length).padStart(2, '0');
    grid.innerHTML = window.PROJECTS.map((p, i) => {
      const num = String(i + 1).padStart(2, '0');
      const topics = (p.topics || []).slice(0, 3).map(t => `<span class="tag">#${t}</span>`).join(' ');
      const g = p.glyph || { mark: '··', accent: '', pattern: 'dots' };
      // Per-card mark size. Default to 200 if unspecified.
      const demoLink = p.liveDemo
        ? `<a class="card__btn card__btn--live" href="${p.liveDemo}" target="_blank" rel="noopener">LIVE <span aria-hidden="true">↗</span></a>`
        : '';
      const repoLink = `<a class="card__btn card__btn--repo" href="${gh}/${p.repo}" target="_blank" rel="noopener">REPO <span aria-hidden="true">↗</span></a>`;
      return `
        <li class="card" data-pattern="${g.pattern}">
          <div class="card__glyph" style="--lang-color:${p.langColor || '#0A0A0A'}">
            <span class="card__glyph-pattern" aria-hidden="true"></span>
            <span class="card__glyph-mark" style="--mark-size:${g.size || 200}px">${g.mark}</span>
            ${g.accent ? `<span class="card__glyph-accent" aria-hidden="true">${g.accent}</span>` : ''}
          </div>
          <div class="card__body">
            <div class="card__head">
              <span class="card__no">${num} / ${total}</span>
              <span class="card__lang" style="--lang-color:${p.langColor || '#0A0A0A'}">${p.lang || '—'}</span>
            </div>
            <h3 class="card__title">${p.title}</h3>
            <p class="card__desc">${p.desc || ''}</p>
            <div class="card__foot">
              <div class="card__tags">${topics}</div>
              <div class="card__ctas">
                ${demoLink}
                ${repoLink}
              </div>
            </div>
          </div>
        </li>
      `;
    }).join('');
  }

  // ------------------------------------------------------------
  // REVEAL — IntersectionObserver for [data-reveal] sections.
  // Pure CSS class toggle. No GSAP.
  // ------------------------------------------------------------
  (function reveal() {
    const els = document.querySelectorAll('[data-reveal]');
    if (!els.length) return;
    const style = document.createElement('style');
    style.textContent = `
      [data-reveal] { opacity: 0; transform: translateY(8px); transition: opacity 480ms ease, transform 480ms ease; }
      [data-reveal].is-in { opacity: 1; transform: none; }
      @media (prefers-reduced-motion: reduce) {
        [data-reveal] { opacity: 1; transform: none; transition: none; }
      }
    `;
    document.head.appendChild(style);
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });
    els.forEach(el => io.observe(el));
    // Safety net — IO can miss sections that are already in view on
    // load (deep-link, headless screenshot, prefers-reduced-motion).
    // Mirror the pattern from motion.js workCards/timelineStagger.
    setTimeout(() => {
      els.forEach(el => {
        if (!el.classList.contains('is-in')) el.classList.add('is-in');
      });
    }, 1200);
  })();

  // ------------------------------------------------------------
  // SCROLL PROGRESS — thin lime bar at the top of the nav.
  // Shows reader how far through the page they are.
  // ------------------------------------------------------------
  (function scrollProgress() {
    const bar = document.querySelector('.nav__progress');
    if (!bar) return;
    let ticking = false;
    function update() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.transform = `scaleX(${pct})`;
      ticking = false;
    }
    addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  })();

  // ------------------------------------------------------------
  // NAV — solid bottom border once user scrolls past hero.
  // ------------------------------------------------------------
  (function navScrolled() {
    const nav = document.querySelector('.nav');
    if (!nav) return;
    let lastY = -1;
    addEventListener('scroll', () => {
      const y = window.scrollY;
      if (y === lastY) return;
      lastY = y;
      nav.classList.toggle('nav--scrolled', y > 4);
    }, { passive: true });
  })();

  // ------------------------------------------------------------
  // STAT COUNTERS — count up the about-section numbers when
  // they scroll into view. Adds tangible motion to a static
  // number without being gimmicky.
  // ------------------------------------------------------------
  (function statCounters() {
    const stats = document.querySelectorAll('.about__stat .num[data-target]');
    if (!stats.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const target = parseInt(el.dataset.target, 10) || 0;
        const dur = 900;
        const start = performance.now();
        function step(now) {
          const t = Math.min(1, (now - start) / dur);
          // ease-out cubic
          const eased = 1 - Math.pow(1 - t, 3);
          el.textContent = String(Math.round(target * eased)).padStart(2, '0');
          if (t < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        io.unobserve(el);
      });
    }, { threshold: 0.5 });
    stats.forEach(el => io.observe(el));
  })();

  // ------------------------------------------------------------
  // PROCESS — drives the track transform, active step, counter,
  // and word highlight for the pinned horizontal scroll section.
  // JS is the single source of truth for the track position so
  // it always agrees with the .is-active class on the visible step.
  // ------------------------------------------------------------
  (function process() {
    const section = document.querySelector('.process');
    const track = document.querySelector('[data-track]');
    const steps = Array.from(document.querySelectorAll('.process__step'));
    if (!section || !track || !steps.length) return;

    // Cache each step's words (so we don't querySelectorAll on every
    // scroll event). The bullet LIs are also cached so we can light
    // them up as the step's "highlight playhead" crosses them.
    const stepData = steps.map(step => {
      const words = Array.from(step.querySelectorAll('.word'));
      const bullets = Array.from(step.querySelectorAll('.process__step-bullets li'));
      return { el: step, words, bullets };
    });

    const statusNum = document.querySelector('[data-sonar-current]');
    const statusHits = document.querySelector('[data-sonar-hits]');
    const stepCurrent = document.querySelector('[data-step-current]');
    const hitSet = new Set();
    function update() {
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const scrollable = r.height - vh;
      // scrolled: how far past the top of the section the user has
      // scrolled. r.top = 0 → scrolled = 0. r.top = -scrollable →
      // scrolled = scrollable. r.top > 0 → scrolled clamped to 0.
      const scrolled = Math.max(0, -r.top);
      const progress = scrollable > 0 ? Math.min(1, scrolled / scrollable) : 0;
      // Track translateX: 0 → -3 * vw in 4 discrete steps. The
      // track is at -0vw, -1vw, -2vw, or -3vw depending on the
      // active step, with a CSS transition smoothing the jump.
      // This keeps the active step CENTERED in the viewport
      // (instead of mid-transition like a smooth slide would do),
      // which avoids the "cut-off text" problem on narrow viewports
      // where the active step would otherwise be partially off-screen.
      //   step 1: 0      → 1/4   → track 0
      //   step 2: 1/4    → 1/2   → track -1vw
      //   step 3: 1/2    → 3/4   → track -2vw
      //   step 4: 3/4    → 1     → track -3vw
      const active = progress < (1/4) ? 0
                   : progress < (1/2) ? 1
                   : progress < (3/4) ? 2
                   : 3;
      const trackX = -active * vw;
      track.style.transform = `translateX(${trackX}px)`;
      steps.forEach((s, i) => s.classList.toggle('is-active', i === active));
      // Word highlight: each step owns a quarter of the section's
      // scroll range. The track moves in discrete jumps (one per
      // step), so the active step's range is exactly 1/4:
      //   step 1: 0      → 1/4
      //   step 2: 1/4    → 1/2
      //   step 3: 1/2    → 3/4
      //   step 4: 3/4    → 1
      // Within a step's range, the step's words light up one by
      // one as the user scrolls through.
      const ranges = [
        [0,   1/4],
        [1/4, 1/2],
        [1/2, 3/4],
        [3/4, 1  ],
      ];
      stepData.forEach((sd, stepIdx) => {
        const [sStart, sEnd] = ranges[stepIdx];
        const stepSpan = sEnd - sStart;
        const stepProgress = Math.max(0, Math.min(1, (progress - sStart) / stepSpan));
        // Words
        const wn = sd.words.length;
        sd.words.forEach((word, wi) => {
          const threshold = wn > 0 ? (wi / wn) : 0;
          const isLit = stepProgress >= threshold;
          if (isLit && word.dataset.lit !== '1') {
            word.style.color = 'var(--ink)';
            word.dataset.lit = '1';
          } else if (!isLit && word.dataset.lit === '1') {
            word.style.color = 'var(--mute)';
            word.dataset.lit = '';
          }
        });
        // Bullets — light up in the last 20% of the step's range.
        sd.bullets.forEach((li, bi) => {
          const threshold = 0.8 + (bi / Math.max(1, sd.bullets.length)) * 0.2;
          const isLit = stepProgress >= threshold;
          li.style.opacity = isLit ? '1' : '0.4';
        });
      });
      // Hit counter + SONAR + step counter text.
      if (active >= 0 && !hitSet.has(active)) hitSet.add(active);
      const display = String(active + 1).padStart(2, '0');
      if (statusNum) statusNum.textContent = display;
      if (statusHits) statusHits.textContent = String(Math.max(1, hitSet.size)).padStart(2, '0');
      if (stepCurrent) stepCurrent.textContent = display;
    }
    let ticking = false;
    addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(() => { ticking = false; update(); }); ticking = true; }
    }, { passive: true });
    update();
  })();

  // ------------------------------------------------------------
  // ACTIVE NAV LINK — highlights the current section in the nav.
  // ------------------------------------------------------------
  (function activeNav() {
    const links = Array.from(document.querySelectorAll('.nav__links a[href^="#"]'));
    const targets = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
    if (!links.length || !targets.length) return;
    function update() {
      const y = window.scrollY + window.innerHeight * 0.25;
      let activeIdx = -1;
      targets.forEach((t, i) => { if (t.offsetTop <= y) activeIdx = i; });
      links.forEach((a, i) => a.classList.toggle('is-active', i === activeIdx));
    }
    let ticking = false;
    addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  })();
})();
