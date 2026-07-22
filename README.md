# Meeting Protocol System

Система ведения протоколов совещаний, решений и поручений. На этапе 1 создан только инфраструктурный каркас: предметные CRUD-модули, совещания, протоколы, решения и задачи ещё не реализованы.

## Versions

- Node.js `22.14.0`;
- PostgreSQL `16.6`;
- Nginx `1.27.5`.

## Architecture

- `frontend` — статическое SPA на HTML, CSS и JavaScript ES modules, выдаваемое Nginx;
- `backend` — Express REST API на TypeScript в strict-режиме;
- `database` — PostgreSQL с именованным томом `meeting-protocol-database-data`.

Браузер использует только same-origin URL `/api/v1`. Nginx фронтенда проксирует `/api/` во внутренний сервис `backend`; backend подключается к PostgreSQL по имени `database`.

## Start

1. Создайте локальную конфигурацию без добавления её в Git:

   ```bash
   cp .env.example .env
   ```

2. Соберите и запустите сервисы:

   ```bash
   docker compose up --build -d
   ```

3. Откройте `http://localhost:8080`. Стартовая страница выполнит проверку backend через `/api/v1/health`.

## Stop

```bash
docker compose down
```

Для удаления и named volume с данными:

```bash
docker compose down --volumes
```

## Health checks

```bash
curl -i http://localhost:8080/api/v1/health
curl -i http://localhost:8080/api/v1/ready
docker compose ps
```

`/api/v1/health` проверяет liveness API. `/api/v1/ready` выполняет минимальный параметронезависимый запрос `SELECT 1` к PostgreSQL и подтверждает готовность подключения.

## Local checks

Из корня репозитория:

```bash
npm ci
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
docker compose config
```

## Project documents

- Requirements: `docs/requirements.md`
- Development rules: `dev-guide.md`
- Database model for later stages: `database/schema/meeting-protocol.dbml`
