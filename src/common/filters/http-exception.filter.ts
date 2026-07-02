import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '../../../generated/prisma/client';
import { ValidationErrorDetail } from '../validators/format-validation-errors.util';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  errors?: ValidationErrorDetail[];
  timestamp: string;
  path: string;
}

const PRISMA_STATUS_MAP: Record<
  string,
  { status: HttpStatus; message: string }
> = {
  P2002: {
    status: HttpStatus.CONFLICT,
    message: 'Já existe um registro com esses dados',
  },
  P2025: { status: HttpStatus.NOT_FOUND, message: 'Registro não encontrado' },
  P2003: {
    status: HttpStatus.CONFLICT,
    message: 'Operação viola uma referência existente',
  },
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<{ url: string }>();

    const { status, message, error, errors } = this.resolveException(exception);

    const body: ErrorBody = {
      statusCode: status,
      message,
      error,
      ...(errors ? { errors } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.url} -> ${JSON.stringify(message)}`,
        (exception as Error)?.stack,
      );
    }

    response.status(status).json(body);
  }

  private resolveException(exception: unknown): {
    status: HttpStatus;
    message: string | string[];
    error: string;
    errors?: ValidationErrorDetail[];
  } {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const status: HttpStatus = exception.getStatus();

      if (typeof response === 'string') {
        return { status, message: response, error: exception.name };
      }

      const responseObj = response as {
        message?: string | string[];
        error?: string;
        errors?: ValidationErrorDetail[];
      };
      return {
        status,
        message: responseObj.message ?? exception.message,
        error: responseObj.error ?? exception.name,
        errors: responseObj.errors,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = PRISMA_STATUS_MAP[exception.code];
      if (mapped) {
        return {
          status: mapped.status,
          message: mapped.message,
          error: 'PrismaError',
        };
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Erro interno do servidor',
      error: 'InternalServerError',
    };
  }
}
