// ============================================================
// AMOS · PORTFOLIO 2026 — interactions
// - Hero canvas (orbiting gradient mesh, no three.js needed)
// - Cursor glow
// - Project card rendering
// - GSAP scroll reveals
// ============================================================

(() => {
  'use strict';

  // ---------- DEPLOY STAMP ----------
  const stamp = document.getElementById('deployStamp');
  if (stamp) {
    const d = new Date();
    stamp.textContent = d.toISOString().slice(0,10);
  }

  // ---------- WEBGL FEATURE DETECT ----------
  // Three.js itself runs a probe; if it throws, the import rejects and our
  // module-level handlers will set a class on <html>. As a backup we test here.
  (() => {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) document.documentElement.classList.add('no-webgl');
    } catch (e) {
      document.documentElement.classList.add('no-webgl');
    }
  })();

  // ---------- CURSOR GLOW ----------
  const glow = document.querySelector('.cursor-glow');
  let mx = window.innerWidth/2, my = window.innerHeight/2;
  let gx = mx, gy = my;
  window.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
  }, { passive: true });
  function loop() {
    gx += (mx - gx) * 0.12;
    gy += (my - gy) * 0.12;
    if (glow) glow.style.transform = `translate(${gx}px, ${gy}px) translate(-50%, -50%)`;
    requestAnimationFrame(loop);
  }
  loop();

  // ---------- HERO 3D ----------
  // Module is loaded separately (three-hero.js). It owns the renderer.
  // We just listen for the ready event to fade it in.
  window.addEventListener('hero3d:ready', () => {
    const el = document.getElementById('hero3d');
    if (el) el.classList.add('is-ready');
  });

  // ---------- SCENE STEPS HIGHLIGHT ----------
  // Map progress [0..1] to one of 4 steps. Steps roughly cover:
  //   0.00–0.25  → Knot
  //   0.25–0.50  → Torus
  //   0.50–0.75  → Sphere
  //   0.75–1.00  → Particles
  const steps = document.querySelectorAll('#sceneSteps li');
  if (steps.length) {
    const setActive = (i) => steps.forEach((s, idx) => s.classList.toggle('is-active', idx === i));
    setActive(0);
    if (window.ScrollTrigger) {
      for (let i = 0; i < 4; i++) {
        const start = `${10 + i * 20}%`;
        const end   = `${30 + i * 20}%`;
        ScrollTrigger.create({
          trigger: '#scene',
          start: `top+=${start} center`,
          end:   `top+=${end} center`,
          onEnter:    () => setActive(i),
          onEnterBack:() => setActive(i),
        });
      }
    }
  }

  // ---------- RENDER PROJECTS ----------
  const grid = document.getElementById('workGrid');
  if (grid && window.PROJECTS) {
    grid.innerHTML = window.PROJECTS.map((p, i) => {
      const num = String(i + 1).padStart(2, '0');
      const href = `https://github.com/WiseAmos/${p.repo}`;
      const topics = (p.topics || []).slice(0, 3).map(t => `<span>${t}</span>`).join('');
      return `
        <li class="work-card" data-size="${p.size || ''}" data-mouse>
          <div class="work-card__index">${num} / ${String(window.PROJECTS.length).padStart(2,'0')}</div>
          <span class="work-card__chip">
            <span class="swatch" style="background:${p.color}"></span>
            ${p.tag}
          </span>
          <h3 class="work-card__title">${p.title}</h3>
          <p class="work-card__desc">${p.desc}</p>
          <div class="work-card__meta">${topics}</div>
          <a class="work-card__cta" href="${href}" target="_blank" rel="noopener">
            View on GitHub <span aria-hidden="true">↗</span>
          </a>
        </li>
      `;
    }).join('');
  }

  // ---------- CARD MOUSE GLOW POSITION ----------
  document.querySelectorAll('[data-mouse]').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  // ---------- GSAP SCROLL REVEALS ----------
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    document.querySelectorAll('[data-reveal]').forEach((el) => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        once: true,
        onEnter: () => el.classList.add('is-in'),
      });
    });

    // Hero title line stagger
    const lines = document.querySelectorAll('.hero__title .line > span');
    if (lines.length) {
      gsap.from(lines, {
        yPercent: 110,
        duration: 1.1,
        ease: 'power4.out',
        stagger: 0.08,
        delay: 0.1,
      });
    }
    gsap.from('.hero__sub, .hero__cta, .hero__meta', {
      opacity: 0, y: 24, duration: 0.9, ease: 'power3.out', stagger: 0.08, delay: 0.6,
    });
  } else {
    // No GSAP — just reveal immediately
    document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('is-in'));
  }
})();
