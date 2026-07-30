# REST API

## Общие соглашения

Все маршруты имеют префикс `/api/v1`, принимают и возвращают JSON (кроме ответов `204`) и доступны фронтенду через same-origin proxy Nginx. Идентификаторы в JSON-ответах представлены строками, поскольку в PostgreSQL используется `bigint`.

Каждый ответ содержит `X-Request-Id`. Корректный входящий ID сохраняется, иначе сервер создаёт новый. Успех имеет envelope `{ "data": ... }`, ошибка — единый вид:

```json
{"error":{"code":"VALIDATION_ERROR","message":"title must be a non-empty string up to 500 characters","requestId":"d34f3f58-5327-45b7-bc85-706fb1ad148f"}}
```

Необработанная ошибка возвращает `500 INTERNAL_ERROR` без внутренних деталей.

## Служебные endpoints

### `GET /api/v1/health`

Liveness без обращения к БД. Query-параметры и body отсутствуют. **Ответ `200`:** `{ "data": { "status": "ok" } }`.

### `GET /api/v1/ready`

Readiness выполняет минимальный запрос к PostgreSQL. Query-параметры и body отсутствуют. **Ответ `200`:** `{ "data": { "status": "ready", "database": "available" } }`.

**Ошибки:** `503 DATABASE_UNAVAILABLE`, если БД недоступна; `500 INTERNAL_ERROR` для иной неожиданной ошибки.

## Совещания

Модель `Meeting` содержит `id`, `meetingNumber`, `title`, `meetingType`, `meetingFormat`, `scheduledStartAt`, `scheduledEndAt`, `actualStartAt`, `actualEndAt`, `location`, `conferenceUrl`, `nextMeetingAt`, `specialNotes`. Даты сериализуются как ISO date-time, optional-значения — `null`.

### `GET /api/v1/meetings`

Возвращает массив совещаний по плановой дате и ID по убыванию. Элемент дополнен `protocolStatus` (`null` либо `DRAFT`, `ON_APPROVAL`, `APPROVED`, `ARCHIVED`, `CANCELLED`), `chairperson` (`string|null`) и `openTaskCount` (`number`). Body отсутствует.

| Query | Validation rules | Default |
| --- | --- | --- |
| `search` | строка до 500 символов; поиск по номеру/названию без учёта регистра | нет фильтра |
| `meetingType` | `PLANNED`, `EXTRAORDINARY`, `WORKING`, `OTHER` | нет фильтра |
| `protocolStatus` | `DRAFT`, `ON_APPROVAL`, `APPROVED`, `ARCHIVED`, `CANCELLED` | нет фильтра |
| `from`, `to` | ISO date-time, включительные границы планового начала | нет фильтра |
| `limit` | неотрицательное целое, максимум 100 | `25` |
| `offset` | неотрицательное целое, максимум 100000 | `0` |

**Ответ `200`:** `{ "data": [MeetingListItem, ...] }`. **Ошибки:** `400 VALIDATION_ERROR`, `500 INTERNAL_ERROR`.

### `POST /api/v1/meetings`

Создаёт совещание. Query отсутствует; body и его validation rules совпадают с `PUT` ниже. **Ответ `201`:** `{ "data": Meeting }`. **Ошибки:** `400 VALIDATION_ERROR`, `500 INTERNAL_ERROR`.

### `GET /api/v1/meetings/{meetingId}`

Возвращает карточку с полями `Meeting`, `archived: boolean` и `participants: Participant[]`. Query и body отсутствуют. `meetingId` — положительный целочисленный идентификатор.

```json
{"data":{"id":"12","meetingNumber":"M-2026-07","title":"Еженедельное совещание","meetingType":"PLANNED","meetingFormat":"HYBRID","scheduledStartAt":"2026-08-03T07:00:00.000Z","scheduledEndAt":"2026-08-03T08:00:00.000Z","actualStartAt":null,"actualEndAt":null,"location":"Переговорная 2","conferenceUrl":null,"nextMeetingAt":null,"specialNotes":null,"archived":false,"participants":[]}}
```

**Ответ `200`:** как выше. **Ошибки:** `400 VALIDATION_ERROR`, `404 MEETING_NOT_FOUND`, `500 INTERNAL_ERROR`.

### `PUT /api/v1/meetings/{meetingId}`

Полностью заменяет редактируемые сведения. Пропущенные optional-поля становятся `null`, а enum — default. Query отсутствует; `meetingId` — положительное целое.

