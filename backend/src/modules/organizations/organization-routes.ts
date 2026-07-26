import { Router } from 'express';
import { ApplicationError } from '../../shared/errors/application-error.js';
import {
  optionalString,
  requireId,
  requireObject,
  requireString
} from '../../shared/validation/http-validation.js';
import { OrganizationRepository } from './organization-repository.js';
import type { QueryClient } from '../../infrastructure/database/database-client.js';

export function createOrganizationRouter(database: QueryClient): Router {
  const router = Router();
  const repository = new OrganizationRepository(database);
  router.get('/', async (_request, response) =>
    response.json({ data: await repository.findAll() })
  );
  router.get('/:organizationId', async (request, response) => {
    const item = await repository.findById(
      requireId(request.params.organizationId, 'organizationId')
    );
    if (!item)
      throw new ApplicationError(404, 'ORGANIZATION_NOT_FOUND', 'Organization was not found');
    response.json({ data: item });
  });
  router.post('/', async (request, response) => {
    const body = requireObject(request.body);
    const item = await repository.create({
      name: requireString(body.name, 'name', 255),
      shortName: optionalString(body.shortName, 'shortName', 100),
      externalCode: optionalString(body.externalCode, 'externalCode', 100)
    });
    response.status(201).json({ data: item });
  });
  return router;
}
