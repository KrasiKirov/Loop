require('./setup');
const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { resetDb, seedCard, pool } = require('./setup');
const app = require('../server');

const ZERO_UUID = '00000000-0000-0000-0000-000000000000';

async function signup(username) {
  const res = await request(app)
    .post('/auth/signup')
    .send({ name: username, username, password: 'pw' });
  return res.body.accessToken;
}

// Seed `count` sliding-window cards (known correct answer 'Sliding Window').
async function seedCards(count, over = {}) {
  const ids = [];
  for (let i = 0; i < count; i++) ids.push(await seedCard(over));
  return ids;
}

// Fetch /play and build the answers array, picking the chosen string per card.
// `pick(card)` returns the selectedAnswer string to submit (default: correct).
async function answersFor(token, duelId, pick = () => 'Sliding Window', ms = () => 1000) {
  const play = await request(app)
    .get(`/duels/${duelId}/play`)
    .set('Authorization', `Bearer ${token}`);
  return {
    play,
    body: {
      answers: play.body.cards.map((c) => ({
        cardId: c.id,
        selectedAnswer: pick(c),
        ms: ms(c),
      })),
    },
  };
}

test('ghost duel: create, play hides answer keys, submit grades + resolves + rates', async () => {
  await resetDb();
  const t = await signup('ghoster');
  await seedCards(6);

  const create = await request(app)
    .post('/duels')
    .set('Authorization', `Bearer ${t}`)
    .send({ patternSlug: 'sliding-window', size: 6 });
  assert.strictEqual(create.status, 200);
  assert.ok(create.body.id);
  assert.strictEqual(create.body.shareUrl, `/duel/${create.body.id}`);
  const duelId = create.body.id;

  const play = await request(app)
    .get(`/duels/${duelId}/play`)
    .set('Authorization', `Bearer ${t}`);
  assert.strictEqual(play.status, 200);
  assert.strictEqual(play.body.duel.isGhost, true);
  assert.strictEqual(play.body.duel.opponent, 'Ghost');
  assert.strictEqual(play.body.cards.length, 6);
  assert.strictEqual(play.body.alreadySubmitted, false);
  for (const c of play.body.cards) {
    assert.strictEqual(c.answers.length, 4);
    assert.strictEqual(c.correctanswer, undefined);
    assert.strictEqual(c.explanation, undefined);
  }

  const { body } = await answersFor(t, duelId);
  const submit = await request(app)
    .post(`/duels/${duelId}/submit`)
    .set('Authorization', `Bearer ${t}`)
    .send(body);
  assert.strictEqual(submit.status, 200);
  assert.strictEqual(submit.body.status, 'complete');
  assert.strictEqual(submit.body.yourScore.numCorrect, 6);
  assert.ok(submit.body.result);
  assert.strictEqual(submit.body.result.opponent.name, 'Ghost');
  assert.ok(['win', 'loss', 'draw'].includes(submit.body.result.outcome));

  // overall rating row exists and moved off BASE_RATING.
  const rq = await pool.query(
    "SELECT rating FROM user_ratings WHERE subject = 'overall'"
  );
  assert.strictEqual(rq.rows.length, 1);
  assert.notStrictEqual(rq.rows[0].rating, 1000);
  assert.strictEqual(rq.rows[0].rating, 1000 + submit.body.result.you.ratingDelta);
});

test('ghost duel: re-submitting returns 409 and does not double-rate', async () => {
  await resetDb();
  const t = await signup('ghoster2');
  await seedCards(6);
  const create = await request(app)
    .post('/duels')
    .set('Authorization', `Bearer ${t}`)
    .send({ size: 6 });
  const duelId = create.body.id;

  const { body } = await answersFor(t, duelId);
  await request(app)
    .post(`/duels/${duelId}/submit`)
    .set('Authorization', `Bearer ${t}`)
    .send(body);
  const ratingAfterFirst = (
    await pool.query("SELECT rating FROM user_ratings WHERE subject = 'overall'")
  ).rows[0].rating;

  const again = await request(app)
    .post(`/duels/${duelId}/submit`)
    .set('Authorization', `Bearer ${t}`)
    .send(body);
  assert.strictEqual(again.status, 409);

  const ratingAfterSecond = (
    await pool.query("SELECT rating FROM user_ratings WHERE subject = 'overall'")
  ).rows[0].rating;
  assert.strictEqual(ratingAfterSecond, ratingAfterFirst);

  // exactly one human result row.
  const cnt = await pool.query(
    'SELECT count(*)::int AS n FROM duel_results WHERE duel_id = $1',
    [duelId]
  );
  assert.strictEqual(cnt.rows[0].n, 1);
});

