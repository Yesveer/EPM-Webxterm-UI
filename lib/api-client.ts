const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

interface RequestOptions extends RequestInit {
  token?: string;
  _skipRefresh?: boolean;
}

// Mutex: prevents multiple simultaneous refresh calls when concurrent requests all get 401
let isRefreshing = false;
let refreshQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

async function doTokenRefresh(expiredToken: string): Promise<string> {
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: expiredToken }),
  });
  if (!response.ok) throw new Error('Refresh failed');
  const data = await response.json();
  return data.token as string;
}

function clearAuthStorage() {
  localStorage.removeItem('vsay-token');
  localStorage.removeItem('vsay-user');
  localStorage.removeItem('vsay-session-token');
  localStorage.removeItem('vsay-available-tenants');
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token, _skipRefresh, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    // Handle 401: try silent token refresh once, then logout
    if (response.status === 401 && token && !_skipRefresh) {
      if (isRefreshing) {
        // Another refresh is already in progress — queue this request
        return new Promise<T>((resolve, reject) => {
          refreshQueue.push({
            resolve: (newToken) => {
              resolve(apiRequest<T>(endpoint, { ...options, token: newToken, _skipRefresh: true }));
            },
            reject,
          });
        });
      }

      isRefreshing = true;

      try {
        const newToken = await doTokenRefresh(token);

        // Persist new token and notify AuthContext via custom event
        localStorage.setItem('vsay-token', newToken);
        window.dispatchEvent(new CustomEvent('vsay-token-refreshed', { detail: { token: newToken } }));

        // Unblock all queued requests
        refreshQueue.forEach(({ resolve }) => resolve(newToken));
        refreshQueue = [];

        // Retry original request with new token
        return apiRequest<T>(endpoint, { ...options, token: newToken, _skipRefresh: true });
      } catch {
        // Refresh failed — session is dead, force logout
        refreshQueue.forEach(({ reject: rej }) => rej(new APIError(401, 'Session expired')));
        refreshQueue = [];
        clearAuthStorage();
        window.location.href = '/login';
        throw new APIError(401, 'Session expired. Please login again.');
      } finally {
        isRefreshing = false;
      }
    }

    if (!response.ok) {
      let errorMessage = 'An error occurred';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      throw new APIError(response.status, errorMessage);
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(0, 'Network error. Please check your connection.');
  }
}
