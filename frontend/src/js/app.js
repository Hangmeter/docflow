import { api } from './api/api-client.js';
import { logger } from './shared/logger.js';
const list = document.querySelector('#meeting-list');
const dialog = document.querySelector('#meeting-dialog');
const form = document.querySelector('#meeting-form');
function text(value) {
  return value ?? '—';
}
function showError(error) {
  logger.error('Request failed', error);
  return `Не удалось выполнить запрос${error.requestId ? `. Код: ${error.requestId}` : ''}`;
}
function renderMeetings(items) {
  list.replaceChildren();
  if (items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'Совещания не найдены';
    list.append(empty);
    return;
  }
  for (const meeting of items) {
    const card = document.createElement('article');
    card.className = 'meeting-card';
    card.tabIndex = 0;
    card.dataset.meetingId = meeting.id;
    const date = new Date(meeting.scheduledStartAt).toLocaleString('ru-RU');
    for (const [className, value] of [
      ['meeting-number', text(meeting.meetingNumber)],
      ['meeting-title', meeting.title],
      ['meeting-meta', `${date} · ${meeting.meetingFormat}`],
      [
        'meeting-meta',
        `Председатель: ${text(meeting.chairperson)} · Открытых задач: ${meeting.openTaskCount}`
      ]
    ]) {
      const node = document.createElement(className === 'meeting-title' ? 'h3' : 'p');
      node.className = className;
      node.textContent = value;
      card.append(node);
    }
    list.append(card);
  }
}
async function loadMeetings(query = '') {
  list.textContent = 'Загрузка…';
  try {
    renderMeetings(await api.meetings(query));
  } catch (error) {
    list.textContent = showError(error);
  }
}
async function loadDirectories() {
  const [organizations, departments, persons] = await Promise.all([
    api.organizations(),
    api.departments(),
    api.persons()
  ]);
  for (const [id, items, label] of [
    ['organization-list', organizations, (item) => item.name],
    ['department-list', departments, (item) => item.name],
    ['person-list', persons, (item) => `${item.fullName} — ${text(item.positionName)}`]
  ]) {
    const target = document.querySelector(`#${id}`);
    target.replaceChildren(
      ...items.map((item) => {
        const li = document.createElement('li');
        li.textContent = label(item);
        return li;
      })
    );
  }
}
document.querySelector('#meeting-filters').addEventListener('submit', (event) => {
  event.preventDefault();
  const values = new FormData(event.currentTarget);
  const query = new URLSearchParams();
  for (const [key, value] of values) if (value) query.set(key, value);
  void loadMeetings(`?${query}`);
});
document.querySelector('#new-meeting').addEventListener('click', () => dialog.showModal());
document.querySelector('#cancel-meeting').addEventListener('click', () => dialog.close());
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form));
  try {
    await api.createMeeting({
      ...values,
      scheduledStartAt: new Date(values.scheduledStartAt).toISOString()
    });
    dialog.close();
    form.reset();
    await loadMeetings();
  } catch (error) {
    document.querySelector('#form-error').textContent = showError(error);
  }
});
for (const tab of document.querySelectorAll('.tab'))
  tab.addEventListener('click', () => {
    for (const item of document.querySelectorAll('.tab'))
      item.classList.toggle('is-active', item === tab);
    document.querySelector('#meetings-view').hidden = tab.dataset.view !== 'meetings';
    document.querySelector('#directories-view').hidden = tab.dataset.view !== 'directories';
    if (tab.dataset.view === 'directories')
      void loadDirectories().catch((error) => logger.error('Directories failed', error));
  });
api
  .health()
  .then(() => {
    document.querySelector('#backend-status').textContent = 'API доступен';
  })
  .catch((error) => {
    document.querySelector('#backend-status').textContent = 'API недоступен';
    logger.error('Health failed', error);
  });
void loadMeetings();

const detailsDialog = document.querySelector('#meeting-details');
async function openMeetingDetails(meetingId) {
  try {
    const meeting = await api.meeting(meetingId);
    document.querySelector('#detail-title').textContent = meeting.title;
    document.querySelector('#detail-meta').textContent =
      `${new Date(meeting.scheduledStartAt).toLocaleString('ru-RU')} · ${meeting.meetingFormat}`;
    const participants = document.querySelector('#detail-participants');
    participants.replaceChildren(
      ...meeting.participants.map((participant) => {
        const item = document.createElement('li');
        item.textContent = `${participant.fullName} — ${participant.participantRole} — ${participant.attendanceStatus}`;
        return item;
      })
    );
    detailsDialog.showModal();
  } catch (error) {
    logger.error('Meeting details failed', error);
  }
}
list.addEventListener('click', (event) => {
  const card = event.target.closest('.meeting-card');
  if (card) void openMeetingDetails(card.dataset.meetingId);
});
document.querySelector('#close-details').addEventListener('click', () => detailsDialog.close());
