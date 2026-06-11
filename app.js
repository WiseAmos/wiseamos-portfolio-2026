// ============================================================
// WORK TABLE — render curated projects as <tr> rows
// No card grid. No gradients. No holographic anything.
// ============================================================

(function () {
  const tbody = document.querySelector('#workTable tbody');
  if (!tbody || !window.PROJECTS) return;

  const gh = 'https://github.com/WiseAmos';

  tbody.innerHTML = window.PROJECTS.map((p, i) => {
    const num = String(i + 1).padStart(2, '0');
    const topics = (p.topics || []).slice(0, 3).map(t => `<span>${t}</span>`).join('');
    return `
      <tr>
        <td class="col-no">${num} / ${String(window.PROJECTS.length).padStart(2, '0')}</td>
        <td class="col-name">
          ${p.title}
          <span class="sub">${p.tag || ''}</span>
        </td>
        <td class="col-lang">
          <span class="lang-tag" style="--lang-color:${p.langColor || '#0A0A0A'}">${p.lang || '—'}</span>
        </td>
        <td class="col-desc">${p.desc || ''}</td>
        <td class="col-topics">${topics}</td>
        <td class="col-link">
          <a class="work__link" href="${gh}/${p.repo}" target="_blank" rel="noopener">
            REPO <span aria-hidden="true">↗</span>
          </a>
        </td>
      </tr>
    `;
  }).join('');
})();

// ============================================================
// REVEAL — IntersectionObserver for [data-reveal] sections
// Pure CSS class toggle. No GSAP. No animation library.
// ============================================================

(function () {
  const els = document.querySelectorAll('[data-reveal]');
  if (!els.length) return;

  // Inject the reveal CSS once.
  const style = document.createElement('style');
  style.textContent = `
    [data-reveal] { opacity: 0; transform: translateY(8px); transition: opacity 400ms ease, transform 400ms ease; }
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
  }, { threshold: 0.08, rootMargin: '0px 0px -10% 0px' });

  els.forEach(el => io.observe(el));
})();

// ============================================================
// NAV — solid background once user scrolls past hero
// Prevents weird transparent-over-text state if nav height changes.
// ============================================================

(function () {
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
