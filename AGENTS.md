# AGENTS.md

## Project

This repository contains a meeting protocol management system.

Architecture:

- frontend: single-page HTML application using JavaScript ES modules and CSS;
- backend: Node.js and TypeScript REST API;
- database: PostgreSQL;
- frontend, backend and database run in separate containers;
- frontend communicates with backend only through `/api/v1`;
- frontend container proxies `/api` requests to backend.

## Required documents

Before making changes, read:

1. `docs/requirements.md`
2. `dev-guide.md`
3. `database/schema/meeting-protocol.dbml`
4. `README.md`
5. existing database migrations

## Mandatory rules

- Follow `dev-guide.md`.
- Do not change the technology stack without an explicit request.
- Do not put business logic in the frontend.
- Do not place SQL in HTTP controllers.
- Use parameterized SQL queries.
- Validate all external input.
- Use strict TypeScript.
- Do not use `any` without a documented reason.
- Do not store secrets in the repository.
- Do not modify an existing migration after it has been applied.
- One meeting may have only one protocol.
- A task must be linked to a decision and discussion.
- The consolidated task table must be computed, not stored separately.
- Return API errors in the common project format.
- Include a request ID in backend logs.

## Required checks

After changes, run all available checks:

```bash
npm run typecheck
npm run lint
npm test
npm run build
docker compose config