// Boot: canvas scaling, main loop, audio unlock.
(function () {
  const MX = window.MX;
  const canvas = document.getElementById('screen');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  function resize() {
    const s = Math.min(window.innerWidth / canvas.width, window.innerHeight / canvas.height);
    // Integer scaling keeps pixels crisp on big screens; small (phone) screens use all the space.
    const scale = s >= 3 ? Math.floor(s) : s;
    canvas.style.width = Math.floor(canvas.width * scale) + 'px';
    canvas.style.height = Math.floor(canvas.height * scale) + 'px';
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  resize();

  MX.input.init(canvas);
  MX.input.onInteraction(() => MX.audio.unlock());
  document.addEventListener('visibilitychange', () => { if (document.hidden) MX.game.autoPause(); });

  MX.game.init();

  // Dev shortcut: &t=N fast-forwards N seconds of game time before the first frame.
  const warm = parseFloat(new URLSearchParams(location.search).get('t')) || 0;
  for (let i = 0; i < warm * 60; i++) {
    MX.game.update(1 / 60, []);
    if (i % 6 === 0) MX.game.draw(ctx); // keeps timed visual effects (lasers, flashes) consistent
  }
  // Dev shortcut: &keys=54 simulates typing those keys after the fast-forward.
  for (const k of new URLSearchParams(location.search).get('keys') || '') {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: k }));
  }
  if (warm) MX.game.update(1 / 60, MX.input.poll());

  let last = performance.now();
  function frame(now) {
    // rAF timestamps can precede the performance.now() taken at boot: clamp to avoid negative dt.
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    MX.game.update(dt, MX.input.poll());
    MX.game.draw(ctx);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
