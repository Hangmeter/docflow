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

Браузер использует только same-origin URL `/api/v1`. Nginx фронтенда проксирует `/api/` во внутренний сервис `backend`; backend подключается к PostgreSQL по имени `database`.

- Requirements: `docs/requirements.md`
- Development rules: `dev-guide.md`
- Database model for later stages: `database/schema/meeting-protocol.dbml`

### Troubleshooting `npm ci`

`npm ci` requires every dependency declared in `package.json` to be present in the corresponding `package-lock.json`. If manifests are changed, regenerate and commit the lockfiles before running CI or building release images:

```bash
npm install --package-lock-only
npm install --package-lock-only --prefix backend --workspaces=false
npm install --package-lock-only --prefix frontend --workspaces=false
```

The frontend runtime image contains only static files and therefore does not install development-only linting and formatting packages. The backend build currently synchronizes its lock metadata with `package.json` during `npm install`; after committing fully regenerated lockfiles, its Dockerfile should be switched back to `npm ci` for reproducible builds.