test('ghost duel: /play after completion sets alreadySubmitted true', async () => {
  await resetDb();
  const t = await signup('ghoster3');
  await seedCards(6);
  const create = await request(app)
    .post('/duels')
    .set('Authorization', `Bearer ${t}`)
    .send({ size: 6 });
  const duelId = create.body.id;
  const { body } = await answersFor(t, duelId);
  await request(app)
    .post(`/duels/${duelId}/submit`)
    .set('Authorization', `Bearer ${t}`)
    .send(body);

  const play = await request(app)
    .get(`/duels/${duelId}/play`)
    .set('Authorization', `Bearer ${t}`);
  assert.strictEqual(play.body.alreadySubmitted, true);
  assert.strictEqual(play.body.cards.length, 6);
});

test('real duel: pending until both submit, higher score wins, ratings diverge', async () => {
  await resetDb();
  const ta = await signup('alice');
  const tb = await signup('bob');
  await seedCards(6);

  const create = await request(app)
    .post('/duels')
    .set('Authorization', `Bearer ${ta}`)
    .send({ patternSlug: 'sliding-window', size: 6, opponentUsername: 'bob' });
  assert.strictEqual(create.status, 200);
  const duelId = create.body.id;

  // A answers all 6 correct.
  const aAns = await answersFor(ta, duelId);
  const aSub = await request(app)
    .post(`/duels/${duelId}/submit`)
    .set('Authorization', `Bearer ${ta}`)
    .send(aAns.body);
  assert.strictEqual(aSub.status, 200);
  assert.strictEqual(aSub.body.status, 'pending');
  assert.strictEqual(aSub.body.result, undefined);

  // Mid-duel summary is pending.
  const mid = await request(app).get(`/duels/${duelId}`).set('Authorization', `Bearer ${ta}`);
  assert.strictEqual(mid.body.status, 'pending');

  // B answers all 6 wrong → A must win.
  const bAns = await answersFor(tb, duelId, () => 'Greedy');
  const bSub = await request(app)
    .post(`/duels/${duelId}/submit`)
    .set('Authorization', `Bearer ${tb}`)
    .send(bAns.body);
  assert.strictEqual(bSub.status, 200);
  assert.strictEqual(bSub.body.status, 'complete');
  // From B's perspective B lost.
  assert.strictEqual(bSub.body.result.outcome, 'loss');
  assert.ok(bSub.body.result.you.ratingDelta < 0);

  // Overall ratings moved in opposite directions.
  const aR = (
    await pool.query(
      "SELECT ur.rating FROM user_ratings ur JOIN users u ON u.id = ur.user_id WHERE u.username = 'alice' AND ur.subject = 'overall'"
    )
  ).rows[0].rating;
  const bR = (
    await pool.query(
      "SELECT ur.rating FROM user_ratings ur JOIN users u ON u.id = ur.user_id WHERE u.username = 'bob' AND ur.subject = 'overall'"
    )
  ).rows[0].rating;
  assert.ok(aR > 1000, 'winner alice gained');
  assert.ok(bR < 1000, 'loser bob lost');

  // Summary winner correctness from each side.
  const aSummary = await request(app)
    .get(`/duels/${duelId}`)
    .set('Authorization', `Bearer ${ta}`);
  assert.strictEqual(aSummary.body.status, 'complete');
  assert.strictEqual(aSummary.body.you.numCorrect, 6);
  assert.strictEqual(aSummary.body.opponent.numCorrect, 0);
  assert.strictEqual(aSummary.body.winner, 'you');

  const bSummary = await request(app)
    .get(`/duels/${duelId}`)
    .set('Authorization', `Bearer ${tb}`);
  assert.strictEqual(bSummary.body.winner, 'alice');
});

test('real duel: tie on correct broken by lower totalMs', async () => {
  await resetDb();
  const ta = await signup('cara');
  const tb = await signup('dan');
  await seedCards(4);
  const create = await request(app)
    .post('/duels')
    .set('Authorization', `Bearer ${ta}`)
    .send({ size: 4, opponentUsername: 'dan' });
  const duelId = create.body.id;

  // Both all-correct, but A is faster (ms 500 vs 2000).
  const aAns = await answersFor(ta, duelId, () => 'Sliding Window', () => 500);
  await request(app)
    .post(`/duels/${duelId}/submit`)
    .set('Authorization', `Bearer ${ta}`)
    .send(aAns.body);
  const bAns = await answersFor(tb, duelId, () => 'Sliding Window', () => 2000);
  const bSub = await request(app)
    .post(`/duels/${duelId}/submit`)
    .set('Authorization', `Bearer ${tb}`)
    .send(bAns.body);
  assert.strictEqual(bSub.body.result.outcome, 'loss');

  const aSummary = await request(app)
    .get(`/duels/${duelId}`)
    .set('Authorization', `Bearer ${ta}`);
  assert.strictEqual(aSummary.body.winner, 'you');
});

