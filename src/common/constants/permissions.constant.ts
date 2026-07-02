/**
 * Catálogo de códigos de permissão usados pelo `@Permissions()` guard.
 * Deve espelhar os registros semeados em `prisma/seed.ts` na tabela `permissoes`.
 * Módulos futuros (fiscal, financeiro, estoque) devem estender este objeto,
 * nunca strings soltas nos controllers.
 */
export const PERMISSIONS = {
  ADMIN: {
    GERENCIAR_PLANOS: 'admin.planos.gerenciar',
    LISTAR_EMPRESAS: 'admin.empresas.listar',
  },
  CADASTROS: {
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
