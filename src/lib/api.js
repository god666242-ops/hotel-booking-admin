export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
export const ADMIN_API_URL = `${API_BASE}/admin`;

export async function fetchWithAuth(endpoint, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('hbe_token') : null;
  
  // Check if body is FormData (file upload)
  const isFormData = options.body instanceof FormData;

  const headers = {
    // Only set Content-Type to application/json if NOT uploading FormData
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${ADMIN_API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('hbe_token');
      localStorage.removeItem('hbe_user');
      localStorage.removeItem('hbe_hotel');
      window.location.href = '/login';
    }
    const err = new Error(data.message || 'API request failed');
    err.status = res.status;
    err.data = data; // lets callers read machine codes such as BALANCE_DUE
    throw err;
  }
  return data;
}

/** Downloads a protected file (e.g. a PDF invoice) and saves it in the browser. */
export async function downloadWithAuth(endpoint, fallbackName = 'download') {
  const token = typeof window !== 'undefined' ? localStorage.getItem('hbe_token') : null;
  const res = await fetch(`${ADMIN_API_URL}${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Download failed');
  }
  const match = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = match?.[1] || fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Ensure this calls fetchWithAuth directly
export async function uploadFilesWithAuth(endpoint, formData) {
  return fetchWithAuth(endpoint, {
    method: 'POST',
    body: formData,
  });
}