// ============================================================
// HERO 3D CARD CAROUSEL
// Renders 5 featured project cards as 3D planes in a perspective
// group. Cards are perspective-tilted with the center card
// pushed forward, sides angled back. Mouse drag (desktop) and
// touch swipe (mobile) rotate the carousel. Auto-advance every
// 6s. Falls back to a CSS scroll-snap carousel in app.js.
// ============================================================

import * as THREE from 'three';

const mount = document.getElementById('heroStage');
const cards = document.getElementById('heroCards');
const dotsEl = document.getElementById('heroDots');

if (!mount || !cards) {
  // nothing to do
} else {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) throw new Error('WebGL unavailable');

    // ----- Projects source (use window.PROJECTS from projects.js) -----
    const all = (window.PROJECTS || []).slice(0, 5);
    if (all.length < 3) throw new Error('Need at least 3 projects for carousel');

    // ----- Renderer -----
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    cards.appendChild(renderer.domElement);

    // ----- Scene -----
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 7);

    // ----- Lighting (subtle, for the iridescent material) -----
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const key = new THREE.PointLight(0xB6FF6B, 1.2, 12);
    key.position.set(2, 2, 3);
    scene.add(key);
    const rim = new THREE.PointLight(0xFF6B9D, 0.9, 12);
    rim.position.set(-2, -1, 2);
    scene.add(rim);
    const back = new THREE.PointLight(0x6BCBFF, 0.6, 12);
    back.position.set(0, 0, -3);
    scene.add(back);

    // ----- Card art: each card = offscreen canvas → CanvasTexture -----
    // Card art is rendered at 540×760 to look crisp on retina.
    const CARD_W = 540, CARD_H = 760;
    const palettes = [
      ['#B6FF6B', '#6BCBFF'],
      ['#FF6B9D', '#C792EA'],
      ['#6BCBFF', '#B6FF6B'],
      ['#C792EA', '#FF6B9D'],
      ['#FFD86B', '#6BCBFF'],
    ];
    const langColors = {
      TypeScript: '#3178C6',
      Python: '#FFD43B',
      'C++': '#F34B7D',
      Rust: '#DEA584',
      Go: '#00ADD8',
      Solidity: '#AA6746',
      JavaScript: '#F1E05A',
    };

    function makeCardArt(project, idx) {
      const cv = document.createElement('canvas');
      cv.width = CARD_W; cv.height = CARD_H;
      const ctx = cv.getContext('2d');

      // Background gradient (palette-based)
      const [c1, c2] = palettes[idx % palettes.length];
      const grad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
      grad.addColorStop(0, c1);
      grad.addColorStop(1, c2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CARD_W, CARD_H);

      // Dark overlay so text reads
      const overlay = ctx.createLinearGradient(0, 0, 0, CARD_H);
      overlay.addColorStop(0, 'rgba(0,0,0,0.0)');
      overlay.addColorStop(0.5, 'rgba(0,0,0,0.35)');
      overlay.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, CARD_W, CARD_H);

      // Grain noise
      const imgd = ctx.getImageData(0, 0, CARD_W, CARD_H);
      const d = imgd.data;
      for (let i = 0; i < d.length; i += 4) {
        const n = (Math.random() - 0.5) * 18;
        d[i] = Math.max(0, Math.min(255, d[i] + n));
        d[i+1] = Math.max(0, Math.min(255, d[i+1] + n));
        d[i+2] = Math.max(0, Math.min(255, d[i+2] + n));
      }
      ctx.putImageData(imgd, 0, 0);

      // Holographic border ring
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(20, 20, CARD_W - 40, CARD_H - 40, 28);
      ctx.stroke();

      // Index number, top-left
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '600 28px "Space Grotesk", system-ui, sans-serif';
      ctx.fillText(String(idx + 1).padStart(2, '0'), 50, 80);

      // Tag pill, top-right
      const tag = project.tag || project.tags?.[0] || 'PROJECT';
      ctx.font = '500 18px "JetBrains Mono", monospace';
      const tagW = ctx.measureText(tag).width;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.roundRect(CARD_W - tagW - 80, 50, tagW + 40, 36, 18);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fillText(tag, CARD_W - tagW - 60, 74);

      // Big initial letter, decorative
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.font = '800 380px "Space Grotesk", system-ui, sans-serif';
      const initial = (project.title || 'A').charAt(0).toUpperCase();
      ctx.fillText(initial, 50, CARD_H * 0.65);

      // Title, bottom
      ctx.fillStyle = 'rgba(255,255,255,0.98)';
      ctx.font = '700 56px "Space Grotesk", system-ui, sans-serif';
      const title = project.title || 'Project';
      wrapText(ctx, title, 50, CARD_H - 180, CARD_W - 100, 60);

      // Subtitle (description)
      ctx.fillStyle = 'rgba(255,255,255,0.70)';
      ctx.font = '400 22px "Space Grotesk", system-ui, sans-serif';
      const sub = project.desc || project.description || '';
      wrapText(ctx, sub, 50, CARD_H - 110, CARD_W - 100, 30);

      // Footer: language dot + repo name
      const lang = project.language || (project.languages && project.languages[0]) || '';
      if (lang) {
        ctx.fillStyle = langColors[lang] || '#B6FF6B';
        ctx.beginPath();
        ctx.arc(60, CARD_H - 50, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = '500 18px "JetBrains Mono", monospace';
      ctx.fillText(`amos / ${project.repo || 'repo'}`, 80, CARD_H - 44);

      return cv;
    }

    function wrapText(ctx, text, x, y, maxW, lineH) {
      const words = String(text).split(/\s+/);
      let line = '';
      let yy = y;
      for (const w of words) {
        const test = line ? line + ' ' + w : w;
        if (ctx.measureText(test).width > maxW && line) {
          ctx.fillText(line, x, yy);
          line = w;
          yy += lineH;
        } else {
          line = test;
        }
      }
      if (line) ctx.fillText(line, x, yy);
    }

    // ----- Build the cards -----
    const cardGroup = new THREE.Group();
    scene.add(cardGroup);

    const N = all.length;
    const cardMeshes = [];

    for (let i = 0; i < N; i++) {
      const art = makeCardArt(all[i], i);
      const tex = new THREE.CanvasTexture(art);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.35,
        metalness: 0.0,
        transparent: true,
        opacity: 1.0,
        emissive: 0xffffff,
        emissiveMap: tex,
        emissiveIntensity: 0.15,
      });
      const geo = new THREE.PlaneGeometry(1.4, 1.98, 1, 1);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData.index = i;
      mesh.userData.baseScale = 1.0;
      cardGroup.add(mesh);
      cardMeshes.push(mesh);
    }

    // ----- Carousel state -----
    // activeIndex is the "center" card. We arrange cards in a circle of
    // radius R around the camera, with the active one closest.
    let activeIndex = 0;
    let targetYaw = 0;       // current rotation of the group (radians)
    let currentYaw = 0;
    const SPACING = 1.32;    // distance between card centers (tightened so all 5 fit)
    const SIDE_TILT = 0.42;  // ~24° tilt for side cards
    const SCALE_FACTOR = 0.78;

    function layoutCards() {
      // Position each card at an arc around the group origin.
      // Spacing along the arc.
      for (let i = 0; i < N; i++) {
        const m = cardMeshes[i];
        const offset = i - activeIndex;
        const x = offset * SPACING;
        // Z: center card is closer, sides recede
        const z = -Math.abs(offset) * 0.45;
        // Y: subtle vertical wave
        const y = Math.sin((i - activeIndex) * 0.5) * 0.05;
        m.position.set(x, y, z);

        // Rotation: tilt sides around Y axis (perspective)
        const rotY = -offset * SIDE_TILT;
        m.rotation.set(0, rotY, 0);

        // Scale: center is largest
        const distFromActive = Math.abs(offset);
        const scale = 1.0 - distFromActive * 0.15;
        m.scale.setScalar(scale);

        // Opacity: side cards dim a bit
        m.material.opacity = 1.0 - distFromActive * 0.18;
      }
    }

    layoutCards();

    // ----- Dots UI -----
    if (dotsEl) {
      for (let i = 0; i < N; i++) {
        const li = document.createElement('li');
        if (i === activeIndex) li.classList.add('is-active');
        li.addEventListener('click', () => setActive(i));
        dotsEl.appendChild(li);
      }
    }
    function updateDots() {
      if (!dotsEl) return;
      [...dotsEl.children].forEach((el, i) => {
        el.classList.toggle('is-active', i === activeIndex);
      });
    }

    function setActive(i) {
      activeIndex = ((i % N) + N) % N;
      layoutCards();
      updateDots();
    }

    // ----- Drag / swipe -----
    let dragging = false;
    let dragStartX = 0;
    let lastDragX = 0;
    let dragDelta = 0;
    let lastInteraction = 0;
    const AUTO_ADVANCE_MS = 6000;

    function onDown(x) {
      dragging = true;
      dragStartX = x;
      lastDragX = x;
      dragDelta = 0;
      lastInteraction = performance.now();
    }
    function onMove(x) {
      if (!dragging) return;
      const dx = x - lastDragX;
      lastDragX = x;
      dragDelta += dx;
      // Apply visual rotation while dragging
      targetYaw += dx * 0.005;
      lastInteraction = performance.now();
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      // Snap to nearest card based on dragDelta
      const cards_to_advance = Math.round(dragDelta / 80);
      if (cards_to_advance !== 0) {
        setActive(activeIndex - cards_to_advance);
      }
      dragDelta = 0;
      lastInteraction = performance.now();
    }

    renderer.domElement.addEventListener('pointerdown', (e) => {
      onDown(e.clientX);
      renderer.domElement.setPointerCapture(e.pointerId);
    });
    renderer.domElement.addEventListener('pointermove', (e) => onMove(e.clientX));
    renderer.domElement.addEventListener('pointerup', (e) => {
      try { renderer.domElement.releasePointerCapture(e.pointerId); } catch {}
      onUp();
    });
    renderer.domElement.addEventListener('pointercancel', onUp);

    // ----- Resize -----
    function resize() {
      const r = mount.getBoundingClientRect();
      const w = Math.max(1, r.width);
      const h = Math.max(1, r.height);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // Move camera back further on portrait (mobile) so card width fits.
      // FOV is the same; the key is the distance.
      if (w < h) {
        // Mobile portrait
        camera.position.z = 7.5;
        camera.fov = 44;
      } else if (w < 1100) {
        // Tablet / narrow desktop
        camera.position.z = 7.5;
        camera.fov = 40;
      } else {
        // Wide desktop
        camera.position.z = 6.5;
        camera.fov = 38;
      }
      camera.updateProjectionMatrix();
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    // ----- Animation loop -----
    const clock = new THREE.Clock();
    let raf;
    function animate() {
      const t = clock.getElapsedTime();
      const now = performance.now();

      // Auto-advance if idle
      if (!dragging && now - lastInteraction > AUTO_ADVANCE_MS) {
        setActive((activeIndex + 1) % N);
        lastInteraction = now;
      }

      // Eased rotation toward targetYaw (so group returns to identity after drag)
      // We use activeIndex to compute the desired yaw so cards align nicely.
      const desiredYaw = 0; // always 0 because we move cards in layoutCards
      currentYaw += (desiredYaw - currentYaw) * 0.08;
      cardGroup.rotation.y = currentYaw;

      // Subtle ambient sway
      cardGroup.rotation.x = Math.sin(t * 0.4) * 0.02;
      cardGroup.position.y = Math.sin(t * 0.6) * 0.03;

      // Subtle per-card rotation in Z for life
      for (let i = 0; i < N; i++) {
        const m = cardMeshes[i];
        const offset = i - activeIndex;
        m.rotation.z = Math.sin(t * 0.8 + i) * 0.015 * Math.min(1, Math.abs(offset) + 0.3);
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    }
    animate();

    // ----- Reveal + signal ready -----
    requestAnimationFrame(() => {
      renderer.domElement.classList.add('is-ready');
      window.dispatchEvent(new CustomEvent('hero3d:ready'));
    });

    // ----- Pause when off-screen (perf) -----
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          if (!raf) animate();
        } else {
          cancelAnimationFrame(raf);
          raf = null;
        }
      }
    }, { threshold: 0 });
    io.observe(mount);
  } catch (err) {
    console.warn('[three-hero] disabled, falling back to CSS carousel:', err);
    document.documentElement.classList.add('no-webgl');
  }
}
