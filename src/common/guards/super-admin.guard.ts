import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

/**
 * Restringe uma rota à administração da PLATAFORMA (equipe interna,
 * cross-tenant) — exige `usuario.superAdmin === true`.
 *
 * Propositalmente **não** usa o sistema de `@Permissions()`/`PermissionsGuard`:
 * aquele sistema é escopado por tenant (`Papel`/`Permissao` de uma empresa) e
 * não deveria decidir acesso a rotas de plataforma como `GET /empresas`
 * (lista todas as empresas clientes) ou o CRUD de `/planos`. Aplique este
 * guard nessas rotas em vez de `@Permissions(PERMISSIONS.ADMIN.*)`.
 *
 * `usuario.superAdmin` só é concedido pela equipe interna (via seed/suporte),
 * nunca pelo onboarding público de uma empresa (`POST /empresas`) — ver
 * `src/empresas/tenant-onboarding.ts`.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user?.superAdmin) {
      throw new ForbiddenException('Restrito a administradores da plataforma');
    }

    return true;
  }
}
