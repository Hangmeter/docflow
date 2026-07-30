import { api } from './api/api-client.js';
import { logger } from './shared/logger.js';
const list = document.querySelector('#meeting-list');
const dialog = document.querySelector('#meeting-dialog');
const form = document.querySelector('#meeting-form');
let selectedMeeting = null;
const roleLabels = {
  CHAIRPERSON: 'Председатель',
  SECRETARY: 'Секретарь',
  MEMBER: 'Участник',
  INVITED: 'Приглашённый'
};
function text(value) {
  return value ?? '—';
}
function showError(error) {
  logger.error('Request failed', error);
  return `${error.message ?? 'Не удалось выполнить запрос'}${error.requestId ? `. Код: ${error.requestId}` : ''}`;
}
function localDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function openCreateForm() {
  form.reset();
  form.elements.meetingId.value = '';
  document.querySelector('#meeting-form-title').textContent = 'Новое совещание';
  document.querySelector('#save-meeting').textContent = 'Создать';
  document.querySelector('#form-error').textContent = '';
  dialog.showModal();
}
function openEditForm() {
  if (!selectedMeeting || selectedMeeting.archived) return;
  for (const field of [
    'meetingNumber',
    'title',
    'meetingType',
    'meetingFormat',
    'location',
    'conferenceUrl',
    'specialNotes'
  ])
    form.elements[field].value = selectedMeeting[field] ?? '';
  for (const field of [
    'scheduledStartAt',
    'scheduledEndAt',
    'actualStartAt',
    'actualEndAt',
    'nextMeetingAt'
  ])
    form.elements[field].value = localDateTime(selectedMeeting[field]);
  form.elements.meetingId.value = selectedMeeting.id;
  document.querySelector('#meeting-form-title').textContent = 'Редактирование совещания';
  document.querySelector('#save-meeting').textContent = 'Сохранить';
  document.querySelector('#form-error').textContent = '';
  detailsDialog.close();
  dialog.showModal();
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
document.querySelector('#new-meeting').addEventListener('click', openCreateForm);
document.querySelector('#cancel-meeting').addEventListener('click', () => dialog.close());
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form));
  const meetingId = values.meetingId;
  delete values.meetingId;
  for (const field of [
    'scheduledStartAt',
    'scheduledEndAt',
    'actualStartAt',
    'actualEndAt',
    'nextMeetingAt'
  ])
    values[field] = values[field] ? new Date(values[field]).toISOString() : null;
  try {
    const saved = meetingId
      ? await api.updateMeeting(meetingId, values)
      : await api.createMeeting(values);
    dialog.close();
    form.reset();
    await loadMeetings();
    if (meetingId) {
      await openMeetingDetails(saved.id, 'Изменения сохранены');
    }
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
async function openMeetingDetails(meetingId, notice = '') {
  try {
    const meeting = await api.meeting(meetingId);
    selectedMeeting = meeting;
    document.querySelector('#detail-title').textContent = meeting.title;
    document.querySelector('#detail-meta').textContent =
      `${new Date(meeting.scheduledStartAt).toLocaleString('ru-RU')} · ${meeting.meetingFormat}`;
    const details = document.querySelector('#detail-fields');
    details.replaceChildren();
    for (const [label, value] of [
      ['Номер', meeting.meetingNumber],
      ['Тип', meeting.meetingType],
      [
        'Плановое окончание',
        meeting.scheduledEndAt && new Date(meeting.scheduledEndAt).toLocaleString('ru-RU')
      ],
      [
        'Фактическое начало',
        meeting.actualStartAt && new Date(meeting.actualStartAt).toLocaleString('ru-RU')
      ],
      [
        'Фактическое окончание',
        meeting.actualEndAt && new Date(meeting.actualEndAt).toLocaleString('ru-RU')
      ],
      ['Место', meeting.location],
      ['Видеоконференция', meeting.conferenceUrl],
      [
        'Следующее совещание',
        meeting.nextMeetingAt && new Date(meeting.nextMeetingAt).toLocaleString('ru-RU')
      ],
      ['Особые отметки', meeting.specialNotes]
    ]) {
      const term = document.createElement('dt');
      term.textContent = label;
      const description = document.createElement('dd');
      description.textContent = text(value);
      details.append(term, description);
    }
    document.querySelector('#edit-meeting').hidden = meeting.archived;
    document.querySelector('#detail-notice').textContent = meeting.archived
      ? 'Архивированное совещание нельзя редактировать'
      : notice;
    renderParticipants(meeting.participants);
    document.querySelector('#add-participant').hidden = meeting.archived;
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
document.querySelector('#edit-meeting').addEventListener('click', openEditForm);

const participantDialog = document.querySelector('#participant-dialog');
const participantForm = document.querySelector('#participant-form');
function renderParticipants(items) {
  const body = document.querySelector('#detail-participants');
  body.replaceChildren();
  for (const participant of items) {
    const row = document.createElement('tr');
    for (const value of [
      participant.fullName,
      participant.organizationSnapshot,
      participant.departmentSnapshot,
      participant.positionSnapshot
    ]) {
      const cell = document.createElement('td');
      cell.textContent = text(value);
      row.append(cell);
    }
    const roleCell = document.createElement('td');
    const role = document.createElement('select');
    for (const [value, label] of Object.entries(roleLabels)) role.add(new Option(label, value));
    role.value = participant.participantRole;
    role.disabled = selectedMeeting.archived;
    role.addEventListener('change', async () => {
      try {
        await api.updateParticipant(selectedMeeting.id, participant.id, {
          participantRole: role.value
        });
        await refreshParticipants();
      } catch (error) {
        role.value = participant.participantRole;
        document.querySelector('#participant-error').textContent = showError(error);
      }
    });
    roleCell.append(role);
    row.append(roleCell);
    const actions = document.createElement('td');
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Удалить';
    remove.hidden = selectedMeeting.archived;
    remove.addEventListener('click', async () => {
      if (!window.confirm(`Удалить участника «${participant.fullName}»?`)) return;
      try {
        await api.deleteParticipant(selectedMeeting.id, participant.id);
        await refreshParticipants();
      } catch (error) {
        document.querySelector('#participant-error').textContent = showError(error);
      }
    });
    actions.append(remove);
    row.append(actions);
    body.append(row);
  }
}
async function refreshParticipants() {
  const meeting = await api.meeting(selectedMeeting.id);
  selectedMeeting = meeting;
  renderParticipants(meeting.participants);
  document.querySelector('#participant-error').textContent = '';
}
async function loadCandidates() {
  const query = document.querySelector('#participant-search').value;
  const candidates = await api.participantCandidates(selectedMeeting.id, query);
  const select = participantForm.elements.personId;
  select.replaceChildren();
  for (const candidate of candidates)
    select.add(new Option(`${candidate.fullName} — ${text(candidate.positionName)}`, candidate.id));
}
document.querySelector('#add-participant').addEventListener('click', async () => {
  participantForm.reset();
  document.querySelector('#participant-form-error').textContent = '';
  await loadCandidates();
  participantDialog.showModal();
});
document.querySelector('#participant-search').addEventListener(
  'input',
  () =>
    void loadCandidates().catch((error) => {
      document.querySelector('#participant-form-error').textContent = showError(error);
    })
);
document
  .querySelector('#cancel-participant')
  .addEventListener('click', () => participantDialog.close());
participantForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(participantForm));
  try {
    await api.addParticipant(selectedMeeting.id, values);
    participantDialog.close();
    await refreshParticipants();
  } catch (error) {
    document.querySelector('#participant-form-error').textContent = showError(error);
  }
});
