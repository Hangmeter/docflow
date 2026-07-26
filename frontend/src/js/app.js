import { getHealth } from './api/api-client.js';
import { logger } from './shared/logger.js';
const statusIndicator = document.querySelector('#status-indicator');
const statusTitle = document.querySelector('#status-title');
const statusDetail = document.querySelector('#status-detail');
const retryButton = document.querySelector('#retry-button');
function updateStatus(state, title, detail) {
  statusIndicator.className = `status-indicator status-indicator--${state}`;
  statusTitle.textContent = title;
  statusDetail.textContent = detail;
}
async function checkBackendHealth() {
  retryButton.disabled = true;
  updateStatus('pending', 'Проверяем backend…', 'Запрос выполняется через /api/v1/health.');
  try {
    const response = await getHealth();
    if (response?.data?.status !== 'ok')
      throw new Error('Backend returned an unexpected health response');
    updateStatus('ready', 'Backend доступен', 'Проверка /api/v1/health успешно завершена.');
    logger.debug('Backend health check completed');
  } catch (error) {
    updateStatus(
      'error',
      'Backend недоступен',
      'Проверьте состояние контейнера backend и повторите попытку.'
    );
    logger.error('Backend health check failed', error);
  } finally {
    retryButton.disabled = false;
  }
}
retryButton.addEventListener('click', checkBackendHealth);
void checkBackendHealth();
