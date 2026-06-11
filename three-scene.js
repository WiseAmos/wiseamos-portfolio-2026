// ============================================================
// SCENE — single geometry, 4 stages tied to scroll progress
// Brutalist. Each stage = a different primitive. Crossfade by
// opacity. The geometry's rotation also changes with scroll.
// No shaders, no particles, no lighting — just line segments.
// ============================================================

import * as THREE from 'three';

const mount = document.getElementById('sceneCanvas');
const stateEl = document.getElementById('sceneState');
const ledeEl = document.getElementById('sceneLede');
const stepsEl = document.getElementById('sceneSteps');
const stepItems = stepsEl ? Array.from(stepsEl.querySelectorAll('.scene3d__step')) : [];

if (!mount) {
  // skip
} else {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) throw new Error('WebGL unavailable');

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 5.5);
    camera.lookAt(0, 0, 0);

    const INK = 0x0A0A0A;
    const ACCENT = 0xB6FF6B;
    const HOT = 0xFF5722;

    // Build a wireframe for any geometry.
    function wireframe(geom, color = INK) {
      const edges = new THREE.EdgesGeometry(geom);
      return new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
        color, transparent: true, opacity: 0,
      }));
    }

    // 4 stages — different geometry per stage.
    const stages = [
      { name: 'STATEFUL',     geom: new THREE.TorusKnotGeometry(0.95, 0.32, 128, 16, 2, 3) },
      { name: 'DETERMINISTIC', geom: new THREE.TorusGeometry(1.15, 0.4, 16, 64) },
      { name: 'STRUCTURED',   geom: new THREE.IcosahedronGeometry(1.25, 0) },
      { name: 'EMERGENT',     geom: new THREE.IcosahedronGeometry(1.25, 1) },
    ];
    const meshes = stages.map(s => {
      const m = wireframe(s.geom, INK);
      m.userData.name = s.name;
      scene.add(m);
      return m;
    });

    // One accent ring per stage, hidden by default — we crossfade them too.
    const accentRings = stages.map((s, i) => {
      const r = new THREE.Mesh(
        new THREE.RingGeometry(1.55 + i * 0.05, 1.6 + i * 0.05, 64),
        new THREE.MeshBasicMaterial({ color: ACCENT, side: THREE.DoubleSide, transparent: true, opacity: 0 })
      );
      r.rotation.x = Math.PI / 2;
      scene.add(r);
      return r;
    });

    // Resize.
    function resize() {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      if (h > w * 1.4) camera.position.set(0, 0, 6.5);
      else camera.position.set(0, 0, 5.5);
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });
    new ResizeObserver(resize).observe(mount);

    // Scroll progress across the sticky pin range.
    function getProgress() {
      const r = mount.closest('.scene3d').getBoundingClientRect();
      const total = r.height - window.innerHeight;
      if (total <= 0) return 0;
      const scrolled = Math.min(Math.max(-r.top, 0), total);
      return scrolled / total;
    }

    // Animate.
    let raf = null;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { if (!raf) animate(); }
      else { cancelAnimationFrame(raf); raf = null; }
    }, { threshold: 0.05 });
    io.observe(mount);

    function setStep(progress) {
      const N = stages.length;
      const idx = Math.min(N - 1, Math.floor(progress * N));
      stepItems.forEach((el, i) => {
        el.classList.toggle('is-active', i === idx);
      });
      const s = stages[idx];
      if (stateEl) stateEl.textContent = s.name;
      const step = stepItems[idx];
      if (step && step.dataset.lede && ledeEl) ledeEl.textContent = step.dataset.lede;
    }

    function animate() {
      raf = requestAnimationFrame(animate);
      const progress = getProgress();
      const N = stages.length;
      const stagePos = progress * (N - 1);
      const i0 = Math.floor(stagePos);
      const i1 = Math.min(N - 1, i0 + 1);
      const t = stagePos - i0;
      // smoothstep
      const s = t * t * (3 - 2 * t);

      meshes.forEach((m, i) => {
        let op = 0;
        if (i === i0) op = 1 - s;
        else if (i === i1) op = s;
        m.material.opacity = op * 0.95;
        m.visible = op > 0.005;
        m.rotation.x = performance.now() * 0.0003 + i * 0.2;
        m.rotation.y = performance.now() * 0.0005 + i * 0.1;
      });
      accentRings.forEach((r, i) => {
        let op = 0;
        if (i === i0) op = 1 - s;
        else if (i === i1) op = s;
        r.material.opacity = op * 0.85;
        r.visible = op > 0.005;
        r.rotation.z = -performance.now() * 0.0002;
      });

      setStep(progress);
      renderer.render(scene, camera);
    }
    animate();
  } catch (err) {
    console.warn('scene 3D skipped:', err.message);
  }
}
