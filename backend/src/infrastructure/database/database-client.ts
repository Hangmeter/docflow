import { Pool } from 'pg';

export function createDatabaseClient(databaseUrl: string): Pool {
  return new Pool({ connectionString: databaseUrl, max: 10 });
}
