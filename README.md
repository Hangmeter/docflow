# Meeting Protocol System

Система ведения протоколов совещаний, решений и поручений. Этап 2 реализует PostgreSQL-схему, миграции, development seed и минимальные repositories; предметные REST CRUD endpoints и формы ещё не реализованы.

## Versions and architecture

- Node.js `22.14.0`; PostgreSQL `16.6`; Nginx `1.27.5`.
- `frontend` — статическое SPA; `backend` — strict TypeScript/Express; `database` — PostgreSQL с named volume.
- Одноразовый Compose-сервис `migrate` применяет SQL-миграции до запуска backend.
- Браузер обращается только к `/api/v1`; backend подключается к сервису `database`.

## Start and stop

```bash
cp .env.example .env
docker compose up --build -d
curl -i http://localhost:8080/api/v1/health
curl -i http://localhost:8080/api/v1/ready
docker compose ps
docker compose down
```

Удаление development-данных вместе с named volume: `docker compose down --volumes`.

## Database commands

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

## Project documents

- Requirements: `docs/requirements.md`
- Development rules: `dev-guide.md`
- Database model: `database/schema/meeting-protocol.dbml`
- Architecture and normalization: `docs/architecture.md`
- REST API: `docs/api.md`
