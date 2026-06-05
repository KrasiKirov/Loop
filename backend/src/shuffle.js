// Fisher-Yates shuffle (returns a new array). Cards are stored with a strong
// "correct option first" bias from generation; shuffling per serve removes any
// positional tell so the slot a user clicks carries no information.
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

module.exports = { shuffle };
