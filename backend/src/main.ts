import { createApp } from './app.js';
import { loadApplicationConfig } from './config/application-config.js';
import { createDatabaseClient } from './infrastructure/database/database-client.js';
import { createLogger } from './infrastructure/logging/logger.js';

const config = loadApplicationConfig();
const logger = createLogger(config);
const database = createDatabaseClient(config.databaseUrl);
const app = createApp(database, logger);

const server = app.listen(config.port, () => {
  logger.info({ port: config.port }, 'Backend server started');
});

function shutDown(signal: string): void {
  logger.info({ signal }, 'Shutting down backend server');
  server.close(() => {
    void database.end().finally(() => process.exit(0));
  });
}

process.on('SIGTERM', () => shutDown('SIGTERM'));
process.on('SIGINT', () => shutDown('SIGINT'));
