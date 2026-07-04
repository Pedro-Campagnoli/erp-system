import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { formatValidationErrors } from './common/validators/format-validation-errors.util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const port = configService.get<number>('port')!;
  const apiPrefix = configService.get<string>('apiPrefix')!;
  const corsOrigin = configService.get<string>('corsOrigin')!;

  app.use(helmet());
  app.use(compression());
  app.enableCors({ origin: corsOrigin === '*' ? true : corsOrigin.split(',') });
  app.setGlobalPrefix(apiPrefix);

  // Documentação OpenAPI — gateada pela mesma flag explícita do
  // TestingModule (`ENABLE_TESTING_ROUTES`, ver `app.module.ts` e
  // `configuration.ts`), não por `NODE_ENV !== 'production'`: essa checagem
  // deixava o Swagger exposto por engano em qualquer ambiente cujo
  // `NODE_ENV` não fosse exatamente "production" (ex.: staging acessível
  // pela rede).
  if (configService.get<boolean>('enableTestingRoutes')) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('ERP API')
        .setDescription(
          'API multi-tenant do ERP (empresas, lojas, usuários, permissões)',
        )
        .setVersion('1.0')
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) =>
        new BadRequestException(formatValidationErrors(errors)),
    }),
  );

  await app.listen(port);
  Logger.log(
    `🚀 Aplicação rodando em http://localhost:${port}/${apiPrefix}`,
    'Bootstrap',
  );
}

void bootstrap();
