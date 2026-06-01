const API_URL = process.env.REACT_APP_API_URL;

export const setTokens = ({ accessToken, refreshToken }) => {
  if (accessToken) localStorage.setItem('accessToken', accessToken);
  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
};

export const clearAuth = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

// Single-flight: concurrent 401s share one in-flight refresh so the rotating
// refresh token is only spent once (a second call would use an already-rotated
// token and fail).
let refreshPromise = null;

const doRefresh = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return false;
  setTokens(await res.json());
  return true;
};

const refreshTokens = () => {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

export const apiFetch = async (path, options = {}, retry = true) => {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const access = localStorage.getItem('accessToken');
  if (access) headers.Authorization = `Bearer ${access}`;

  const body =
    options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers, body });

  if (res.status === 401 && retry) {
    if (await refreshTokens()) return apiFetch(path, options, false);
    clearAuth();
    if (typeof window !== 'undefined') window.location.href = '/login';
  }
  return res;
};
