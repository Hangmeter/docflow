# Meeting Protocol System

Система ведения протоколов совещаний, решений и поручений. Реализованы справочники организаций, подразделений и сотрудников, список, просмотр и полное редактирование совещания, поиск кандидатов и управление составом участников. Повестка, протокол, решения и задачи остаются следующими этапами.

## Versions and architecture

- Node.js `22.14.0`; PostgreSQL `16.6`; Nginx `1.27.5`.
- `frontend` — статическое SPA; `backend` — strict TypeScript/Express; `database` — PostgreSQL с named volume.
- Одноразовый Compose-сервис `migrate` применяет SQL-миграции до запуска backend.
- Браузер обращается только к `/api/v1`; backend подключается к сервису `database`.
- SPA показывает совещания и справочники, позволяет создавать и редактировать совещания и управлять участниками; REST API запрещает изменения архивированного совещания.

## Start and stop

```bash
cp .env.example .env
docker compose up --build -d
curl -i http://localhost:8080/api/v1/health
curl -i http://localhost:8080/api/v1/ready
docker compose ps
docker compose down
```

После запуска доступны:

- frontend: <http://localhost:8080/> (порт задаётся `FRONTEND_PORT`);
- liveness: <http://localhost:8080/api/v1/health>;
- readiness: <http://localhost:8080/api/v1/ready>.

Удаление development-данных вместе с named volume: `docker compose down --volumes`.

## Database commands

Порядок подготовки пустой БД: **(1)** применить миграции, **(2)** при необходимости загрузить development seed, **(3)** запустить backend. Seed не заменяет миграции и очищает выбранную БД, поэтому не запускайте его над нужными данными.


Локально, при доступном `DATABASE_URL`:

```bash
npm run db:migrate
NODE_ENV=development npm run db:seed
npm run test:integration
```

Контейнерные эквиваленты:

```bash
docker compose run --rm migrate
docker compose run --rm -e NODE_ENV=development backend node dist/infrastructure/database/seeds/seed.js
docker compose run --rm integration-test
```

Seed очищает только выбранную development/test базу после проверки `NODE_ENV` и имени БД. Все данные вымышлены. Integration-тесты требуют отдельную `TEST_DATABASE_URL` и никогда не используют `DATABASE_URL` как fallback.

## Migration guarantees

Миграции из `database/migrations` применяются по версии и транзакционно. Таблица `schema_migrations` хранит версию, имя, SHA-256 checksum и время применения. Повторный запуск безопасен; изменение применённого файла обнаруживается по checksum и завершает команду с ошибкой.

## Checks

```bash
npm ci
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:integration
npm run build
docker compose config
```

`npm test` запускает unit-тесты workspaces. Интеграционные тесты запускаются отдельно и требуют подготовленной тестовой PostgreSQL из `TEST_DATABASE_URL`.

## API examples

Все запросы направляются через frontend URL:

```bash
curl 'http://localhost:8080/api/v1/meetings?meetingType=PLANNED&limit=10&offset=0'
curl 'http://localhost:8080/api/v1/meetings/1'

curl -X PUT 'http://localhost:8080/api/v1/meetings/1' \
  -H 'Content-Type: application/json' \
  -d '{"meetingNumber":"M-2026-07","title":"Еженедельное совещание","meetingType":"PLANNED","meetingFormat":"HYBRID","scheduledStartAt":"2026-08-03T07:00:00Z","scheduledEndAt":"2026-08-03T08:00:00Z","location":"Переговорная 2"}'

curl 'http://localhost:8080/api/v1/meetings/1/participant-candidates?search=Орлова'
curl -X POST 'http://localhost:8080/api/v1/meetings/1/participants' \
  -H 'Content-Type: application/json' \
  -d '{"personId":"7","participantRole":"MEMBER"}'
curl -X PATCH 'http://localhost:8080/api/v1/meetings/1/participants/31' \
  -H 'Content-Type: application/json' \
  -d '{"participantRole":"SECRETARY"}'
```

Полные request/response, validation rules и error codes описаны в `docs/api.md`.

## Project documents

- Requirements: `docs/requirements.md`
- Development rules: `dev-guide.md`
- Database model: `database/schema/meeting-protocol.dbml`
- Architecture and normalization: `docs/architecture.md`
- REST API: `docs/api.md`
