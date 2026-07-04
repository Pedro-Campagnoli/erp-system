export interface AppConfig {
  env: string;
  port: number;
  apiPrefix: string;
  corsOrigin: string;
  jwt: {
    accessSecret: string;
    accessExpiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  bcryptSaltRounds: number;
  // Liga as rotas de apoio a testes E2E (`src/testing/`) e a documentação
  // Swagger (`/api/docs`). Deliberadamente uma flag explícita, não derivada
  // de `NODE_ENV !== 'production'` — qualquer ambiente de staging/homologação
  // que não use exatamente a string "production" ficaria exposto por engano.
  enableTestingRoutes: boolean;
}

export default (): AppConfig => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET as string,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET as string,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '10', 10),
  enableTestingRoutes: process.env.ENABLE_TESTING_ROUTES === 'true',
});
