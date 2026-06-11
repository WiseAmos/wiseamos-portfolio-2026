// ============================================================
// THREE.JS — HERO WIREFRAME TORUS KNOT
// 50vw canvas, fixed-positioned, runs after first paint.
// Falls back gracefully if WebGL is unavailable.
// ============================================================

import * as THREE from 'three';

const mount = document.getElementById('hero3d');
if (!mount) {
  // No mount point — bail.
} else {
  try {
    // Test context first; abort if it fails.
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) throw new Error('WebGL unavailable');

    // ----- Renderer -----
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // ----- Scene -----
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 4.5);

    // ----- Lights (subtle, wireframe doesn't really need them but
    //       helps if we ever swap to shaded materials) -----
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const key = new THREE.PointLight(0xB6FF6B, 1.4, 12);
    key.position.set(2, 1.5, 2);
    scene.add(key);
    const rim = new THREE.PointLight(0xFF6B9D, 1.0, 12);
    rim.position.set(-2, -1.2, -1.5);
    scene.add(rim);

    // ----- Torus knot: wireframe, with a faint inner shell -----
    const group = new THREE.Group();
    scene.add(group);

    const KNOT_R = 1.1, KNOT_TUBE = 0.32, KNOT_SEGS = 220, KNOT_RADIAL = 18;
    const geo = new THREE.TorusKnotGeometry(KNOT_R, KNOT_TUBE, KNOT_SEGS, KNOT_RADIAL);

    // Filled shell (very low opacity) so the volume reads
    const shellMat = new THREE.MeshStandardMaterial({
      color: 0xB6FF6B,
      emissive: 0xB6FF6B,
      emissiveIntensity: 0.18,
      metalness: 0.7,
      roughness: 0.35,
      transparent: true,
      opacity: 0.10,
    });
    const shell = new THREE.Mesh(geo, shellMat);
    group.add(shell);

    // Wireframe on top
    const wireMat = new THREE.LineBasicMaterial({
      color: 0xF4F4F6,
      transparent: true,
      opacity: 0.55,
    });
    const wire = new THREE.LineSegments(new THREE.WireframeGeometry(geo), wireMat);
    group.add(wire);

    // Accent wireframe (slightly larger, lime) for a halo effect
    const accentWire = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.TorusKnotGeometry(KNOT_R * 1.04, KNOT_TUBE * 0.55, 120, 8)),
      new THREE.LineBasicMaterial({ color: 0xB6FF6B, transparent: true, opacity: 0.35 })
    );
    group.add(accentWire);

    // ----- Floating particles -----
    const PARTICLE_COUNT = 380;
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Distribute in a loose spherical shell
      const r = 2.6 + Math.random() * 1.8;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      positions[i*3]   = r * Math.sin(p) * Math.cos(t);
      positions[i*3+1] = r * Math.sin(p) * Math.sin(t);
      positions[i*3+2] = r * Math.cos(p);
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xB6FF6B,
      size: 0.018,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // ----- Mouse parallax -----
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    window.addEventListener('mousemove', (e) => {
      // Normalize to [-1, 1]
      target.x = (e.clientX / window.innerWidth)  * 2 - 1;
      target.y = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });

    // ----- Resize -----
    function resize() {
      const r = mount.getBoundingClientRect();
      const w = Math.max(1, r.width);
      const h = Math.max(1, r.height);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
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

      // Slow auto-rotation
      group.rotation.x = Math.sin(t * 0.15) * 0.35;
      group.rotation.y = t * 0.18;

      // Mouse parallax (eased)
      current.x += (target.x - current.x) * 0.06;
      current.y += (target.y - current.y) * 0.06;
      group.rotation.y += current.x * 0.35;
      group.rotation.x += current.y * -0.25;

      // Particles drift
      particles.rotation.y = t * 0.04;
      particles.rotation.x = Math.sin(t * 0.2) * 0.1;

      // Accent wire pulses
      accentWire.material.opacity = 0.25 + Math.sin(t * 1.4) * 0.15;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    }
    animate();

    // ----- Reveal + signal ready -----
    requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent('hero3d:ready'));
    });

    // ----- Pause when out of view (perf) -----
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
    console.warn('[three-hero] disabled:', err);
    document.documentElement.classList.add('no-webgl');
  }
}
