require('./setup');
const { test } = require('node:test');
const assert = require('node:assert');
const { resetDb, seedCard, pool } = require('./setup');

// These CHECK constraints are the schema's defence for the content pipeline:
// a malformed card should fail loudly at insert, not become a silently
// unanswerable or out-of-band question.

test('cards: correctanswer must be one of the four options', async () => {
  await resetDb();
  await assert.rejects(
    seedCard({ correctanswer: 'Not one of the options' }),
    /cards_correct_in_options|violates check constraint/i
  );
});

test('cards: rating must stay within the ELO band (700-2000)', async () => {
  await resetDb();
  await assert.rejects(seedCard({ rating: 5000 }), /cards_rating_band|violates check constraint/i);
  await assert.rejects(seedCard({ rating: 100 }), /cards_rating_band|violates check constraint/i);
});

test('cards: a well-formed card inserts cleanly', async () => {
  await resetDb();
  const id = await seedCard({ rating: 1500 });
  assert.ok(id);
});

test.after(() => pool.end());