| Request body | Обязательность и validation rules |
| --- | --- |
| `title` | обязательно; непустая строка до 500 символов |
| `scheduledStartAt` | обязательно; ISO date-time |
| `meetingNumber` | optional; строка до 50 символов; `null`/`""` очищает |
| `meetingType` | optional `PLANNED`, `EXTRAORDINARY`, `WORKING`, `OTHER`; default `PLANNED` |
| `meetingFormat` | optional `IN_PERSON`, `VIDEO_CONFERENCE`, `HYBRID`, `OTHER`; default `VIDEO_CONFERENCE` |
| `scheduledEndAt` | optional ISO date-time/`null`; не раньше планового начала |
| `actualStartAt` | optional ISO date-time/`null` |
| `actualEndAt` | optional ISO date-time/`null`; при заданном начале не раньше него |
| `location` | optional строка до 500 символов/`null` |
| `conferenceUrl` | optional абсолютный HTTP(S) URL до 2000 символов/`null` |
| `nextMeetingAt` | optional ISO date-time/`null` |
| `specialNotes` | optional строка до 10000 символов/`null` |

Неизвестные поля игнорируются. **Ответ `200`:** `{ "data": Meeting }`.

**Ошибки:** `400 VALIDATION_ERROR`; `404 MEETING_NOT_FOUND`; `409 MEETING_ARCHIVED`; `409 MEETING_NOT_UPDATED` при ином отказе обновления; `500 INTERNAL_ERROR`.

## Участники

`Participant` содержит `id`, `meetingId`, `personId`, `fullName`, `participantRole`, `positionSnapshot`, `departmentSnapshot`, `organizationSnapshot`. Один сотрудник добавляется один раз; допускается не более одного председателя и секретаря; архивированный состав неизменяем.

```json
{"id":"31","meetingId":"12","personId":"7","fullName":"Мария Орлова","participantRole":"SECRETARY","positionSnapshot":"Ведущий специалист","departmentSnapshot":"Проектный офис","organizationSnapshot":"Пример"}
```

### `GET /api/v1/meetings/{meetingId}/participants`

Возвращает участников по роли и имени. Query/body отсутствуют; `meetingId` — положительное целое. **Ответ `200`:** `{ "data": [Participant, ...] }`. Для несуществующего корректного ID возвращается `[]`. **Ошибки:** `400 VALIDATION_ERROR`, `500 INTERNAL_ERROR`.

### `GET /api/v1/meetings/{meetingId}/participant-candidates`

Возвращает до 50 активных ещё не добавленных сотрудников. Query `search` — optional строка до 255 символов, поиск по ФИО/должности без учёта регистра. Body отсутствует; `meetingId` — положительное целое. Для несуществующего ID текущая реализация также формирует кандидатов.

```json
{"data":[{"id":"7","fullName":"Мария Орлова","positionName":"Ведущий специалист","departmentName":"Проектный офис","organizationName":"Пример"}]}
```

**Ошибки:** `400 VALIDATION_ERROR`, `500 INTERNAL_ERROR`.

### `POST /api/v1/meetings/{meetingId}/participants`

Добавляет активного сотрудника и фиксирует кадровые снимки. Query отсутствует. Body: обязательный положительный `personId`; optional `participantRole` из `CHAIRPERSON`, `SECRETARY`, `MEMBER`, `INVITED` (default `MEMBER`). Неизвестные поля игнорируются.

**Ответ `201`:** `{ "data": Participant }`. **Ошибки:** `400 VALIDATION_ERROR`; `404 MEETING_NOT_FOUND`; `404 PERSON_NOT_FOUND` для отсутствующего/неактивного сотрудника; `409 MEETING_ARCHIVED`; `409 PARTICIPANT_ALREADY_EXISTS`; `409 PARTICIPANT_ROLE_CONFLICT`; `500 INTERNAL_ERROR`.

### `PATCH /api/v1/meetings/{meetingId}/participants/{participantId}`

Меняет роль, не обновляя снимки. Query отсутствует; path ID — положительные целые. Body: optional `participantRole` из четырёх значений выше; пропуск означает `MEMBER`. Неизвестные поля игнорируются.

**Ответ `200`:** `{ "data": Participant }`. **Ошибки:** `400 VALIDATION_ERROR`; `404 MEETING_NOT_FOUND`; `404 PARTICIPANT_NOT_FOUND`; `409 MEETING_ARCHIVED`; `409 PARTICIPANT_ROLE_CONFLICT`; `500 INTERNAL_ERROR`.

### `DELETE /api/v1/meetings/{meetingId}/participants/{participantId}`

Удаляет участника. Председателя/секретаря сначала переводят на другую роль. Query/body отсутствуют; path ID — положительные целые. **Ответ `204`:** пустой body.

**Ошибки:** `400 VALIDATION_ERROR`; `404 MEETING_NOT_FOUND`; `404 PARTICIPANT_NOT_FOUND`; `409 MEETING_ARCHIVED`; `409 PARTICIPANT_ROLE_REQUIRED`; `500 INTERNAL_ERROR`.

## Справочники

Также реализованы `GET|POST /organizations`, `GET /organizations/{organizationId}`, `GET|POST /departments`, `GET /departments/{departmentId}`, `GET|POST /persons`, `GET /persons/{personId}` под `/api/v1`. Они используют те же envelopes; вход валидируется до repository-слоя.
