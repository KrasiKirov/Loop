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
    if (url.endsWith('/cards/next?pattern=sliding-window') && opts.headers.Authorization === 'Bearer old-access') {
      return Promise.resolve({ status: 401, ok: false });
    }
    if (url.endsWith('/auth/refresh')) {
      return Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve({ accessToken: 'new-access', refreshToken: 'refresh-2' }) });
    }
    return Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve([{ question: 'q' }]) });
  });

  const res = await apiFetch('/cards/next?pattern=sliding-window');
  expect(res.status).toBe(200);
  expect(localStorage.getItem('accessToken')).toBe('new-access');
  expect(localStorage.getItem('refreshToken')).toBe('refresh-2');
  // the retry carried the new bearer token
  expect(calls[calls.length - 1].auth).toBe('Bearer new-access');
});

test('concurrent 401s trigger only one refresh (single-flight)', async () => {
  let refreshCount = 0;
  global.fetch = jest.fn((url, opts) => {
    if (url.endsWith('/auth/refresh')) {
      refreshCount += 1;
      return Promise.resolve({
        status: 200,
        ok: true,
        json: () => Promise.resolve({ accessToken: 'new-access', refreshToken: 'refresh-2' }),
      });
    }
    if (opts.headers.Authorization === 'Bearer old-access') {
      return Promise.resolve({ status: 401, ok: false });
    }
    return Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve({ ok: true }) });
  });

  const [a, b] = await Promise.all([apiFetch('/a'), apiFetch('/b')]);
  expect(a.status).toBe(200);
  expect(b.status).toBe(200);
  expect(refreshCount).toBe(1);
});
