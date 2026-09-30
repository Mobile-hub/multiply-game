// Pixel-art sprites: player ship, asteroids, spider robot and final boss.
(function () {
  const MX = (window.MX = window.MX || {});

  function line(ctx, x0, y0, x1, y1, color) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    ctx.fillStyle = color;
    for (;;) {
      ctx.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  function disc(ctx, cx, cy, r, color) {
    ctx.fillStyle = color;
    for (let y = -r; y <= r; y++) {
      const w = Math.floor(Math.sqrt(r * r - y * y));
      ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
    }
  }

  // Render a string-matrix sprite into an offscreen canvas.
  function bake(rows, palette) {
    const c = document.createElement('canvas');
    c.width = Math.max(...rows.map((r) => r.length));
    c.height = rows.length;
    const g = c.getContext('2d');
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const col = palette[row[x]];
        if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
      }
    });
    return c;
  }

  // ---------- Player ship ----------
  const SHIP = bake([
    '.....rr.........',
    '.....bbr........',
    '..bbbbbbb.......',
    '.bwwwwbbbbbbl...',
    'bbwccwbbbbbbbbw.',
    '.bwwwwbbbbbbl...',
    '..bbbbbbb.......',
    '.....bbr........',
    '.....rr.........',
  ], { b: '#4f7bff', w: '#dfe8ff', c: '#4fd6ff', r: '#ff3b3b', l: '#9fb8ff' });

  function drawShip(ctx, x, y, t) {
    // Flickering engine flame.
    const f = Math.floor(t * 20) % 3;
    const flame = ['#fff7c2', '#ffd23f', '#ff8c1a'];
    ctx.fillStyle = flame[f];
    ctx.fillRect(Math.round(x) - 3 - f, Math.round(y) + 3, 3 + f, 3);
    ctx.fillStyle = flame[(f + 1) % 3];
    ctx.fillRect(Math.round(x) - 2, Math.round(y) + 4, 2, 1);
    ctx.drawImage(SHIP, Math.round(x), Math.round(y));
  }
  const SHIP_W = SHIP.width, SHIP_H = SHIP.height;

  // ---------- Asteroids ----------
  const ASTEROID_R = 13;
  function makeAsteroid(seed, tones) {
    const r = ASTEROID_R, size = r * 2 + 5;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const cx = size / 2, cy = size / 2;
    const craters = [];
    for (let i = 0; i < 4; i++) {
      const a = seed * 3 + i * 1.9;
      craters.push({ x: Math.cos(a) * r * 0.5, y: Math.sin(a * 1.3) * r * 0.45, r: 2 + ((seed + i) % 3) });
    }
    for (let y = -r - 2; y <= r + 2; y++) {
      for (let x = -r - 2; x <= r + 2; x++) {
        const ang = Math.atan2(y, x);
        const rr = r + Math.sin(ang * 3 + seed) * 1.4 + Math.sin(ang * 5 + seed * 2) * 0.9;
        const d = Math.sqrt(x * x + y * y);
        if (d > rr) continue;
        const light = (x + y) / (rr * 1.5);
        let col = light < -0.35 ? tones[0] : light < 0.25 ? tones[1] : tones[2];
        if (d > rr - 1) col = tones[3];
        for (const cr of craters) {
          const cd = Math.hypot(x - cr.x, y - cr.y);
          if (cd < cr.r) col = cd < cr.r - 1 ? tones[2] : tones[3];
        }
        g.fillStyle = col;
        g.fillRect(Math.floor(cx + x), Math.floor(cy + y), 1, 1);
      }
    }
    return c;
  }
  const ASTEROID_TONES = [
    ['#b8a58a', '#8a7658', '#5e4e3a', '#3a2f22'],
    ['#a8a8b8', '#7a7a8e', '#52526a', '#2e2e40'],
    ['#c49a7a', '#9a6a4e', '#6a4432', '#40281c'],
    ['#9ab8a0', '#6a8e72', '#46624c', '#28382c'],
  ];
  let asteroidImgs = null;
  function asteroidImg(variant) {
    if (!asteroidImgs) asteroidImgs = ASTEROID_TONES.map((t, i) => makeAsteroid(i * 1.7 + 0.5, t));
    return asteroidImgs[variant % asteroidImgs.length];
  }

  function drawAsteroid(ctx, a) {
    const img = asteroidImg(a.variant);
    const x = Math.round(a.x - img.width / 2), y = Math.round(a.y - img.height / 2);
    ctx.drawImage(img, x, y);
    if (a.hover) {
      ctx.fillStyle = '#ffd23f';
      const r = ASTEROID_R + 4;
      for (let k = 0; k < 16; k++) {
        const ang = k / 16 * Math.PI * 2 + a.t * 2;
        ctx.fillRect(Math.round(a.x + Math.cos(ang) * r), Math.round(a.y + Math.sin(ang) * r), 1, 1);
      }
    }
    MX.font.drawText(ctx, String(a.value), a.x + 1, a.y - 3, {
      scale: 1, align: 'center', color: a.flash > 0 ? '#ff3b3b' : '#ffffff', outline: '#1a1030',
    });
  }

  // ---------- Spider robot ----------
  const SPIDER_SAY = {
    correct: ['NICE!', 'GREAT!', 'SUPER!', 'WELL DONE!', 'AWESOME!', 'BOOM!', 'PERFECT!'],
    wrong: ['OOPS!', 'KEEP GOING!', 'YOU CAN DO IT!', 'TRY AGAIN!', 'NO WORRIES!'],
    timeout: ['FASTER!', 'OUT OF TIME!', 'WAKE UP!'],
    line: ['LINE!', 'TABLE DONE!', 'AMAZING!'],
    bingo: ['BINGO!', 'YOU DID IT!'],
    idle: ["LET'S GO!", 'BEEP BOOP', 'GET THEM!', 'FOCUS!'],
    boss: ['WATCH OUT!', "IT'S HUGE!", 'GET IT!'],
  };

  class Spider {
    constructor() {
      this.baseX = 26;
      this.x = 26;
      this.groundY = 177;
      this.t = 0;
      this.mood = 'idle';
      this.moodT = 0;
      this.bubble = null;
      this.bubbleT = 0;
      this.blinkT = 2;
      this.idleTalkT = 8;
    }
    say(text, dur = 1.6) {
      this.bubble = text;
      this.bubbleT = dur;
    }
    react(mood, text) {
      this.mood = mood;
      this.moodT = mood === 'dance' ? 2.4 : 1.1;
      const list = SPIDER_SAY[text] || null;
      if (list) this.say(list[Math.floor(Math.random() * list.length)]);
      else if (text) this.say(text);
    }
    update(dt, chatty) {
      this.t += dt;
      this.moodT -= dt;
      if (this.moodT <= 0) this.mood = 'idle';
      this.bubbleT -= dt;
      if (this.bubbleT <= 0) this.bubble = null;
      this.blinkT -= dt;
      if (this.blinkT < -0.12) this.blinkT = 1.5 + Math.random() * 3;
      if (chatty) {
        this.idleTalkT -= dt;
        if (this.idleTalkT <= 0) {
          this.idleTalkT = 10 + Math.random() * 8;
          if (!this.bubble) this.react('idle', 'idle');
        }
      }
      // Patrol left-right a little.
      this.x = this.baseX + Math.sin(this.t * 0.7) * 9;
    }
    draw(ctx) {
      const t = this.t;
      let bodyY = this.groundY - 15;
      let ox = 0;
      const walk = this.mood === 'dance' ? 14 : 6;
      if (this.mood === 'happy') bodyY -= Math.abs(Math.sin(t * 12)) * 6;
      if (this.mood === 'dance') bodyY -= Math.abs(Math.sin(t * 9)) * 4;
      if (this.mood === 'sad') ox = Math.round(Math.sin(t * 40) * 1.5);
      const cx = Math.round(this.x + ox), cy = Math.round(bodyY);

      // Legs: 4 per side with a knee joint.
      for (let side = -1; side <= 1; side += 2) {
        for (let i = 0; i < 4; i++) {
          const phase = t * walk + i * 1.6 + (side > 0 ? 0 : Math.PI);
          const hipX = cx + side * (2 + i * 2), hipY = cy + 3;
          const lift = Math.max(0, Math.sin(phase)) * 3;
          const footX = cx + side * (8 + i * 4) + Math.cos(phase) * 1.5;
          const footY = this.groundY - lift;
          const kneeX = (hipX + footX) / 2 + side * 3;
          const kneeY = Math.min(hipY, footY) - 6 + i * 0.5;
          line(ctx, hipX, hipY, kneeX, kneeY, '#5a6478');
          line(ctx, kneeX, kneeY, footX, footY, '#8a96ae');
          ctx.fillStyle = '#ffd23f';
          ctx.fillRect(Math.round(kneeX), Math.round(kneeY), 1, 1);
        }
      }
      // Body: metallic dome.
      disc(ctx, cx, cy + 1, 8, '#3a4258');
      disc(ctx, cx, cy, 7, '#7a88a8');
      disc(ctx, cx - 2, cy - 2, 3, '#b8c4dc');
      ctx.fillStyle = '#3a4258';
      ctx.fillRect(cx - 7, cy + 3, 15, 3);
      ctx.fillStyle = this.mood === 'dance' ? ['#ff3b6b', '#ffd23f', '#5dff5d', '#4fd6ff'][Math.floor(t * 8) % 4] : '#4fd6ff';
      ctx.fillRect(cx - 6, cy + 4, 13, 1);
      // Visor + eyes.
      ctx.fillStyle = '#10141e';
      ctx.fillRect(cx - 5, cy - 1, 11, 4);
      const eyeCol = this.mood === 'sad' ? '#ff3b3b' : this.mood === 'happy' || this.mood === 'dance' ? '#5dff5d' : '#4fd6ff';
      ctx.fillStyle = eyeCol;
      if (this.blinkT < 0) {
        ctx.fillRect(cx - 4, cy + 1, 3, 1);
        ctx.fillRect(cx + 2, cy + 1, 3, 1);
      } else if (this.mood === 'happy' || this.mood === 'dance') {
        // ^ ^ eyes
        ctx.fillRect(cx - 4, cy + 1, 1, 1); ctx.fillRect(cx - 3, cy, 1, 1); ctx.fillRect(cx - 2, cy + 1, 1, 1);
        ctx.fillRect(cx + 2, cy + 1, 1, 1); ctx.fillRect(cx + 3, cy, 1, 1); ctx.fillRect(cx + 4, cy + 1, 1, 1);
      } else if (this.mood === 'sad') {
        // x x eyes
        ctx.fillRect(cx - 4, cy, 1, 1); ctx.fillRect(cx - 2, cy, 1, 1); ctx.fillRect(cx - 3, cy + 1, 1, 1);
        ctx.fillRect(cx - 4, cy + 2, 1, 1); ctx.fillRect(cx - 2, cy + 2, 1, 1);
        ctx.fillRect(cx + 2, cy, 1, 1); ctx.fillRect(cx + 4, cy, 1, 1); ctx.fillRect(cx + 3, cy + 1, 1, 1);
        ctx.fillRect(cx + 2, cy + 2, 1, 1); ctx.fillRect(cx + 4, cy + 2, 1, 1);
      } else {
        const look = Math.round(Math.sin(t * 0.9) * 1);
        ctx.fillRect(cx - 4 + look, cy, 2, 2);
        ctx.fillRect(cx + 2 + look, cy, 2, 2);
      }
      // Antenna with blinking light.
      line(ctx, cx, cy - 7, cx + 1, cy - 11, '#8a96ae');
      ctx.fillStyle = Math.floor(t * 3) % 2 ? '#ff3b3b' : '#ffd23f';
      ctx.fillRect(cx, cy - 13, 2, 2);

      if (this.bubble) this.drawBubble(ctx, cx, cy - 16);
    }
    drawBubble(ctx, cx, y) {
      const text = this.bubble.toLocaleUpperCase('es');
      const w = MX.font.measure(text) + 8, h = 13;
      let x = Math.round(cx - 6);
      x = Math.max(2, Math.min(318 - w, x));
      const by = y - h;
      ctx.fillStyle = '#000';
      ctx.fillRect(x - 1, by - 1, w + 2, h + 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, by, w, h);
      ctx.fillStyle = '#1a1030';
      ctx.fillRect(x + 1, by + 1, w - 2, h - 2);
      // Tail.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 1, by + h, 3, 1);
      ctx.fillRect(cx, by + h + 1, 2, 1);
      ctx.fillRect(cx, by + h + 2, 1, 1);
      MX.font.drawText(ctx, text, x + 4, by + 3, { color: '#ffd23f' });
    }
  }

  // ---------- Final boss ----------
  class Boss {
    constructor(maxHp) {
      this.maxHp = maxHp;
      this.hp = maxHp;
      this.x = 380;
      this.targetX = 282;
      this.y = 100;
      this.t = 0;
      this.hitT = 0;
      this.attackT = 0;
      this.dead = false;
    }
    hit() { this.hp = Math.max(0, this.hp - 1); this.hitT = 0.3; }
    attack() { this.attackT = 0.6; }
    update(dt) {
      this.t += dt;
      this.hitT -= dt;
      this.attackT -= dt;
      this.x += (this.targetX - this.x) * Math.min(1, dt * 2);
      this.y = 100 + Math.sin(this.t * 1.6) * 8;
    }
    mouthPos() { return { x: this.x - 14, y: this.y + 6 }; }
    draw(ctx) {
      if (this.dead) return;
      const t = this.t;
      const hit = this.hitT > 0 && Math.floor(this.hitT * 30) % 2 === 0;
      const cx = Math.round(this.x + (this.hitT > 0 ? Math.sin(t * 60) * 2 : 0)), cy = Math.round(this.y);
      const body = hit ? '#ffffff' : '#7a2eb8';
      const dark = hit ? '#ffffff' : '#4a1a78';
      const light = hit ? '#ffffff' : '#b36bff';
      // Tentacles.
      for (let i = 0; i < 6; i++) {
        let px = cx - 12 + i * 5, py = cy + 14;
        for (let s = 0; s < 8; s++) {
          const nx = px + Math.sin(t * 4 + i + s * 0.7) * 1.4;
          const ny = py + 2;
          ctx.fillStyle = s % 2 ? dark : body;
          ctx.fillRect(Math.round(nx) - 1, Math.round(ny), 3 - (s > 5 ? 1 : 0), 2);
          px = nx; py = ny;
        }
      }
      // Spikes.
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI + (i / 6) * Math.PI;
        const sx = cx + Math.cos(a) * 22, sy = cy + Math.sin(a) * 18;
        line(ctx, sx, sy, cx + Math.cos(a) * 28, cy + Math.sin(a) * 24, '#ff3b6b');
      }
      disc(ctx, cx, cy + 1, 22, dark);
      disc(ctx, cx, cy, 21, body);
      disc(ctx, cx + 6, cy - 7, 7, light);
      disc(ctx, cx + 5, cy - 8, 3, hit ? '#fff' : '#d8a8ff');
      // Three eyes looking at the player.
      const eyes = [[-9, -6, 5], [3, -10, 4], [9, 2, 3]];
      for (const [ex, ey, er] of eyes) {
        disc(ctx, cx + ex, cy + ey, er, '#ffffff');
        const blink = Math.sin(t * 2 + ex) > 0.97;
        if (blink) {
          ctx.fillStyle = body;
          ctx.fillRect(cx + ex - er, cy + ey - er, er * 2 + 1, er * 2 + 1);
          ctx.fillStyle = '#000';
          ctx.fillRect(cx + ex - er, cy + ey, er * 2 + 1, 1);
        } else {
          disc(ctx, cx + ex - Math.ceil(er / 2), cy + ey + 1, Math.max(1, er - 3), this.attackT > 0 ? '#ffd23f' : '#ff1a1a');
        }
      }
      // Mouth with teeth, opens on attack.
      const open = this.attackT > 0 ? 6 : 2 + Math.round(Math.abs(Math.sin(t * 3)) * 2);
      ctx.fillStyle = '#1a0010';
      ctx.fillRect(cx - 16, cy + 5, 18, open + 2);
      ctx.fillStyle = '#ffffff';
      for (let k = 0; k < 6; k++) {
        ctx.fillRect(cx - 15 + k * 3, cy + 5, 2, 2);
        ctx.fillRect(cx - 14 + k * 3, cy + 5 + open, 2, 2);
      }
    }
  }

  // ---------- Icons ----------
  function drawSpeaker(ctx, x, y, muted) {
    ctx.fillStyle = '#dfe8ff';
    ctx.fillRect(x, y + 3, 2, 3);
    ctx.fillRect(x + 2, y + 2, 1, 5);
    ctx.fillRect(x + 3, y + 1, 1, 7);
    ctx.fillRect(x + 4, y, 1, 9);
    if (muted) {
      ctx.fillStyle = '#ff3b3b';
      line(ctx, x + 6, y + 2, x + 10, y + 6, '#ff3b3b');
      line(ctx, x + 10, y + 2, x + 6, y + 6, '#ff3b3b');
    } else {
      ctx.fillRect(x + 6, y + 3, 1, 3);
      ctx.fillRect(x + 8, y + 1, 1, 7);
    }
  }

  MX.sprites = { line, disc, drawShip, SHIP_W, SHIP_H, drawAsteroid, ASTEROID_R, Spider, Boss, drawSpeaker };
})();
