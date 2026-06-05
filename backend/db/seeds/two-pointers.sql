-- Two Pointers — content deck (~25 cards across the 4 drill formats).
-- pattern_id is resolved from the slug; CHECK constraints enforce that
-- correctanswer is one of the options and rating stays in the 700-2000 band.
-- Stored correct answer is always answer1; the API shuffles answers per serve.

INSERT INTO cards (pattern_id, format, prompt, code, answer1, answer2, answer3, answer4, correctanswer, explanation, rating)
SELECT p.id, v.format, v.prompt, v.code, v.a1, v.a2, v.a3, v.a4, v.correct, v.expl, v.rating
FROM patterns p
CROSS JOIN (VALUES

-- ===== Pattern identification (8) =====
('pattern_id',
 'Which pattern best solves: "Given a SORTED array, find two numbers that add up to a target"?',
 NULL::text,
 'Two pointers (one at each end, converging)', 'Sliding window', 'Hashing with a seen-set', 'Dynamic programming',
 'Two pointers (one at each end, converging)',
 'Because the array is sorted, a left/right pair converges in O(n) O(1)-space: a sum too small moves left up, too large moves right down. A hash set also works but costs O(n) extra space; the SORTED input is the discriminator for two pointers.',
 820),

('pattern_id',
 'Which pattern best checks whether a string is a valid palindrome by comparing characters from both ends?',
 NULL,
 'Two pointers (opposite ends, converging)', 'Sliding window', 'A stack of all characters', 'Recursion with memoization',
 'Two pointers (opposite ends, converging)',
 'A pointer at each end moves inward, comparing mirrored characters until they cross — O(n) time, O(1) space. The converging-from-both-ends structure is the two-pointer signature.',
 760),

('pattern_id',
 'Which pattern solves "Container With Most Water" (max area between two of n vertical lines) in O(n)?',
 NULL,
 'Two pointers (widest gap first, move the shorter wall inward)', 'Sliding window of fixed size', 'Binary search on the answer', 'Sorting then greedy',
 'Two pointers (widest gap first, move the shorter wall inward)',
 'Start at the widest base and move the shorter line inward each step, since only a taller wall can ever increase area. The converging two-pointer scan replaces the O(n^2) brute force.',
 1250),

('pattern_id',
 'Which pattern detects whether a singly linked list contains a cycle using O(1) extra space?',
 NULL,
 'Fast and slow pointers (Floyd''s tortoise and hare)', 'Hashing every visited node', 'Sliding window over the nodes', 'Depth-first search with a stack',
 'Fast and slow pointers (Floyd''s tortoise and hare)',
 'A slow pointer advancing one node and a fast pointer advancing two will meet inside a cycle, using O(1) space. Hashing visited nodes also detects a cycle but needs O(n) space.',
 1150),

('pattern_id',
 'Which pattern finds the middle node of a singly linked list in a single pass without knowing its length?',
 NULL,
 'Fast and slow pointers (fast moves twice as fast)', 'Two pointers converging from both ends', 'Sliding window of size n/2', 'Binary search on the list',
 'Fast and slow pointers (fast moves twice as fast)',
 'When the fast pointer reaches the end, the slow pointer — moving at half speed — sits at the middle. A singly linked list has no random access, so converging or binary search do not apply.',
 1000),

('pattern_id',
 'Which pattern moves all zeroes in an array to the end while keeping the order of non-zero elements, in place?',
 NULL,
 'Two pointers (a slow write index and a fast read index)', 'A sliding window of zeroes', 'Sorting the array', 'A hash map of positions',
 'Two pointers (a slow write index and a fast read index)',
 'A fast reader scans every element; a slow writer marks where the next non-zero belongs. This partition-in-place is a classic slow/fast two-pointer move, O(n) time O(1) space.',
 900),

('pattern_id',
 'Which pattern removes duplicates from a SORTED array in place and returns the new length?',
 NULL,
 'Two pointers (a slow write index trailing a fast scan)', 'Hashing into a set', 'Sliding window with a frequency map', 'Binary search for each duplicate',
 'Two pointers (a slow write index trailing a fast scan)',
 'Because the array is sorted, duplicates are adjacent: a fast pointer scans while a slow pointer writes each newly seen value. A set would work but wastes O(n) space and ignores the sorted structure.',
 950),

('pattern_id',
 'Which pattern solves 3Sum — find all unique triplets that sum to zero — in O(n^2) after sorting?',
 NULL,
 'Sort, then for each element run a converging two-pointer scan', 'A sliding window over the sorted array', 'A hash map of every pair sum', 'Backtracking over all triplets',
 'Sort, then for each element run a converging two-pointer scan',
 'Sorting lets you fix one element and collapse the remaining two-sum into a left/right converging scan, giving O(n^2) overall while skipping duplicates to keep triplets unique.',
 1450),

-- ===== Crux step (6) =====
('crux',
 'In two-sum on a SORTED array with pointers lo and hi, if arr[lo] + arr[hi] > target, you move:',
 NULL,
 'hi-- (decrease the right pointer)', 'lo++ (increase the left pointer)', 'both pointers inward', 'hi to the midpoint',
 'hi-- (decrease the right pointer)',
 'The array is ascending, so to reduce a sum that is too large you must drop the larger addend: move hi left. Moving lo up would only increase the sum.',
 950),

('crux',
 'In "Container With Most Water", at each step you advance the pointer at the ___ wall:',
 NULL,
 'shorter wall', 'taller wall', 'left wall always', 'wall with the larger index',
 'shorter wall',
 'Area is limited by the shorter line, so moving the taller one can never increase it (width shrinks, height still capped). Only moving the shorter wall offers any chance of a taller bound.',
 1300),

('crux',
 'In 3Sum after sorting, once you record a valid triplet you must skip over ___ before continuing:',
 NULL,
 'duplicate values for both the left and right pointers', 'every remaining element', 'only the fixed outer element', 'the largest value in the array',
 'duplicate values for both the left and right pointers',
 'To keep triplets unique you advance left past identical values and pull right past identical values; skipping only one side still emits duplicate triplets.',
 1500),

('crux',
 'In Floyd''s cycle detection, the standard speeds are: the slow pointer moves ___ and the fast pointer moves ___ per step.',
 NULL,
 '1 node; 2 nodes', '2 nodes; 4 nodes', '1 node; 3 nodes', '2 nodes; 1 node',
 '1 node; 2 nodes',
 'Slow advances one and fast advances two, so the gap closes by exactly one node each step and they are guaranteed to meet inside any cycle.',
 1000),

('crux',
 'In "remove duplicates from a SORTED array", the slow write pointer advances only when:',
 NULL,
 'the fast element differs from the last written element', 'every iteration of the loop', 'the fast element equals the previous one', 'the fast pointer reaches the end',
 'the fast element differs from the last written element',
 'The slow pointer marks the tail of the unique prefix; it only steps forward and stores a value when the fast scan finds something new, leaving duplicates behind.',
 1100),

('crux',
 'To remove the Nth node from the end of a singly linked list in one pass, you first advance the lead pointer ___ before moving both together:',
 NULL,
 'N steps ahead of the trailing pointer', 'to the middle of the list', 'to the end of the list, then count back', 'N/2 steps ahead',
 'N steps ahead of the trailing pointer',
 'Giving the lead a head start of N nodes means when it hits the end, the trailing pointer sits exactly at the node before the target — a single-pass two-pointer gap.',
 1200),

-- ===== Complexity (5) =====
('complexity',
 'Two-sum on a SORTED array with converging left/right pointers. Time and extra space?',
 NULL,
 'O(n) time, O(1) space', 'O(n log n) time, O(1) space', 'O(n) time, O(n) space', 'O(n^2) time, O(1) space',
 'O(n) time, O(1) space',
 'Each pointer only moves inward and they meet after at most n steps, using two index variables — linear time, constant space (no sorting needed since the input is already sorted).',
 900),

('complexity',
 '3Sum solved by sorting then a converging two-pointer scan for each fixed element. Overall time?',
 NULL,
 'O(n^2)', 'O(n log n)', 'O(n)', 'O(n^3)',
 'O(n^2)',
 'Sorting is O(n log n); the outer loop fixes each of n elements and runs an O(n) two-pointer scan, giving O(n^2) which dominates. O(n^3) is the brute-force triple loop.',
 1350),

('complexity',
 'Floyd''s cycle detection on a linked list of n nodes. Time and extra space?',
 NULL,
 'O(n) time, O(1) space', 'O(n) time, O(n) space', 'O(n^2) time, O(1) space', 'O(log n) time, O(1) space',
 'O(n) time, O(1) space',
 'The pointers traverse a linear number of nodes before meeting (or fast reaches the end), using only two pointers — linear time, constant space. The O(n)-space option is the hash-set approach.',
 1150),

('complexity',
 'Valid palindrome check with two pointers converging from both ends of a string of length n. Time complexity?',
 NULL,
 'O(n)', 'O(n^2)', 'O(n log n)', 'O(1)',
 'O(n)',
 'The two pointers together cover each character at most once before crossing, so the scan is linear in the string length.',
 760),

('complexity',
 '"Move zeroes" with a slow write pointer and a fast read pointer over n elements. Time and extra space?',
 NULL,
 'O(n) time, O(1) space', 'O(n) time, O(n) space', 'O(n log n) time, O(1) space', 'O(n^2) time, O(1) space',
 'O(n) time, O(1) space',
 'A single forward pass swaps or writes in place using two indices — linear time and no auxiliary array.',
 1000),

-- ===== Bug / predict-output (6) =====
('bug',
 'This two-sum-on-sorted routine has a boundary bug. What is it?',
 'def two_sum(arr, target):
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        s = arr[lo] + arr[hi]
        if s == target:
            return (lo, hi)
        elif s < target:
            lo += 1
        else:
            hi -= 1
    return None',
 'The loop should be while lo < hi; lo <= hi lets a single element pair with itself', 'It should start hi at len(arr)', 'The < and > branches are swapped', 'There is no bug',
 'The loop should be while lo < hi; lo <= hi lets a single element pair with itself',
 'With lo <= hi the pointers can land on the same index, returning a "pair" that reuses one element (e.g. target = 2*arr[lo]). The standard converging loop must use lo < hi.',
 1250),

('bug',
 'This 3Sum inner scan finds triplets but emits duplicates. What is missing?',
 'nums.sort()
res = []
for i in range(len(nums) - 2):
    lo, hi = i + 1, len(nums) - 1
    while lo < hi:
        s = nums[i] + nums[lo] + nums[hi]
        if s == 0:
            res.append((nums[i], nums[lo], nums[hi]))
            lo += 1
            hi -= 1
        elif s < 0:
            lo += 1
        else:
            hi -= 1',
 'After recording a triplet it must skip equal values at lo and hi (and skip equal i in the outer loop)', 'It should iterate i up to len(nums)', 'lo should start at 0, not i + 1', 'The s < 0 and s > 0 branches are reversed',
 'After recording a triplet it must skip equal values at lo and hi (and skip equal i in the outer loop)',
 'Without advancing past duplicate values for i, lo, and hi, identical triplets like (-1, 0, 1) are emitted multiple times. Skipping duplicates after a match keeps the result set unique.',
 1550),

('bug',
 'This Floyd cycle check crashes on some inputs. Why?',
 'def has_cycle(head):
    slow = fast = head
    while fast.next.next:
        slow = slow.next
        fast = fast.next.next
        if slow == fast:
            return True
    return False',
 'It dereferences fast.next.next without first checking fast and fast.next are non-null', 'slow and fast should start at different nodes', 'It should compare slow.next == fast', 'The return values are inverted',
 'It dereferences fast.next.next without first checking fast and fast.next are non-null',
 'On a list with no cycle, fast or fast.next becomes None and "fast.next.next" raises an attribute error. The guard must be "while fast and fast.next:" evaluated before advancing.',
 1400),

('bug',
 'For the SORTED array [1, 2, 4, 7, 11, 15] and target 15, what 0-based index pair does a converging two-sum (left=0, right=n-1, returning the first match) produce?',
 NULL,
 '(2, 4)', '(0, 5)', '(1, 4)', '(3, 4)',
 '(2, 4)',
 'Trace: (0,5) 1+15=16>15 so hi=4; (0,4) 1+11=12<15 so lo=1; (1,4) 2+11=13<15 so lo=2; (2,4) 4+11=15 -> return (2, 4).',
 1300),

('bug',
 'After running "move zeroes" on [0, 1, 0, 3, 12], what is the resulting array?',
 NULL,
 '[1, 3, 12, 0, 0]', '[0, 0, 1, 3, 12]', '[1, 3, 12, 0, 0, 0]', '[12, 3, 1, 0, 0]',
 '[1, 3, 12, 0, 0]',
 'Non-zero elements keep their relative order at the front (1, 3, 12) and all zeroes are pushed to the end, preserving the array length.',
 850),

('bug',
 'Using two pointers to reverse the array [1, 2, 3, 4, 5] in place (swap ends, move inward), what is the array after the FIRST swap only?',
 NULL,
 '[5, 2, 3, 4, 1]', '[5, 4, 3, 2, 1]', '[2, 1, 3, 4, 5]', '[1, 2, 3, 5, 4]',
 '[5, 2, 3, 4, 1]',
 'The first swap exchanges index 0 and index 4 (values 1 and 5), giving [5, 2, 3, 4, 1]; subsequent swaps would handle the inner pair.',
 780)

) AS v(format, prompt, code, a1, a2, a3, a4, correct, expl, rating)
WHERE p.slug = 'two-pointers';
