export interface ApplicationConfig {
  port: number;
  databaseUrl: string;
  logLevel: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
}

const LOG_LEVELS = new Set<ApplicationConfig['logLevel']>([
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal'
]);

function getPort(value: string | undefined): number {
  const port = Number(value ?? '3000');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  return port;
}

export function loadApplicationConfig(
  environment: NodeJS.ProcessEnv = process.env
): ApplicationConfig {
  const databaseUrl = environment.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const logLevel = environment.LOG_LEVEL ?? 'info';
  if (!LOG_LEVELS.has(logLevel as ApplicationConfig['logLevel'])) {
    throw new Error('LOG_LEVEL is invalid');
  }

  return {
    port: getPort(environment.PORT),
    databaseUrl,
    logLevel: logLevel as ApplicationConfig['logLevel']
  };
}
