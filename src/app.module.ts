import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], validate }),
    PrismaModule,
    AuthModule,
    PlanosModule,
    EmpresasModule,
    LojasModule,
    PermissoesModule,
    UsuariosModule,
    // Rotas de apoio a testes E2E (repo erp-tests) — nunca em produção.
    ...(process.env.NODE_ENV !== 'production' ? [TestingModule] : []),
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
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
