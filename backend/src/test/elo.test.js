const { test } = require('node:test');
const assert = require('node:assert');
const { BASE_RATING, updateRatings, getBounds } = require('../elo');

test('BASE_RATING is 1000', () => {
  assert.strictEqual(BASE_RATING, 1000);
});

test('a correct answer raises the rating, wrong lowers it', () => {
  const up = updateRatings(1000, 1000, 1);
  const down = updateRatings(1000, 1000, 0);
  assert.ok(up > 1000);
  assert.ok(down < 1000);
  assert.strictEqual(up, Math.round(up)); // integer
});

test('rating never drops below the floor of 100', () => {
  assert.ok(updateRatings(100, 3000, 0) >= 100);
});

test('getBounds widens by difficulty around the rating', () => {
  const easy = getBounds('easy', 1000);
  const hard = getBounds('hard', 1000);
  assert.ok(easy.upper <= 1000);
  assert.ok(hard.lower >= 1000);
});
