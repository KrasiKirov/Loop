// elo.js

export function expectedOutcome(ratingUser, ratingQuestion) {
  return 1 / (1 + Math.pow(10, (ratingQuestion - ratingUser) / 400));
}

export function updateRatings(ratingUser, ratingQuestion, outcomeUser) {
  const kFactor = 16;
  const expectedUser = expectedOutcome(ratingUser, ratingQuestion);
  const expectedQuestion = 1 - expectedUser;

  // Calculate the new ratings
  let newRatingUser = ratingUser + kFactor * (outcomeUser - expectedUser);
  const newRatingQuestion = ratingQuestion + kFactor * ((1 - outcomeUser) - expectedQuestion);

  // Set a minimum ELO (e.g., 0)
  newRatingUser = Math.max(newRatingUser, 0);

  return newRatingUser;
}
