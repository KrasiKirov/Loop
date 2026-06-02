const { test } = require('node:test');
const assert = require('node:assert');
const { nextSrs, INTERVALS_MIN } = require('../srs');

const MIN = 60_000;

test('nextSrs(null, true) -> box 1, reps 1, lapses 0, due ~1 day', () => {
  const before = Date.now();
  const s = nextSrs(null, true);
  assert.strictEqual(s.box, 1);
  assert.strictEqual(s.reps, 1);
  assert.strictEqual(s.lapses, 0);
  assert.strictEqual(s.lastResult, true);
  const expected = before + INTERVALS_MIN[1] * MIN; // 1 day
  assert.ok(Math.abs(s.dueAt.getTime() - expected) < 5000);
});

test('nextSrs({box:3,reps:3}, false) -> box 0, lapses incremented, due ~10 min', () => {
  const before = Date.now();
  const s = nextSrs({ box: 3, reps: 3, lapses: 0 }, false);
  assert.strictEqual(s.box, 0);
  assert.strictEqual(s.reps, 4);
  assert.strictEqual(s.lapses, 1);
  assert.strictEqual(s.lastResult, false);
  const expected = before + INTERVALS_MIN[0] * MIN; // 10 minutes
  assert.ok(Math.abs(s.dueAt.getTime() - expected) < 5000);
});

test('correct at box 5 stays at box 5', () => {
  const s = nextSrs({ box: 5, reps: 9, lapses: 2 }, true);
  assert.strictEqual(s.box, 5);
  assert.strictEqual(s.reps, 10);
  assert.strictEqual(s.lapses, 2);
});

test('nextSrs preserves and increments lapses across wrong answers', () => {
  const s = nextSrs({ box: 2, reps: 5, lapses: 3 }, false);
  assert.strictEqual(s.lapses, 4);
});
