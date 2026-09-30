// Pure question logic: shuffled deck of all 100 products, plausible distractors, line/bingo tracking.
// Works in the browser (window.MX.questions) and in node (module.exports) for tests.
(function (root) {
  const SIZE = 10;

  function shuffle(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function allPairs() {
    const out = [];
    for (let a = 1; a <= SIZE; a++) for (let b = 1; b <= SIZE; b++) out.push({ a, b });
    return out;
  }

  // Three wrong answers that look plausible, never the right one, no duplicates, shuffled order.
  function makeOptions(a, b, rng = Math.random, count = 4) {
    const p = a * b;
    const candidates = [
      (a - 1) * b, (a + 1) * b, a * (b - 1), a * (b + 1),
      (a + 1) * (b + 1), (a - 1) * (b - 1), (a + 1) * (b - 1), (a - 1) * (b + 1),
      p + 1, p - 1, p + 2, p - 2, p + 10, p - 10, a + b,
    ];
    const pool = shuffle([...new Set(candidates.filter((v) => v > 0 && v !== p))], rng);
    const picked = pool.slice(0, count - 1);
    let k = 3;
    while (picked.length < count - 1) {
      const v = p + k;
      if (!picked.includes(v)) picked.push(v);
      k++;
    }
    return shuffle([p, ...picked], rng);
  }

  // One level: every a×b must be answered correctly once. Misses go back into the deck.
  class Round {
    constructor(rng = Math.random) {
      this.rng = rng;
      this.deck = shuffle(allPairs(), rng);
      this.solved = Array.from({ length: SIZE }, () => new Array(SIZE).fill(false));
      this.lines = new Set();
      this.solvedCount = 0;
    }
    get current() { return this.deck[0] || null; }
    get remaining() { return this.deck.length; }
    get done() { return this.solvedCount === SIZE * SIZE; }
    isSolved(a, b) { return this.solved[a - 1][b - 1]; }
    isLineDone(a) { return this.solved[a - 1].every(Boolean); }

    // Returns { line: table number completed now or null, bingo: boolean }.
    answerCorrect() {
      const q = this.deck.shift();
      if (!q) return { line: null, bingo: false };
      if (!this.solved[q.a - 1][q.b - 1]) {
        this.solved[q.a - 1][q.b - 1] = true;
        this.solvedCount++;
      }
      let line = null;
      if (!this.lines.has(q.a) && this.isLineDone(q.a)) {
        this.lines.add(q.a);
        line = q.a;
      }
      return { line, bingo: this.done };
    }

    // Requeue the missed question a few places later so it is not repeated immediately.
    answerWrong() {
      const q = this.deck.shift();
      if (!q) return;
      const min = Math.min(3, this.deck.length);
      const idx = min + Math.floor(this.rng() * (this.deck.length - min + 1));
      this.deck.splice(idx, 0, q);
    }
  }

  // Endless random questions for the boss fight, avoiding immediate repeats.
  class EndlessDeck {
    constructor(rng = Math.random) {
      this.rng = rng;
      this.deck = [];
      this.last = null;
    }
    next() {
      if (!this.deck.length) {
        this.deck = shuffle(allPairs(), this.rng);
        if (this.last && this.deck[0].a === this.last.a && this.deck[0].b === this.last.b) this.deck.push(this.deck.shift());
      }
      this.last = this.deck.shift();
      return this.last;
    }
  }

  const api = { SIZE, shuffle, allPairs, makeOptions, Round, EndlessDeck };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.MX = root.MX || {}).questions = api;
})(typeof window !== 'undefined' ? window : globalThis);
