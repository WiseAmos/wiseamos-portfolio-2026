// ============================================================
// v4 — content-first. No 3D. No WebGL. No canvas.
// All interactions are DOM/CSS, no animation library.
// ============================================================

(function () {
  'use strict';

  // ------------------------------------------------------------
  // WORK TABLE — render curated projects as <tr> rows
  // v4: single-line NO column (no wrap), LIVE DEMO column,
  // row hover reveals stars + last-commit date.
  // ------------------------------------------------------------
  const tbody = document.querySelector('#workTable tbody');
  if (tbody && window.PROJECTS) {
    const gh = 'https://github.com/WiseAmos';
    const total = String(window.PROJECTS.length).padStart(2, '0');
    tbody.innerHTML = window.PROJECTS.map((p, i) => {
      const num = String(i + 1).padStart(2, '0');
      const topics = (p.topics || []).slice(0, 3).map(t => `<span>${t}</span>`).join('');
      const demoCell = p.liveDemo
        ? `<a class="work__link work__link--accent" href="${p.liveDemo}" target="_blank" rel="noopener">LIVE <span aria-hidden="true">↗</span></a>`
        : `<span class="work__link work__link--mute">—</span>`;
      return `
        <tr>
          <td class="col-no"><span class="col-no__num">${num}</span><span class="col-no__sep">/</span><span class="col-no__total">${total}</span></td>
          <td class="col-name">
            <span class="col-name__title">${p.title}</span>
            <span class="sub">${p.tag || ''}</span>
          </td>
          <td class="col-lang">
            <span class="lang-tag" style="--lang-color:${p.langColor || '#0A0A0A'}">${p.lang || '—'}</span>
          </td>
          <td class="col-desc">${p.desc || ''}</td>
          <td class="col-topics">${topics}</td>
          <td class="col-demo">${demoCell}</td>
          <td class="col-link">
            <a class="work__link" href="${gh}/${p.repo}" target="_blank" rel="noopener">
              REPO <span aria-hidden="true">↗</span>
            </a>
          </td>
        </tr>
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
  // TIMELINE — fills the rail on the process section as the
  // user scrolls through it. Pure CSS for the rail, JS for the
  // active step highlighting.
  // ------------------------------------------------------------
  (function timeline() {
    const rail = document.querySelector('.timeline__rail');
    const steps = Array.from(document.querySelectorAll('.timeline__step'));
    if (!rail || !steps.length) return;
    function update() {
      const section = document.querySelector('.timeline');
      if (!section) return;
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight;
      // progress 0..1 across the section, with a 200px start offset
      const start = vh * 0.55;
      const total = r.height - start;
      const scrolled = Math.min(Math.max(start - r.top, 0), total);
      const pct = total > 0 ? scrolled / total : 0;
      // Set a CSS variable that drives the ::after transform.
      // (We can't write to a pseudo-element's transform directly,
      // so we use --rail-progress and let CSS apply it.)
      rail.style.setProperty('--rail-progress', String(pct));
      // active step = the deepest one whose top has passed the start line
      let active = -1;
      steps.forEach((s, i) => {
        const sr = s.getBoundingClientRect();
        if (sr.top < vh * 0.5) active = i;
      });
      steps.forEach((s, i) => s.classList.toggle('is-active', i === active));
    }
    let ticking = false;
    addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
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
