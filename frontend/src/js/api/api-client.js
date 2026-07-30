import { runtimeConfig } from '../config/runtime-config.js';
const REQUEST_TIMEOUT_MS = 5000;
async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${runtimeConfig.apiBaseUrl}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...options.headers
      },
      signal: controller.signal
    });
    const payload = response.status === 204 ? null : await response.json();
    if (!response.ok) {
      const error = new Error(payload?.error?.message ?? `HTTP ${response.status}`);
      error.requestId = payload?.error?.requestId;
      throw error;
    }
    return payload?.data;
  } finally {
    window.clearTimeout(timeout);
  }
}
export const api = Object.freeze({
  health: () => request('/health'),
  meetings: (query = '') => request(`/meetings${query}`),
  meeting: (meetingId) => request(`/meetings/${meetingId}`),
  createMeeting: (body) => request('/meetings', { method: 'POST', body: JSON.stringify(body) }),
  updateMeeting: (meetingId, body) =>
    request(`/meetings/${meetingId}`, { method: 'PUT', body: JSON.stringify(body) }),
  organizations: () => request('/organizations'),
  departments: () => request('/departments'),
  persons: () => request('/persons')
});
