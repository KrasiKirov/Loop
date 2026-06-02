// Spaced repetition (Leitner boxes). The retention engine.
// Box -> interval (minutes from the review time):
//   box 0 -> 10m, 1 -> 1d, 2 -> 3d, 3 -> 7d, 4 -> 16d, 5 -> 35d.
const INTERVALS_MIN = [10, 1440, 4320, 10080, 23040, 50400];

// Compute the next SRS state given the previous row (or null) and the result.
// Correct promotes a box (capped at 5); wrong demotes to box 0. Due date is
// always now + the new box's interval. reps always increments; lapses counts wrongs.
function nextSrs(prev, correct) {
  const box = correct ? Math.min((prev?.box ?? 0) + 1, 5) : 0;
  const dueAt = new Date(Date.now() + INTERVALS_MIN[box] * 60_000);
  return {
    box,
    dueAt,
    reps: (prev?.reps ?? 0) + 1,
    lapses: (prev?.lapses ?? 0) + (correct ? 0 : 1),
    lastResult: correct,
  };
}

module.exports = { nextSrs, INTERVALS_MIN };
