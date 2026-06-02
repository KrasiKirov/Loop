-- Sliding Window — first content deck (~25 cards across the 4 drill formats).
-- pattern_id is resolved from the slug; CHECK constraints enforce that
-- correctanswer is one of the options and rating stays in the 700-2000 band.
-- Stored correct answer is always answer1; the API shuffles answers per serve.

INSERT INTO cards (pattern_id, format, prompt, code, answer1, answer2, answer3, answer4, correctanswer, explanation, rating)
SELECT p.id, v.format, v.prompt, v.code, v.a1, v.a2, v.a3, v.a4, v.correct, v.expl, v.rating
FROM patterns p
CROSS JOIN (VALUES

-- ===== Pattern identification (8) =====
('pattern_id',
 'Which algorithmic pattern best solves: "Find the maximum sum of any contiguous subarray of size k"?',
 NULL::text,
 'Fixed-size sliding window', 'Two pointers', 'Kadane''s algorithm (dynamic programming)', 'Prefix sums with binary search',
 'Fixed-size sliding window',
 'A fixed contiguous range of size k slides across the array, adding the entering element and dropping the one that falls out — O(n) in one pass.',
 760),

('pattern_id',
 'Which pattern computes the average of every contiguous subarray of size k in a single pass?',
 NULL,
 'Fixed-size sliding window', 'Prefix sums only', 'Hashing', 'Backtracking',
 'Fixed-size sliding window',
 'Keep a running window sum; each step add the entering element and subtract the leaving one, then divide by k.',
 800),

('pattern_id',
 'Which pattern solves: "Longest substring with at most K distinct characters"?',
 NULL,
 'Variable-size sliding window with a hash map', 'Two pointers on the sorted string', 'Dynamic programming over substrings', 'A trie of substrings',
 'Variable-size sliding window with a hash map',
 'Grow the window on the right; when the map exceeds K distinct keys, shrink from the left until it is valid again.',
 1050),

('pattern_id',
 'Which pattern solves: "Longest substring without repeating characters"?',
 NULL,
 'Variable-size sliding window', 'Hashing alone', 'Two pointers on sorted input', 'Dynamic programming on substrings',
 'Variable-size sliding window',
 'A window grows while characters stay unique and shrinks from the left when a repeat enters; the hash map is a tool inside the window, not the pattern.',
 1100),

('pattern_id',
 'Which pattern solves: "Does string s2 contain any permutation of string s1?"',
 NULL,
 'Fixed-size window (length of s1) with character counts', 'Generate every permutation of s1 and search', 'Sort each window and compare', 'Backtracking over s2',
 'Fixed-size window (length of s1) with character counts',
 'Slide a window of length |s1| over s2 and compare frequency counts; generating permutations is exponential and unnecessary.',
 1200),

('pattern_id',
 'For "smallest subarray with sum >= target" where all elements are positive, the optimal O(n) approach uses:',
 NULL,
 'A variable-size sliding window', 'Binary search on prefix sums', 'A monotonic deque', 'Divide and conquer',
 'A variable-size sliding window',
 'Because all elements are positive the window sum is monotonic, so you can greedily shrink from the left in O(n). (Binary search on prefix sums also works but is O(n log n).)',
 1550),

('pattern_id',
 'Which pattern solves: "Longest subarray with sum exactly k" when the array can contain negative numbers?',
 NULL,
 'Prefix sums with a hash map', 'A sliding window', 'Two pointers', 'Greedy expansion',
 'Prefix sums with a hash map',
 'Negatives break the monotonicity a sliding window relies on; store the earliest index of each prefix sum and look up prefix - k.',
 1650),

('pattern_id',
 'Which pattern finds all start indices of anagrams of a pattern p within a text s?',
 NULL,
 'Fixed-size sliding window with a frequency count', 'Sort s then binary search', 'Recursion with memoization', 'A stack',
 'Fixed-size sliding window with a frequency count',
 'Slide a window of length |p| across s, maintaining character counts, and record each index where the counts match p.',
 900),

-- ===== Crux step (6) =====
('crux',
 'In the optimal "longest substring without repeating characters", when the current character was last seen at index j, how do you update the left pointer?',
 NULL,
 'left = max(left, j + 1)', 'left = j + 1', 'left = left + 1', 'left = j',
 'left = max(left, j + 1)',
 'The max guard stops left from moving backward when an earlier duplicate has already advanced it past j.',
 1100),

('crux',
 'In minimum-window-substring, you shrink the window from the left while:',
 NULL,
 'the window is valid (contains all required characters)', 'the window is longer than the best found so far', 'the right pointer has not reached the end', 'on every iteration',
 'the window is valid (contains all required characters)',
 'You contract only while the window still satisfies the requirement, recording the smallest valid window as you go.',
 1250),

('crux',
 'In "longest substring with at most K distinct characters", when you move the left pointer you decrement that character''s count and remove it from the map:',
 NULL,
 'only when its count drops to 0', 'on every left-pointer move', 'only when it is unique in the whole string', 'never — leave it in the map',
 'only when its count drops to 0',
 'The distinct count must reflect characters actually present, so a key is removed exactly when its in-window count reaches zero.',
 1450),

('crux',
 'To count subarrays with exactly K distinct integers using an at-most helper, you compute:',
 NULL,
 'atMost(K) - atMost(K - 1)', 'atMost(K) - atMost(K + 1)', 'atMost(K) / 2', 'a single direct pass',
 'atMost(K) - atMost(K - 1)',
 'Subarrays with at most K minus those with at most K-1 leaves exactly those with precisely K distinct values.',
 1600),

('crux',
 'For a fixed window of size k with a running sum, how do you advance the window by one position?',
 NULL,
 'add arr[right] and subtract arr[right - k]', 'add arr[right] only', 'subtract arr[left] and recompute the sum', 'recompute the sum over all k elements',
 'add arr[right] and subtract arr[right - k]',
 'Adding the entering element and removing the one k positions back keeps each update O(1).',
 1150),

('crux',
 'In the optimal longest-substring-without-repeats, why use max(left, last[c] + 1) rather than just last[c] + 1?',
 NULL,
 'An earlier duplicate may have already moved left past last[c], and left must never move backward', 'last[c] + 1 can exceed the string length', 'The character might not be in the window', 'It avoids an off-by-one at the end of the string',
 'An earlier duplicate may have already moved left past last[c], and left must never move backward',
 'last[c] can be a stale index from before the current window; without max, left would jump backward and admit repeats.',
 1300),

-- ===== Complexity (5) =====
('complexity',
 'A variable-size sliding window scans n elements; each of the two pointers only advances and never resets. Total time complexity?',
 NULL,
 'O(n)', 'O(n^2)', 'O(n log n)', 'O(k * n)',
 'O(n)',
 'Each element is added once and removed at most once, so the pointers do O(n) total work — amortized linear.',
 800),

('complexity',
 'In "longest substring with at most K distinct characters", the auxiliary space for the hash map, in terms of K, is:',
 NULL,
 'O(K)', 'O(n)', 'O(n * K)', 'O(log K)',
 'O(K)',
 'The map holds at most K+1 distinct characters at any moment, so space is O(K).',
 1100),

('complexity',
 'Permutation-in-string is solved with a fixed window plus two 26-length frequency arrays compared each step. Time for a text of length n?',
 NULL,
 'O(n)', 'O(n * m)', 'O(n log n)', 'O(n^2)',
 'O(n)',
 'Comparing two fixed 26-element arrays is O(1) per step, so the scan is O(n); O(n*m) is the naive sort-each-window approach.',
 1150),

('complexity',
 'Longest-substring-without-repeating-characters using a hash map of last-seen indices over a string of length n. Worst-case time?',
 NULL,
 'O(n)', 'O(n^2)', 'O(n log n)', 'O(26 * n^2)',
 'O(n)',
 'Both pointers only move forward across the string, giving linear time regardless of alphabet size.',
 950),

('complexity',
 'Maximum-sum subarray of fixed size k computed by sliding a running sum. Time and extra space?',
 NULL,
 'O(n) time, O(1) space', 'O(n * k) time, O(1) space', 'O(n) time, O(k) space', 'O(n log n) time, O(n) space',
 'O(n) time, O(1) space',
 'One pass with a single running-sum variable — linear time and constant extra space.',
 1050),

-- ===== Bug / predict-output (6) =====
('bug',
 'For s = "abcabcbb", what is the length of the longest substring without repeating characters?',
 NULL,
 '3', '7', '8', '2',
 '3',
 'The longest such substrings are "abc", "bca", and "cab", each of length 3.',
 780),

('bug',
 'For s = "pwwkew", what is the length of the longest substring without repeating characters?',
 NULL,
 '3', '4', '2', '5',
 '3',
 'The answer is "wke" of length 3; "pwke" is not contiguous and "pww" repeats w.',
 820),

('bug',
 'This fixed-window (size k) maximum-sum routine has a bug. What is it?',
 'best = 0
windowSum = 0
for i in range(len(arr)):
    windowSum += arr[i]
    if i > k:
        windowSum -= arr[i - k]
    if i >= k - 1:
        best = max(best, windowSum)',
 'The shrink condition should be i >= k; as written the window holds k + 1 elements', 'best should be initialized to negative infinity', 'windowSum should be reset to 0 each iteration', 'There is no bug',
 'The shrink condition should be i >= k; as written the window holds k + 1 elements',
 'With i > k the subtraction happens one step too late, so the window spans k+1 elements and the sums are wrong.',
 1100),

('bug',
 'This longest-substring-without-repeating-characters routine has a subtle bug. On s = "abba", what does it return?',
 'left = 0
best = 0
last = {}
for right, c in enumerate(s):
    if c in last:
        left = last[c] + 1
    last[c] = right
    best = max(best, right - left + 1)',
 '3 (wrong; the answer is 2 — left can move backward, so it needs max(left, last[c] + 1))', '2 (correct)', '4', '1',
 '3 (wrong; the answer is 2 — left can move backward, so it needs max(left, last[c] + 1))',
 'At the final a, last[a] = 0 resets left to 1 even though left was already 2, admitting a repeat and overcounting to 3.',
 1500),

('bug',
 'A variable window for "at most K distinct" decrements the leftmost character''s frequency when moving left but never deletes the key when its count reaches 0. What goes wrong?',
 NULL,
 'The distinct-character count stays too high, so valid windows are rejected and the answer is too small', 'It runs in O(n^2) time', 'It returns a window that is too long', 'Nothing — the map size does not matter',
 'The distinct-character count stays too high, so valid windows are rejected and the answer is too small',
 'Stale zero-count keys inflate the distinct count, so the window shrinks more than necessary and misses longer valid substrings.',
 1250),

('bug',
 'For the array [2, 1, 5, 1, 3, 2], what is the maximum sum of a contiguous subarray of size 3?',
 NULL,
 '9', '8', '11', '6',
 '9',
 'The size-3 windows sum to 8, 7, 9, and 6; the maximum is [5, 1, 3] = 9.',
 1350)

) AS v(format, prompt, code, a1, a2, a3, a4, correct, expl, rating)
WHERE p.slug = 'sliding-window';
