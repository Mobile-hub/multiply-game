// Chiptune audio synthesized with WebAudio: sound effects and looping background music.
(function () {
  const MX = (window.MX = window.MX || {});

  let ctx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
  let muted = false;
  try { muted = localStorage.getItem('mx.muted') === '1'; } catch (e) { /* storage unavailable */ }

  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      sfxBus = ctx.createGain();
      sfxBus.gain.value = 0.7;
      sfxBus.connect(master);
      musicBus = ctx.createGain();
      musicBus.gain.value = 0.28;
      musicBus.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      startScheduler();
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function tone(freq, dur, opts = {}) {
    if (!ctx) return;
    const t0 = (opts.at || ctx.currentTime) + (opts.delay || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slide), t0 + dur);
    const vol = opts.vol === undefined ? 0.3 : opts.vol;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(opts.bus || sfxBus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, opts = {}) {
    if (!ctx) return;
    const t0 = (opts.at || ctx.currentTime) + (opts.delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const filter = ctx.createBiquadFilter();
    filter.type = opts.filter || 'lowpass';
    filter.frequency.setValueAtTime(opts.freq || 2000, t0);
    if (opts.freqTo) filter.frequency.exponentialRampToValueAtTime(opts.freqTo, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(opts.vol === undefined ? 0.4 : opts.vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(opts.bus || sfxBus);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dur + 0.02);
  }

  function arp(notes, step, opts = {}) {
    notes.forEach((n, i) => tone(midi(n), opts.dur || step * 1.2, { ...opts, delay: (opts.delay || 0) + i * step }));
  }

  const sfx = {
    select() { tone(880, 0.06, { vol: 0.2 }); tone(1320, 0.06, { vol: 0.2, delay: 0.05 }); },
    start() { arp([60, 64, 67, 72, 76, 79, 84], 0.05, { vol: 0.25 }); },
    laser() { tone(1400, 0.16, { slide: 180, vol: 0.22 }); tone(700, 0.16, { slide: 90, vol: 0.12, type: 'sawtooth' }); },
    explode() { noise(0.5, { freq: 3000, freqTo: 100, vol: 0.55 }); tone(120, 0.35, { slide: 30, type: 'triangle', vol: 0.5 }); },
    bigExplode() { noise(1.2, { freq: 4000, freqTo: 60, vol: 0.7 }); tone(90, 0.9, { slide: 20, type: 'triangle', vol: 0.6 }); },
    correct() { arp([72, 76, 79, 84], 0.06, { vol: 0.2, type: 'square' }); },
    wrong() { tone(300, 0.35, { slide: 70, type: 'sawtooth', vol: 0.3 }); noise(0.25, { freq: 800, vol: 0.3 }); },
    hurt() { noise(0.4, { freq: 1500, freqTo: 200, vol: 0.5 }); tone(200, 0.3, { slide: 60, type: 'square', vol: 0.25 }); },
    tick() { tone(1800, 0.03, { vol: 0.12 }); },
    alarm() { for (let i = 0; i < 4; i++) { tone(880, 0.15, { delay: i * 0.3, vol: 0.2 }); tone(660, 0.15, { delay: i * 0.3 + 0.15, vol: 0.2 }); } },
    line() { arp([67, 71, 74, 79, 74, 79, 83, 86], 0.08, { vol: 0.22 }); arp([43, 47, 50, 55], 0.16, { vol: 0.25, type: 'triangle' }); },
    bingo() {
      arp([60, 64, 67, 72, 67, 72, 76, 79, 76, 79, 84, 88], 0.07, { vol: 0.22 });
      arp([36, 43, 48, 55, 60], 0.17, { vol: 0.3, type: 'triangle' });
      noise(0.6, { freq: 6000, filter: 'highpass', vol: 0.15, delay: 0.8 });
    },
    warp() { tone(100, 2.5, { slide: 2000, type: 'sawtooth', vol: 0.15 }); noise(2.8, { freq: 200, freqTo: 8000, vol: 0.25 }); },
    roar() {
      tone(70, 1.2, { slide: 40, type: 'sawtooth', vol: 0.4 });
      tone(95, 1.2, { slide: 55, type: 'square', vol: 0.25 });
      noise(1.2, { freq: 600, freqTo: 150, vol: 0.4 });
    },
    bossShot() { tone(200, 0.4, { slide: 900, type: 'sawtooth', vol: 0.25 }); },
    lifeUp() { arp([76, 79, 83, 88], 0.05, { vol: 0.2, type: 'triangle' }); },
    gameOver() { arp([67, 63, 60, 55, 51, 48], 0.18, { vol: 0.25, type: 'triangle', dur: 0.3 }); },
    victory() {
      arp([60, 60, 60, 64, 67, 67, 72], 0.12, { vol: 0.25 });
      arp([72, 76, 79, 84], 0.12, { vol: 0.2, delay: 0.9 });
      arp([36, 43, 48, 55], 0.25, { vol: 0.3, type: 'triangle' });
    },
    firework() { noise(0.3, { freq: 5000, freqTo: 300, vol: 0.2 }); },
    countdown(final) { tone(final ? 1320 : 660, final ? 0.3 : 0.12, { vol: 0.22 }); },
  };

  // ---------- Music ----------
  // Each song: chord roots per bar (MIDI), chord quality, tempo, lead arpeggio pattern.
  const SONGS = {
    menu: { tempo: 110, bars: [[57, 'm'], [53, 'M'], [48, 'M'], [55, 'M']], lead: [0, 1, 2, 1, 3, 2, 1, 2, 0, 1, 2, 3, 2, 1, 2, 1], leadOct: 12, drums: 'soft' },
    level1: { tempo: 124, bars: [[48, 'M'], [57, 'm'], [53, 'M'], [55, 'M']], lead: [0, 2, 1, 2, 3, 2, 1, 2, 0, 2, 1, 2, 3, 1, 2, 1], leadOct: 12, drums: 'beat' },
    level2: { tempo: 136, bars: [[50, 'm'], [58, 'M'], [53, 'M'], [57, 'M']], lead: [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 3, 1, 2, 3, 2], leadOct: 12, drums: 'beat' },
    level3: { tempo: 150, bars: [[52, 'm'], [48, 'M'], [55, 'M'], [50, 'M']], lead: [0, 3, 2, 3, 1, 3, 2, 3, 0, 3, 2, 1, 2, 3, 1, 3], leadOct: 12, drums: 'fast' },
    boss: { tempo: 168, bars: [[45, 'm'], [46, 'M'], [45, 'm'], [52, 'M']], lead: [0, 0, 3, 0, 2, 0, 3, 1, 0, 0, 3, 0, 2, 3, 1, 2], leadOct: 12, drums: 'fast', leadType: 'sawtooth' },
    victory: { tempo: 120, bars: [[48, 'M'], [53, 'M'], [55, 'M'], [48, 'M']], lead: [0, 1, 2, 3, 2, 1, 2, 3, 3, 2, 1, 2, 3, 3, 2, 3], leadOct: 12, drums: 'soft' },
  };
  const CHORDS = { M: [0, 4, 7, 12], m: [0, 3, 7, 12] };

  let song = null, songName = null, step = 0, nextTime = 0, schedTimer = null;

  function playMusic(name) {
    if (songName === name) return;
    songName = name;
    song = SONGS[name] || null;
    step = 0;
    if (ctx) nextTime = ctx.currentTime + 0.05;
  }

  function scheduleStep(s, time) {
    const stepDur = 60 / song.tempo / 4;
    const bar = song.bars[Math.floor(s / 16) % song.bars.length];
    const chord = CHORDS[bar[1]];
    const i = s % 16;
    // Bass on 8ths.
    if (i % 2 === 0) {
      const bassNote = bar[0] - 12 + (i % 8 === 4 ? 7 : 0);
      tone(midi(bassNote), stepDur * 1.8, { at: time, type: 'triangle', vol: 0.5, bus: musicBus });
    }
    // Lead arpeggio.
    const ln = bar[0] + song.leadOct + chord[song.lead[i]];
    tone(midi(ln), stepDur * 0.9, { at: time, type: song.leadType || 'square', vol: 0.12, bus: musicBus });
    // Drums.
    if (song.drums !== 'soft' || i % 4 === 2) {
      if (i % 2 === 1 || song.drums === 'fast') noise(0.04, { at: time, freq: 7000, filter: 'highpass', vol: 0.12, bus: musicBus });
    }
    if (song.drums !== 'soft' && i % 8 === 0) tone(150, 0.12, { at: time, slide: 40, type: 'sine', vol: 0.7, bus: musicBus });
    if (song.drums !== 'soft' && i % 8 === 4) noise(0.1, { at: time, freq: 1800, vol: 0.25, bus: musicBus });
  }

  function startScheduler() {
    nextTime = ctx.currentTime + 0.05;
    schedTimer = setInterval(() => {
      if (!song || !ctx) return;
      const stepDur = 60 / song.tempo / 4;
      if (nextTime < ctx.currentTime - 0.2) nextTime = ctx.currentTime + 0.02; // tab was hidden
      while (nextTime < ctx.currentTime + 0.12) {
        scheduleStep(step, nextTime);
        nextTime += stepDur;
        step++;
      }
    }, 25);
  }

  function setMuted(m) {
    muted = m;
    try { localStorage.setItem('mx.muted', m ? '1' : '0'); } catch (e) { /* storage unavailable */ }
    if (master) master.gain.setTargetAtTime(m ? 0 : 0.5, ctx.currentTime, 0.02);
  }

  MX.audio = {
    unlock,
    sfx: new Proxy(sfx, { get: (o, k) => (o[k] ? (...a) => { if (ctx && !muted) o[k](...a); } : () => {}) }),
    playMusic,
    stopMusic() { song = null; songName = null; },
    toggleMute() { setMuted(!muted); return muted; },
    isMuted: () => muted,
  };
})();
