// Boot: canvas scaling, main loop, audio unlock.
(function () {
  const MX = window.MX;
  const canvas = document.getElementById('screen');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  function resize() {
    const s = Math.min(window.innerWidth / canvas.width, window.innerHeight / canvas.height);
    const scale = s >= 1 ? Math.floor(s) || 1 : s;
    canvas.style.width = canvas.width * scale + 'px';
    canvas.style.height = canvas.height * scale + 'px';
  }
  window.addEventListener('resize', resize);
  resize();

  MX.input.init(canvas);
  MX.input.onFirstInteraction(() => MX.audio.unlock());

  MX.game.init();

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    MX.game.update(dt, MX.input.poll());
    MX.game.draw(ctx);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
