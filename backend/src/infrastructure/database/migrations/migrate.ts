import { resolve } from 'node:path';

import { loadApplicationConfig } from '../../../config/application-config.js';
import { createDatabaseClient } from '../database-client.js';
import { runMigrations } from './migration-runner.js';

const config = loadApplicationConfig();
const pool = createDatabaseClient(config.databaseUrl);
const migrationsDirectory = resolve(process.env.MIGRATIONS_DIR ?? '../database/migrations');

try {
  const result = await runMigrations(pool, migrationsDirectory);
  process.stdout.write(`${JSON.stringify({ event: 'migrations_complete', ...result })}\n`);
} catch (error: unknown) {
  process.stderr.write(
    `${JSON.stringify({ event: 'migrations_failed', message: error instanceof Error ? error.message : 'Unknown error' })}\n`
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
