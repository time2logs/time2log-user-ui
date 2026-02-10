/**
 * API client for making authenticated requests to the backend
 * Uses HTTP-only cookies for authentication (managed by the backend)
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Make an authenticated API request
 * Cookies are sent automatically by the browser (HTTP-only cookies)
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include', // Required for cookies to be sent
    headers
  });

  // Handle 401 Unauthorized - token expired or invalid
  if (response.status === 401) {
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}

/**
 * Login API call
 * Backend sets HTTP-only cookie on successful login
 */
export async function login(email: string, password: string): Promise<{
  message: string;
  email: string;
  userId: string;
}> {
  const response = await fetch(`${API_BASE}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Login failed');
  }

  return data;
}

/**
 * Verify token - check if user is authenticated
 */
export async function verifyToken(): Promise<{
  valid: boolean;
  role?: string;
  personId?: string;
  personName?: string;
  message?: string;
}> {
  const response = await fetch(`${API_BASE}/api/verify-token`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Token verification failed');
  }

  return response.json();
}

/**
 * Logout - call backend to clear cookie and redirect to login
 */
export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/logout`, {
      method: 'POST',
      credentials: 'include'
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    window.location.href = '/login';
  }
}
