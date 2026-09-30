// Pointer (mouse/touch/pen) and keyboard input mapped into low-res canvas coordinates.
(function () {
  const MX = (window.MX = window.MX || {});

  const events = [];
  const pointer = { x: -100, y: -100 };
  let canvas = null;
  let interactionCb = null;

  function toCanvas(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * canvas.width,
      y: ((clientY - r.top) / r.height) * canvas.height,
    };
  }

  // Called on every user gesture: mobile browsers (iOS Safari) only unlock audio inside one.
  function interacted() {
    if (interactionCb) interactionCb();
  }

  function init(c) {
    canvas = c;
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      interacted();
      const p = toCanvas(e.clientX, e.clientY);
      pointer.x = p.x;
      pointer.y = p.y;
      events.push({ type: 'click', x: p.x, y: p.y });
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const p = toCanvas(e.clientX, e.clientY);
      pointer.x = p.x;
      pointer.y = p.y;
    });
    // Touch has no hover: forget the finger position once it lifts.
    const release = (e) => {
      if (e.pointerType !== 'mouse') { pointer.x = -100; pointer.y = -100; }
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('touchend', interacted, { passive: true });
    // Block long-press menu, double-tap zoom and scrolling on mobile.
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      interacted();
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Backspace'].includes(key)) e.preventDefault();
      events.push({ type: 'key', key });
    });
  }

  function poll() {
    return events.splice(0, events.length);
  }

  function onInteraction(cb) {
    interactionCb = cb;
  }

  function inRect(p, r) {
    return p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;
  }

  MX.input = { init, poll, pointer, onInteraction, inRect };
})();
