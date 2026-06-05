-- Stack — content deck (~25 cards across the 4 drill formats).
-- pattern_id is resolved from the slug; CHECK constraints enforce that
-- correctanswer is one of the options and rating stays in the 700-2000 band.
-- Stored correct answer is always answer1; the API shuffles answers per serve.

INSERT INTO cards (pattern_id, format, prompt, code, answer1, answer2, answer3, answer4, correctanswer, explanation, rating)
SELECT p.id, v.format, v.prompt, v.code, v.a1, v.a2, v.a3, v.a4, v.correct, v.expl, v.rating
FROM patterns p
CROSS JOIN (VALUES

-- ===== Pattern identification (8) =====
('pattern_id',
 'Which pattern best solves: "Determine whether a string of brackets ()[]{} is balanced"?',
 NULL::text,
 'Stack', 'Queue', 'Two pointers', 'Hash map alone',
 'Stack',
 'Push each opening bracket; on a closing bracket the top of the stack must be its match. The most recent unmatched opener is exactly what a stack gives you.',
 760),

('pattern_id',
 'Which pattern best solves: "Evaluate an expression written in Reverse Polish (postfix) notation"?',
 NULL,
 'Stack', 'Queue', 'Binary heap', 'Binary search',
 'Stack',
 'Push operands; on an operator, pop the top two, apply, and push the result. RPN evaluation is the textbook stack application.',
 850),

('pattern_id',
 'You must support push, pop, top, and getMin — all in O(1) worst case. Which structure makes getMin O(1)?',
 NULL,
 'A stack augmented with a per-element minimum (min stack)', 'A min-heap', 'A balanced BST', 'A sorted array',
 'A stack augmented with a per-element minimum (min stack)',
 'A min stack stores the running minimum alongside (or in a second stack parallel to) each value, so getMin is a constant-time read; a heap gives O(log n) pop.',
 1150),

('pattern_id',
 'Which pattern solves: "For each element, find the next element to its right that is strictly greater" in O(n)?',
 NULL,
 'Monotonic stack', 'Min-heap', 'Sliding window', 'Binary indexed tree',
 'Monotonic stack',
 'A decreasing monotonic stack of pending indices resolves each "next greater" as soon as a larger element arrives, in linear time.',
 1250),

('pattern_id',
 'Which pattern solves "Daily Temperatures" — for each day, how many days until a warmer temperature — in O(n)?',
 NULL,
 'Monotonic stack of indices', 'A max-heap of temperatures', 'Two pointers from both ends', 'Prefix sums',
 'Monotonic stack of indices',
 'Keep a stack of indices with decreasing temperatures; when a warmer day arrives, pop and record the index distance. Each index is pushed and popped once.',
 1300),

('pattern_id',
 'Which pattern computes the "Largest Rectangle in Histogram" in O(n)?',
 NULL,
 'Monotonic (increasing) stack of bar indices', 'Divide and conquer on the minimum bar', 'A max-heap of bar heights', 'Dynamic programming over all subranges',
 'Monotonic (increasing) stack of bar indices',
 'An increasing stack lets you finalize each bar''s maximal width the moment a shorter bar appears, giving O(n); divide-and-conquer is O(n log n) average and O(n^2) worst.',
 1700),

('pattern_id',
 'Which approach implements a FIFO queue using only LIFO stacks?',
 NULL,
 'Two stacks (an inbox and an outbox), transferring lazily', 'One stack and a counter', 'A single stack with recursion', 'A circular buffer',
 'Two stacks (an inbox and an outbox), transferring lazily',
 'Push onto the inbox; to dequeue, if the outbox is empty pour the inbox into it (reversing order) and pop. Amortized O(1) per operation.',
 1200),

('pattern_id',
 'A compiler must report the position of the most recent unmatched opening tag while scanning left to right. Which structure fits?',
 NULL,
 'Stack', 'Queue', 'Priority queue', 'Doubly linked list',
 'Stack',
 '"Most recent unmatched" is last-in-first-out by definition: push openers, pop on a matching closer, and the top is always the most recent unmatched one.',
 900),

-- ===== Crux step (6) =====
('crux',
 'In a monotonic stack that finds the NEXT GREATER element, you pop the stack while:',
 NULL,
 'the stack is non-empty AND the top is less than the current element', 'the stack is non-empty AND the top is greater than the current element', 'the current element equals the top', 'the stack is empty',
 'the stack is non-empty AND the top is less than the current element',
 'The current element is the answer for every pending smaller element, so you pop all tops strictly less than it (a decreasing stack). Popping greater tops would be the next-smaller variant.',
 1350),

('crux',
 'For "Daily Temperatures" (distance to a warmer day), what should the monotonic stack hold?',
 NULL,
 'Indices, so you can compute the day distance current - poppedIndex', 'The temperature values themselves', 'Running maximum temperatures', 'Pairs of (temperature, count) only',
 'Indices, so you can compute the day distance current - poppedIndex',
 'The answer is a distance, so you must store indices; with only values you cannot recover how many days apart the bars are.',
 1300),

('crux',
 'A min stack must return the current minimum in O(1). Which auxiliary scheme achieves this?',
 NULL,
 'Push (value, minSoFar) on each entry, or keep a parallel stack of minima', 'Sort the stack after every push', 'Keep a single min variable updated only on push', 'Scan the whole stack on each getMin',
 'Push (value, minSoFar) on each entry, or keep a parallel stack of minima',
 'Pairing each element with the minimum at its push time (or a second stack of minima) keeps getMin O(1) AND correct after pops; a lone min variable becomes stale when the minimum is popped.',
 1250),

('crux',
 'A single min variable (not a paired/second stack) fails a min stack specifically when:',
 NULL,
 'the current minimum element is popped, leaving the variable stale', 'two equal values are pushed', 'the stack grows beyond its initial capacity', 'push and pop alternate',
 'the current minimum element is popped, leaving the variable stale',
 'Once the element holding the minimum is removed, a single variable has no record of the previous minimum, so it reports a value no longer in the stack.',
 1400),

('crux',
 'Evaluating RPN, you reach the operator "-" with the stack (bottom..top) = [..., 8, 3]. Which subtraction is correct?',
 NULL,
 'second-popped MINUS first-popped: 8 - 3 = 5', 'first-popped minus second-popped: 3 - 8 = -5', 'either order, since subtraction is symmetric', 'top minus zero: 3 - 0 = 3',
 'second-popped MINUS first-popped: 8 - 3 = 5',
 'For non-commutative operators, order matters: the second value popped is the left operand. Pop b=3 then a=8 and compute a - b = 5.',
 1450),

('crux',
 'In the "Largest Rectangle in Histogram" stack solution, when you pop a bar of height h, its rectangle WIDTH is:',
 NULL,
 'current index - index of the new stack top - 1', 'current index - popped index', 'current index - popped index + 1', 'the popped index itself',
 'current index - index of the new stack top - 1',
 'After popping, the left boundary is the bar now on top (exclusive) and the right boundary is the current index (exclusive), so width = i - stack.top - 1. If the stack empties, width = i.',
 1850),

-- ===== Complexity (5) =====
('complexity',
 'A monotonic stack scans n elements; each element is pushed once and popped at most once. Total time complexity?',
 NULL,
 'O(n)', 'O(n^2)', 'O(n log n)', 'O(n * stackSize)',
 'O(n)',
 'Although there is an inner while-loop, every element enters and leaves the stack at most once, so the total work is amortized linear.',
 1100),

('complexity',
 'Why is a monotonic stack O(n) despite the nested while-loop that pops?',
 NULL,
 'Each element is pushed and popped at most once, so total pops are bounded by n (amortized analysis)', 'The while-loop runs at most twice per element', 'The input is assumed sorted', 'The stack never exceeds size 2',
 'Each element is pushed and popped at most once, so total pops are bounded by n (amortized analysis)',
 'A per-iteration worst case looks like O(n), but summed over the whole run the pops total at most n, giving O(n) overall — classic amortized reasoning.',
 1300),

('complexity',
 'Validating balanced parentheses with a stack over a string of length n. Worst-case time and extra space?',
 NULL,
 'O(n) time, O(n) space', 'O(n) time, O(1) space', 'O(n^2) time, O(n) space', 'O(n log n) time, O(n) space',
 'O(n) time, O(n) space',
 'One linear pass; in the worst case (all opening brackets, e.g. "((((") the stack holds up to n entries, so extra space is O(n).',
 950),

('complexity',
 'Implementing a queue with two stacks, using lazy transfer (move inbox to outbox only when outbox is empty). Amortized cost per enqueue/dequeue?',
 NULL,
 'O(1) amortized', 'O(n) per operation', 'O(log n) amortized', 'O(n) amortized',
 'O(1) amortized',
 'Each element is moved from inbox to outbox at most once over its lifetime, so the transfer cost spreads out to O(1) amortized per operation.',
 1400),

('complexity',
 'Evaluating a Reverse Polish expression of n tokens with a stack. Time and extra space?',
 NULL,
 'O(n) time, O(n) space', 'O(n) time, O(1) space', 'O(n log n) time, O(n) space', 'O(n^2) time, O(n) space',
 'O(n) time, O(n) space',
 'Each token is processed once (O(n)); the operand stack can hold up to O(n) values in the worst case, so extra space is O(n).',
 1050),

-- ===== Bug / predict-output (6) =====
('bug',
 'This balanced-brackets checker has a bug. What is it?',
 'def is_valid(s):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for c in s:
        if c in pairs:
            if stack.pop() != pairs[c]:
                return False
        else:
            stack.append(c)
    return len(stack) == 0',
 'It calls stack.pop() without checking the stack is non-empty, so a leading closer like ")" crashes', 'It should return True even when the stack is non-empty', 'The pairs map has the keys and values swapped', 'It never pushes opening brackets',
 'It calls stack.pop() without checking the stack is non-empty, so a leading closer like ")" crashes',
 'On input ")" the stack is empty when pop() is called, raising an error. The guard "if not stack: return False" must precede the pop.',
 1200),

('bug',
 'This "next greater element" routine uses the wrong pop direction. What does it actually compute?',
 'def f(nums):
    res = [-1] * len(nums)
    stack = []  # holds indices
    for i, x in enumerate(nums):
        while stack and nums[stack[-1]] > x:
            res[stack.pop()] = x
        stack.append(i)
    return res',
 'It computes the next SMALLER element, not the next greater, because it pops while the top is greater than x', 'It correctly computes the next greater element', 'It computes the previous greater element', 'It always returns all -1',
 'It computes the next SMALLER element, not the next greater, because it pops while the top is greater than x',
 'Resolving a pending index when a SMALLER value arrives yields next-smaller. Next-greater requires popping while nums[top] < x (pop the smaller pending ones).',
 1450),

('bug',
 'This histogram-rectangle width calculation is off by one. Which width is correct after popping index "top" at position i, when the stack is non-empty?',
 'h = heights[stack.pop()]
# stack still non-empty here
width = i - stack[-1]      # buggy
area = h * width',
 'width should be i - stack[-1] - 1 (boundaries are exclusive on both sides)', 'width should be i - stack[-1] + 1', 'width should be i - top', 'the width is already correct',
 'width should be i - stack[-1] - 1 (boundaries are exclusive on both sides)',
 'The new stack top is the left boundary (exclusive) and i is the right boundary (exclusive), so the span is i - stack[-1] - 1; omitting the -1 overcounts the width by one bar.',
 1750),

('bug',
 'A min stack tracks the minimum with a single variable updated only on push: self.min = min(self.min, x). After push(5), push(2), pop() [removes 2], what does getMin() return, and is it correct?',
 NULL,
 'It returns 2, which is now WRONG — the true minimum is 5, because the variable was never restored when 2 was popped', 'It returns 5, which is correct', 'It returns 2, which is correct', 'It crashes because pop does not update the minimum',
 'It returns 2, which is now WRONG — the true minimum is 5, because the variable was never restored when 2 was popped',
 'Once the element holding the minimum (2) is popped, a single un-restored variable still reports 2 even though only 5 remains. A paired (value, minSoFar) entry or a second stack of minima fixes this.',
 1500),

('bug',
 'Predict the output. A stack starts empty; the operations are: push(1), push(2), push(3), pop(), push(4), pop(), pop(). What sequence of values do the three pops return, in order?',
 NULL,
 '3, 4, 2', '1, 2, 3', '3, 2, 1', '4, 3, 2',
 '3, 4, 2',
 'LIFO: pop returns 3 (top), then push 4, pop returns 4, then pop returns 2 (1 remains in the stack).',
 850),

('bug',
 'For the Reverse Polish expression tokens ["4", "13", "5", "/", "+"], what value does a correct evaluator return? (Integer division of 13 by 5 truncates toward zero.)',
 NULL,
 '6', '7', '2', '17',
 '6',
 'Evaluate inner first: 13 / 5 = 2 (truncated). Then 4 + 2 = 6. Order matters for /, but here 13 is the left operand: 13 / 5, not 5 / 13.',
 1150)

) AS v(format, prompt, code, a1, a2, a3, a4, correct, expl, rating)
WHERE p.slug = 'stack';
