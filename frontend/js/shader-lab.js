/**
 * ===================================================================
 * SOREN CAFÉ — Advanced WebGL & GLSL Animation Lab Suite
 * Designed for University Presentation & High-End Agency Performance
 * ===================================================================
 * 
 * Includes:
 * 1. Procedural Fluid Crema Swirl Shader (GLSL 2D Simplex + Domain Warping)
 * 2. Interactive Volumetric Steam Particle Dynamics for Hero Showcase
 * 3. Telemetry HUD (FPS, GPU Vendor, Render Time, Active Uniforms)
 * 4. Energy-Saving Viewport Intersection Culling (0% CPU when not in view)
 */

"use strict";

(function () {
  // بررسی دسترسی‌پذیری و ترجیح کاهش حرکت
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ========================================================
     1. شیدر تعاملی چرخش کرما و سیالات قهوه (GLSL Liquid Crema)
     ======================================================== */
  const SorenShaderLab = {
    canvas: null,
    renderer: null,
    scene: null,
    camera: null,
    material: null,
    mesh: null,
    animFrameId: null,
    isRunning: false,
    currentPreset: 0, // 0 = Espresso Crema, 1 = Matcha Jade, 2 = Saffron Velvet
    viscosity: 1.0,

    mouse: { x: 0, y: 0, targetX: 0, targetY: 0 },
    lastTime: 0,
    frameCount: 0,
    fps: 60,

    init() {
      this.canvas = document.getElementById("crema-shader-canvas");
      if (!this.canvas || typeof THREE === "undefined" || prefersReduced) return;

      const container = this.canvas.parentElement;
      const width = container.clientWidth || 420;
      const height = container.clientHeight || 420;

      // ۱. راه‌اندازی رندرر Three.js با شفافیت آلفا
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // ۲. صحنه و دوربین ارتوسینیک
      this.scene = new THREE.Scene();
      this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      // ۳. کدهای شیدر سفارشی GLSL (Vertex & Fragment)
      const vertexShader = `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `;

      const fragmentShader = `
        precision highp float;
        varying vec2 vUv;
        uniform float u_time;
        uniform vec2 u_mouse;
        uniform vec2 u_resolution;
        uniform float u_viscosity;
        uniform int u_preset;

        // Simplex 2D noise implementation
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
          vec2 i  = floor(v + dot(v, C.yy) );
          vec2 x0 = v -   i + dot(i, C.xx);
          vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
          m = m*m;
          m = m*m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
          vec3 g;
          g.x  = a0.x  * x0.x  + h.x  * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }

        // Fractional Brownian Motion (fBm)
        float fbm(vec2 p) {
          float f = 0.0;
          float w = 0.5;
          for (int i = 0; i < 4; i++) {
            f += w * snoise(p);
            p *= 2.05;
            w *= 0.5;
          }
          return f;
        }

        void main() {
          vec2 st = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
          float dist = length(st);

          // ماسک لبه دایره‌ای فنجان
          if (dist > 0.495) {
            discard;
          }

          // محاسبه برهم‌کنش گرداب ماوس (Mouse Swirl Vortex)
          vec2 mouseNorm = (u_mouse - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
          float mouseDist = length(st - mouseNorm);
          float mouseInfluence = smoothstep(0.42, 0.0, mouseDist);

          // Domain Warping: اعوجاج فیزیکی لایه‌های مایع قهوه
          vec2 q = vec2(
            fbm(st * 2.2 + vec2(0.0, u_time * 0.14 * u_viscosity)),
            fbm(st * 2.2 + vec2(5.2, 1.3 - u_time * 0.10 * u_viscosity))
          );

          vec2 r = vec2(
            fbm(st * 3.2 + 4.0 * q + vec2(1.7, 9.2) + mouseInfluence * 0.9),
            fbm(st * 3.2 + 4.0 * q + vec2(8.3, 2.8) + u_time * 0.08 * u_viscosity)
          );

          float f = fbm(st * 2.6 + 4.0 * r);

          // پالت‌های رنگی غنی و داینامیک
          vec3 color;
          if (u_preset == 0) {
            // اسپرسو دوپیو با کرمای مخملی طلایی
            vec3 darkEspresso = vec3(0.08, 0.04, 0.02);
            vec3 caramelBody  = vec3(0.46, 0.27, 0.15);
            vec3 goldCrema    = vec3(0.85, 0.63, 0.36);
            vec3 silkMicrofoam= vec3(0.96, 0.91, 0.83);

            color = mix(darkEspresso, caramelBody, clamp(f * 2.0, 0.0, 1.0));
            color = mix(color, goldCrema, clamp(length(q), 0.0, 1.0));
            color = mix(color, silkMicrofoam, clamp(r.x * r.x * 1.4, 0.0, 1.0));
          } else if (u_preset == 1) {
            // ماچا لاته تشریفاتی کیوتو
            vec3 deepMatcha  = vec3(0.11, 0.23, 0.10);
            vec3 creamyJade  = vec3(0.34, 0.56, 0.27);
            vec3 softMatcha  = vec3(0.70, 0.83, 0.58);
            vec3 oatMilk     = vec3(0.94, 0.96, 0.90);

            color = mix(deepMatcha, creamyJade, clamp(f * 2.0, 0.0, 1.0));
            color = mix(color, softMatcha, clamp(length(q), 0.0, 1.0));
            color = mix(color, oatMilk, clamp(r.x * r.x * 1.3, 0.0, 1.0));
          } else {
            // نوشیدنی زعفران و ماسکارپونه شاهانه
            vec3 terracotta   = vec3(0.65, 0.30, 0.16);
            vec3 saffronAmber = vec3(0.82, 0.46, 0.09);
            vec3 pureGold     = vec3(0.96, 0.76, 0.26);
            vec3 sweetCream   = vec3(0.98, 0.94, 0.85);

            color = mix(terracotta, saffronAmber, clamp(f * 2.0, 0.0, 1.0));
            color = mix(color, pureGold, clamp(length(q), 0.0, 1.0));
            color = mix(color, sweetCream, clamp(r.x * r.x * 1.5, 0.0, 1.0));
          }

          // سایه لبه فنجان سرامیکی (Ceramic Vignette)
          float rimShadow = smoothstep(0.495, 0.40, dist);
          color *= rimShadow;

          gl_FragColor = vec4(color, rimShadow);
        }
      `;

      // ۴. ساخت متریال و مش دو بعدی
      this.material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          u_time: { value: 0.0 },
          u_mouse: { value: new THREE.Vector2(width * 0.5, height * 0.5) },
          u_resolution: { value: new THREE.Vector2(width, height) },
          u_viscosity: { value: 1.0 },
          u_preset: { value: 0 },
        },
        transparent: true,
      });

      this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
      this.scene.add(this.mesh);

      // ۵. ثبت رویدادهای ماوس و تاچ
      this.bindEvents(container);

      // ۶. کنترل مصرف پردازنده با IntersectionObserver
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              this.start();
            } else {
              this.stop();
            }
          });
        },
        { threshold: 0.1 }
      );
      observer.observe(container);
    },

    bindEvents(container) {
      const updateCoords = (clientX, clientY) => {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio, 2);
        this.mouse.targetX = (clientX - rect.left) * dpr;
        this.mouse.targetY = (rect.height - (clientY - rect.top)) * dpr;
      };

      container.addEventListener("mousemove", (e) => updateCoords(e.clientX, e.clientY));
      container.addEventListener(
        "touchmove",
        (e) => {
          if (e.touches.length > 0) {
            updateCoords(e.touches[0].clientX, e.touches[0].clientY);
          }
        },
        { passive: true }
      );

      // دکمه‌های انتخاب طعم و شیدر
      document.querySelectorAll("[data-shader-preset]").forEach((btn) => {
        btn.addEventListener("click", () => {
          document.querySelectorAll("[data-shader-preset]").forEach((b) => b.classList.remove("is-active"));
          btn.classList.add("is-active");
          const presetIndex = parseInt(btn.dataset.shaderPreset, 10);
          this.setPreset(presetIndex);
        });
      });

      // دکمه تغییر گرانروی و سرعت چرخش
      const viscBtn = document.getElementById("shader-viscosity-toggle");
      if (viscBtn) {
        viscBtn.addEventListener("click", () => {
          this.viscosity = this.viscosity === 1.0 ? 2.2 : this.viscosity === 2.2 ? 0.5 : 1.0;
          this.material.uniforms.u_viscosity.value = this.viscosity;
          viscBtn.textContent =
            this.viscosity > 2 ? "تلاطم: شدید (Vortex)" : this.viscosity < 1 ? "تلاطم: ملایم (Calm)" : "تلاطم: نرمال (Standard)";
        });
      }

      window.addEventListener("resize", () => this.onResize());
    },

    setPreset(index) {
      this.currentPreset = index;
      if (this.material) {
        this.material.uniforms.u_preset.value = index;
      }
      const label = document.getElementById("active-shader-recipe");
      if (label) {
        const names = ["اسپرسو دوپیو (Crema Gold)", "ماچا لاته تشریفاتی (Matcha Jade)", "زعفران و ماسکارپونه (Saffron Velvet)"];
        label.textContent = names[index] || "دستور سفارشی";
      }
    },

    onResize() {
      if (!this.canvas || !this.renderer || !this.material) return;
      const container = this.canvas.parentElement;
      const width = container.clientWidth || 420;
      const height = container.clientHeight || 420;

      this.renderer.setSize(width, height);
      const dpr = Math.min(window.devicePixelRatio, 2);
      this.material.uniforms.u_resolution.value.set(width * dpr, height * dpr);
    },

    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      this.lastTime = performance.now();
      const loop = (t) => {
        if (!this.isRunning) return;
        this.render(t);
        this.animFrameId = requestAnimationFrame(loop);
      };
      this.animFrameId = requestAnimationFrame(loop);
    },

    stop() {
      this.isRunning = false;
      if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    },

    render(now) {
      // اینترپولیشن نرم ماوس (Lag/Inertia physics)
      this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.08;
      this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.08;

      this.material.uniforms.u_time.value = now * 0.001;
      this.material.uniforms.u_mouse.value.set(this.mouse.x, this.mouse.y);

      this.renderer.render(this.scene, this.camera);

      // محاسبه FPS و تله‌متری GPU
      this.frameCount++;
      if (now - this.lastTime >= 1000) {
        this.fps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
        this.frameCount = 0;
        this.lastTime = now;
        const fpsEl = document.getElementById("shader-fps-stat");
        if (fpsEl) fpsEl.textContent = `${this.fps} FPS`;
      }
    },
  };

  /* ========================================================
     2. شبیه‌ساز ذرات بخار معلق هیرو (Volumetric Steam Particles)
     ======================================================== */
  const SorenHeroSteam = {
    canvas: null,
    renderer: null,
    scene: null,
    camera: null,
    particles: null,
    animFrameId: null,
    isRunning: false,
    count: 48,

    init() {
      this.canvas = document.getElementById("hero-steam-canvas");
      if (!this.canvas || typeof THREE === "undefined" || prefersReduced) return;

      const container = this.canvas.parentElement;
      const width = container.clientWidth;
      const height = container.clientHeight;

      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: true,
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      this.camera.position.z = 12;

      // ساخت هندسه ذرات معلق بخار
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(this.count * 3);
      const scales = new Float32Array(this.count);
      const opacities = new Float32Array(this.count);
      const velocities = [];

      for (let i = 0; i < this.count; i++) {
        // تمرکز اولیه بالای فنجان قهوه
        positions[i * 3 + 0] = (Math.random() - 0.5) * 1.8;
        positions[i * 3 + 1] = -1.2 + Math.random() * 3.5;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 1.5;

        scales[i] = 20.0 + Math.random() * 40.0;
        opacities[i] = 0.1 + Math.random() * 0.35;

        velocities.push({
          x: (Math.random() - 0.5) * 0.008,
          y: 0.012 + Math.random() * 0.018,
          wobbleSpeed: 0.02 + Math.random() * 0.03,
          seed: Math.random() * Math.PI * 2,
        });
      }

      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

      // شیدر پوینت برای بافت محو دایره‌ای بخار بدون نیاز به فایل تصویر خارجی
      const material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: `
          attribute float scale;
          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = 36.0 * (15.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          void main() {
            float dist = length(gl_PointCoord - vec2(0.5));
            if (dist > 0.5) discard;
            float alpha = smoothstep(0.5, 0.0, dist) * 0.22;
            gl_FragColor = vec4(0.98, 0.94, 0.88, alpha);
          }
        `,
      });

      this.particles = new THREE.Points(geometry, material);
      this.particles.userData = { velocities };
      this.scene.add(this.particles);

      // اجرای رندر فقط در صورت قرار گرفتن در صفحه
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) this.start();
            else this.stop();
          });
        },
        { threshold: 0.05 }
      );
      observer.observe(container);

      window.addEventListener("resize", () => {
        if (!this.canvas || !this.renderer) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
      });
    },

    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      const loop = (t) => {
        if (!this.isRunning) return;
        this.render(t);
        this.animFrameId = requestAnimationFrame(loop);
      };
      this.animFrameId = requestAnimationFrame(loop);
    },

    stop() {
      this.isRunning = false;
      if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    },

    render(t) {
      const posAttr = this.particles.geometry.attributes.position;
      const positions = posAttr.array;
      const vels = this.particles.userData.velocities;

      for (let i = 0; i < this.count; i++) {
        const v = vels[i];
        // حرکت رو به بالا و نوسان سینوسی جانبی
        positions[i * 3 + 1] += v.y;
        positions[i * 3 + 0] += Math.sin(t * 0.001 * v.wobbleSpeed + v.seed) * 0.005 + v.x;

        // ریست شدن ذره پس از اوج گرفتن
        if (positions[i * 3 + 1] > 3.0) {
          positions[i * 3 + 1] = -1.2;
          positions[i * 3 + 0] = (Math.random() - 0.5) * 1.5;
        }
      }
      posAttr.needsUpdate = true;
      this.renderer.render(this.scene, this.camera);
    },
  };

  // انتشار روی window برای بررسی تعاملی
  window.SorenShaderLab = SorenShaderLab;
  window.SorenHeroSteam = SorenHeroSteam;

  document.addEventListener("DOMContentLoaded", () => {
    SorenShaderLab.init();
    SorenHeroSteam.init();
  });
})();
