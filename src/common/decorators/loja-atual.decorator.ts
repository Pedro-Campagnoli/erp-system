import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

/** Retorna o id da loja de contexto da requisição (header `x-loja-id`), validado pelo LojaAccessGuard. */
export const LojaAtual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.lojaId;
  },
);
