// ============================================================
// HERO — single rotating wireframe cube
// Brutalist. No shader. No particles. No lighting tricks.
// Just a thick-lined cube rotating on Y. Geometry as graphic.
// ============================================================

import * as THREE from 'three';

const stage = document.getElementById('heroStage');
if (!stage) {
  // silently skip
} else {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) throw new Error('WebGL unavailable');

    // Renderer — flat black lines on transparent.
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    stage.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 6);
    camera.lookAt(0, 0, 0);

    // The cube. EdgesGeometry → line segments with --ink color.
    const CUBE_SIZE = 1.6;
    const cubeGeom = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
    const edges = new THREE.EdgesGeometry(cubeGeom);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x0A0A0A,
      linewidth: 2, // hint; WebGL ignores this on most platforms
      transparent: true,
      opacity: 0.95,
    });
    const cube = new THREE.LineSegments(edges, lineMat);
    scene.add(cube);

    // Faint inner cross to give the cube "depth reference" — just 3 axis lines through origin.
    const axisGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-CUBE_SIZE * 0.7, 0, 0),
      new THREE.Vector3( CUBE_SIZE * 0.7, 0, 0),
      new THREE.Vector3(0, -CUBE_SIZE * 0.7, 0),
      new THREE.Vector3(0,  CUBE_SIZE * 0.7, 0),
      new THREE.Vector3(0, 0, -CUBE_SIZE * 0.7),
      new THREE.Vector3(0, 0,  CUBE_SIZE * 0.7),
    ]);
    const axisMat = new THREE.LineBasicMaterial({ color: 0x0A0A0A, transparent: true, opacity: 0.25 });
    const axes = new THREE.LineSegments(axisGeom, axisMat);
    scene.add(axes);

    // A single accent ring around the cube (lime) — the only color in the hero.
    const ringGeom = new THREE.RingGeometry(CUBE_SIZE * 0.95, CUBE_SIZE * 1.0, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xB6FF6B,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);

    // Resize.
    function resize() {
      const w = stage.clientWidth || 1;
      const h = stage.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // On tall viewports, push camera back so cube fits
      if (h > w * 1.4) {
        camera.position.set(0, 0, 7.5);
      } else {
        camera.position.set(0, 0, 6);
      }
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });
    new ResizeObserver(resize).observe(stage);

    // Animate.
    let raf = null;
    let scrollY = window.scrollY;
    addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });

    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        if (!raf) animate();
      } else {
        cancelAnimationFrame(raf);
        raf = null;
      }
    });
    io.observe(stage);

    function animate() {
      raf = requestAnimationFrame(animate);
      const t = performance.now() * 0.0006;
      cube.rotation.x = t * 0.7;
      cube.rotation.y = t;
      // Add a slight wobble from scroll
      cube.rotation.z = Math.sin(scrollY * 0.0008) * 0.05;
      axes.rotation.x = -t * 0.7;
      axes.rotation.y = -t;
      ring.rotation.z = -t * 0.5;
      ring.lookAt(camera.position);
      renderer.render(scene, camera);
    }
    animate();

    // Optional: live coord readout
    const coordEl = stage.querySelector('.hero__stage-coord');
    if (coordEl) {
      setInterval(() => {
        const deg = ((cube.rotation.y * 180 / Math.PI) % 360).toFixed(0).padStart(3, '0');
        coordEl.innerHTML = `<b>SOLID.WIRE</b> ANGLE: ${deg}°  PHASE: 01/04`;
      }, 100);
    }
  } catch (err) {
    // No WebGL — stage just stays empty. That's fine for brutalism.
    console.warn('hero 3D skipped:', err.message);
  }
}
