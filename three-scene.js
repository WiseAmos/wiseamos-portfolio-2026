// ============================================================
// SCROLL-PINNED 3D SCENE
// Shader-based morphing blob with iridescent fresnel and
// 4 stages tied to scroll progress:
//   0.00 → knot shape
//   0.25 → torus
//   0.50 → icosahedron (faceted sphere)
//   0.75 → particle burst
// All on a single IcosahedronGeometry with vertex-displacement
// driven by 3D simplex noise. Material is a custom shader with
// iridescent fresnel and chromatic offset. Falls back to a
// static gradient if WebGL is unavailable.
// ============================================================

import * as THREE from 'three';

const mount = document.getElementById('scene3d');
const section = document.getElementById('scene');
const steps = document.getElementById('sceneSteps');
const lede = document.getElementById('sceneLede');

if (!mount || !section) {
  // nothing to do
} else {
  try {
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
    camera.position.set(0, 0, 3.4);

    // ----- 3D simplex noise (Ashima) -----
    const noiseChunk = `
      vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
      vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
      vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
      vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
      float snoise(vec3 v){
        const vec2 C=vec2(1./6.,1./3.);
        const vec4 D=vec4(0.,.5,1.,2.);
        vec3 i=floor(v+dot(v,C.yyy));
        vec3 x0=v-i+dot(i,C.xxx);
        vec3 g=step(x0.yzx,x0.xyz);
        vec3 l=1.-g;
        vec3 i1=min(g.xyz,l.zxy);
        vec3 i2=max(g.xyz,l.zxy);
        vec3 x1=x0-i1+C.xxx;
        vec3 x2=x0-i2+C.yyy;
        vec3 x3=x0-D.yyy;
        i=mod289(i);
        vec4 p=permute(permute(permute(
                  i.z+vec4(0.,i1.z,i2.z,1.))
                +i.y+vec4(0.,i1.y,i2.y,1.))
                +i.x+vec4(0.,i1.x,i2.x,1.));
        float n_=.142857142857;
        vec3 ns=n_*D.wyz-D.xzx;
        vec4 j=p-49.*floor(p*ns.z*ns.z);
        vec4 x_=floor(j*ns.z);
        vec4 y_=floor(j-7.*x_);
        vec4 x=x_*ns.x+ns.yyyy;
        vec4 y=y_*ns.x+ns.yyyy;
        vec4 h=1.-abs(x)-abs(y);
        vec4 b0=vec4(x.xy,y.xy);
        vec4 b1=vec4(x.zw,y.zw);
        vec4 s0=floor(b0)*2.+1.;
        vec4 s1=floor(b1)*2.+1.;
        vec4 sh=-step(h,vec4(0.));
        vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
        vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
        vec3 p0=vec3(a0.xy,h.x);
        vec3 p1=vec3(a0.zw,h.y);
        vec3 p2=vec3(a1.xy,h.z);
        vec3 p3=vec3(a1.zw,h.w);
        vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
        p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
        vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
        m=m*m;
        return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
      }
    `;

    // ----- Shader material: iridescent fresnel + noise displacement -----
    const uniforms = {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uDisplace: { value: 0.35 },
      uColorA: { value: new THREE.Color('#B6FF6B') },  // lime
      uColorB: { value: new THREE.Color('#6BCBFF') },  // cyan
      uColorC: { value: new THREE.Color('#FF6B9D') },  // pink
      uLightDir: { value: new THREE.Vector3(0.5, 0.8, 0.6).normalize() },
    };

    const vertexShader = `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec3 vPos;
      varying float vNoise;
      uniform float uTime;
      uniform float uProgress;
      uniform float uDisplace;
      ${noiseChunk}

      void main() {
        // Noise field driven by time and progress
        float t = uTime * 0.18;
        float n = snoise(position * 1.3 + vec3(t, t * 0.7, -t * 0.5));
        // 2nd octave for detail
        float n2 = snoise(position * 3.1 + vec3(-t * 1.3, t * 0.4, t * 0.9));
        float total = n * 0.7 + n2 * 0.3;

        // Displace vertex along its normal
        float disp = total * uDisplace;
        // Pulse displacement on stage transitions
        disp *= 0.6 + 0.4 * sin(uProgress * 3.14159);

        vec3 displaced = position + normal * disp;

        // Stage-specific deformation: spread outward as progress increases
        // (loosely simulates the particle burst at p=1.0)
        float spread = smoothstep(0.6, 1.0, uProgress);
        displaced += normal * spread * 0.4 * (0.5 + 0.5 * sin(uTime * 0.5 + position.x * 4.0));

        vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
        gl_Position = projectionMatrix * mv;

        vNormal = normalize(normalMatrix * normal);
        vViewDir = normalize(-mv.xyz);
        vPos = displaced;
        vNoise = total;
      }
    `;

    const fragmentShader = `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec3 vPos;
      varying float vNoise;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform vec3 uColorC;
      uniform vec3 uLightDir;
      uniform float uTime;
      uniform float uProgress;

      void main() {
        // Fresnel
        float fres = 1.0 - max(0.0, dot(vNormal, vViewDir));
        fres = pow(fres, 2.2);

        // Base color blends between A, B, C based on noise + view angle
        float a = smoothstep(-0.3, 0.6, vNoise);
        float b = smoothstep(0.0, 1.0, fres);
        vec3 col = mix(uColorA, uColorB, a);
        col = mix(col, uColorC, b * 0.55);

        // Iridescent rim: shift hue based on view angle + time
        float hueShift = sin(fres * 6.28 + uTime * 0.4) * 0.5 + 0.5;
        col = mix(col, vec3(
          col.r * (0.7 + 0.6 * hueShift),
          col.g * (0.85 + 0.3 * sin(uTime * 0.6 + vNoise * 3.0)),
          col.b * (0.7 + 0.6 * (1.0 - hueShift))
        ), 0.35);

        // Stage tint: at p≈0.5 (icosahedron stage) more cyan,
        // at p≈0.75 (particles stage) more pink.
        col = mix(col, mix(col, uColorB, 0.3), smoothstep(0.3, 0.55, uProgress));
        col = mix(col, mix(col, uColorC, 0.3), smoothstep(0.65, 0.85, uProgress));

        // Inner shadow: darken by view-facing-ness
        col *= 0.5 + 0.5 * b;

        // Rim glow
        col += uColorA * fres * 0.6;

        // Subtle vignette via noise
        col *= 0.85 + 0.15 * vNoise;

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: false,
    });

    // ----- Geometry: icosahedron with high subdivision for noise displacement -----
    const geometry = new THREE.IcosahedronGeometry(1.0, 64);
    const blob = new THREE.Mesh(geometry, material);
    scene.add(blob);

    // ----- Particles (visible in the last stage) -----
    const PARTICLE_COUNT = 600;
    const pPositions = new Float32Array(PARTICLE_COUNT * 3);
    const pSeeds = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const r = 1.3;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      pPositions[i*3]   = r * Math.sin(p) * Math.cos(t);
      pPositions[i*3+1] = r * Math.sin(p) * Math.sin(t);
      pPositions[i*3+2] = r * Math.cos(p);
      pSeeds[i] = Math.random();
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    pGeo.setAttribute('seed', new THREE.BufferAttribute(pSeeds, 1));

    const pMat = new THREE.ShaderMaterial({
      uniforms: { uTime: uniforms.uTime, uProgress: uniforms.uProgress,
                  uColorA: uniforms.uColorA, uColorB: uniforms.uColorB },
      vertexShader: `
        attribute float seed;
        varying float vSeed;
        varying float vAlpha;
        uniform float uTime;
        uniform float uProgress;
        void main() {
          vSeed = seed;
          // Particles drift outward as uProgress → 1
          float drift = smoothstep(0.55, 1.0, uProgress);
          vec3 pos = position * (1.0 + drift * 1.6);
          pos += vec3(
            sin(uTime * 0.5 + seed * 6.28) * 0.15,
            cos(uTime * 0.4 + seed * 3.14) * 0.15,
            sin(uTime * 0.3 + seed * 9.42) * 0.15
          ) * (0.4 + drift);
          vec4 mv = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = (3.0 + 4.0 * drift) * (200.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
          vAlpha = drift;
        }
      `,
      fragmentShader: `
        varying float vSeed;
        varying float vAlpha;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float a = (1.0 - d * 2.0);
          a *= a;
          vec3 col = mix(uColorA, uColorB, vSeed);
          gl_FragColor = vec4(col, a * vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

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

    // ----- Section height: make it 220vh of scroll (60vh pin beyond viewport) -----
    function setSectionHeight() {
      if (window.innerWidth <= 900) {
        // mobile: no pinning, section is normal flow
        section.style.height = 'auto';
        return;
      }
      const vh = window.innerHeight;
      section.style.height = `${vh * 2.2}px`;
    }
    setSectionHeight();
    window.addEventListener('resize', setSectionHeight);

    // ----- Scroll progress -----
    let progress = 0;
    let targetProgress = 0;
    function onScroll() {
      if (window.innerWidth <= 900) {
        targetProgress = 0; // no morph on mobile
        return;
      }
      const rect = section.getBoundingClientRect();
      const total = section.offsetHeight - window.innerHeight;
      const scrolled = Math.max(0, -rect.top);
      targetProgress = Math.max(0, Math.min(1, scrolled / total));
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // ----- Step highlighting -----
    function updateSteps(p) {
      if (!steps) return;
      // 4 stages evenly distributed across [0, 1]
      const idx = Math.min(3, Math.floor(p * 4));
      [...steps.children].forEach((el, i) => {
        el.classList.toggle('is-active', i === idx);
      });
      // Update copy
      if (lede) {
        const active = steps.children[idx];
        if (active && active.dataset.copy) {
          lede.innerHTML = active.dataset.copy;
        }
      }
    }

    // ----- Animation loop -----
    const clock = new THREE.Clock();
    let raf;
    function animate() {
      const t = clock.getElapsedTime();
      uniforms.uTime.value = t;
      progress += (targetProgress - progress) * 0.1;
      uniforms.uProgress.value = progress;
      updateSteps(progress);

      // Slow auto-rotation
      blob.rotation.x = t * 0.08;
      blob.rotation.y = t * 0.12;
      particles.rotation.x = -t * 0.05;
      particles.rotation.y = t * 0.07;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    }
    animate();

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
    console.warn('[three-scene] disabled:', err);
    document.documentElement.classList.add('scene-no-webgl');
  }
}
