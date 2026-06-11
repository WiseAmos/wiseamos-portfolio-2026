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

  // ---------- HERO CANVAS ----------
  // A lightweight, GPU-friendly "orbiting mesh" of blobs.
  const canvas = document.getElementById('heroCanvas');
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d', { alpha: true });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;
    const blobs = [
      { x: 0.2, y: 0.3, r: 0.32, hue: 95,  sat: 95, l: 65, vx: 0.00020, vy: 0.00015, phase: 0 },
      { x: 0.8, y: 0.2, r: 0.28, hue: 330, sat: 95, l: 70, vx:-0.00018, vy: 0.00022, phase: 1.2 },
      { x: 0.5, y: 0.7, r: 0.34, hue: 200, sat: 90, l: 65, vx: 0.00014, vy:-0.00020, phase: 2.4 },
      { x: 0.3, y: 0.8, r: 0.22, hue: 60,  sat: 95, l: 65, vx: 0.00018, vy: 0.00010, phase: 3.1 },
    ];
    function resize() {
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    let t0 = performance.now();
    function frame(now) {
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);

      for (const b of blobs) {
        b.x += b.vx;
        b.y += b.vy;
        if (b.x < 0.05 || b.x > 0.95) b.vx *= -1;
        if (b.y < 0.05 || b.y > 0.95) b.vy *= -1;
        const cx = b.x * W + Math.cos(t*0.4 + b.phase) * 40;
        const cy = b.y * H + Math.sin(t*0.3 + b.phase) * 40;
        const r  = b.r * Math.min(W, H);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, `hsla(${b.hue}, ${b.sat}%, ${b.l}%, 0.55)`);
        g.addColorStop(0.5, `hsla(${b.hue}, ${b.sat}%, ${b.l}%, 0.18)`);
        g.addColorStop(1, `hsla(${b.hue}, ${b.sat}%, ${b.l}%, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
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
