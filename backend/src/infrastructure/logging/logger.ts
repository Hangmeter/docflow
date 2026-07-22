import pino from 'pino';

import type { ApplicationConfig } from '../../config/application-config.js';

export function createLogger(config: ApplicationConfig): pino.Logger {
  return pino({
    level: config.logLevel,
    base: { service: 'meeting-protocol-backend' },
    redact: ['req.headers.authorization', 'req.headers.cookie', 'databaseUrl']
  });
}
