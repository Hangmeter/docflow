import { loadApplicationConfig } from '../../../config/application-config.js';
import { createDatabaseClient } from '../database-client.js';
import { seedDevelopmentDatabase } from './development-seed.js';

const config = loadApplicationConfig();
const pool = createDatabaseClient(config.databaseUrl);
try {
  const counts = await seedDevelopmentDatabase(pool, process.env.NODE_ENV ?? 'production');
  process.stdout.write(`${JSON.stringify({ event: 'development_seed_complete', counts })}\n`);
} catch (error: unknown) {
  process.stderr.write(
    `${JSON.stringify({ event: 'development_seed_failed', message: error instanceof Error ? error.message : 'Unknown error' })}\n`
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
