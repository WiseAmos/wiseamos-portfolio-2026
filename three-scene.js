// ============================================================
// THREE.JS — SCROLL-PINNED 3D SCENE
// Morphs through 4 states as the user scrolls:
//   0  Torus Knot   (matching hero)
//   1  Torus        (clean ring)
//   2  Icosahedron  (faceted sphere)
//   3  Particle burst (explode into dust)
// Driven entirely by the page's scroll progress through #scene.
// ============================================================

import * as THREE from 'three';

const mount = document.getElementById('scene3d');
if (mount) {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) throw new Error('WebGL unavailable');

    // ----- Renderer -----
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 4.5);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const k = new THREE.PointLight(0xB6FF6B, 1.8, 14); k.position.set(2, 2, 3); scene.add(k);
    const k2 = new THREE.PointLight(0x6BCBFF, 1.2, 14); k2.position.set(-2, -1, 2); scene.add(k2);

    // ----- Build materials once -----
    const shellMaterials = {
      knot:  new THREE.MeshStandardMaterial({ color: 0xB6FF6B, emissive: 0xB6FF6B, emissiveIntensity: 0.35, metalness: 0.7, roughness: 0.3, transparent: true, opacity: 0.22, side: THREE.DoubleSide }),
      torus: new THREE.MeshStandardMaterial({ color: 0x6BCBFF, emissive: 0x6BCBFF, emissiveIntensity: 0.32, metalness: 0.7, roughness: 0.3, transparent: true, opacity: 0.22, side: THREE.DoubleSide }),
      ico:   new THREE.MeshStandardMaterial({ color: 0xFF6B9D, emissive: 0xFF6B9D, emissiveIntensity: 0.32, metalness: 0.7, roughness: 0.3, transparent: true, opacity: 0.22, side: THREE.DoubleSide }),
    };
    const wireMaterials = {
      knot:  new THREE.LineBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.95 }),
      torus: new THREE.LineBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.95 }),
      ico:   new THREE.LineBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.95 }),
    };

    const meshes = {
      knot:  new THREE.Mesh(new THREE.TorusKnotGeometry(1.05, 0.32, 220, 18), shellMaterials.knot),
      torus: new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.36, 28, 140),              shellMaterials.torus),
      ico:   new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 1),                      shellMaterials.ico),
    };
    const wires = {
      knot:  new THREE.LineSegments(new THREE.WireframeGeometry(meshes.knot.geometry),  wireMaterials.knot),
      torus: new THREE.LineSegments(new THREE.WireframeGeometry(meshes.torus.geometry), wireMaterials.torus),
      ico:   new THREE.LineSegments(new THREE.WireframeGeometry(meshes.ico.geometry),   wireMaterials.ico),
    };

    // ----- Particles for the final state -----
    const PARTICLE_COUNT = 1600;
    const ppos = new Float32Array(PARTICLE_COUNT * 3);
    const pvel = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const r = 1.3;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      ppos[i*3]   = r * Math.sin(p) * Math.cos(t);
      ppos[i*3+1] = r * Math.sin(p) * Math.sin(t);
      ppos[i*3+2] = r * Math.cos(p);
      pvel[i*3]   = ppos[i*3]   * (0.4 + Math.random() * 0.6);
      pvel[i*3+1] = ppos[i*3+1] * (0.4 + Math.random() * 0.6);
      pvel[i*3+2] = ppos[i*3+2] * (0.4 + Math.random() * 0.6);
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(ppos.slice(), 3));
    const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
      color: 0xB6FF6B, size: 0.035, transparent: true, opacity: 0, sizeAttenuation: true,
    }));
    scene.add(particles);

    const group = new THREE.Group();
    Object.values(meshes).forEach(m => group.add(m));
    Object.values(wires).forEach(w => group.add(w));
    scene.add(group);

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

    // ----- Scroll progress -----
    let progress = 0;
    function onScroll() {
      // The sticky child pins when its top hits the viewport top.
      // Pin starts when section.top = 0 (after the section has scrolled into view).
      // Pin ends when the section's bottom hits the viewport's bottom.
      //   r.top = 0  → pin start  → progress 0
      //   r.top = -(sectionH - vh) → pin end → progress 1
      const section = mount.closest('.scene3d');
      if (!section) return;
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const sectionH = section.offsetHeight;
      const pinRange = sectionH - vh;     // amount of scroll during which the sticky child is pinned
      // traveled: how far past the pin-start we are
      const traveled = -r.top;             // r.top = 0 at pin start, becomes negative as we scroll
      progress = Math.max(0, Math.min(1, traveled / Math.max(1, pinRange)));
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    // ----- Animation -----
    const clock = new THREE.Clock();
    let raf;
    function animate() {
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.getElapsedTime();

      // Map progress [0..1] → stage [0..3]
      const stage = progress * 3;
      const i0 = Math.min(2, Math.floor(stage));
      const i1 = Math.min(2, i0 + 1);
      const f  = stage - i0; // 0..1 within the i0→i1 transition

      // Smoothstep for nicer crossfade
      const smooth = (x) => x * x * (3 - 2 * x);
      const k = smooth(f);

      // For the last 15% of scroll, fade everything to particles
      const isFinalPhase = progress > 0.7;
      const finalBlend = isFinalPhase ? Math.min(1, (progress - 0.7) / 0.2) : 0;

      // Crossfade the 3 meshes by opacity
      const stages = ['knot','torus','ico'];
      stages.forEach((key, i) => {
        let op;
        if (i === i0) op = 1 - k;
        else if (i === i1) op = k;
        else op = 0;
        // Fade out during final phase
        op *= (1 - finalBlend);
        meshes[key].material.opacity = op * 0.22;
        meshes[key].visible = op > 0.01;
        wires[key].material.opacity = op * 0.95;
        wires[key].visible = op > 0.01;
      });

      // Rotation
      group.rotation.x = t * 0.12;
      group.rotation.y = t * 0.18 + progress * Math.PI * 1.5;

      // Particle phase
      particles.material.opacity = finalBlend * 0.95;
      particles.visible = finalBlend > 0.01;
      if (particles.visible) {
        // Slow them down so they linger in view, and counter-translate them
        // back toward the camera to compensate for outward drift.
        const pos = particles.geometry.attributes.position.array;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          pos[i*3]   += pvel[i*3]   * dt * 0.25;
          pos[i*3+1] += pvel[i*3+1] * dt * 0.25;
          pos[i*3+2] += pvel[i*3+2] * dt * 0.25;
        }
        particles.geometry.attributes.position.needsUpdate = true;
        // Counter-rotate the particle group so they swirl rather than escape
        particles.rotation.y = t * 0.3;
        particles.rotation.x = Math.sin(t * 0.4) * 0.3;
      }

      // Scale up slightly
      const s = 0.9 + progress * 0.2;
      group.scale.set(s, s, s);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    }
    animate();
  } catch (err) {
    console.warn('[three-scene] disabled:', err);
    mount.style.display = 'none';
  }
}
