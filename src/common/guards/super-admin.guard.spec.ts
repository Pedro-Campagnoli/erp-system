import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SuperAdminGuard } from './super-admin.guard';

/**
 * Regressão: as rotas de administração da PLATAFORMA (`GET /empresas`,
 * CRUD de `/planos`) devem exigir `usuario.superAdmin === true` — nunca o
 * sistema de permissões por tenant, que é escopado a `empresaId`/loja.
 */
describe('SuperAdminGuard', () => {
  const guard = new SuperAdminGuard();

  function buildContext(user?: { superAdmin?: boolean }): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  it('permite a requisição quando usuario.superAdmin é true', () => {
    expect(guard.canActivate(buildContext({ superAdmin: true }))).toBe(true);
  });

  it('rejeita quando usuario.superAdmin é false (ex.: admin comum de uma empresa)', () => {
    expect(() =>
      guard.canActivate(buildContext({ superAdmin: false })),
    ).toThrow(ForbiddenException);
  });

  it('rejeita quando não há usuário autenticado na requisição', () => {
    expect(() => guard.canActivate(buildContext(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
