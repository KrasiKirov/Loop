import { subjectLabel } from './subjectLabels';

test('splits PascalCase subject keys into spaced labels', () => {
  expect(subjectLabel('DiscreteMath')).toBe('Discrete Math');
  expect(subjectLabel('LinearAlgebra')).toBe('Linear Algebra');
  expect(subjectLabel('MolecularBiology')).toBe('Molecular Biology');
  expect(subjectLabel('AnalyticalChemistry')).toBe('Analytical Chemistry');
  expect(subjectLabel('QuantumMechanics')).toBe('Quantum Mechanics');
});

test('leaves single-word subjects unchanged', () => {
  expect(subjectLabel('Calculus')).toBe('Calculus');
  expect(subjectLabel('Anatomy')).toBe('Anatomy');
  expect(subjectLabel('Thermodynamics')).toBe('Thermodynamics');
});

test('handles empty / undefined input safely', () => {
  expect(subjectLabel('')).toBe('');
  expect(subjectLabel()).toBe('');
});
