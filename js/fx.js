// Visual effects: parallax starfield, planets, particles, lasers, floating text, screen shake, flashes.
(function () {
  const MX = (window.MX = window.MX || {});
  const W = 320, H = 180;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const PALETTES = {
    fire: ['#fff7c2', '#ffd23f', '#ff8c1a', '#ff3b1f', '#8a1a1a'],
    ice: ['#ffffff', '#b6f3ff', '#4fd6ff', '#2b7bff', '#1a2f8a'],
    green: ['#ffffff', '#c6ff9e', '#5dff5d', '#1fb84a', '#0b5e2a'],
    rock: ['#d8c8b0', '#a08a70', '#6e5c48', '#3f3328'],
    rainbow: ['#ff3b6b', '#ffd23f', '#5dff5d', '#4fd6ff', '#b36bff', '#ffffff'],
    red: ['#ffffff', '#ff9e9e', '#ff3b3b', '#b31414'],
  };

  // ---------- Starfield ----------
  const stars = [];
  const LAYERS = [
    { n: 60, speed: 6, color: '#3a3a6e' },
    { n: 35, speed: 16, color: '#8a8ad0' },
    { n: 18, speed: 36, color: '#ffffff' },
  ];
  LAYERS.forEach((layer, li) => {
    for (let i = 0; i < layer.n; i++) stars.push({ x: rand(0, W), y: rand(0, H), layer: li, tw: rand(0, 6) });
  });

  const space = { warp: 0, speedMul: 1, tint: null };

  function updateStars(dt) {
    const mul = space.speedMul * (1 + space.warp * 30);
    for (const s of stars) {
      s.x -= LAYERS[s.layer].speed * mul * dt;
      s.tw += dt * 3;
      if (s.x < -40) {
        s.x = W + rand(0, 20);
        s.y = rand(0, H);
      }
    }
  }

  function drawStars(ctx) {
    for (const s of stars) {
      const layer = LAYERS[s.layer];
      const len = Math.floor(space.warp * (s.layer + 1) * 14);
      ctx.fillStyle = s.layer === 2 && Math.sin(s.tw) > 0.8 ? '#ffe98a' : layer.color;
      if (len > 0) {
        ctx.fillRect(Math.floor(s.x), Math.floor(s.y), len + 1, 1);
      } else {
        ctx.fillRect(Math.floor(s.x), Math.floor(s.y), 1, 1);
      }
    }
  }

  // ---------- Planets ----------
  const PLANET_TYPES = [
    { bands: ['#ff9e5e', '#e0703a', '#ffc38a', '#b85a2e'], ring: '#ffe2b0' },
    { bands: ['#5ecbff', '#3a8ae0', '#8ae8ff', '#2e5ab8'], ring: null },
    { bands: ['#c77dff', '#8a3ae0', '#e0b0ff', '#5a2eb8'], ring: '#f0d0ff' },
    { bands: ['#7dff9e', '#3ab85e', '#b0ffc8', '#2e8a4a'], ring: null },
    { bands: ['#ff6b8a', '#c73a5e', '#ffb0c0', '#8a2e4a'], ring: '#ffd0da' },
  ];

  function makePlanet(r, type) {
    const size = r * 2 + (type.ring ? r * 2 : 0) + 4;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const cx = size / 2, cy = size / 2;
    const ringBack = [], ringFront = [];
    if (type.ring) {
      for (let a = 0; a < Math.PI * 2; a += 0.01) {
        const rx = Math.cos(a) * r * 1.8, ry = Math.sin(a) * r * 0.45;
        (ry < 0 ? ringBack : ringFront).push([Math.round(cx + rx), Math.round(cy + ry)]);
      }
      g.fillStyle = type.ring;
      ringBack.forEach(([x, y]) => g.fillRect(x, y, 1, 1));
    }
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        const d = Math.sqrt(x * x + y * y);
        if (d > r) continue;
        const band = type.bands[Math.floor(((y + r) / (2 * r)) * 7 + Math.sin(x * 0.3) * 0.6) % type.bands.length];
        const light = (x + y) / (r * 1.4); // shade bottom-right
        g.fillStyle = band;
        g.fillRect(cx + x, cy + y, 1, 1);
        if (light > 0.45) {
          g.fillStyle = 'rgba(0,0,20,0.45)';
          g.fillRect(cx + x, cy + y, 1, 1);
        }
        if (light < -0.7) {
          g.fillStyle = 'rgba(255,255,255,0.25)';
          g.fillRect(cx + x, cy + y, 1, 1);
        }
      }
    }
    if (type.ring) {
      g.fillStyle = type.ring;
      ringFront.forEach(([x, y]) => g.fillRect(x, y, 1, 1));
    }
    return c;
  }

  const planets = [];
  let planetTimer = 2;
  function spawnPlanet(x) {
    const r = Math.floor(rand(8, 22));
    planets.push({ img: makePlanet(r, pick(PLANET_TYPES)), x: x === undefined ? W + 40 : x, y: rand(20, H - 30), speed: rand(3, 7) });
  }
  spawnPlanet(rand(60, 260));

  function updatePlanets(dt) {
    planetTimer -= dt * (1 + space.warp * 20);
    if (planetTimer <= 0) {
      planetTimer = rand(14, 26);
      if (planets.length < 2) spawnPlanet();
    }
    const mul = space.speedMul * (1 + space.warp * 25);
    for (const p of planets) p.x -= p.speed * mul * dt;
    for (let i = planets.length - 1; i >= 0; i--) if (planets[i].x < -planets[i].img.width) planets.splice(i, 1);
  }

  function drawPlanets(ctx) {
    for (const p of planets) ctx.drawImage(p.img, Math.floor(p.x - p.img.width / 2), Math.floor(p.y - p.img.height / 2));
  }

  // ---------- Particles ----------
  const particles = [];
  function burst(x, y, opts = {}) {
    const n = opts.count || 30;
    const colors = opts.colors || PALETTES.fire;
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(opts.minSpeed || 20, opts.speed || 90);
      particles.push({
        x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(0.4, opts.life || 1), max: 0,
        size: Math.random() < 0.3 ? 2 : 1,
        color: pick(colors),
        gravity: opts.gravity || 0,
        drag: opts.drag === undefined ? 0.92 : opts.drag,
      });
      particles[particles.length - 1].max = particles[particles.length - 1].life;
    }
  }

  function explosion(x, y, big) {
    burst(x, y, { count: big ? 70 : 40, colors: PALETTES.fire, speed: big ? 140 : 100 });
    burst(x, y, { count: big ? 25 : 12, colors: PALETTES.rock, speed: 60, life: 1.3 });
    rings.push({ x, y, r: 2, max: big ? 34 : 22, life: 0.35, t: 0, color: '#fff7c2' });
    shake(big ? 6 : 3);
    flash('#ffffff', big ? 0.25 : 0.08);
  }

  function firework(x, y) {
    const pal = pick([PALETTES.rainbow, PALETTES.ice, PALETTES.green, PALETTES.fire]);
    burst(x, y, { count: 45, colors: pal, speed: 80, minSpeed: 50, life: 1.4, gravity: 40, drag: 0.96 });
  }

  function sparks(x, y, colors) {
    burst(x, y, { count: 18, colors: colors || PALETTES.ice, speed: 60, life: 0.6 });
  }

  const rings = [];

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.vx *= Math.pow(p.drag, dt * 60);
      p.vy *= Math.pow(p.drag, dt * 60);
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.t += dt;
      if (r.t >= r.life) rings.splice(i, 1);
    }
  }

  function drawParticles(ctx) {
    for (const p of particles) {
      if (p.life < p.max * 0.25 && Math.random() < 0.5) continue; // flicker out
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
    }
    for (const r of rings) {
      const rad = r.r + (r.max - r.r) * (r.t / r.life);
      ctx.fillStyle = r.color;
      for (let a = 0; a < Math.PI * 2; a += 0.12) {
        ctx.fillRect(Math.floor(r.x + Math.cos(a) * rad), Math.floor(r.y + Math.sin(a) * rad), 1, 1);
      }
    }
  }

  // ---------- Lasers ----------
  const lasers = [];
  function laser(x1, y1, x2, y2, color) {
    lasers.push({ x1, y1, x2, y2, color: color || '#5dff5d', life: 0.18, max: 0.18 });
  }
  function drawLasers(ctx, dt) {
    for (let i = lasers.length - 1; i >= 0; i--) {
      const l = lasers[i];
      l.life -= dt;
      if (l.life <= 0) { lasers.splice(i, 1); continue; }
      const steps = Math.ceil(Math.hypot(l.x2 - l.x1, l.y2 - l.y1));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const x = Math.floor(l.x1 + (l.x2 - l.x1) * t);
        const y = Math.floor(l.y1 + (l.y2 - l.y1) * t);
        ctx.fillStyle = l.color;
        ctx.fillRect(x, y - 1, 1, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  // ---------- Floating text ----------
  const texts = [];
  function floatText(text, x, y, color, scale) {
    texts.push({ text, x, y, color: color || '#ffd23f', scale: scale || 1, life: 1.1, max: 1.1 });
  }
  function updateTexts(dt) {
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      t.life -= dt;
      t.y -= 18 * dt;
      if (t.life <= 0) texts.splice(i, 1);
    }
  }
  function drawTexts(ctx) {
    for (const t of texts) {
      if (t.life < 0.3 && Math.floor(t.life * 20) % 2) continue;
      MX.font.drawText(ctx, t.text, t.x, t.y, { color: t.color, scale: t.scale, align: 'center', shadow: '#000' });
    }
  }

  // ---------- Shake & flash ----------
  const shakeState = { amount: 0 };
  function shake(a) { shakeState.amount = Math.max(shakeState.amount, a); }
  function shakeOffset(dt) {
    shakeState.amount = Math.max(0, shakeState.amount - dt * 25);
    if (shakeState.amount <= 0) return [0, 0];
    return [Math.round(rand(-1, 1) * shakeState.amount), Math.round(rand(-1, 1) * shakeState.amount)];
  }

  const flashState = { color: null, life: 0, max: 0 };
  function flash(color, dur) {
    flashState.color = color;
    flashState.life = flashState.max = dur;
  }
  function drawFlash(ctx, dt) {
    if (flashState.life <= 0) return;
    flashState.life -= dt;
    ctx.globalAlpha = Math.max(0, flashState.life / flashState.max) * 0.6;
    ctx.fillStyle = flashState.color;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  function clearAll() {
    particles.length = 0;
    rings.length = 0;
    lasers.length = 0;
    texts.length = 0;
  }

  MX.fx = {
    W, H, rand, pick, PALETTES, space,
    updateBackground(dt) { updateStars(dt); updatePlanets(dt); },
    drawBackground(ctx) {
      ctx.fillStyle = space.tint || '#05030f';
      ctx.fillRect(0, 0, W, H);
      drawPlanets(ctx);
      drawStars(ctx);
    },
    update(dt) { updateParticles(dt); updateTexts(dt); },
    drawTop(ctx, dt) { drawLasers(ctx, dt); drawParticles(ctx); drawTexts(ctx); },
    drawFlash, burst, explosion, firework, sparks, laser, floatText, shake, shakeOffset, flash, clearAll,
  };
})();
