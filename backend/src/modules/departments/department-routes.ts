import { Router } from 'express';
import { ApplicationError } from '../../shared/errors/application-error.js';
import {
  optionalId,
  optionalString,
  requireId,
  requireObject,
  requireString
} from '../../shared/validation/http-validation.js';
import { DepartmentRepository } from './department-repository.js';
import type { QueryClient } from '../../infrastructure/database/database-client.js';
export function createDepartmentRouter(database: QueryClient): Router {
  const router = Router();
  const repository = new DepartmentRepository(database);
  router.get('/', async (_request, response) =>
    response.json({ data: await repository.findAll() })
  );
  router.get('/:departmentId', async (request, response) => {
    const item = await repository.findById(requireId(request.params.departmentId, 'departmentId'));
    if (!item) throw new ApplicationError(404, 'DEPARTMENT_NOT_FOUND', 'Department was not found');
    response.json({ data: item });
  });
  router.post('/', async (request, response) => {
    const body = requireObject(request.body);
    const item = await repository.create({
      organizationId: requireId(body.organizationId, 'organizationId'),
      parentDepartmentId: optionalId(body.parentDepartmentId, 'parentDepartmentId'),
      name: requireString(body.name, 'name', 255),
      shortName: optionalString(body.shortName, 'shortName', 100)
    });
    response.status(201).json({ data: item });
  });
  return router;
}
