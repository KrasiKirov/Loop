import React from 'react';
import { render } from '@testing-library/react';
import CodeBlock from './CodeBlock';

test('renders code inside a pre/code block, preserving text', () => {
  const code = 'for i in range(n):\n    total += arr[i]';
  const { container } = render(<CodeBlock code={code} />);
  const pre = container.querySelector('pre.code-block code');
  expect(pre).not.toBeNull();
  expect(pre.textContent).toBe(code);
});

test('renders nothing when code is empty/null', () => {
  const { container } = render(<CodeBlock code={null} />);
  expect(container.querySelector('pre')).toBeNull();
});
