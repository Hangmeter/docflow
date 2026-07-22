# Architecture

The initial operational skeleton contains three independently deployed containers:

1. **frontend**: Nginx serves the static HTML/CSS/ES-module SPA on port 8080. Nginx proxies `/api/` to `backend:3000`.
2. **backend**: Node.js/Express hosts versioned REST endpoints. It receives `DATABASE_URL` that identifies the `database` Compose service and exposes health/readiness endpoints.
3. **database**: PostgreSQL persists data in the named `database_data` volume. No domain schema is created at this stage.

The browser never receives PostgreSQL credentials and only makes same-origin API requests. Future domain modules belong in backend `modules/`, with controllers, services, validation, and repositories separated as described in `dev-guide.md`.
