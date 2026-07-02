import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_LOJA_KEY } from '../decorators/require-loja.decorator';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

/**
 * Garante o isolamento entre lojas de uma mesma empresa: quando a requisição
 * informa uma loja de contexto (header `x-loja-id`), valida que o usuário
 * autenticado tem acesso a ela. Usuários `superAdmin` têm acesso irrestrito
 * a todas as lojas da própria empresa.
 */
@Injectable()
export class LojaAccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const usuario = request.user;
    const lojaId = request.lojaId;

    const lojaObrigatoria = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_LOJA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!lojaId) {
      if (lojaObrigatoria) {
        throw new ForbiddenException(
          'Informe a loja de contexto (header "x-loja-id")',
        );
      }
      return true;
    }

    if (usuario?.superAdmin) {
      return true;
    }

    const temAcesso = usuario?.lojas.some((loja) => loja.lojaId === lojaId);

    if (!temAcesso) {
      throw new ForbiddenException('Você não tem acesso a esta loja');
    }

    return true;
  }
}
