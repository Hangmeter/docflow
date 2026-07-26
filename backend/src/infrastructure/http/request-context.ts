import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

const REQUEST_ID_HEADER = 'x-request-id';
const REQUEST_ID_PATTERN = /^[A-Za-z0-9-]{1,128}$/;

export function addRequestContext(request: Request, response: Response, next: NextFunction): void {
  const candidate = request.header(REQUEST_ID_HEADER);
  const requestId = candidate && REQUEST_ID_PATTERN.test(candidate) ? candidate : randomUUID();

  response.locals.requestId = requestId;
  response.setHeader('X-Request-Id', requestId);
  next();
}
