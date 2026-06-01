import { render } from '@testing-library/react';
import Sparkline from './Sparkline';

test('renders a polyline with normalized coordinates', () => {
  const { container } = render(<Sparkline points={[0, 5, 10]} width={100} height={30} />);
  const polyline = container.querySelector('polyline');
  expect(polyline).not.toBeNull();
  expect(polyline.getAttribute('points')).toBe('0,30 50,15 100,0');
});

test('empty input renders no polyline and does not throw', () => {
  const { container } = render(<Sparkline points={[]} width={100} height={30} />);
  expect(container.querySelector('polyline')).toBeNull();
});

test('single point renders a flat mid-line without throwing', () => {
  const { container } = render(<Sparkline points={[7]} width={100} height={30} />);
  const polyline = container.querySelector('polyline');
  expect(polyline).not.toBeNull();
  expect(polyline.getAttribute('points')).toBe('50,15');
});
