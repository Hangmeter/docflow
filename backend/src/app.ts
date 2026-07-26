import express from 'express';

import { createErrorHandler } from './infrastructure/http/error-handler.js';
import { createApiRouter } from './infrastructure/http/routes.js';
import { addRequestContext } from './infrastructure/http/request-context.js';

import type { QueryClient } from './infrastructure/database/database-client.js';

export interface HttpLogger {
  error(bindings: object, message: string): void;
}

export function createApp(database: QueryClient, logger: HttpLogger): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use(addRequestContext);
  app.use('/api/v1', createApiRouter(database));
  app.use(createErrorHandler(logger));
  return app;
}
