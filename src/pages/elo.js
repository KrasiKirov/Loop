// elo.js
export const updateRatings = (currentElo, questionScore, result, questionDifficulty) => {
  const kFactor = 32; // Basic K-factor, can be dynamic based on user's ELO or other factors
  const expectedScore = 1 / (1 + Math.pow(10, (questionScore - currentElo) / 400));
  const actualScore = result ? 1 : 0;
  const difficultyBonus = getDifficultyBonus(questionDifficulty);

  return currentElo + kFactor * (actualScore - expectedScore) + difficultyBonus;
};

const getDifficultyBonus = (difficulty) => {
  switch (difficulty) {
    case 'easy':
      return 0; // Less ELO for easy questions
    case 'medium':
      return 5; // Neutral for medium questions
    case 'hard':
      return 10; // Bonus ELO for hard questions
    default:
      return 0;
  }
};
