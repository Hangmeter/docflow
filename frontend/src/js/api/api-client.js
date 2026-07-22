import { runtimeConfig } from '../config/runtime-config.js';
const REQUEST_TIMEOUT_MS = 5_000;
export async function getHealth() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${runtimeConfig.apiBaseUrl}/health`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`Backend returned HTTP ${response.status}`);
    return response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}
