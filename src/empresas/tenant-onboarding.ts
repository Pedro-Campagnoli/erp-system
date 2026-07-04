import { Prisma } from '../../generated/prisma/client';
import { MODULOS_PLATAFORMA } from '../common/constants/permissions.constant';
import { toJsonInput } from '../common/utils/json.util';

export interface DadosOnboardingTenant {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  inscricaoEstadual?: string;
  email: string;
  telefone?: string;
  endereco?: object;
  planoId: string;
  admin: {
    nome: string;
    email: string;
    /** Já deve chegar hasheada (bcrypt) — este módulo nunca lida com senha em texto puro. */
    senhaHash: string;
  };
}

export interface ResultadoOnboardingTenant {
  empresaId: string;
  lojaMatrizId: string;
  papelAdminId: string;
  usuarioAdminId: string;
}

/**
 * Onboarding de um novo tenant, compartilhado entre `EmpresasService.create`
 * (rota pública `POST /empresas`) e `prisma/seed.ts` (empresa de
 * demonstração) — as duas únicas origens que criam uma `Empresa` do zero.
 * Existir num único lugar evita que as duas implementações divirjam (já
 * aconteceu: as duas concediam TODO o catálogo de permissões, incluindo as
 * de administração da plataforma, ao papel "Administrador" do tenant).
 *
 * Cria, numa única transação (o `tx` recebido): a `Empresa`, a `Loja`
 * matriz, o `Papel` "Administrador" e o `Usuario` administrador, já
 * vinculado à loja matriz.
 *
 * Regras de segurança que este helper garante (não duplique esta lógica
 * fora daqui):
 * - O papel "Administrador" do tenant recebe **todas as permissões, exceto
 *   as de módulos de plataforma** (`MODULOS_PLATAFORMA`) — ele administra a
 *   própria empresa (usuários, papéis, lojas, cadastros), nunca a
 *   plataforma (listar todas as empresas, gerenciar planos globais).
 * - O usuário administrador criado aqui **nunca** recebe `superAdmin: true`.
 *   `Usuario.superAdmin` é reservado para a equipe interna da plataforma
 *   (ver seed) e não deve ser concedido a ninguém através do onboarding
 *   público de uma empresa.
 */
export async function onboardTenant(
  tx: Prisma.TransactionClient,
  dados: DadosOnboardingTenant,
): Promise<ResultadoOnboardingTenant> {
  const empresa = await tx.empresa.create({
    data: {
      cnpj: dados.cnpj,
      razaoSocial: dados.razaoSocial,
      nomeFantasia: dados.nomeFantasia,
      inscricaoEstadual: dados.inscricaoEstadual,
      email: dados.email,
      telefone: dados.telefone,
      endereco: toJsonInput(dados.endereco),
      planoId: dados.planoId,
    },
  });

  const lojaMatriz = await tx.loja.create({
    data: {
      empresaId: empresa.id,
      codigo: 'MATRIZ',
      nome: dados.nomeFantasia ?? dados.razaoSocial,
      tipo: 'MATRIZ',
      cnpj: dados.cnpj,
      email: dados.email,
      telefone: dados.telefone,
      endereco: toJsonInput(dados.endereco),
    },
  });

  // Nunca incluir permissões de módulos de plataforma (ex.: ADMIN) no papel
  // Administrador de um tenant — ver docs no topo do arquivo.
  const permissoesDeTenant = await tx.permissao.findMany({
    where: { modulo: { notIn: [...MODULOS_PLATAFORMA] } },
    select: { id: true },
  });

  const papelAdmin = await tx.papel.create({
    data: {
      empresaId: empresa.id,
      nome: 'Administrador',
      descricao:
        'Acesso completo aos módulos e lojas da própria empresa (não inclui administração da plataforma)',
      sistema: true,
      permissoes: {
        create: permissoesDeTenant.map((permissao) => ({
          permissaoId: permissao.id,
        })),
      },
    },
  });

  const usuarioAdmin = await tx.usuario.create({
    data: {
      empresaId: empresa.id,
      nome: dados.admin.nome,
      email: dados.admin.email,
      senha: dados.admin.senhaHash,
      // Admin DA EMPRESA, não da plataforma — ver docs no topo do arquivo.
      superAdmin: false,
    },
  });

  await tx.usuarioLoja.create({
    data: {
      usuarioId: usuarioAdmin.id,
      lojaId: lojaMatriz.id,
      papelId: papelAdmin.id,
    },
  });

  return {
    empresaId: empresa.id,
    lojaMatrizId: lojaMatriz.id,
    papelAdminId: papelAdmin.id,
    usuarioAdminId: usuarioAdmin.id,
  };
}
