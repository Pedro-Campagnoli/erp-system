import { ModuloSistema } from '../../generated/prisma/enums';
import { Prisma } from '../../generated/prisma/client';
import { onboardTenant } from './tenant-onboarding';

interface PapelCreateArgs {
  data: { permissoes: { create: { permissaoId: string }[] } };
}

interface UsuarioCreateArgs {
  data: { superAdmin: boolean };
}

/**
 * Regressão do bug crítico: o onboarding de uma empresa nova concedia TODO o
 * catálogo de `Permissao` (sem filtro) ao papel "Administrador" do tenant,
 * incluindo permissões de módulo `ADMIN` (administração da PLATAFORMA —
 * listar todas as empresas clientes, gerenciar planos globais). Estes
 * testes fixam o contrato: o papel Administrador de um tenant só pode
 * receber permissões filtradas por `modulo: { notIn: MODULOS_PLATAFORMA }`,
 * e o usuário administrador nunca é criado com `superAdmin: true`.
 */
describe('onboardTenant', () => {
  function buildTx(permissoesRetornadas: { id: string }[]) {
    const papelCreate = jest
      .fn<Promise<{ id: string }>, [PapelCreateArgs]>()
      .mockResolvedValue({ id: 'papel-1' });
    const usuarioCreate = jest
      .fn<Promise<{ id: string }>, [UsuarioCreateArgs]>()
      .mockResolvedValue({ id: 'usuario-1' });

    const tx = {
      empresa: { create: jest.fn().mockResolvedValue({ id: 'empresa-1' }) },
      loja: { create: jest.fn().mockResolvedValue({ id: 'loja-1' }) },
      permissao: {
        findMany: jest.fn().mockResolvedValue(permissoesRetornadas),
      },
      papel: { create: papelCreate },
      usuario: { create: usuarioCreate },
      usuarioLoja: { create: jest.fn().mockResolvedValue({}) },
    };

    return { tx, papelCreate, usuarioCreate };
  }

  const dadosBase = {
    cnpj: '11222333000181',
    razaoSocial: 'Empresa Teste LTDA',
    email: 'contato@teste.com',
    planoId: 'plano-1',
    admin: { nome: 'Admin', email: 'admin@teste.com', senhaHash: 'hash-fake' },
  };

  it('consulta o catálogo de permissões excluindo os módulos de plataforma', async () => {
    const { tx } = buildTx([{ id: 'perm-cadastros-1' }]);

    await onboardTenant(tx as unknown as Prisma.TransactionClient, dadosBase);

    expect(tx.permissao.findMany).toHaveBeenCalledWith({
      where: { modulo: { notIn: [ModuloSistema.ADMIN] } },
      select: { id: true },
    });
  });

  it('cria o papel Administrador só com as permissões retornadas pela consulta filtrada (nunca "todo o catálogo")', async () => {
    const permissoesDeTenant = [
      { id: 'perm-cadastros-1' },
      { id: 'perm-cadastros-2' },
    ];
    const { tx, papelCreate } = buildTx(permissoesDeTenant);

    await onboardTenant(tx as unknown as Prisma.TransactionClient, dadosBase);

    const chamada = papelCreate.mock.calls[0][0];
    const permissoesConcedidas = chamada.data.permissoes.create.map(
      (p) => p.permissaoId,
    );

    expect(permissoesConcedidas).toEqual([
      'perm-cadastros-1',
      'perm-cadastros-2',
    ]);
    // Nenhuma permissão "extra" além do que a consulta filtrada devolveu —
    // ou seja, nada de conceder o catálogo completo por fora do filtro.
    expect(permissoesConcedidas).toHaveLength(permissoesDeTenant.length);
  });

  it('nunca cria o usuário administrador do tenant com superAdmin: true', async () => {
    const { tx, usuarioCreate } = buildTx([]);

    await onboardTenant(tx as unknown as Prisma.TransactionClient, dadosBase);

    const chamada = usuarioCreate.mock.calls[0][0];
    expect(chamada.data.superAdmin).toBe(false);
  });
});
