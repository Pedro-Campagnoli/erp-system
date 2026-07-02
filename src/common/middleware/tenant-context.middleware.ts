import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

export const LOJA_HEADER = 'x-loja-id';

/**
 * Extrai o id da loja de contexto informado pelo cliente (header `x-loja-id`).
 * Apenas transporta o dado bruto — a validação de que o usuário autenticado
 * realmente tem acesso a essa loja é feita pelo LojaAccessGuard, que roda
 * depois do JwtAuthGuard já ter populado `request.user`.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
    const header = req.headers[LOJA_HEADER];
    const lojaId = Array.isArray(header) ? header[0] : header;
    req.lojaId = lojaId;
    next();
  }
}
