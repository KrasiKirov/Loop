// Subjects are stored as compact PascalCase keys ("LinearAlgebra") that double as
// DB table names. This turns a key into a human label ("Linear Algebra") for display.
// Splitting on lower→upper and letter→digit boundaries covers every current subject;
// single-word names ("Calculus", "Anatomy") pass through unchanged.
export const subjectLabel = (key = '') =>
  String(key)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])([0-9])/g, '$1 $2');

export default subjectLabel;
