# Architecture

The system runs as three long-lived containers plus a one-shot migration job:

1. **frontend**: Nginx serves the static HTML/CSS/ES-module SPA and proxies `/api/` to `backend:3000`.
2. **migrate**: uses the backend image to apply checksum-verified SQL migrations transactionally before backend startup.
3. **backend**: Node.js/Express hosts versioned REST endpoints and uses a PostgreSQL connection pool.
4. **database**: PostgreSQL persists data in the named `database_data` volume.

The browser never receives PostgreSQL credentials. Domain SQL is restricted to migration, seed, and repository modules; repositories do not depend on Express.

## Database lifecycle

Migration files are ordered by their four-digit version. `schema_migrations` records version, filename, SHA-256 checksum, and application time. An advisory lock prevents concurrent runners. Every unapplied file and its metadata insert execute in one transaction; a changed applied file causes a fatal error.

Development seed data is inserted transactionally. The seed refuses production-like environments and database names, then truncates only the selected development/test database before loading deterministic fictional records.

## Normalization decision

`tasks.discussion_id` was removed from the physical schema and DBML because `tasks.decision_id → decisions.discussion_id` determines the discussion unambiguously. Keeping both columns would permit contradictory links. A task remains obligatorily linked to both concepts through the mandatory decision foreign key. No consolidated task table is stored.

The `COMPLETED` invariant is enforced directly by PostgreSQL: the task must have `progress_percent = 100` and a non-null `actual_completion_date`. Clients must update status, progress, and completion date in the same SQL statement or transaction.
