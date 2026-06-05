-- Binary Search — content deck (~25 cards across the 4 drill formats).
-- pattern_id is resolved from the slug; CHECK constraints enforce that
-- correctanswer is one of the options and rating stays in the 700-2000 band.
-- Stored correct answer is always answer1; the API shuffles answers per serve.

INSERT INTO cards (pattern_id, format, prompt, code, answer1, answer2, answer3, answer4, correctanswer, explanation, rating)
SELECT p.id, v.format, v.prompt, v.code, v.a1, v.a2, v.a3, v.a4, v.correct, v.expl, v.rating
FROM patterns p
CROSS JOIN (VALUES

-- ===== Pattern identification (8) =====
('pattern_id',
 'Which pattern solves: "Given a sorted array of integers, find the index of a target value (or report it is absent)"?',
 NULL::text,
 'Binary search', 'Two pointers', 'Sliding window', 'Hashing with a frequency map',
 'Binary search',
 'The array is sorted, so each comparison against the middle element discards half the search space — O(log n).',
 720),

('pattern_id',
 'Which pattern finds the index of the FIRST occurrence of a target in a sorted array that may contain duplicates?',
 NULL,
 'Binary search for the lower bound', 'Linear scan from the left', 'Two pointers converging from both ends', 'Sliding window',
 'Binary search for the lower bound',
 'A lower-bound binary search keeps moving left even after a match, narrowing to the first index where the target appears — O(log n) vs O(n) for a scan.',
 1150),

('pattern_id',
 'You must decide: "What is the minimum integer speed at which Koko can eat all the banana piles within H hours?" Feasibility is monotonic in speed. Which pattern?',
 NULL,
 'Binary search on the answer', 'Greedy from the largest pile', 'Sliding window over the piles', 'Dynamic programming over hours',
 'Binary search on the answer',
 'If a speed works, every higher speed works too — a monotonic predicate. Binary search the speed range and test feasibility in O(n) per guess.',
 1500),

('pattern_id',
 'Which pattern best solves: "Split an array into m contiguous subarrays so that the largest subarray sum is minimized"?',
 NULL,
 'Binary search on the answer (the candidate largest sum)', 'Two pointers', 'A fixed-size sliding window', 'Greedy single pass without search',
 'Binary search on the answer (the candidate largest sum)',
 'Feasibility — "can we split into <= m parts with every part <= X?" — is monotonic in X, so binary search X and greedily count parts for each candidate.',
 1750),

('pattern_id',
 'A sorted array was rotated at an unknown pivot. To find a target in O(log n), which pattern applies?',
 NULL,
 'Modified binary search', 'Two pointers from both ends', 'Linear scan', 'Sliding window',
 'Modified binary search',
 'At least one half around the middle is still sorted; decide which half is sorted and whether the target lies inside it to discard the other half.',
 1400),

('pattern_id',
 'Which pattern solves: "Find a peak element (one greater than its neighbors) in an unsorted array" in O(log n)?',
 NULL,
 'Binary search on the slope', 'Linear scan for the global maximum', 'Sliding window of size 3', 'Two pointers',
 'Binary search on the slope',
 'Even without global sorting, comparing the middle to its neighbor tells you which side must contain a peak, so you can halve the range each step.',
 1450),

('pattern_id',
 'For "find the minimum element in a rotated sorted array of distinct values" in O(log n), the pattern is:',
 NULL,
 'Binary search comparing mid against the right end', 'Two pointers', 'Greedy', 'Sliding window',
 'Binary search comparing mid against the right end',
 'Comparing arr[mid] to arr[hi] reveals which side holds the rotation point (the minimum); recurse into that half.',
 1350),

('pattern_id',
 'What is the discriminator that signals "use binary search" rather than two pointers or a sliding window?',
 NULL,
 'A sorted array OR a monotonic feasibility predicate over the answer space', 'The array contains only positive numbers', 'The problem asks for a contiguous subarray', 'The input fits in memory',
 'A sorted array OR a monotonic feasibility predicate over the answer space',
 'Binary search needs a yes/no test that flips exactly once across an ordered space — that is what sortedness or a monotonic predicate provides.',
 1300),

-- ===== Crux step (6) =====
('crux',
 'Why compute the midpoint as mid = lo + (hi - lo) / 2 instead of mid = (lo + hi) / 2?',
 NULL,
 'lo + hi can overflow a fixed-width integer when both are large; the subtraction form cannot', 'It produces a different midpoint that converges faster', '(lo + hi) / 2 rounds toward the wrong end', 'It avoids a division entirely',
 'lo + hi can overflow a fixed-width integer when both are large; the subtraction form cannot',
 'Both compute the same midpoint mathematically, but lo + hi may exceed INT_MAX. Since hi - lo >= 0 and <= the range, lo + (hi - lo)/2 stays in bounds.',
 1250),

('crux',
 'In a classic search with the loop condition while (lo <= hi), when arr[mid] < target you update:',
 NULL,
 'lo = mid + 1', 'lo = mid', 'hi = mid', 'hi = mid - 1',
 'lo = mid + 1',
 'mid is already too small, so it can be excluded; moving lo to mid + 1 shrinks the inclusive range and guarantees progress.',
 1000),

('crux',
 'In a lower-bound search with while (lo < hi), when the predicate at mid is FALSE (mid is too small / target lies strictly right), you set:',
 NULL,
 'lo = mid + 1', 'hi = mid', 'hi = mid - 1', 'lo = mid',
 'lo = mid + 1',
 'mid fails the predicate so it cannot be the answer; excluding it with lo = mid + 1 keeps the half-open invariant and ensures termination.',
 1300),

('crux',
 'In a lower-bound search with while (lo < hi), when the predicate at mid is TRUE (mid is a feasible candidate), you set:',
 NULL,
 'hi = mid', 'hi = mid - 1', 'lo = mid + 1', 'lo = mid',
 'hi = mid',
 'mid might itself be the smallest feasible answer, so you must keep it in the range; hi = mid - 1 would risk discarding the true boundary.',
 1400),

('crux',
 'When is the half-open style while (lo < hi) with hi = mid preferred over the inclusive while (lo <= hi)?',
 NULL,
 'When searching for a boundary (first index satisfying a predicate), since lo converges to that boundary', 'When the array is unsorted', 'When duplicates are forbidden', 'When the array length is a power of two',
 'When searching for a boundary (first index satisfying a predicate), since lo converges to that boundary',
 'Boundary/lower-bound searches use the half-open invariant so the loop ends with lo == hi at the first satisfying index; the inclusive form fits exact-match search.',
 1500),

('crux',
 'In "binary search on the answer", what property must the feasibility predicate have for the search to be correct?',
 NULL,
 'It must be monotonic: once true it stays true (or once false it stays false) across the ordered answer space', 'It must be computable in O(1)', 'It must be true for the smallest candidate', 'It must depend only on the array length',
 'It must be monotonic: once true it stays true (or once false it stays false) across the ordered answer space',
 'Binary search needs a single transition point. A monotonic predicate flips exactly once, so you can discard half the candidates per test.',
 1600),

-- ===== Complexity (5) =====
('complexity',
 'A classic binary search over a sorted array of n elements runs in:',
 NULL,
 'O(log n) time', 'O(n) time', 'O(n log n) time', 'O(1) time',
 'O(log n) time',
 'Each comparison halves the remaining range, so the number of steps is about log2(n).',
 760),

('complexity',
 'Koko-eats-bananas style "binary search on the answer": the speed ranges over values up to M and each feasibility check scans n piles. Total time?',
 NULL,
 'O(n log M)', 'O(n * M)', 'O(log n)', 'O(n^2)',
 'O(n log M)',
 'Binary search over the answer range contributes O(log M) iterations; each runs an O(n) feasibility check, giving O(n log M).',
 1450),

('complexity',
 'A lower-bound (first-occurrence) binary search over n sorted elements runs in:',
 NULL,
 'O(log n) time', 'O(n) time', 'O(log n) only when there are no duplicates, else O(n)', 'O(n log n) time',
 'O(log n) time',
 'It still halves the range each step; continuing past a match toward the left does not change the logarithmic bound.',
 1050),

('complexity',
 'Computing the integer square root of x via binary search over the range [0, x] takes:',
 NULL,
 'O(log x) time', 'O(sqrt(x)) time', 'O(x) time', 'O(1) time',
 'O(log x) time',
 'The candidate range [0, x] is halved each iteration, so the number of steps is logarithmic in x.',
 1100),

('complexity',
 'Searching a rotated sorted array of n distinct elements with the modified binary search runs in:',
 NULL,
 'O(log n) time', 'O(n) time', 'O(n log n) time', 'O(log^2 n) time',
 'O(log n) time',
 'Each step still identifies a sorted half and discards the other, preserving the logarithmic bound despite the rotation.',
 1200),

-- ===== Bug / predict-output (6) =====
('bug',
 'For the sorted array [1, 3, 5, 7, 9, 11] and target 7, how many times is mid computed (how many probes) before this classic binary search returns?',
 'lo, hi = 0, 5
while lo <= hi:
    mid = lo + (hi - lo) // 2
    if arr[mid] == target:
        return mid
    elif arr[mid] < target:
        lo = mid + 1
    else:
        hi = mid - 1',
 '3', '2', '1', '4',
 '3',
 'Probe 1: mid = 2, arr[2] = 5 < 7, so lo = 3. Probe 2: mid = 4, arr[4] = 9 > 7, so hi = 3. Probe 3: mid = 3, arr[3] = 7, match. Three probes total.',
 1150),

('bug',
 'This loop can spin forever. With mid floored toward lo, what is the root cause of non-termination?',
 'lo, hi = 0, len(arr) - 1
while lo < hi:
    mid = (lo + hi) // 2
    if arr[mid] <= target:
        lo = mid          # bug: does not exclude mid
    else:
        hi = mid - 1',
 'When hi = lo + 1, mid floors to lo and lo = mid leaves lo unchanged, so the range never shrinks', 'mid should use lo + (hi - lo) // 2 to avoid overflow', 'hi should be initialized to len(arr)', 'The loop condition should be lo <= hi',
 'When hi = lo + 1, mid floors to lo and lo = mid leaves lo unchanged, so the range never shrinks',
 'With hi = lo + 1, (lo + hi)//2 = lo. If the first branch runs, lo = mid = lo: no progress and an infinite loop. Such an upper-bound search must either set lo = mid + 1, or round mid up with (lo + hi + 1)//2 when using lo = mid.',
 1700),

('bug',
 'This inclusive-bounds search has an off-by-one. What is the bug?',
 'lo, hi = 0, len(arr)
while lo <= hi:
    mid = lo + (hi - lo) // 2
    if arr[mid] == target:
        return mid
    elif arr[mid] < target:
        lo = mid + 1
    else:
        hi = mid - 1',
 'hi should start at len(arr) - 1; as written arr[mid] can index out of bounds', 'The loop should be while lo < hi', 'lo should start at 1', 'mid is computed incorrectly',
 'hi should start at len(arr) - 1; as written arr[mid] can index out of bounds',
 'With the inclusive while (lo <= hi) invariant, hi must be the last valid index. Initializing hi = len(arr) lets mid reach len(arr), reading past the end of the array.',
 1300),

('bug',
 'In this rotated-array search, the decision of which half is sorted is wrong. Which comparison is inverted?',
 'lo, hi = 0, len(arr) - 1
while lo <= hi:
    mid = lo + (hi - lo) // 2
    if arr[mid] == target:
        return mid
    if arr[lo] <= arr[mid]:            # left half is sorted
        if arr[lo] <= target < arr[mid]:
            hi = mid - 1
        else:
            lo = mid + 1
    else:                              # right half is sorted
        if arr[mid] < target <= arr[lo]:   # bug on this line
            lo = mid + 1
        else:
            hi = mid - 1',
 'The right-half test should be arr[mid] < target <= arr[hi], not arr[hi] replaced by arr[lo]', 'The left-half test should use < not <=', 'mid should be (lo + hi) // 2', 'The loop condition should be lo < hi',
 'The right-half test should be arr[mid] < target <= arr[hi], not arr[hi] replaced by arr[lo]',
 'When the right half is sorted, the target falls in it iff arr[mid] < target <= arr[hi]; comparing against arr[lo] uses the wrong boundary and discards the correct half.',
 1650),

('bug',
 'For the sorted array [2, 4, 4, 4, 6, 8] and target 4, this lower-bound search is meant to return the FIRST index of 4. What does it actually return?',
 'lo, hi = 0, len(arr)
while lo < hi:
    mid = lo + (hi - lo) // 2
    if arr[mid] < target:
        lo = mid + 1
    else:
        hi = mid
return lo',
 '1', '3', '0', '2',
 '1',
 'The half-open lower-bound search converges lo to the first index where arr[i] >= target. arr[1] = 4 is the first 4, so it correctly returns 1.',
 1400),

('bug',
 'Integer square root via binary search: for x = 17, this returns floor(sqrt(17)). What value does it return?',
 'lo, hi = 0, 17
ans = 0
while lo <= hi:
    mid = lo + (hi - lo) // 2
    if mid * mid <= 17:
        ans = mid
        lo = mid + 1
    else:
        hi = mid - 1
return ans',
 '4', '5', '3', '17',
 '4',
 '4 * 4 = 16 <= 17 but 5 * 5 = 25 > 17, so the largest mid whose square does not exceed 17 is 4 — the floor of sqrt(17).',
 1100)

) AS v(format, prompt, code, a1, a2, a3, a4, correct, expl, rating)
WHERE p.slug = 'binary-search';
