/**
 * API client for making authenticated requests to the backend
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Get the stored access token from localStorage
 */
export function getAccessToken(): string | null {
  return localStorage.getItem('accessToken');
}

/**
 * Check if the current token is expired
 */
export function isTokenExpired(): boolean {
  const expiration = localStorage.getItem('tokenExpiration');
  if (!expiration) return false;
  return Date.now() > parseInt(expiration);
}

/**
 * Store the access token and expiration date
 */
export function setAccessToken(token: string, expirationDate?: number): void {
  localStorage.setItem('accessToken', token);
  if (expirationDate) {
    localStorage.setItem('tokenExpiration', expirationDate.toString());
  }
}

/**
 * Clear the access token (logout)
 */
export function clearAccessToken(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('tokenExpiration');
}

/**
 * Make an authenticated API request
 * Automatically includes the Authorization header with the Bearer token
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  // Handle 401 Unauthorized - token expired or invalid
  if (response.status === 401) {
    clearAccessToken();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || 'Request failed');
  }

  return response.json();
}

/**
 * Login API call
 */
export async function login(username: string, password: string): Promise<{
  accessToken: string;
  expirationDate: number;
}> {
  const response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Login failed');
  }

  return data;
}

/**
 * Logout - clear token and redirect to login
 */
export function logout(): void {
  clearAccessToken();
  window.location.href = '/login';
}
