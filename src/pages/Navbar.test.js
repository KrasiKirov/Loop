import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UserProvider } from '../AuthContext';
import Navbar from './Navbar';

test('navbar shows username and logout, and no ELO badge', () => {
  localStorage.clear();
  localStorage.setItem('user', JSON.stringify({ name: 'Pat', username: 'pat', elo: 1234 }));
  render(
    <MemoryRouter>
      <UserProvider>
        <Navbar />
      </UserProvider>
    </MemoryRouter>
  );
  expect(screen.getByText('pat')).toBeInTheDocument();
  expect(screen.getByText(/log out/i)).toBeInTheDocument();
  expect(screen.queryByText(/ELO/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/1234/)).not.toBeInTheDocument();
});
