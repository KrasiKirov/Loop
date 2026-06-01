// elo.js — Standard Elo rating update.
//
// Implements the classic Elo system used in chess (FIDE/USCF):
//   expected = 1 / (1 + 10^((opponentRating - playerRating) / 400))
//   newRating = playerRating + K * (actual - expected)
//
// The question itself is the "opponent": its difficulty IS its rating, so there
// are no arbitrary bonuses. Answering correctly is a win (actual = 1), wrong is
// a loss (actual = 0). The result is floored so a rating can never go negative.

export const BASE_RATING = 1000;   // Starting rating for a new player.
const SCALE = 400;                 // Rating gap for 10:1 expected odds (chess standard).
const MIN_RATING = 100;            // Ratings stay comfortably positive.

// Probability that a player beats a question, on the standard logistic curve.
export const expectedScore = (playerRating, questionRating) =>
  1 / (1 + Math.pow(10, (questionRating - playerRating) / SCALE));

// K-factor — how far a single result can move a rating.
// Mirrors FIDE/USCF: provisional players move fast, established players are stable.
export const kFactor = (playerRating) => {
  if (playerRating < 1200) return 40;  // provisional — quick convergence
  if (playerRating < 2000) return 24;  // developing
  return 16;                           // established — stable
};

// Returns the player's new rating after answering a question.
// result: 1 for correct, 0 for incorrect.
export const updateRatings = (currentElo, questionRating, result) => {
  const expected = expectedScore(currentElo, questionRating);
  const actual = result ? 1 : 0;
  const updated = currentElo + kFactor(currentElo) * (actual - expected);
  return Math.max(MIN_RATING, Math.round(updated));
};
