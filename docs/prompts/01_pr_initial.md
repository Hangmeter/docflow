Изучи репозиторий системы ведения протоколов совещаний.

Перед началом полностью прочитай:

1. AGENTS.md
2. docs/requirements.md
3. dev-guide.md
4. database/schema/meeting-protocol.dbml
5. README.md

Выполни только этап 1 спецификации: создание рабочего каркаса репозитория.

Не реализуй пока предметные CRUD-модули, совещания, протоколы, решения и задачи.

Необходимо:

1. Создать frontend как одностраничное приложение:
   - один index.html;
   - JavaScript ES modules;
   - CSS;
   - отдельный контейнер Nginx;
   - стартовая страница с проверкой доступности backend.

2. Создать backend:
   - Node.js;
   - TypeScript strict;
   - Express;
   - модульная структура согласно dev-guide.md;
   - GET /api/v1/health;
   - GET /api/v1/ready;
   - единый обработчик ошибок;
   - requestId;
   - структурированное логирование.

3. Подготовить PostgreSQL:
   - отдельный контейнер;
   - named volume;
   - healthcheck;
   - пока не создавай всю предметную схему, кроме минимального механизма подключения и проверки готовности.

4. Создать:
   - Dockerfile для frontend;
   - Dockerfile для backend;
   - docker-compose.yml;
   - nginx/default.conf;
   - package.json и lock-файлы;
   - конфигурацию TypeScript;
   - ESLint и formatter;
   - базовые тесты health endpoint;
   - рабочий .env.example.

5. Настроить проксирование:
   Browser -> frontend /api -> backend.

6. Обновить README.md:
   - запуск;
   - остановка;
   - проверка health;
   - команды lint, typecheck, test и build.

Обязательные критерии:

- frontend, backend и database запускаются в отдельных контейнерах;
- frontend не обращается напрямую к PostgreSQL;
- backend использует имя сервиса database;
- TypeScript компилируется в strict-режиме;
- секреты не добавляются;
- не используй any без обоснования;
- не реализуй функциональность следующих этапов.

После выполнения запусти все доступные проверки.

В итоговом отчёте перечисли:
- созданные и изменённые файлы;
- выбранные версии Node.js и PostgreSQL;
- команды запуска;
- результаты typecheck, lint, tests и build;
- результат docker compose config;
- результат smoke-теста, если Docker доступен;
- проверки, которые не удалось выполнить.