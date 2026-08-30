/**
 * Centralized API Configuration & Client
 * Backend runs strictly on port 8001: http://127.0.0.1:8001 in dev
 */

const RAW_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export const API_BASE_URL = RAW_BASE_URL || '/api';

export async function apiFetch<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Standardize path: always starts with /api
  const apiPath = cleanEndpoint.startsWith('/api') ? cleanEndpoint : `/api${cleanEndpoint}`;
  const url = RAW_BASE_URL ? `${RAW_BASE_URL}${apiPath}` : apiPath;

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: `HTTP error ${response.status}: ${response.statusText}` }));
      throw new Error(errorData.detail || errorData.message || `Request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (err: any) {
    console.error(`API Fetch Error [${url}]:`, err);
    throw err;
  }
}