test('participant-only: a third user 404s on /play and /submit', async () => {
  await resetDb();
  const ta = await signup('owner');
  await signup('partner');
  const tc = await signup('intruder');
  await seedCards(5);
  const create = await request(app)
    .post('/duels')
    .set('Authorization', `Bearer ${ta}`)
    .send({ size: 5, opponentUsername: 'partner' });
  const duelId = create.body.id;

  const play = await request(app)
    .get(`/duels/${duelId}/play`)
    .set('Authorization', `Bearer ${tc}`);
  assert.strictEqual(play.status, 404);

  const submit = await request(app)
    .post(`/duels/${duelId}/submit`)
    .set('Authorization', `Bearer ${tc}`)
    .send({ answers: [] });
  assert.strictEqual(submit.status, 404);
});

test('validation: size clamps to 3..10', async () => {
  await resetDb();
  const t = await signup('clamper');
  await seedCards(12);

  const big = await request(app)
    .post('/duels')
    .set('Authorization', `Bearer ${t}`)
    .send({ size: 99 });
  assert.strictEqual(big.status, 200);
  const bigPlay = await request(app)
    .get(`/duels/${big.body.id}/play`)
    .set('Authorization', `Bearer ${t}`);
  assert.strictEqual(bigPlay.body.cards.length, 10);

  const small = await request(app)
    .post('/duels')
    .set('Authorization', `Bearer ${t}`)
    .send({ size: 1 });
  const smallPlay = await request(app)
    .get(`/duels/${small.body.id}/play`)
    .set('Authorization', `Bearer ${t}`);
  assert.strictEqual(smallPlay.body.cards.length, 3);
});

test('validation: not enough cards → 400', async () => {
  await resetDb();
  const t = await signup('sparse');
  await seedCards(2);
  const res = await request(app)
    .post('/duels')
    .set('Authorization', `Bearer ${t}`)
    .send({ size: 5 });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.error, 'not enough cards');
});

test('validation: unknown opponentUsername → 404', async () => {
  await resetDb();
  const t = await signup('lonely');
  await seedCards(5);
  const res = await request(app)
    .post('/duels')
    .set('Authorization', `Bearer ${t}`)
    .send({ size: 5, opponentUsername: 'nobody' });
  assert.strictEqual(res.status, 404);
});

test('validation: self-duel → 400', async () => {
  await resetDb();
  const t = await signup('narcissus');
  await seedCards(5);
  const res = await request(app)
    .post('/duels')
    .set('Authorization', `Bearer ${t}`)
    .send({ size: 5, opponentUsername: 'narcissus' });
  assert.strictEqual(res.status, 400);
});

test('validation: invalid patternSlug → 400', async () => {
  await resetDb();
  const t = await signup('badpat');
  await seedCards(5);
  const res = await request(app)
    .post('/duels')
    .set('Authorization', `Bearer ${t}`)
    .send({ patternSlug: 'not-a-pattern', size: 5 });
  assert.strictEqual(res.status, 400);
});

test('expired duel → 410 on submit', async () => {
  await resetDb();
  const ta = await signup('expA');
  await signup('expB');
  await seedCards(5);
  const create = await request(app)
    .post('/duels')
    .set('Authorization', `Bearer ${ta}`)
    .send({ size: 5, opponentUsername: 'expB' });
  const duelId = create.body.id;
  await pool.query("UPDATE duels SET expires_at = now() - interval '1 day' WHERE id = $1", [
    duelId,
  ]);
  const { body } = await answersFor(ta, duelId);
  const res = await request(app)
    .post(`/duels/${duelId}/submit`)
    .set('Authorization', `Bearer ${ta}`)
    .send(body);
  assert.strictEqual(res.status, 410);
});

test('/duels/mine lists newest first with opponent label', async () => {
  await resetDb();
  const ta = await signup('listerA');
  await signup('listerB');
  await seedCards(5);
  await request(app).post('/duels').set('Authorization', `Bearer ${ta}`).send({ size: 5 });
  const second = await request(app)
    .post('/duels')
    .set('Authorization', `Bearer ${ta}`)
    .send({ size: 5, opponentUsername: 'listerB' });

  const mine = await request(app).get('/duels/mine').set('Authorization', `Bearer ${ta}`);
  assert.strictEqual(mine.status, 200);
  assert.strictEqual(mine.body.length, 2);
  // newest first → the real duel created second comes first.
  assert.strictEqual(mine.body[0].id, second.body.id);
  assert.strictEqual(mine.body[0].opponent, 'listerB');
  assert.strictEqual(mine.body[1].opponent, 'Ghost');
});

test('requires a token', async () => {
  await resetDb();
  const res = await request(app).post('/duels').send({ size: 5 });
  assert.strictEqual(res.status, 401);
  const m = await request(app).get('/duels/mine');
  assert.strictEqual(m.status, 401);
  const p = await request(app).get(`/duels/${ZERO_UUID}/play`);
  assert.strictEqual(p.status, 401);
});
