import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { validate } from './config/env.validation';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { LojaAccessGuard } from './common/guards/loja-access.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { EmpresasModule } from './empresas/empresas.module';
import { LojasModule } from './lojas/lojas.module';
import { PermissoesModule } from './permissoes/permissoes.module';
import { PlanosModule } from './planos/planos.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { TestingModule } from './testing/testing.module';

// Rotas de apoio a testes E2E (repo erp-tests) e a documentação Swagger só
// existem quando `ENABLE_TESTING_ROUTES=true` é definido explicitamente —
// nunca ligado a `NODE_ENV !== 'production'` (frágil: qualquer ambiente cujo
// NODE_ENV não seja exatamente "production", ex.: staging, ficaria exposto
// por engano). Avaliado no import (fora do DI), por isso lê `process.env`
// direto em vez de via `ConfigService` — ver `configuration.ts` para o
// mesmo valor exposto ao restante da app.
const ENABLE_TESTING_ROUTES = process.env.ENABLE_TESTING_ROUTES === 'true';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], validate }),
    // Rate limiting global (ver overrides mais estritos via `@Throttle()` em
    // login/refresh/signup). Armazenamento em memória — não sobrevive a
    // múltiplas instâncias/restart; se a API rodar com mais de uma réplica,
    // troque por um storage compartilhado (ex.: Redis, `@nest-lab/throttler-storage-redis`).
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    PlanosModule,
    EmpresasModule,
    LojasModule,
    PermissoesModule,
    UsuariosModule,
    // Rotas de apoio a testes E2E (repo erp-tests) — nunca em produção.
    ...(ENABLE_TESTING_ROUTES ? [TestingModule] : []),
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: LojaAccessGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
