// Server-side Elo. The question's difficulty is its rating; correct = win.
const BASE_RATING = 1000;
const SCALE = 400;
const MIN_RATING = 100;

const expectedScore = (playerRating, questionRating) =>
  1 / (1 + Math.pow(10, (questionRating - playerRating) / SCALE));

const kFactor = (playerRating) => {
  if (playerRating < 1200) return 40;
  if (playerRating < 2000) return 24;
  return 16;
};

// result: 1 correct, 0 wrong. Returns an integer, floored at MIN_RATING.
const updateRatings = (currentElo, questionRating, result) => {
  const expected = expectedScore(currentElo, questionRating);
  const updated = currentElo + kFactor(currentElo) * ((result ? 1 : 0) - expected);
  return Math.max(MIN_RATING, Math.round(updated));
};

// The difficulty band of question scores to draw from, around the player's rating.
const getBounds = (difficulty, elo) => {
  const m = 0.2;
  switch (difficulty) {
    case 'easy':
      return { lower: elo - Math.round(elo * 2 * m), upper: elo };
    case 'medium':
      return { lower: Math.round(elo - elo * m), upper: Math.round(elo + elo * m) };
    case 'hard':
      return { lower: elo, upper: Math.round(elo + elo * m * 2) };
    default:
      return { lower: 0, upper: 100000 };
  }
};

module.exports = { BASE_RATING, expectedScore, kFactor, updateRatings, getBounds };
