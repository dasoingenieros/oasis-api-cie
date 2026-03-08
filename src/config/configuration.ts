// src/config/configuration.ts

export interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  authMode: 'embedded' | 'external';
  database: {
    url: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  cors: {
    origin: string;
  };
}

export default (): AppConfig => {
  const port = parseInt(process.env['PORT'] ?? '3001', 10);
  const nodeEnv = (process.env['NODE_ENV'] ?? 'development') as AppConfig['nodeEnv'];
  const authMode = (process.env['AUTH_MODE'] ?? 'embedded') as AppConfig['authMode'];

  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const jwtSecret = process.env['JWT_SECRET'];
  if (!jwtSecret && nodeEnv === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }

  const jwtRefreshSecret = process.env['JWT_REFRESH_SECRET'];
  if (!jwtRefreshSecret && nodeEnv === 'production') {
    throw new Error('JWT_REFRESH_SECRET must be set in production');
  }

  return {
    port: isNaN(port) ? 3001 : port,
    nodeEnv,
    authMode,
    database: {
      url: databaseUrl,
    },
    jwt: {
      secret: jwtSecret ?? 'dev_secret_not_for_production',
      expiresIn: process.env['JWT_EXPIRES_IN'] ?? '15m',
      refreshSecret: jwtRefreshSecret ?? 'dev_refresh_secret_not_for_production',
      refreshExpiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d',
    },
    cors: {
      origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000',
    },
  };
};
