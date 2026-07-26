import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../src/app.js';

let queryCalls = 0;
const database = {
  async query(queryText: string): Promise<unknown> {
    queryCalls += 1;
    return { queryText };
  }
};
const logger = {
  error(): void {
    return;
  }
};

describe('health endpoints', () => {
  it('returns liveness status and a request ID', async () => {
    const response = await request(createApp(database, logger)).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { status: 'ok' } });
    expect(response.headers['x-request-id']).toMatch(/^[A-Za-z0-9-]+$/);
  });

  it('returns readiness when PostgreSQL can be queried', async () => {
    const response = await request(createApp(database, logger)).get('/api/v1/ready');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { status: 'ready', database: 'available' } });
    expect(queryCalls).toBeGreaterThan(0);
  });
});
