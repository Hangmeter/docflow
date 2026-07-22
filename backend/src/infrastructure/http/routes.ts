import { Router } from 'express';

export interface DatabaseHealthClient {
  query(queryText: string): Promise<unknown>;
}

export function createApiRouter(database: DatabaseHealthClient): Router {
  const router = Router();

  router.get('/health', (_request, response): void => {
    response.status(200).json({ data: { status: 'ok' } });
  });

  router.get('/ready', async (_request, response, next): Promise<void> => {
    try {
      await database.query('SELECT 1');
      response.status(200).json({ data: { status: 'ready', database: 'available' } });
    } catch (error: unknown) {
      next(error);
    }
  });

  return router;
}
