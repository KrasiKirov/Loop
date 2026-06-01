import { apiFetch } from './client';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('accessToken', 'old-access');
  localStorage.setItem('refreshToken', 'refresh-1');
});

test('on 401 it refreshes once and retries with the new token', async () => {
  const calls = [];
  global.fetch = jest.fn((url, opts) => {
    calls.push({ url, auth: opts.headers && opts.headers.Authorization });
    if (url.endsWith('/questions?subject=Calculus') && opts.headers.Authorization === 'Bearer old-access') {
      return Promise.resolve({ status: 401, ok: false });
    }
    if (url.endsWith('/auth/refresh')) {
      return Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve({ accessToken: 'new-access', refreshToken: 'refresh-2' }) });
    }
    return Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve([{ question: 'q' }]) });
  });

  const res = await apiFetch('/questions?subject=Calculus');
  expect(res.status).toBe(200);
  expect(localStorage.getItem('accessToken')).toBe('new-access');
  expect(localStorage.getItem('refreshToken')).toBe('refresh-2');
  // the retry carried the new bearer token
  expect(calls[calls.length - 1].auth).toBe('Bearer new-access');
});
