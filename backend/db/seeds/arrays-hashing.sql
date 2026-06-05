-- Arrays & Hashing — content deck (~25 cards across the 4 drill formats).
-- pattern_id is resolved from the slug; CHECK constraints enforce that
-- correctanswer is one of the options and rating stays in the 700-2000 band.
-- Stored correct answer is always answer1; the API shuffles answers per serve.

INSERT INTO cards (pattern_id, format, prompt, code, answer1, answer2, answer3, answer4, correctanswer, explanation, rating)
SELECT p.id, v.format, v.prompt, v.code, v.a1, v.a2, v.a3, v.a4, v.correct, v.expl, v.rating
FROM patterns p
CROSS JOIN (VALUES

-- ===== Pattern identification (8) =====
('pattern_id',
 'Which pattern solves: "Return whether any value appears at least twice in an array"?',
 NULL::text,
 'Hashing — insert into a set and report a collision', 'Two pointers on the array', 'Fixed-size sliding window', 'Binary search',
 'Hashing — insert into a set and report a collision',
 'A hash set gives O(1) membership: scan once, and the first value already present is a duplicate — O(n) time without touching the original order.',
 720),

('pattern_id',
 'Which pattern solves "Two Sum" — return indices of the two numbers that add to a target — on an UNSORTED array in O(n)?',
 NULL,
 'Hashing — store each value''s index and look up the complement', 'Two pointers from both ends', 'Sort then binary search for the complement', 'A fixed-size sliding window',
 'Hashing — store each value''s index and look up the complement',
 'On unsorted input you need fast lookups but cannot move inward by value, so a hash map of value to index finds target - num in O(1). Two pointers requires sorted data.',
 900),

('pattern_id',
 'The array is already SORTED and you must find two numbers summing to a target using O(1) extra space. Which pattern fits best?',
 NULL,
 'Two pointers from both ends', 'Hashing with a complement map', 'A frequency-count hash map', 'Prefix sums',
 'Two pointers from both ends',
 'Sortedness is the discriminator: a two-pointer sweep needs no extra structure, so hashing''s O(n) space is wasted here. Unsorted + fast lookup would favor hashing instead.',
 1000),

('pattern_id',
 'Which pattern decides whether two strings are anagrams of each other?',
 NULL,
 'Hashing — compare character frequency counts', 'Two pointers walking inward', 'Binary search over characters', 'A sliding window of variable size',
 'Hashing — compare character frequency counts',
 'Anagrams share an identical multiset of characters, so a frequency map (or 26-length count array) compared for equality settles it in O(n).',
 820),

('pattern_id',
 'Which pattern solves: "Group a list of strings into anagram clusters"?',
 NULL,
 'Hashing — key each string by a canonical signature (sorted chars or count tuple)', 'Two pointers across the string list', 'A sliding window over the strings', 'Binary search after sorting the list',
 'Hashing — key each string by a canonical signature (sorted chars or count tuple)',
 'All anagrams collapse to the same canonical key, so a hash map from key to bucket groups them in one pass.',
 1080),

('pattern_id',
 'Which pattern returns the K most frequent elements of an array in O(n) time?',
 NULL,
 'Hashing for counts, then bucket sort by frequency', 'Two pointers on the sorted array', 'A variable-size sliding window', 'Binary search on the value range',
 'Hashing for counts, then bucket sort by frequency',
 'Count with a hash map, then index buckets by frequency (0..n) and read the top K — linear time. A heap also works but costs O(n log K).',
 1250),

('pattern_id',
 'Which pattern finds the length of the longest run of consecutive integers in an UNSORTED array in O(n)?',
 NULL,
 'Hashing — put values in a set and extend streaks from sequence starts', 'Sort the array, then scan adjacent pairs', 'Two pointers from both ends', 'A fixed-size sliding window',
 'Hashing — put values in a set and extend streaks from sequence starts',
 'A set gives O(1) membership so you can grow each streak from its start without sorting. Sorting also solves it but at O(n log n), not O(n).',
 1500),

('pattern_id',
 'Which pattern counts the number of subarrays whose elements sum to exactly K, where the array may contain negatives?',
 NULL,
 'Prefix sums with a hash map of prefix-sum counts', 'A variable-size sliding window', 'Two pointers from both ends', 'Binary search on prefix sums',
 'Prefix sums with a hash map of prefix-sum counts',
 'Negatives break the monotonicity a sliding window needs; instead store how many times each prefix sum has occurred and look up prefix - K.',
 1650),

-- ===== Crux step (6) =====
('crux',
 'In the O(n) hash-map Two Sum, what do you store as the KEY when you insert each element into the map?',
 NULL,
 'The value itself (mapped to its index)', 'The complement target - num (mapped to its index)', 'The index (mapped to the value)', 'The running prefix sum',
 'The value itself (mapped to its index)',
 'You key by value so that, for a later element, a single lookup of target - num tells you whether a partner already exists. The complement is what you look UP, not what you store.',
 1000),

('crux',
 'In hash-map Two Sum, the correct ordering inside the loop for each num is:',
 NULL,
 'Check whether target - num is already in the map, THEN insert num', 'Insert num, THEN check whether target - num is in the map', 'Insert num and its complement together, then check', 'Check and insert in either order — it does not matter',
 'Check whether target - num is already in the map, THEN insert num',
 'Looking up the complement before inserting the current element prevents pairing a number with itself when 2*num == target but it appears only once.',
 1200),

('crux',
 'In "subarray sum equals K", for each running prefix sum `prefix` you increment the answer by the stored count of which key?',
 NULL,
 'prefix - K', 'K - prefix', 'prefix + K', 'prefix',
 'prefix - K',
 'A subarray ending here sums to K exactly when some earlier prefix equals prefix - K; the count of that earlier prefix is how many such subarrays end at the current index.',
 1450),

('crux',
 'In "subarray sum equals K", why initialize the prefix-sum count map with {0: 1} before scanning?',
 NULL,
 'To count subarrays that start at index 0 (whole prefix equals K)', 'To avoid division by zero', 'To reserve space for negative sums', 'To mark the array as non-empty',
 'To count subarrays that start at index 0 (whole prefix equals K)',
 'The empty-prefix sum of 0 must already be present so that when a running prefix itself equals K, prefix - K = 0 is found once and the leading subarray is counted.',
 1550),

('crux',
 'In the O(n) longest-consecutive-sequence algorithm, you begin counting a streak from a value `num` ONLY when:',
 NULL,
 'num - 1 is NOT in the set (num is a sequence start)', 'num + 1 is in the set', 'num is the smallest value seen so far', 'num appears exactly once',
 'num - 1 is NOT in the set (num is a sequence start)',
 'Only sequence starts launch the inner walk; if num - 1 exists, num is mid-sequence and will be counted from its true start, which keeps total work linear.',
 1500),

('crux',
 'In "product of array except self" without using division, what are the two passes?',
 NULL,
 'A left-to-right pass of prefix products, then a right-to-left pass multiplying by suffix products', 'Two left-to-right passes accumulating sums', 'A sort followed by a sweep', 'A single pass dividing the total product by each element',
 'A left-to-right pass of prefix products, then a right-to-left pass multiplying by suffix products',
 'output[i] = (product of everything left of i) * (product of everything right of i); the two directional passes build those without ever dividing, so zeros are handled safely.',
 1350),

-- ===== Complexity (5) =====
('complexity',
 'Two Sum on an UNSORTED array via a hash map of value to index. Worst-case time and extra space?',
 NULL,
 'O(n) time, O(n) space', 'O(n log n) time, O(1) space', 'O(n^2) time, O(1) space', 'O(n) time, O(1) space',
 'O(n) time, O(n) space',
 'One pass with O(1) average map operations is linear time, and the map can hold up to n entries — trading space for the fast complement lookup.',
 950),

('complexity',
 'Two Sum solved by sorting the array first and then using two pointers. Dominant time complexity?',
 NULL,
 'O(n log n)', 'O(n)', 'O(n^2)', 'O(log n)',
 'O(n log n)',
 'The two-pointer sweep is O(n), but the initial sort dominates at O(n log n) — which is why hashing wins when the array is unsorted and indices are needed.',
 1050),

('complexity',
 'Contains-duplicate via a hash set versus the sort-then-scan-adjacent approach. The respective time complexities are:',
 NULL,
 'O(n) for the set, O(n log n) for sort-then-scan', 'O(n log n) for the set, O(n) for sort-then-scan', 'Both O(n)', 'Both O(n log n)',
 'O(n) for the set, O(n log n) for sort-then-scan',
 'Inserting n elements into a hash set is O(n) average; the comparison approach pays O(n log n) for the sort, after which the adjacent scan is O(n).',
 1000),

('complexity',
 'In longest-consecutive-sequence, the inner `while (set.contains(cur+1))` loop can run many times. Why is the TOTAL time still O(n), not O(n^2)?',
 NULL,
 'The inner walk runs only from sequence starts, so each value is visited by exactly one streak overall', 'The set lookups are O(log n), which cancels a factor', 'Because duplicates are removed first', 'Because the array is implicitly sorted by the set',
 'The inner walk runs only from sequence starts, so each value is visited by exactly one streak overall',
 'Guarding on "num - 1 not in set" means only the start of each run triggers the while loop, so across all streaks every element is stepped over at most once — O(n) amortized, not quadratic.',
 1750),

('complexity',
 'Top-K-frequent via a count map plus bucket sort by frequency. Time complexity?',
 NULL,
 'O(n)', 'O(n log n)', 'O(n log K)', 'O(n * K)',
 'O(n)',
 'Counting is O(n), and bucketing frequencies into indices 0..n then reading off the top K is also O(n) — strictly better than the O(n log K) heap approach.',
 1300),

-- ===== Bug / predict-output (6) =====
('bug',
 'For nums = [3, 3] and target = 6, hash-map Two Sum should return indices [0, 1]. This code returns nothing. What is the bug?',
 'seen = {}
for i, num in enumerate(nums):
    seen[num] = i
    if target - num in seen:
        return [seen[target - num], i]',
 'It inserts num before checking, so num matches itself; check the complement BEFORE inserting', 'It should store target - num as the key, not num', 'enumerate should start at 1', 'It needs to sort nums first',
 'It inserts num before checking, so num matches itself; check the complement BEFORE inserting',
 'At i=0 the map becomes {3:0} and the check finds complement 3 at index 0, returning [0, 0]. Inserting after the check fixes the self-pairing.',
 1300),

('bug',
 'For nums = [2, 7, 11, 15] and target = 9, what does correct hash-map Two Sum return (as indices)?',
 NULL,
 '[0, 1]', '[1, 2]', '[0, 2]', '[2, 3]',
 '[0, 1]',
 'nums[0] + nums[1] = 2 + 7 = 9, so the answer is indices 0 and 1.',
 760),

('bug',
 'This anagram check fails on s = "aab", t = "abb" (it wrongly reports True). What is the flaw?',
 'def is_anagram(s, t):
    count = {}
    for c in s:
        count[c] = count.get(c, 0) + 1
    for c in t:
        count[c] = count.get(c, 0) - 1
    return len(s) == len(t)',
 'It never checks that all counts returned to 0; it only compares lengths', 'It should sort both strings instead', 'get(c, 0) should be get(c, 1)', 'It must iterate t before s',
 'It never checks that all counts returned to 0; it only compares lengths',
 '"aab" and "abb" have equal length but different letter counts; the function must verify every value in count is 0, not just that the lengths match.',
 1200),

('bug',
 'This longest-consecutive-sequence code is O(n^2) on a long run like [1,2,3,...,n]. What single change makes it O(n)?',
 'best = 0
s = set(nums)
for num in s:
    length = 1
    cur = num
    while cur + 1 in s:
        cur += 1
        length += 1
    best = max(best, length)',
 'Only start counting when num - 1 is not in the set', 'Sort nums before building the set', 'Use a list instead of a set for s', 'Break out of the while loop after one step',
 'Only start counting when num - 1 is not in the set',
 'As written, every element launches a full forward walk, so a single long run is re-walked from each member — O(n^2). Guarding on "num - 1 not in s" restricts walks to sequence starts, making total work O(n).',
 1700),

('bug',
 'For nums = [1, 1, 1] and k = 2, how many contiguous subarrays sum to exactly k (using prefix sum + count map seeded with {0: 1})?',
 NULL,
 '2', '1', '3', '0',
 '2',
 'The subarrays [1,1] at indices (0,1) and (1,2) each sum to 2, so the count is 2.',
 1150),

('bug',
 'This "subarray sum equals K" counter under-reports by one whenever a prefix from index 0 equals K. What is the fix?',
 'def subarray_sum(nums, k):
    count = 0
    prefix = 0
    seen = {}
    for x in nums:
        prefix += x
        if prefix - k in seen:
            count += seen[prefix - k]
        seen[prefix] = seen.get(prefix, 0) + 1
    return count',
 'Initialize seen with {0: 1} before the loop', 'Increment count before updating seen', 'Use prefix + k instead of prefix - k', 'Reset prefix to 0 each iteration',
 'Initialize seen with {0: 1} before the loop',
 'The empty prefix (sum 0) must be pre-seeded so that when a running prefix equals k, the lookup prefix - k = 0 is found and the leading subarray is counted.',
 1450)

) AS v(format, prompt, code, a1, a2, a3, a4, correct, expl, rating)
WHERE p.slug = 'arrays-hashing';
