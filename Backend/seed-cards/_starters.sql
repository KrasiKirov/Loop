-- Starter cards (2 each) for the patterns that don't yet have a full deck, so the
-- hub shows every pattern as drillable. Each VALUES row carries its own slug and is
-- joined to the matching pattern. Full decks for these come later.

INSERT INTO cards (pattern_id, format, prompt, code, answer1, answer2, answer3, answer4, correctanswer, explanation, rating)
SELECT p.id, v.format, v.prompt, v.code, v.a1, v.a2, v.a3, v.a4, v.correct, v.expl, v.rating
FROM (VALUES

-- Linked List
('linked-list','pattern_id','Which pattern detects whether a singly linked list has a cycle using O(1) extra space?',NULL,
 'Fast and slow pointers (Floyd''s)', 'Hashing every visited node', 'Reversing the list', 'Binary search',
 'Fast and slow pointers (Floyd''s)', 'A slow pointer moves one step and a fast pointer two; if they ever meet there is a cycle — O(1) space.', 1000),
('linked-list','crux','Reversing a singly linked list iteratively: inside the loop, after saving nxt = curr.next, you:',NULL,
 'set curr.next = prev, then prev = curr, curr = nxt', 'set prev.next = curr, then advance', 'set curr.next = nxt.next', 'swap the node values',
 'set curr.next = prev, then prev = curr, curr = nxt', 'You reverse the pointer (curr.next = prev) before advancing both pointers forward.', 1050),

-- Trees
('trees','pattern_id','Which traversal visits a binary tree level by level (top to bottom, left to right)?',NULL,
 'Breadth-first search with a queue', 'Depth-first preorder', 'Two pointers', 'Union-find',
 'Breadth-first search with a queue', 'BFS uses a queue to process each level before the next, giving level-order traversal.', 950),
('trees','crux','Searching a binary SEARCH tree, you move to the left child when the target is:',NULL,
 'less than the current node', 'greater than the current node', 'equal to the current node', 'a leaf',
 'less than the current node', 'BST invariant: left subtree holds smaller keys, so a smaller target means go left.', 850),

-- Tries
('tries','pattern_id','Which structure stores a dictionary to support fast prefix lookups (autocomplete)?',NULL,
 'A trie (prefix tree)', 'A hash set', 'A balanced BST', 'A min-heap',
 'A trie (prefix tree)', 'A trie shares common prefixes along paths, so prefix queries take time proportional to the prefix length.', 1050),
('tries','complexity','Searching for a word of length L in a trie takes:',NULL,
 'O(L)', 'O(n)', 'O(L log n)', 'O(1)',
 'O(L)', 'You follow one child per character, so the work is proportional to the word length, independent of how many words are stored.', 950),

-- Heap / Priority Queue
('heap','pattern_id','Which structure efficiently maintains the k largest elements seen in a stream?',NULL,
 'A min-heap of size k', 'A sorted array re-sorted each step', 'A hash map', 'A stack',
 'A min-heap of size k', 'Keep a size-k min-heap; each new element is pushed and the smallest popped — O(log k) per element.', 1100),
('heap','complexity','Pushing one element onto a binary heap of n elements takes:',NULL,
 'O(log n)', 'O(1)', 'O(n)', 'O(n log n)',
 'O(log n)', 'The element sifts up at most the height of the heap, which is log n.', 850),

-- Backtracking
('backtracking','pattern_id','Which technique generates all subsets (the power set) of a set?',NULL,
 'Backtracking (DFS over include/exclude choices)', 'Greedy selection', 'Two pointers', 'Binary search',
 'Backtracking (DFS over include/exclude choices)', 'Each element is either included or excluded; exploring both branches enumerates all 2^n subsets.', 1050),
('backtracking','crux','In backtracking, after exploring a choice you must ___ before trying the next choice:',NULL,
 'undo the choice (backtrack)', 'commit it permanently', 'sort the remaining input', 'memoize the result',
 'undo the choice (backtrack)', 'Removing the last choice restores state so sibling branches explore from the same starting point.', 1050),

-- Graphs
('graphs','pattern_id','Counting the number of connected components in an undirected graph is best done with:',NULL,
 'DFS/BFS flood fill or union-find', 'Binary search', 'A greedy sweep', 'Two pointers',
 'DFS/BFS flood fill or union-find', 'Each unvisited node starts a new component; flood-fill marks all nodes reachable from it.', 1050),
('graphs','crux','Breadth-first search explores using a ___, while depth-first search uses a ___ (or recursion):',NULL,
 'queue; stack', 'stack; queue', 'heap; queue', 'queue; heap',
 'queue; stack', 'BFS''s FIFO queue gives level order; DFS''s LIFO stack dives deep before backtracking.', 950),

-- Advanced Graphs
('advanced-graphs','pattern_id','Shortest path from a source in a weighted graph with non-negative edge weights:',NULL,
 'Dijkstra''s algorithm', 'Breadth-first search', 'Depth-first search', 'In-order traversal',
 'Dijkstra''s algorithm', 'Dijkstra greedily settles the closest unfinished node using a priority queue; plain BFS only works when edges are unweighted.', 1300),
('advanced-graphs','pattern_id','Ordering tasks in a DAG so every task comes before its dependents is called:',NULL,
 'Topological sort', 'Dijkstra''s algorithm', 'Union-find', 'Binary search',
 'Topological sort', 'A topological order (via DFS finish times or Kahn''s algorithm) lists vertices so all edges point forward.', 1200),

-- 1-D DP
('dp-1d','pattern_id','Maximum sum of a contiguous subarray that may contain negatives is solved by:',NULL,
 'Dynamic programming (Kadane''s algorithm)', 'A fixed sliding window', 'Two pointers', 'Binary search',
 'Dynamic programming (Kadane''s algorithm)', 'Kadane keeps the best subarray sum ending at each index: best = max(x, best + x).', 1100),
('dp-1d','crux','Climbing stairs taking 1 or 2 steps, the number of ways f(n) satisfies the recurrence:',NULL,
 'f(n) = f(n-1) + f(n-2)', 'f(n) = f(n-1) + 1', 'f(n) = 2 * f(n-1)', 'f(n) = f(n-1) * f(n-2)',
 'f(n) = f(n-1) + f(n-2)', 'The last move is a 1-step from n-1 or a 2-step from n-2, so the counts add (the Fibonacci recurrence).', 950),

-- 2-D DP
('dp-2d','pattern_id','The longest common subsequence of two strings is computed with:',NULL,
 '2-D dynamic programming over the two indices', 'Two pointers', 'A greedy scan', 'Hashing',
 '2-D dynamic programming over the two indices', 'A table dp[i][j] over prefixes of each string captures the overlapping subproblems.', 1250),
('dp-2d','complexity','Filling the DP table for edit distance between strings of lengths m and n takes:',NULL,
 'O(m * n)', 'O(m + n)', 'O(max(m, n))', 'O(2^n)',
 'O(m * n)', 'Every cell of the m-by-n table is computed once in O(1), so the total is O(m*n).', 1100),

-- Greedy
('greedy','pattern_id','Jump Game — from index 0 (arr[i] = max jump length), can you reach the last index? The optimal O(n) approach is:',NULL,
 'Greedy (track the farthest reachable index)', 'Binary search', 'Backtracking over all paths', 'Hashing',
 'Greedy (track the farthest reachable index)', 'Sweep left to right keeping the farthest index reachable so far; if an index exceeds it, you''re stuck.', 1150),
('greedy','crux','To select the maximum number of non-overlapping intervals, you greedily pick the interval that ends:',NULL,
 'earliest', 'latest', 'with the longest duration', 'with the shortest duration',
 'earliest', 'Choosing the earliest finishing interval leaves the most room for the rest — the classic activity-selection greedy.', 1050),

-- Intervals
('intervals','pattern_id','Merging all overlapping intervals is done by:',NULL,
 'Sorting by start time, then merging adjacent overlaps', 'Hashing the endpoints', 'Binary search on each interval', 'Backtracking',
 'Sorting by start time, then merging adjacent overlaps', 'After sorting by start, a new interval either extends the current merge or begins a fresh one.', 1050),
('intervals','crux','Given intervals [a,b] and [c,d] with a <= c, they overlap exactly when:',NULL,
 'c <= b', 'd <= b', 'c < a', 'b < c',
 'c <= b', 'Once sorted so a <= c, an overlap exists iff the second interval starts at or before the first one ends.', 1050),

-- Math & Geometry
('math-geometry','pattern_id','Rotating an n×n matrix 90 degrees clockwise in place is done by:',NULL,
 'Transposing the matrix, then reversing each row', 'Hashing each cell', 'Recursion on quadrants only', 'Binary search',
 'Transposing the matrix, then reversing each row', 'Transpose swaps across the diagonal; reversing each row then yields a clockwise 90-degree rotation.', 1150),
('math-geometry','pattern_id','Checking if an integer is a palindrome WITHOUT converting it to a string is done by:',NULL,
 'Reversing half its digits using mod and integer division', 'Hashing the digits', 'Sorting the digits', 'Binary search',
 'Reversing half its digits using mod and integer division', 'Build the reversed second half with %10 and /10 and compare it to the first half.', 1000),

-- Bit Manipulation
('bit-manipulation','pattern_id','In an array where every number appears twice except one, the single number is found by:',NULL,
 'XOR-ing all the elements together', 'Sorting then scanning', 'Counting in a hash map', 'Binary search',
 'XOR-ing all the elements together', 'XOR cancels equal pairs (x ^ x = 0) and leaves the unique value (x ^ 0 = x) in O(1) space.', 1050),
('bit-manipulation','crux','The expression x & (x - 1) computes:',NULL,
 'x with its lowest set bit cleared', 'x with its lowest bit set', 'the two''s complement of x', 'the number of set bits in x',
 'x with its lowest set bit cleared', 'Subtracting 1 flips the lowest set bit and the zeros below it; ANDing clears that lowest set bit — the basis of Brian Kernighan''s bit count.', 1100)

) AS v(slug, format, prompt, code, a1, a2, a3, a4, correct, expl, rating)
JOIN patterns p ON p.slug = v.slug;
