import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

/** Valida que o usuário autenticado possui todas as permissões exigidas pela rota. */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permissoesExigidas = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!permissoesExigidas || permissoesExigidas.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const usuario = request.user;

    if (usuario?.superAdmin) {
      return true;
    }

    const possuiTodas = permissoesExigidas.every((codigo) =>
      usuario?.permissoes.includes(codigo),
    );

    if (!possuiTodas) {
      throw new ForbiddenException(
        'Você não tem permissão para executar esta ação',
      );
    }

    return true;
  }
}
