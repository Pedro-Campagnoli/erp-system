import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
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
