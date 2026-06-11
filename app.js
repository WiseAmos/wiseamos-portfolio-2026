// ============================================================
// AMOS · PORTFOLIO 2026 — interactions (v2: Awwwards rebuild)
// - Hero CSS fallback (when WebGL is unavailable or 3D carousel fails)
// - Project card rendering
// - GSAP scroll reveals
// - Cursor glow (desktop only)
// ============================================================

(() => {
  'use strict';

  // ---------- DEPLOY STAMP ----------
  const stamp = document.getElementById('deployStamp');
  if (stamp) {
    const d = new Date();
    stamp.textContent = d.toISOString().slice(0, 10);
  }

  // ---------- WEBGL FEATURE DETECT ----------
  // The three-hero module sets no-webgl on <html> if WebGL is unavailable.
  // We also test here as a backup.
  (() => {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) document.documentElement.classList.add('no-webgl');
    } catch (e) {
      document.documentElement.classList.add('no-webgl');
    }
  })();

  // ---------- HERO CSS FALLBACK ----------
  // If WebGL is off, build CSS scroll-snap cards from the projects data.
  const fb = document.getElementById('heroFallback');
  if (fb && window.PROJECTS) {
    const projects = window.PROJECTS.slice(0, 5);
    fb.innerHTML = projects.map((p) => `
      <a class="fallback-card" href="https://github.com/WiseAmos/${p.repo}" target="_blank" rel="noopener"
         style="--card-accent:${p.color}">
        <div>
          <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:.14em;color:var(--fg-faint);text-transform:uppercase;">${p.tag}</div>
          <h3 style="font-size:24px;font-weight:600;letter-spacing:-.02em;line-height:1.15;margin:14px 0 0;color:var(--fg);">${p.title}</h3>
        </div>
        <p style="font-size:13px;color:var(--fg-dim);line-height:1.5;margin:0;">${p.desc}</p>
        <div style="display:flex;align-items:center;gap:8px;font-family:var(--font-mono);font-size:11px;color:var(--fg-faint);text-transform:uppercase;letter-spacing:.04em;">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};"></span>
          amos/${p.repo}
        </div>
      </a>
    `).join('');
  }

  // ---------- CURSOR GLOW (desktop only) ----------
  if (window.matchMedia('(hover: hover)').matches) {
    const glow = document.querySelector('.cursor-glow');
    if (glow) {
      let mx = window.innerWidth / 2, my = window.innerHeight / 2;
      let gx = mx, gy = my;
      window.addEventListener('mousemove', (e) => {
        mx = e.clientX; my = e.clientY;
        glow.style.opacity = '1';
      }, { passive: true });
      (function loop() {
        gx += (mx - gx) * 0.12;
        gy += (my - gy) * 0.12;
        glow.style.transform = `translate(${gx}px, ${gy}px) translate(-50%, -50%)`;
        requestAnimationFrame(loop);
      })();
    }
  }

  // ---------- RENDER PROJECTS (work grid) ----------
  const grid = document.getElementById('workGrid');
  if (grid && window.PROJECTS) {
    grid.innerHTML = window.PROJECTS.map((p, i) => {
      const num = String(i + 1).padStart(2, '0');
      const href = `https://github.com/WiseAmos/${p.repo}`;
      const topics = (p.topics || []).slice(0, 3)
        .map(t => `<li>${t}</li>`).join('');
      return `
        <li class="work-card" style="--card-accent:${p.color}">
          <div class="work-card__head">
            <span class="work-card__num">${num} / ${String(window.PROJECTS.length).padStart(2, '0')}</span>
            <span class="work-card__tag">${p.tag}</span>
          </div>
          <h3 class="work-card__title">${p.title}</h3>
          <p class="work-card__desc">${p.desc}</p>
          <div class="work-card__foot">
            ${topics ? `<ul style="display:flex;gap:8px;list-style:none;padding:0;margin:0;font-family:var(--font-mono);font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--fg-faint);">${topics}</ul>` : ''}
            <a class="work-card__cta" href="${href}" target="_blank" rel="noopener" aria-label="View ${p.title} on GitHub">↗</a>
          </div>
        </li>
      `;
    }).join('');
  }

  // ---------- NAV SCROLL SHRINK ----------
  const nav = document.getElementById('nav');
  if (nav) {
    const onScroll = () => {
      if (window.scrollY > 24) nav.classList.add('is-scrolled');
      else nav.classList.remove('is-scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ---------- GSAP SCROLL REVEALS ----------
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    document.querySelectorAll('[data-reveal]').forEach((el) => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        once: true,
        onEnter: () => el.classList.add('is-in'),
      });
    });

    // Hero title line stagger — only run if intro splash has cleared
    const lines = document.querySelectorAll('.hero__title .line');
    if (lines.length) {
      gsap.from(lines, {
        yPercent: 110,
        duration: 1.1,
        ease: 'power4.out',
        stagger: 0.08,
        delay: 0.2,
      });
    }
    gsap.from('.hero__sub, .hero__cta, .hero__meta', {
      opacity: 0, y: 24, duration: 0.9, ease: 'power3.out', stagger: 0.08, delay: 0.7,
    });
    gsap.from('.hero__stage', {
      opacity: 0, scale: 0.96, duration: 1.2, ease: 'power3.out', delay: 0.4,
    });
  } else {
    // No GSAP — just reveal immediately
    document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('is-in'));
  }
})();
