// Pointer (mouse/touch) and keyboard input mapped into low-res canvas coordinates.
(function () {
  const MX = (window.MX = window.MX || {});

  const events = [];
  const pointer = { x: -100, y: -100 };
  let canvas = null;
  let firstInteraction = null;

  function toCanvas(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * canvas.width,
      y: ((clientY - r.top) / r.height) * canvas.height,
    };
  }

  function interacted() {
    if (firstInteraction) {
      const cb = firstInteraction;
      firstInteraction = null;
      cb();
    }
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
      const p = toCanvas(e.clientX, e.clientY);
      pointer.x = p.x;
      pointer.y = p.y;
    });
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      interacted();
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(key)) e.preventDefault();
      events.push({ type: 'key', key });
    });
  }

  function poll() {
    return events.splice(0, events.length);
  }

  function onFirstInteraction(cb) {
    firstInteraction = cb;
  }

  function inRect(p, r) {
    return p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;
  }

  MX.input = { init, poll, pointer, onFirstInteraction, inRect };
})();
