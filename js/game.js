// Game state machine: menu, levels, hyperspace warp, boss fight, game over and victory.
(function () {
  const MX = window.MX;
  const { W, H, rand, pick } = MX.fx;
  const { drawText } = MX.font;
  const S = MX.sprites;
  const A = MX.audio;
  const Q = MX.questions;
  const fx = MX.fx;
  const inRect = MX.input.inRect;
  const pointer = MX.input.pointer;

  const LEVELS = [
    { time: 30, name: 'LEVEL 1', music: 'level1', color: '#5dff5d' },
    { time: 20, name: 'LEVEL 2', music: 'level2', color: '#ffd23f' },
    { time: 10, name: 'LEVEL 3', music: 'level3', color: '#ff8c1a' },
  ];
  const BOSS = { time: 5, hp: 20, name: 'FINAL BOSS', music: 'boss', color: '#ff3b6b' };
  const BOSS_LEVEL = LEVELS.length;
  const MAX_LIVES = 5;
  const ROW_COLORS = ['#ff3b6b', '#ff8c1a', '#ffd23f', '#c6ff3f', '#5dff5d', '#3fffc0', '#4fd6ff', '#4f7bff', '#b36bff', '#ff6bd6'];
  const SHIP_POS = { x: 16, y: 88 };
  const LEVEL_SLOTS = [{ x: 118, y: 96 }, { x: 170, y: 134 }, { x: 222, y: 96 }, { x: 274, y: 134 }];
  const BOSS_SLOTS = [{ x: 96, y: 92 }, { x: 140, y: 134 }, { x: 184, y: 92 }, { x: 228, y: 134 }];
  const MUTE_RECT = { x: 305, y: 1, w: 14, h: 11 };

  // Dev only: ?debug=...&auto=1 makes a bot answer every question correctly.
  const DEBUG_AUTO = typeof location !== 'undefined' && new URLSearchParams(location.search).get('auto') === '1';

  let highScore = 0;
  try { highScore = parseInt(localStorage.getItem('mx.highscore') || '0', 10) || 0; } catch (e) { /* storage unavailable */ }
  function saveHighScore(score) {
    if (score <= highScore) return false;
    highScore = score;
    try { localStorage.setItem('mx.highscore', String(score)); } catch (e) { /* storage unavailable */ }
    return true;
  }

  const game = {
    scene: null,
    t: 0,
    paused: false,
    drawDt: 0,
    spider: null,
    run: null,
  };

  function go(scene, ...args) {
    game.scene = scene;
    scene.enter(...args);
  }

  // ---------- Shared drawing helpers ----------
  function drawButton(ctx, r, lines, opts = {}) {
    const color = opts.color || '#8a8ad0';
    const hot = inRect(pointer, r);
    const sel = opts.selected;
    const lift = hot || sel ? -1 : 0;
    ctx.fillStyle = '#000';
    ctx.fillRect(r.x + 2, r.y + 2, r.w, r.h);
    ctx.fillStyle = color;
    ctx.fillRect(r.x, r.y + lift, r.w, r.h);
    ctx.fillStyle = sel ? color : hot ? '#2a2458' : '#1a1030';
    ctx.fillRect(r.x + 2, r.y + 2 + lift, r.w - 4, r.h - 4);
    const arr = Array.isArray(lines) ? lines : [lines];
    const total = arr.length * 9 - 2;
    arr.forEach((l, i) => {
      drawText(ctx, l, r.x + r.w / 2, r.y + lift + Math.floor((r.h - total) / 2) + i * 9, {
        align: 'center', color: sel ? '#1a1030' : i === 0 ? '#ffffff' : color,
      });
    });
  }

  function drawBanner(ctx, text, sub, t, color) {
    drawText(ctx, text, W / 2, 62, {
      scale: 3, align: 'center', wave: 2, t,
      color: color ? [color] : ['#ff3b6b', '#ffd23f', '#5dff5d', '#4fd6ff', '#b36bff'],
      outline: '#1a1030',
    });
    if (sub) drawText(ctx, sub, W / 2, 90, { align: 'center', color: '#ffffff', outline: '#1a1030' });
  }

  const padScore = (n) => String(n).padStart(6, '0');

  function drawHearts(ctx, lives) {
    for (let i = 0; i < MAX_LIVES; i++) {
      const x = 298 - (MAX_LIVES - i) * 7;
      drawText(ctx, '@', x, 3, { color: i < lives ? '#ff3b6b' : '#3a2448' });
    }
  }

  let scanlines = null;
  function drawScanlines(ctx) {
    if (!scanlines) {
      scanlines = document.createElement('canvas');
      scanlines.width = W;
      scanlines.height = H;
      const g = scanlines.getContext('2d');
      g.fillStyle = 'rgba(0,0,0,0.13)';
      for (let y = 1; y < H; y += 2) g.fillRect(0, y, W, 1);
    }
    ctx.drawImage(scanlines, 0, 0);
  }

  // ---------- MENU ----------
  const menu = {
    selected: 0,
    buttons: [0, 1, 2].map((i) => ({ x: 38 + i * 84, y: 78, w: 76, h: 24 })),
    start: { x: 110, y: 114, w: 100, h: 20 },
    shipX: -30,
    enter() {
      A.playMusic('menu');
      fx.space.speedMul = 1;
      fx.space.warp = 0;
      game.spider.say('HI! READY TO PLAY?', 3);
    },
    begin() {
      A.sfx.start();
      fx.explosion(this.start.x + this.start.w / 2, this.start.y + 10);
      game.run = { score: 0, lives: MAX_LIVES, combo: 0, bestCombo: 0, level: this.selected, levelStartScore: 0 };
      go(warp, this.selected);
    },
    select(i) {
      if (this.selected !== i) A.sfx.select();
      this.selected = i;
    },
    update(dt, events) {
      this.shipX += dt * 45;
      if (this.shipX > W + 40) this.shipX = -40;
      for (const ev of events) {
        if (ev.type === 'click') {
          this.buttons.forEach((b, i) => { if (inRect(ev, b)) this.select(i); });
          if (inRect(ev, this.start)) return this.begin();
        } else if (ev.type === 'key') {
          if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') this.select((this.selected + 2) % 3);
          if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') this.select((this.selected + 1) % 3);
          if (['1', '2', '3'].includes(ev.key)) this.select(parseInt(ev.key, 10) - 1);
          if (ev.key === 'Enter' || ev.key === ' ') return this.begin();
        }
      }
    },
    draw(ctx) {
      const t = game.t;
      S.drawShip(ctx, this.shipX, 152 + Math.sin(t * 3) * 3, t);
      drawText(ctx, 'MULTIPLY', W / 2, 16, {
        scale: 4, align: 'center', wave: 3, t,
        color: ['#ff3b6b', '#ff8c1a', '#ffd23f', '#5dff5d', '#4fd6ff', '#4f7bff', '#b36bff', '#ff6bd6'],
        outline: '#1a1030',
      });
      drawText(ctx, 'SPACE TIMES TABLES', W / 2, 54, { align: 'center', color: '#dfe8ff', shadow: '#3a2458' });
      drawText(ctx, 'CHOOSE DIFFICULTY', W / 2, 67, { align: 'center', color: '#8a8ad0' });
      this.buttons.forEach((b, i) => {
        drawButton(ctx, b, [LEVELS[i].name, LEVELS[i].time + ' SECONDS'], { color: LEVELS[i].color, selected: this.selected === i });
      });
      if (Math.floor(t * 2.5) % 2 === 0 || inRect(pointer, this.start)) {
        drawButton(ctx, this.start, 'START!', { color: '#ffd23f', selected: inRect(pointer, this.start) });
      } else {
        drawButton(ctx, this.start, 'START!', { color: '#ffd23f' });
      }
      drawText(ctx, 'HIGH SCORE ' + padScore(highScore), W / 2, 142, { align: 'center', color: '#ffd23f' });
      drawText(ctx, 'M SOUND  P PAUSE', 316, 172, { align: 'right', color: '#5a5a9e' });
    },
  };

  // ---------- WARP (hyperspace travel between levels) ----------
  const warp = {
    enter(next) {
      this.next = next;
      this.t = 0;
      this.dur = 3.4;
      A.stopMusic();
      A.sfx.warp();
      fx.clearAll();
      game.spider.react('happy', 'WHEEE!');
    },
    update(dt) {
      this.t += dt;
      const t = this.t;
      fx.space.warp = t < 0.8 ? t / 0.8 : t > this.dur - 0.8 ? Math.max(0, (this.dur - t) / 0.8) : 1;
      if (Math.random() < dt * 10) fx.burst(SHIP_POS.x + rand(-4, 0), SHIP_POS.y + 60 * 0 + rand(0, 8) + this.shipY() - SHIP_POS.y, { count: 3, colors: fx.PALETTES.ice, speed: 30, life: 0.4 });
      if (t >= this.dur) {
        fx.space.warp = 0;
        if (this.next >= BOSS_LEVEL) go(bossIntro);
        else go(play, this.next);
      }
    },
    shipX() {
      const k = Math.sin(Math.min(1, this.t / this.dur) * Math.PI);
      return SHIP_POS.x + k * 110 + (fx.space.warp > 0.9 ? rand(-1, 1) : 0);
    },
    shipY() { return SHIP_POS.y + (fx.space.warp > 0.9 ? rand(-1, 1) : 0); },
    draw(ctx) {
      S.drawShip(ctx, this.shipX(), this.shipY(), game.t);
      drawText(ctx, 'HYPERSPACE', W / 2, 30, { scale: 2, align: 'center', wave: 2, t: game.t, color: ['#4fd6ff', '#b6f3ff', '#ffffff'], outline: '#1a1030' });
      const label = this.next >= BOSS_LEVEL ? 'UNKNOWN SIGNAL...!' : 'HEADING TO ' + LEVELS[this.next].name;
      if (this.t > 0.6) drawText(ctx, label, W / 2, 140, { align: 'center', color: '#ffd23f', outline: '#1a1030' });
    },
  };

  // ---------- BOSS INTRO ----------
  const bossIntro = {
    enter() {
      this.t = 0;
      this.boss = new S.Boss(BOSS.hp);
      this.roared = false;
      A.sfx.alarm();
      game.spider.react('sad', 'boss');
    },
    update(dt) {
      this.t += dt;
      this.boss.update(dt);
      fx.space.tint = Math.floor(this.t * 4) % 2 ? '#2a0410' : '#05030f';
      if (!this.roared && this.t > 1.4) {
        this.roared = true;
        A.sfx.roar();
        fx.shake(8);
        fx.flash('#ff3b6b', 0.4);
      }
      if (this.t > 3.6) {
        fx.space.tint = null;
        go(play, BOSS_LEVEL, this.boss);
      }
    },
    draw(ctx) {
      S.drawShip(ctx, SHIP_POS.x, SHIP_POS.y, game.t);
      this.boss.draw(ctx);
      if (Math.floor(this.t * 4) % 2 === 0) {
        drawText(ctx, 'ALERT!', W / 2, 26, { scale: 3, align: 'center', color: '#ff3b3b', outline: '#1a1030' });
      }
      if (this.t > 1.4) drawText(ctx, 'FINAL BOSS', W / 2, 150, { scale: 2, align: 'center', wave: 1, t: game.t, color: ['#ff3b6b', '#ffd23f'], outline: '#1a1030' });
    },
  };

  // ---------- PLAY (levels and boss) ----------
  const play = {
    enter(levelIndex, boss) {
      const run = game.run;
      run.level = levelIndex;
      run.levelStartScore = run.score;
      run.combo = 0;
      this.isBoss = levelIndex === BOSS_LEVEL;
      this.cfg = this.isBoss ? BOSS : LEVELS[levelIndex];
      this.round = this.isBoss ? null : new Q.Round();
      this.endless = this.isBoss ? new Q.EndlessDeck() : null;
      this.boss = this.isBoss ? boss || new S.Boss(BOSS.hp) : null;
      this.slots = this.isBoss ? BOSS_SLOTS : LEVEL_SLOTS;
      this.timeMax = this.cfg.time;
      this.timer = this.timeMax;
      this.asteroids = [];
      this.q = null;
      this.timers = [];
      this.banner = null;
      this.cardFlash = new Array(10).fill(0);
      this.shipHitT = 0;
      this.shipDead = false;
      this.phase = 'intro';
      this.phaseT = 0;
      this.countStep = -1;
      this.pendingBingo = false;
      A.playMusic(this.cfg.music);
      fx.space.speedMul = 1 + levelIndex * 0.6;
    },
    later(delay, fn) { this.timers.push({ t: delay, fn }); },
    shipY() { return SHIP_POS.y + Math.sin(game.t * 2) * 2; },
    shipNose() { return { x: SHIP_POS.x + 16, y: this.shipY() + 4 }; },
    shipCenter() { return { x: SHIP_POS.x + 8, y: this.shipY() + 4 }; },

    newQuestion() {
      this.q = this.isBoss ? this.endless.next() : this.round.current;
      const opts = Q.makeOptions(this.q.a, this.q.b);
      this.asteroids = opts.map((value, i) => ({
        value,
        x: W + 20 + i * 12,
        y: this.slots[i].y + rand(-10, 10),
        sx: this.slots[i].x, sy: this.slots[i].y,
        variant: Math.floor(rand(0, 4)),
        t: rand(0, 6),
        flash: 0,
        state: 'in',
        hover: false,
      }));
      this.timer = this.timeMax;
      this.lastTick = Math.ceil(this.timer);
      this.phase = 'ask';
      this.questionPop = 0.25;
    },

    choose(ast) {
      if (this.phase !== 'ask') return;
      const correct = ast.value === this.q.a * this.q.b;
      const nose = this.shipNose();
      fx.laser(nose.x, nose.y, ast.x, ast.y, correct ? '#5dff5d' : '#ffd23f');
      A.sfx.laser();
      this.asteroids.forEach((o) => { if (o !== ast) o.state = 'leave'; });
      this.phase = 'resolve';
      this.phaseT = 0.8;
      if (correct) this.onCorrect(ast);
      else this.onWrong(ast);
    },

    onCorrect(ast) {
      const run = game.run;
      ast.state = 'dead';
      fx.explosion(ast.x, ast.y);
      A.sfx.explode();
      A.sfx.correct();
      run.combo++;
      run.bestCombo = Math.max(run.bestCombo, run.combo);
      const pts = (this.isBoss ? 200 : 100) + Math.round(100 * (this.timer / this.timeMax)) + Math.min(run.combo, 10) * 10;
      run.score += pts;
      fx.floatText('+' + pts, ast.x, ast.y - 20, '#ffd23f');
      if (run.combo >= 3) fx.floatText('COMBO X' + run.combo, W / 2 + 30, 56, '#4fd6ff');
      game.spider.react('happy', 'correct');

      if (this.isBoss) {
        this.later(0.18, () => {
          const n = this.shipNose();
          fx.laser(n.x, n.y, this.boss.x, this.boss.y, '#4fd6ff');
          A.sfx.laser();
          this.boss.hit();
          fx.explosion(this.boss.x + rand(-10, 10), this.boss.y + rand(-10, 10));
          A.sfx.hurt();
          if (this.boss.hp <= 0) this.startBossDeath();
        });
        return;
      }
      const res = this.round.answerCorrect();
      if (res.line) this.lineBonus(res.line);
      if (res.bingo) this.pendingBingo = true;
    },

    onWrong(ast) {
      ast.state = 'crash';
      ast.flash = 1;
      A.sfx.wrong();
      this.miss('wrong');
    },

    timeout() {
      this.asteroids.forEach((o) => { o.state = 'leave'; });
      this.phase = 'resolve';
      this.phaseT = 1;
      fx.floatText('TIME UP!', W / 2 + 30, 60, '#ff3b3b', 2);
      const c = this.shipCenter();
      fx.sparks(c.x, c.y, fx.PALETTES.ice);
      this.miss('timeout');
    },

    miss(kind) {
      const run = game.run;
      run.combo = 0;
      if (this.isBoss) {
        this.boss.attack();
        A.sfx.bossShot();
        const m = this.boss.mouthPos(), c = this.shipCenter();
        this.later(0.15, () => { fx.laser(m.x, m.y, c.x, c.y, '#ff3b6b'); fx.sparks(c.x, c.y, fx.PALETTES.red); });
      } else {
        this.round.answerWrong();
      }
      this.later(kind === 'wrong' ? 0.35 : 0.15, () => this.hurtShip(kind));
    },

    hurtShip(kind) {
      const run = game.run;
      run.lives = Math.max(0, run.lives - 1);
      this.shipHitT = 0.8;
      fx.shake(5);
      fx.flash('#ff0000', 0.3);
      A.sfx.hurt();
      game.spider.react('sad', kind);
      if (run.lives <= 0) {
        this.phase = 'dead';
        this.phaseT = 2.4;
        this.shipDead = true;
        const c = this.shipCenter();
        fx.explosion(c.x, c.y, true);
        A.sfx.bigExplode();
        A.stopMusic();
      }
    },

    lineBonus(table) {
      const run = game.run;
      run.score += 500;
      const gained = run.lives < MAX_LIVES;
      run.lives = Math.min(MAX_LIVES, run.lives + 1);
      this.banner = { text: 'LINE!', sub: table + ' TIMES TABLE DONE  +500' + (gained ? '  +1 @' : ''), t: 1.9 };
      this.cardFlash[table - 1] = 1.9;
      this.phaseT = 2;
      A.sfx.line();
      this.later(0.7, () => A.sfx.lifeUp());
      game.spider.react('dance', 'line');
      for (let i = 0; i < 4; i++) this.later(i * 0.3, () => { fx.firework(rand(70, 300), rand(30, 110)); A.sfx.firework(); });
    },

    startBingo() {
      const run = game.run;
      run.score += 1000;
      this.phase = 'bingo';
      this.phaseT = 3.6;
      this.banner = { text: 'BINGO!', sub: 'ALL TABLES DONE!  +1000', t: 3.6 };
      this.asteroids = [];
      A.stopMusic();
      A.sfx.bingo();
      game.spider.react('dance', 'bingo');
      for (let i = 0; i < 12; i++) this.later(i * 0.25, () => { fx.firework(rand(40, 300), rand(20, 120)); A.sfx.firework(); });
    },

    startBossDeath() {
      this.phase = 'bossDeath';
      this.phaseT = 3.4;
      this.asteroids.forEach((o) => { o.state = 'leave'; });
      A.stopMusic();
      A.sfx.roar();
      for (let i = 0; i < 14; i++) {
        this.later(i * 0.15, () => {
          fx.explosion(this.boss.x + rand(-22, 22), this.boss.y + rand(-20, 20));
          A.sfx.explode();
        });
      }
      this.later(2.3, () => {
        fx.explosion(this.boss.x, this.boss.y, true);
        fx.burst(this.boss.x, this.boss.y, { count: 120, colors: ['#b36bff', '#7a2eb8', '#ff3b6b', '#ffffff'], speed: 160, life: 1.6 });
        fx.flash('#ffffff', 0.6);
        A.sfx.bigExplode();
        this.boss.dead = true;
        game.spider.react('dance', 'bingo');
      });
    },

    afterResolve() {
      if (this.pendingBingo) return this.startBingo();
      this.newQuestion();
    },

    update(dt, events) {
      const run = game.run;
      for (let i = this.timers.length - 1; i >= 0; i--) {
        const tm = this.timers[i];
        tm.t -= dt;
        if (tm.t <= 0) { this.timers.splice(i, 1); tm.fn(); }
      }
      if (this.boss) this.boss.update(dt);
      this.shipHitT -= dt;
      if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }
      this.cardFlash = this.cardFlash.map((v) => Math.max(0, v - dt));
      this.questionPop = Math.max(0, (this.questionPop || 0) - dt);

      // Asteroids.
      const ship = this.shipCenter();
      for (const a of this.asteroids) {
        a.t += dt;
        a.flash = Math.max(0, a.flash - dt);
        if (a.state === 'in') {
          a.x += (a.sx - a.x) * Math.min(1, dt * 6);
          a.y += (a.sy + Math.sin(a.t * 2) * 2 - a.y) * Math.min(1, dt * 6);
        } else if (a.state === 'leave') {
          a.x += 220 * dt;
          a.y += Math.sin(a.t) * 20 * dt;
        } else if (a.state === 'crash') {
          const dx = ship.x - a.x, dy = ship.y - a.y, d = Math.hypot(dx, dy);
          const sp = 320 * dt;
          if (d <= sp) {
            a.state = 'dead';
            fx.explosion(ship.x, ship.y);
            A.sfx.explode();
          } else {
            a.x += (dx / d) * sp;
            a.y += (dy / d) * sp;
          }
        }
        a.hover = this.phase === 'ask' && Math.hypot(pointer.x - a.x, pointer.y - a.y) < S.ASTEROID_R + 3;
      }
      // Only drop asteroids that are gone for good; incoming ones start off-screen on the right.
      this.asteroids = this.asteroids.filter((a) => a.state !== 'dead' && !(a.state === 'leave' && a.x > W + 30));

      if (this.phase === 'intro') {
        this.phaseT += dt;
        const k = Math.floor((this.phaseT - 0.6) / 0.6);
        if (k !== this.countStep && k >= 0 && k <= 3) {
          this.countStep = k;
          A.sfx.countdown(k === 3);
        }
        if (k >= 4) this.newQuestion();
      } else if (this.phase === 'ask') {
        this.timer -= dt;
        const sec = Math.ceil(this.timer);
        if (sec < this.lastTick) {
          this.lastTick = sec;
          if (sec <= 5 && sec > 0) A.sfx.tick();
        }
        if (this.timer <= 0) { this.timer = 0; this.timeout(); }
        if (DEBUG_AUTO && this.phase === 'ask' && this.timeMax - this.timer > 0.5) {
          const right = this.asteroids.find((a) => a.value === this.q.a * this.q.b && a.state === 'in');
          if (right) this.choose(right);
        }
        for (const ev of events) {
          if (this.phase !== 'ask') break;
          if (ev.type === 'click') {
            const hit = this.asteroids.find((a) => a.state === 'in' && Math.hypot(ev.x - a.x, ev.y - a.y) < S.ASTEROID_R + 3);
            if (hit) this.choose(hit);
          } else if (ev.type === 'key' && ['1', '2', '3', '4'].includes(ev.key)) {
            const a = this.asteroids[parseInt(ev.key, 10) - 1];
            if (a && a.state === 'in') this.choose(a);
          }
        }
      } else if (this.phase === 'resolve') {
        this.phaseT -= dt;
        if (this.phaseT <= 0 && run.lives > 0) this.afterResolve();
      } else if (this.phase === 'dead') {
        this.phaseT -= dt;
        if (this.phaseT <= 0) go(gameOver);
      } else if (this.phase === 'bingo') {
        this.phaseT -= dt;
        if (this.phaseT <= 0) go(warp, run.level + 1);
      } else if (this.phase === 'bossDeath') {
        this.phaseT -= dt;
        if (this.phaseT <= 0) go(victory);
      }
    },

    drawCard(ctx) {
      const x0 = 4, y0 = 14;
      ctx.fillStyle = '#3a3a6e';
      ctx.fillRect(x0 - 2, y0 - 2, 43, 43);
      ctx.fillStyle = '#0a0820';
      ctx.fillRect(x0 - 1, y0 - 1, 41, 41);
      for (let a = 1; a <= 10; a++) {
        const flashOn = this.cardFlash[a - 1] > 0 && Math.floor(this.cardFlash[a - 1] * 12) % 2 === 0;
        const lineDone = this.round.isLineDone(a);
        for (let b = 1; b <= 10; b++) {
          let col = '#1e1a44';
          if (this.round.isSolved(a, b)) col = ROW_COLORS[a - 1];
          if (flashOn) col = '#ffffff';
          else if (lineDone && Math.floor(game.t * 6 + b) % 10 === 0) col = '#ffffff';
          ctx.fillStyle = col;
          ctx.fillRect(x0 + (b - 1) * 4, y0 + (a - 1) * 4, 3, 3);
        }
      }
      drawText(ctx, this.round.solvedCount + '/100', 4, 58, { color: '#8a8ad0' });
    },

    drawBossBar(ctx) {
      const b = this.boss;
      const x = 250, y = 58, w = 62;
      ctx.fillStyle = '#000';
      ctx.fillRect(x - 1, y - 1, w + 2, 7);
      ctx.fillStyle = '#3a0a1a';
      ctx.fillRect(x, y, w, 5);
      ctx.fillStyle = b.hitT > 0 ? '#ffffff' : '#ff3b6b';
      ctx.fillRect(x, y, Math.round(w * b.hp / b.maxHp), 5);
      drawText(ctx, 'BOSS', 4, 16, { color: '#ff3b6b' });
      drawText(ctx, b.hp + '/' + b.maxHp, 4, 26, { color: '#ffd23f' });
    },

    drawTimer(ctx) {
      const x = 70, y = 44, w = 220, h = 6;
      const ratio = this.phase === 'ask' ? this.timer / this.timeMax : this.phase === 'intro' ? 1 : this.timer / this.timeMax;
      const col = ratio > 0.5 ? '#5dff5d' : ratio > 0.25 ? '#ffd23f' : '#ff3b3b';
      const blink = ratio <= 0.25 && this.phase === 'ask' && Math.floor(game.t * 8) % 2 === 0;
      ctx.fillStyle = '#dfe8ff';
      ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
      ctx.fillStyle = '#1a1030';
      ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
      ctx.fillStyle = blink ? '#ffffff' : col;
      ctx.fillRect(x, y, Math.round(w * Math.max(0, ratio)), h);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(x, y, Math.round(w * Math.max(0, ratio)), 1);
      drawText(ctx, String(Math.ceil(Math.max(0, this.timer))), 306, 44, { align: 'center', color: col });
    },

    draw(ctx) {
      const run = game.run;
      // HUD.
      drawText(ctx, this.cfg.name, 4, 3, { color: this.cfg.color });
      drawText(ctx, padScore(run.score), 160, 3, { align: 'center', color: '#ffffff' });
      drawHearts(ctx, run.lives);
      if (this.isBoss) this.drawBossBar(ctx);
      else this.drawCard(ctx);

      if (this.boss) this.boss.draw(ctx);

      if (!this.shipDead && (this.shipHitT <= 0 || Math.floor(this.shipHitT * 20) % 2 === 0)) {
        S.drawShip(ctx, SHIP_POS.x, this.shipY(), game.t);
      }

      if (this.phase === 'intro') {
        drawText(ctx, this.cfg.name, W / 2, 62, { scale: 3, align: 'center', color: this.cfg.color, outline: '#1a1030' });
        const k = Math.floor((this.phaseT - 0.6) / 0.6);
        const label = k < 0 ? 'GET READY!' : ['3', '2', '1', 'GO!'][Math.min(k, 3)];
        drawText(ctx, label, W / 2, 96, { scale: 2, align: 'center', color: '#ffffff', outline: '#1a1030' });
        drawText(ctx, this.timeMax + ' SECONDS PER QUESTION', W / 2, 124, { align: 'center', color: '#8a8ad0' });
      }

      if (this.q && this.phase !== 'intro' && this.phase !== 'bingo' && this.phase !== 'bossDeath') {
        const pop = Math.round(Math.sin((this.questionPop / 0.25) * Math.PI) * 3);
        drawText(ctx, this.q.a + ' × ' + this.q.b + ' = ?', 190, 17 - pop, { scale: 3, align: 'center', color: '#ffffff', outline: '#1a1030' });
        this.drawTimer(ctx);
      }

      for (const a of this.asteroids) S.drawAsteroid(ctx, a);

      if (this.banner) drawBanner(ctx, this.banner.text, this.banner.sub, game.t);
    },
  };

  // ---------- GAME OVER ----------
  const gameOver = {
    retry: { x: 60, y: 118, w: 94, h: 20 },
    menuBtn: { x: 166, y: 118, w: 94, h: 20 },
    enter() {
      this.t = 0;
      this.newRecord = saveHighScore(game.run.score);
      A.sfx.gameOver();
    },
    doRetry() {
      const run = game.run;
      A.sfx.start();
      run.score = run.levelStartScore;
      run.lives = MAX_LIVES;
      go(play, run.level);
    },
    update(dt, events) {
      this.t += dt;
      for (const ev of events) {
        if (ev.type === 'click') {
          if (inRect(ev, this.retry)) return this.doRetry();
          if (inRect(ev, this.menuBtn)) { A.sfx.select(); return go(menu); }
        } else if (ev.type === 'key') {
          if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'r') return this.doRetry();
          if (ev.key === 'Escape') return go(menu);
        }
      }
    },
    draw(ctx) {
      drawText(ctx, 'GAME OVER', W / 2, 36, { scale: 4, align: 'center', wave: 2, t: this.t, color: ['#ff3b3b', '#ff8c1a'], outline: '#1a1030' });
      drawText(ctx, 'SCORE ' + padScore(game.run.score), W / 2, 80, { align: 'center', color: '#ffffff' });
      drawText(ctx, 'HIGH SCORE ' + padScore(highScore), W / 2, 92, { align: 'center', color: '#ffd23f' });
      if (this.newRecord && Math.floor(this.t * 3) % 2 === 0) drawText(ctx, 'NEW HIGH SCORE!', W / 2, 104, { align: 'center', color: '#5dff5d' });
      drawButton(ctx, this.retry, 'RETRY', { color: '#5dff5d' });
      drawButton(ctx, this.menuBtn, 'MENU', { color: '#8a8ad0' });
    },
  };

  // ---------- VICTORY ----------
  const victory = {
    menuBtn: { x: 120, y: 140, w: 80, h: 20 },
    enter() {
      this.t = 0;
      this.fw = 0;
      this.newRecord = saveHighScore(game.run.score);
      A.sfx.victory();
      this.musicT = 2.5;
    },
    update(dt, events) {
      this.t += dt;
      this.fw -= dt;
      if (this.musicT > 0) { this.musicT -= dt; if (this.musicT <= 0) A.playMusic('victory'); }
      if (this.fw <= 0) {
        this.fw = rand(0.2, 0.5);
        fx.firework(rand(30, 290), rand(20, 110));
        A.sfx.firework();
      }
      if (Math.random() < dt * 0.4) game.spider.react('dance', pick(['YOU ROCK!', 'HOORAY!', 'VICTORY!']));
      for (const ev of events) {
        if ((ev.type === 'click' && inRect(ev, this.menuBtn)) || (ev.type === 'key' && (ev.key === 'Enter' || ev.key === ' '))) {
          A.sfx.select();
          return go(menu);
        }
      }
    },
    draw(ctx) {
      S.drawShip(ctx, W / 2 - 8 + Math.sin(this.t * 1.5) * 60, 118 + Math.sin(this.t * 3) * 4, this.t);
      drawText(ctx, 'VICTORY!', W / 2, 20, { scale: 4, align: 'center', wave: 3, t: this.t, color: ['#ff3b6b', '#ffd23f', '#5dff5d', '#4fd6ff', '#b36bff'], outline: '#1a1030' });
      drawText(ctx, 'YOU SAVED THE GALAXY', W / 2, 56, { align: 'center', color: '#dfe8ff', outline: '#1a1030' });
      drawText(ctx, 'SCORE ' + padScore(game.run.score), W / 2, 72, { scale: 2, align: 'center', color: '#ffffff', outline: '#1a1030' });
      drawText(ctx, 'BEST COMBO X' + game.run.bestCombo, W / 2, 94, { align: 'center', color: '#4fd6ff' });
      drawText(ctx, 'HIGH SCORE ' + padScore(highScore), W / 2, 104, { align: 'center', color: '#ffd23f' });
      if (this.newRecord && Math.floor(this.t * 3) % 2 === 0) drawText(ctx, 'NEW HIGH SCORE!', W / 2, 132, { align: 'center', color: '#5dff5d' });
      drawButton(ctx, this.menuBtn, 'MENU', { color: '#ffd23f' });
    },
  };

  // ---------- Pause ----------
  const pauseUI = {
    resume: { x: 110, y: 90, w: 100, h: 20 },
    menuBtn: { x: 110, y: 116, w: 100, h: 20 },
  };

  function canPause() { return game.scene === play; }

  function setPaused(p) {
    game.paused = p;
    A.sfx.select();
    if (p) A.stopMusic();
    else A.playMusic(play.cfg.music);
  }

  // ---------- Public API ----------
  MX.game = {
    init() {
      game.spider = new S.Spider();
      // Dev shortcut: index.html?debug=1|2|3|boss|warp|gameover|victory jumps straight to a scene.
      const debug = new URLSearchParams(location.search).get('debug');
      if (!debug) return go(menu);
      game.run = { score: 1234, lives: 3, combo: 0, bestCombo: 7, level: 0, levelStartScore: 0 };
      const scenes = { warp: [warp, 1], boss: [play, BOSS_LEVEL], gameover: [gameOver], victory: [victory] };
      const [scene, ...args] = scenes[debug] || [play, Math.max(0, Math.min(2, parseInt(debug, 10) - 1 || 0))];
      go(scene, ...args);
      // &pre=N pre-solves N questions of the level (to reach line/bingo fast).
      const pre = parseInt(new URLSearchParams(location.search).get('pre'), 10) || 0;
      for (let i = 0; i < Math.min(pre, 99) && play.round; i++) play.round.answerCorrect();
    },
    update(dt, events) {
      game.drawDt = game.paused ? 0 : dt;
      const rest = [];
      for (const ev of events) {
        if ((ev.type === 'click' && inRect(ev, MUTE_RECT)) || (ev.type === 'key' && ev.key === 'm')) {
          A.toggleMute();
          continue;
        }
        if (ev.type === 'key' && (ev.key === 'p' || ev.key === 'Escape') && canPause() && (game.paused || ev.key === 'p' || play.phase === 'ask')) {
          setPaused(!game.paused);
          continue;
        }
        rest.push(ev);
      }
      if (game.paused) {
        for (const ev of rest) {
          if (ev.type !== 'click') continue;
          if (inRect(ev, pauseUI.resume)) setPaused(false);
          else if (inRect(ev, pauseUI.menuBtn)) { game.paused = false; go(menu); }
        }
        return;
      }
      game.t += dt;
      fx.updateBackground(dt);
      fx.update(dt);
      game.spider.update(dt, game.scene === play && play.phase === 'ask');
      game.scene.update(dt, rest);
    },
    draw(ctx) {
      const [sx, sy] = game.paused ? [0, 0] : fx.shakeOffset(game.drawDt);
      ctx.save();
      ctx.translate(sx, sy);
      fx.drawBackground(ctx);
      game.scene.draw(ctx);
      game.spider.draw(ctx);
      fx.drawTop(ctx, game.drawDt);
      ctx.restore();
      fx.drawFlash(ctx, game.drawDt);
      S.drawSpeaker(ctx, MUTE_RECT.x + 2, MUTE_RECT.y + 1, A.isMuted());
      if (game.paused) {
        ctx.fillStyle = 'rgba(5,3,15,0.75)';
        ctx.fillRect(0, 0, W, H);
        drawText(ctx, 'PAUSED', W / 2, 44, { scale: 4, align: 'center', color: '#ffd23f', outline: '#1a1030' });
        drawButton(ctx, pauseUI.resume, 'RESUME', { color: '#5dff5d' });
        drawButton(ctx, pauseUI.menuBtn, 'MENU', { color: '#8a8ad0' });
      }
      drawScanlines(ctx);
    },
  };
})();
