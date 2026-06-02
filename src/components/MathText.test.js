import React from 'react';
import { render } from '@testing-library/react';
import MathText from './MathText';

const html = (node) => render(node).container.innerHTML;
const text = (node) => render(node).container.textContent;

test('renders ^ as a superscript element', () => {
  expect(html(<MathText>{'x^2'}</MathText>)).toContain('<sup>2</sup>');
});

test('renders _ as a subscript element', () => {
  expect(html(<MathText>{'k_B'}</MathText>)).toContain('<sub>B</sub>');
});

test('unwraps parenthesized exponents like e^(2x)', () => {
  expect(html(<MathText>{'e^(2x)'}</MathText>)).toContain('<sup>2x</sup>');
});

test('captures a signed exponent like 10^-10', () => {
  expect(html(<MathText>{'10^-10'}</MathText>)).toContain('<sup>-10</sup>');
});

test('swaps unambiguous ASCII operators', () => {
  expect(text(<MathText>{'a*b'}</MathText>)).toBe('a·b');
  expect(text(<MathText>{'lim(x->0)'}</MathText>)).toBe('lim(x→0)');
  expect(text(<MathText>{'2x*sqrt(x^2+1)'}</MathText>)).toBe('2x·√(x2+1)');
});

test('leaves a lone ^ or _ untouched', () => {
  expect(text(<MathText>{'a ^ b'}</MathText>)).toBe('a ^ b');
});

test('handles empty/undefined safely', () => {
  expect(text(<MathText>{''}</MathText>)).toBe('');
  expect(text(<MathText>{undefined}</MathText>)).toBe('');
});
