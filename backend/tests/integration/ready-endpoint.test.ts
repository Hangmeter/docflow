import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import type { QueryResult, QueryResultRow } from 'pg';
const logger = {
  error(): void {
    return;
  }
};
describe('ready endpoint failures', () => {
  it('returns the common error response when the database is unavailable', async () => {
    const database = {
      async query<Row extends QueryResultRow>(): Promise<QueryResult<Row>> {
        throw new Error('connection unavailable');
      }
    };
    const response = await request(createApp(database, logger)).get('/api/v1/ready');
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('DATABASE_UNAVAILABLE');
    expect(response.body.error.requestId).toBe(response.headers['x-request-id']);
    expect(JSON.stringify(response.body)).not.toContain('connection unavailable');
  });
});
