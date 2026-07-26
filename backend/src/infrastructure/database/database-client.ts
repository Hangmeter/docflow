import { Pool } from 'pg';

import type { PoolClient, QueryResult, QueryResultRow } from 'pg';

export interface QueryClient {
  query<Row extends QueryResultRow = QueryResultRow>(
    queryText: string,
    values?: unknown[]
  ): Promise<QueryResult<Row>>;
}

export function createDatabaseClient(databaseUrl: string): Pool {
  return new Pool({
    connectionString: databaseUrl,
    max: 10,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000
  });
}

export async function withTransaction<Result>(
  pool: Pool,
  operation: (client: PoolClient) => Promise<Result>
): Promise<Result> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error: unknown) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
