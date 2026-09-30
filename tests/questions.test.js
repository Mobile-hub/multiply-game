// Minimal dependency-free tests for js/questions.js. Run: node tests/questions.test.js
const assert = require('assert');
const Q = require('../js/questions.js');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ok  ' + name);
  } catch (e) {
    console.error('  FAIL ' + name + '\n       ' + e.message);
    process.exitCode = 1;
  }
}

// Deterministic RNG (mulberry32).
function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('allPairs has 100 unique combinations', () => {
  const pairs = Q.allPairs();
  assert.strictEqual(pairs.length, 100);
  assert.strictEqual(new Set(pairs.map((p) => p.a + 'x' + p.b)).size, 100);
});

test('round deck is shuffled and complete', () => {
  const r = new Q.Round(rng(1));
  assert.strictEqual(r.remaining, 100);
  const inOrder = r.deck.every((q, i) => q.a === Math.floor(i / 10) + 1 && q.b === (i % 10) + 1);
  assert.ok(!inOrder, 'deck should not be in order');
});

test('options contain the answer once, 4 unique positive values', () => {
  const rand = rng(2);
  for (let a = 1; a <= 10; a++) {
    for (let b = 1; b <= 10; b++) {
      for (let k = 0; k < 20; k++) {
        const opts = Q.makeOptions(a, b, rand);
        assert.strictEqual(opts.length, 4);
        assert.strictEqual(new Set(opts).size, 4, `duplicates for ${a}x${b}: ${opts}`);
        assert.strictEqual(opts.filter((v) => v === a * b).length, 1);
        assert.ok(opts.every((v) => v > 0));
      }
    }
  }
});

test('answer position is not predictable', () => {
  const rand = rng(3);
  const pos = [0, 0, 0, 0];
  for (let i = 0; i < 4000; i++) pos[Q.makeOptions(7, 8, rand).indexOf(56)]++;
  pos.forEach((n) => assert.ok(n > 800 && n < 1200, 'positions ' + pos));
});

test('wrong answer requeues the question later, not immediately', () => {
  const r = new Q.Round(rng(4));
  const q = r.current;
  r.answerWrong();
  assert.strictEqual(r.remaining, 100);
  assert.notStrictEqual(r.current, q);
  assert.ok(r.deck.indexOf(q) >= 3);
  assert.strictEqual(r.solvedCount, 0);
});

test('completing a whole table reports a line once', () => {
  const r = new Q.Round(rng(5));
  // Reorder so all of the 7 table comes first.
  r.deck.sort((x, y) => (x.a === 7 ? 0 : 1) - (y.a === 7 ? 0 : 1));
  const lines = [];
  for (let i = 0; i < 10; i++) {
    const res = r.answerCorrect();
    if (res.line) lines.push(res.line);
  }
  assert.deepStrictEqual(lines, [7]);
  assert.ok(r.isLineDone(7));
});

test('bingo after all 100, with 10 lines, despite misses', () => {
  const r = new Q.Round(rng(6));
  const rand = rng(7);
  const lines = [];
  let bingo = false, steps = 0;
  while (!r.done && steps++ < 1000) {
    if (rand() < 0.3) { r.answerWrong(); continue; }
    const res = r.answerCorrect();
    if (res.line) lines.push(res.line);
    bingo = res.bingo;
  }
  assert.ok(bingo);
  assert.strictEqual(r.remaining, 0);
  assert.deepStrictEqual(lines.sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('endless deck never repeats back-to-back', () => {
  const d = new Q.EndlessDeck(rng(8));
  let prev = d.next();
  for (let i = 0; i < 1000; i++) {
    const q = d.next();
    assert.ok(!(q.a === prev.a && q.b === prev.b));
    prev = q;
  }
});

function typeAll(values, digits) {
  let typed = '', res = null;
  for (const d of digits) {
    res = Q.typeDigit(values, typed, d);
    typed = res.typed;
    if (res.commit !== null) break;
  }
  return res;
}

test('typing: 6x9 with 20,66,55,54 -> "5" waits, "53" ignored', () => {
  const v = [20, 66, 55, 54];
  const r1 = Q.typeDigit(v, '', '5');
  assert.deepStrictEqual(r1.matches.sort(), [54, 55]);
  assert.strictEqual(r1.commit, null);
  const r2 = Q.typeDigit(v, r1.typed, '3');
  assert.ok(r2.rejected);
  assert.strictEqual(r2.typed, '');
  assert.strictEqual(r2.commit, null);
});

test('typing: "55" commits 55 (wrong), "54" commits 54 (right)', () => {
  const v = [20, 66, 55, 54];
  assert.strictEqual(typeAll(v, '55').commit, 55);
  assert.strictEqual(typeAll(v, '54').commit, 54);
});

test('typing: single-digit answer commits at once when unambiguous', () => {
  assert.strictEqual(typeAll([5, 6, 7, 8], '6').commit, 6);
});

test('typing: ambiguous prefix waits, Enter confirms exact', () => {
  const r = Q.typeDigit([6, 60, 7, 8], '', '6');
  assert.strictEqual(r.commit, null);
  assert.strictEqual(Q.exactMatch([6, 60, 7, 8], r.typed), 6);
  assert.strictEqual(typeAll([6, 60, 7, 8], '60').commit, 60);
  assert.strictEqual(Q.exactMatch([6, 60], ''), null);
});

test('typing: three digits for 100', () => {
  const v = [100, 90, 110, 99];
  const r = Q.typeDigit(v, '1', '0');
  assert.strictEqual(r.commit, null);
  assert.strictEqual(typeAll(v, '100').commit, 100);
});

test('typing: first digit with no match is ignored', () => {
  const r = Q.typeDigit([20, 66, 55, 54], '', '3');
  assert.ok(r.rejected);
  assert.strictEqual(r.typed, '');
});

console.log(`\n${passed} tests passed` + (process.exitCode ? ' (with failures)' : ''));
