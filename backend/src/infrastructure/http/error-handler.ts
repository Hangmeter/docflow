import type { ErrorRequestHandler } from 'express';

import { ApplicationError } from '../../shared/errors/application-error.js';

import type { HttpLogger } from '../../app.js';

export function createErrorHandler(logger: HttpLogger): ErrorRequestHandler {
  return (error: unknown, request, response, _next): void => {
    const requestId = response.locals.requestId as string | undefined;
    const applicationError = error instanceof ApplicationError ? error : undefined;
    const statusCode = applicationError?.statusCode ?? 500;
    const code = applicationError?.code ?? 'INTERNAL_ERROR';
    const message = applicationError?.message ?? 'An unexpected error occurred';

    logger.error(
      { err: error, requestId, method: request.method, path: request.path, code },
      message
    );
    response.status(statusCode).json({ error: { code, message, requestId } });
  };
}
