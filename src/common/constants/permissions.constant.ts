import { ModuloSistema } from '../../../generated/prisma/enums';

/**
 * Catálogo de códigos de permissão usados pelo `@Permissions()` guard.
 * Deve espelhar os registros semeados em `prisma/seed.ts` na tabela `permissoes`.
 * Módulos futuros (fiscal, financeiro, estoque) devem estender este objeto,
 * nunca strings soltas nos controllers.
 *
 * IMPORTANTE: `ADMIN` é o módulo de administração da PLATAFORMA (equipe
 * interna, cross-tenant) — nunca de uma empresa/tenant. Essas rotas não são
 * gateadas por este catálogo de permissões; usam `SuperAdminGuard`
 * (`src/common/guards/super-admin.guard.ts`), que exige
 * `usuario.superAdmin === true`. As entradas abaixo existem só como
 * documentação do catálogo/seed — ver `MODULOS_PLATAFORMA`.
 */
export const PERMISSIONS = {
  ADMIN: {
    GERENCIAR_PLANOS: 'admin.planos.gerenciar',
    LISTAR_EMPRESAS: 'admin.empresas.listar',
  },
  CADASTROS: {
    EDITAR_EMPRESA: 'cadastros.empresa.editar',
    CRIAR_LOJA: 'cadastros.lojas.criar',
    EDITAR_LOJA: 'cadastros.lojas.editar',
    EXCLUIR_LOJA: 'cadastros.lojas.excluir',
    CRIAR_USUARIO: 'cadastros.usuarios.criar',
    EDITAR_USUARIO: 'cadastros.usuarios.editar',
    EXCLUIR_USUARIO: 'cadastros.usuarios.excluir',
    GERENCIAR_PAPEIS: 'cadastros.papeis.gerenciar',
    GERENCIAR_ACESSOS: 'cadastros.acessos.gerenciar',
  },
} as const;

/**
 * Módulos do catálogo de `Permissao` que são de escopo de PLATAFORMA — nunca
 * podem ser atribuídos a um papel de uma empresa (tenant), nem concedidos
 * automaticamente ao papel "Administrador" criado no onboarding. Fonte de
 * verdade em CÓDIGO (não só convenção de nome do código da permissão):
 * qualquer `Permissao` cujo `modulo` esteja nesta lista é de plataforma,
 * independentemente do prefixo do código.
 *
 * Ver `PapeisService` (rejeita atribuir essas permissões a papéis de
 * empresa) e `onboardTenant` (nunca concede permissões desses módulos ao
 * Administrador de um tenant novo).
 */
export const MODULOS_PLATAFORMA: readonly ModuloSistema[] = [
  ModuloSistema.ADMIN,
];

/** `true` quando a permissão pertence a um módulo de escopo de plataforma. */
export function isModuloDePlataforma(modulo: ModuloSistema): boolean {
  return (MODULOS_PLATAFORMA as ModuloSistema[]).includes(modulo);
}
