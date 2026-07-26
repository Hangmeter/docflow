import { Router } from 'express';
import { ApplicationError } from '../../shared/errors/application-error.js';
import {
  optionalEmail,
  optionalId,
  optionalString,
  requireId,
  requireObject,
  requireString
} from '../../shared/validation/http-validation.js';
import { PersonRepository } from './person-repository.js';
import type { QueryClient } from '../../infrastructure/database/database-client.js';
export function createPersonRouter(database: QueryClient): Router {
  const router = Router();
  const repository = new PersonRepository(database);
  router.get('/', async (_request, response) =>
    response.json({ data: await repository.findAll() })
  );
  router.get('/:personId', async (request, response) => {
    const item = await repository.findById(requireId(request.params.personId, 'personId'));
    if (!item) throw new ApplicationError(404, 'PERSON_NOT_FOUND', 'Person was not found');
    response.json({ data: item });
  });
  router.post('/', async (request, response) => {
    const body = requireObject(request.body);
    const item = await repository.create({
      externalId: optionalString(body.externalId, 'externalId', 100),
      fullName: requireString(body.fullName, 'fullName', 255),
      email: optionalEmail(body.email, 'email'),
      phone: optionalString(body.phone, 'phone', 50),
      organizationId: optionalId(body.organizationId, 'organizationId'),
      departmentId: optionalId(body.departmentId, 'departmentId'),
      positionName: optionalString(body.positionName, 'positionName', 255)
    });
    response.status(201).json({ data: item });
  });
  return router;
}
