// Patterns are stored as kebab-case slugs ("sliding-window"). This humanizes a
// slug into a display label ("Sliding Window") for screens that only have the slug.
export const patternLabel = (slug = '') =>
  String(slug)
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

// The four drill formats, with the label a learner sees.
export const FORMAT_LABELS = {
  pattern_id: 'Identify the pattern',
  crux: 'Crux step',
  complexity: 'Complexity',
  bug: 'Spot the bug',
};

export const formatLabel = (format) => FORMAT_LABELS[format] || format;
