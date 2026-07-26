import { Router } from 'express';

import { createDepartmentRouter } from '../../modules/departments/department-routes.js';
import { createMeetingRouter } from '../../modules/meetings/meeting-routes.js';
import { createOrganizationRouter } from '../../modules/organizations/organization-routes.js';
import { createPersonRouter } from '../../modules/persons/person-routes.js';
import { ApplicationError } from '../../shared/errors/application-error.js';

import type { QueryClient } from '../database/database-client.js';

export function createApiRouter(database: QueryClient): Router {
  const router = Router();

  router.use('/organizations', createOrganizationRouter(database));
  router.use('/departments', createDepartmentRouter(database));
  router.use('/persons', createPersonRouter(database));
  router.use('/meetings', createMeetingRouter(database));

  router.get('/health', (_request, response): void => {
    response.status(200).json({ data: { status: 'ok' } });
  });

  router.get('/ready', async (_request, response, next): Promise<void> => {
    try {
      await database.query('SELECT 1');
      response.status(200).json({ data: { status: 'ready', database: 'available' } });
    } catch (error: unknown) {
      next(new ApplicationError(503, 'DATABASE_UNAVAILABLE', 'Database is not ready', error));
    }
  });

  return router;
}
