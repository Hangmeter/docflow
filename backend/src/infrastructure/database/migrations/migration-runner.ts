import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { Pool, QueryResultRow } from 'pg';

interface AppliedMigrationRow extends QueryResultRow {
  version: string;
  name: string;
  checksum: string;
}

export interface MigrationResult {
  applied: string[];
  skipped: string[];
}

const MIGRATION_FILE_PATTERN = /^(\d{4})-[a-z0-9-]+\.sql$/;

function calculateChecksum(sql: string): string {
  return createHash('sha256').update(sql).digest('hex');
}

export async function runMigrations(
  pool: Pool,
  migrationsDirectory: string
): Promise<MigrationResult> {
  const client = await pool.connect();
  const applied: string[] = [];
  const skipped: string[] = [];

  try {
    await client.query('SELECT pg_advisory_lock($1)', [2_026_072_601]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version varchar(20) PRIMARY KEY,
        name text NOT NULL UNIQUE,
        checksum char(64) NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const result = await client.query<AppliedMigrationRow>(
      'SELECT version, name, checksum FROM schema_migrations ORDER BY version'
    );
    const existing = new Map(result.rows.map((row) => [row.version, row]));
    const files = (await readdir(migrationsDirectory))
      .filter((fileName) => MIGRATION_FILE_PATTERN.test(fileName))
      .sort();

    for (const fileName of files) {
      const version = fileName.slice(0, 4);
      const sql = await readFile(resolve(migrationsDirectory, fileName), 'utf8');
      const checksum = calculateChecksum(sql);
      const previous = existing.get(version);

      if (previous) {
        if (previous.name !== fileName || previous.checksum !== checksum) {
          throw new Error(`Applied migration ${version} has been modified`);
        }
        skipped.push(fileName);
        continue;
      }

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)',
          [version, fileName, checksum]
        );
        await client.query('COMMIT');
        applied.push(fileName);
      } catch (error: unknown) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
    return { applied, skipped };
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [2_026_072_601]).catch(() => undefined);
    client.release();
  }
}
