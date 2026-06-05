// The full Blind-75 / NeetCode pattern taxonomy.
// Each entry: { slug, name, blurb, sort_order } (sort_order 1..18).
// Seeded into the `patterns` table (see schema.sql) and used to validate
// pattern slugs across the card/duel/rating APIs.
const PATTERNS = [
  {
    slug: 'arrays-hashing',
    name: 'Arrays & Hashing',
    blurb: 'Use hash maps and sets to trade space for O(1) lookups over arrays.',
    sort_order: 1,
  },
  {
    slug: 'two-pointers',
    name: 'Two Pointers',
    blurb: 'Converge or chase indices through a sequence to avoid nested scans.',
    sort_order: 2,
  },
  {
    slug: 'sliding-window',
    name: 'Sliding Window',
    blurb: 'Maintain a moving subrange to answer contiguous-subarray questions in one pass.',
    sort_order: 3,
  },
  {
    slug: 'stack',
    name: 'Stack',
    blurb: 'Push and pop to track nesting, order, and the most recent unmatched element.',
    sort_order: 4,
  },
  {
    slug: 'binary-search',
    name: 'Binary Search',
    blurb: 'Halve a sorted or monotonic search space to reach answers in O(log n).',
    sort_order: 5,
  },
  {
    slug: 'linked-list',
    name: 'Linked List',
    blurb: 'Manipulate node pointers for traversal, reversal, and cycle detection.',
    sort_order: 6,
  },
  {
    slug: 'trees',
    name: 'Trees',
    blurb: 'Recurse over binary and BST structures with DFS and BFS traversals.',
    sort_order: 7,
  },
  {
    slug: 'tries',
    name: 'Tries',
    blurb: 'Store strings as a prefix tree for fast word and prefix lookups.',
    sort_order: 8,
  },
  {
    slug: 'heap',
    name: 'Heap & Priority Queue',
    blurb: 'Keep the top-k or running min/max with a binary heap in O(log n) pushes.',
    sort_order: 9,
  },
  {
    slug: 'backtracking',
    name: 'Backtracking',
    blurb: 'Explore the decision tree of permutations, subsets, and combinations, pruning dead ends.',
    sort_order: 10,
  },
  {
    slug: 'graphs',
    name: 'Graphs',
    blurb: 'Model relationships and search them with BFS, DFS, and union-find.',
    sort_order: 11,
  },
  {
    slug: 'advanced-graphs',
    name: 'Advanced Graphs',
    blurb: 'Dijkstra, topological sort, MST, and other weighted or ordered graph algorithms.',
    sort_order: 12,
  },
  {
    slug: 'dp-1d',
    name: '1-D Dynamic Programming',
    blurb: 'Build answers from overlapping subproblems along a single dimension.',
    sort_order: 13,
  },
  {
    slug: 'dp-2d',
    name: '2-D Dynamic Programming',
    blurb: 'Fill a grid of subproblem results for two-sequence or matrix DP.',
    sort_order: 14,
  },
  {
    slug: 'greedy',
    name: 'Greedy',
    blurb: 'Make the locally optimal choice when it provably yields a global optimum.',
    sort_order: 15,
  },
  {
    slug: 'intervals',
    name: 'Intervals',
    blurb: 'Sort by endpoints to merge, insert, and detect overlapping ranges.',
    sort_order: 16,
  },
  {
    slug: 'math-geometry',
    name: 'Math & Geometry',
    blurb: 'Apply number theory and coordinate reasoning to matrix and math problems.',
    sort_order: 17,
  },
  {
    slug: 'bit-manipulation',
    name: 'Bit Manipulation',
    blurb: 'Use XOR, masks, and shifts to compute on the binary representation directly.',
    sort_order: 18,
  },
];

const VALID_PATTERN_SLUGS = PATTERNS.map((p) => p.slug);

module.exports = { PATTERNS, VALID_PATTERN_SLUGS };
