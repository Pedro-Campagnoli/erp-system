import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { ModuloSistema, PrismaClient } from '../generated/prisma/client';
import { onboardTenant } from '../src/empresas/tenant-onboarding';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '10', 10);

// CNPJ de teste conhecido (dígitos verificadores válidos) — só para dev local.
const EMPRESA_DEMO_CNPJ = '11222333000181';
const EMPRESA_DEMO_ADMIN_EMAIL = 'admin@demo.com';
const EMPRESA_DEMO_ADMIN_SENHA = 'Demo@123';

// Empresa interna (não é um tenant cliente) só para satisfazer a FK
// obrigatória `Usuario.empresaId` do admin de plataforma — ver
// `criarAdminPlataformaSeNaoExistir`.
const EMPRESA_PLATAFORMA_CNPJ = '11444777000080';
const PLATAFORMA_ADMIN_EMAIL = 'plataforma@erp.internal';
const PLATAFORMA_ADMIN_SENHA = 'Plataforma@123';

const PERMISSOES = [
  { codigo: 'admin.planos.gerenciar', modulo: ModuloSistema.ADMIN, descricao: 'Gerenciar planos de assinatura' },
  { codigo: 'admin.empresas.listar', modulo: ModuloSistema.ADMIN, descricao: 'Listar todas as empresas da plataforma' },

  { codigo: 'cadastros.empresa.editar', modulo: ModuloSistema.CADASTROS, descricao: 'Editar os dados cadastrais da própria empresa' },
  { codigo: 'cadastros.lojas.criar', modulo: ModuloSistema.CADASTROS, descricao: 'Criar lojas' },
  { codigo: 'cadastros.lojas.editar', modulo: ModuloSistema.CADASTROS, descricao: 'Editar lojas' },
  { codigo: 'cadastros.lojas.excluir', modulo: ModuloSistema.CADASTROS, descricao: 'Excluir lojas' },
  { codigo: 'cadastros.usuarios.criar', modulo: ModuloSistema.CADASTROS, descricao: 'Criar usuários' },
  { codigo: 'cadastros.usuarios.editar', modulo: ModuloSistema.CADASTROS, descricao: 'Editar usuários' },
  { codigo: 'cadastros.usuarios.excluir', modulo: ModuloSistema.CADASTROS, descricao: 'Excluir usuários' },
  { codigo: 'cadastros.papeis.gerenciar', modulo: ModuloSistema.CADASTROS, descricao: 'Gerenciar papéis e permissões' },
  { codigo: 'cadastros.acessos.gerenciar', modulo: ModuloSistema.CADASTROS, descricao: 'Conceder/revogar acesso de usuários a lojas' },

  // Catálogo inicial para os módulos que serão implementados a seguir.
  { codigo: 'fiscal.nfe.emitir', modulo: ModuloSistema.FISCAL, descricao: 'Emitir notas fiscais eletrônicas' },
  { codigo: 'fiscal.nfe.cancelar', modulo: ModuloSistema.FISCAL, descricao: 'Cancelar notas fiscais eletrônicas' },
  { codigo: 'financeiro.contas.criar', modulo: ModuloSistema.FINANCEIRO, descricao: 'Lançar contas a pagar/receber' },
  { codigo: 'financeiro.contas.aprovar', modulo: ModuloSistema.FINANCEIRO, descricao: 'Aprovar pagamentos' },
  { codigo: 'estoque.produtos.editar', modulo: ModuloSistema.ESTOQUE, descricao: 'Editar cadastro de produtos' },
  { codigo: 'estoque.movimentacoes.criar', modulo: ModuloSistema.ESTOQUE, descricao: 'Registrar movimentações de estoque' },
  { codigo: 'vendas.pedidos.criar', modulo: ModuloSistema.VENDAS, descricao: 'Criar pedidos de venda' },
] as const;

const PLANOS = [
  {
    nome: 'Básico',
    slug: 'basico',
    descricao: 'Para empresas com uma única loja',
    precoMensal: 99.9,
    limiteLojas: 1,
    limiteUsuarios: 5,
    recursos: { fiscal: true, financeiro: true, estoque: false },
  },
  {
    nome: 'Profissional',
    slug: 'profissional',
    descricao: 'Para redes em expansão',
    precoMensal: 249.9,
    limiteLojas: 5,
    limiteUsuarios: 25,
    recursos: { fiscal: true, financeiro: true, estoque: true },
  },
  {
    nome: 'Enterprise',
    slug: 'enterprise',
    descricao: 'Lojas e usuários ilimitados',
    precoMensal: 799.9,
    limiteLojas: null,
    limiteUsuarios: null,
    recursos: { fiscal: true, financeiro: true, estoque: true },
  },
];

async function criarPapelSistemaSeNaoExistir(
  nome: string,
  descricao: string,
  permissaoIds: string[],
) {
  const existente = await prisma.papel.findFirst({ where: { empresaId: null, nome } });
  if (existente) {
    return existente;
  }
  return prisma.papel.create({
    data: {
      nome,
      descricao,
      sistema: true,
      permissoes: { create: permissaoIds.map((permissaoId) => ({ permissaoId })) },
    },
  });
}

/**
 * Empresa + loja matriz + usuário admin para testar a API localmente sem
 * precisar rodar o onboarding (`POST /empresas`) manualmente toda vez.
 * Usa o mesmo `onboardTenant` de `EmpresasService.create` — este admin é um
 * admin DA EMPRESA (não da plataforma): recebe todas as permissões de
 * escopo de tenant, mas nunca `superAdmin` nem permissões de módulo `ADMIN`.
 */
async function criarEmpresaDemoSeNaoExistir() {
  const existente = await prisma.empresa.findUnique({
    where: { cnpj: EMPRESA_DEMO_CNPJ },
  });
  if (existente) {
    return;
  }

  const plano = await prisma.plano.findUniqueOrThrow({
    where: { slug: 'profissional' },
  });
  const senhaHash = await bcrypt.hash(EMPRESA_DEMO_ADMIN_SENHA, BCRYPT_SALT_ROUNDS);

  await prisma.$transaction((tx) =>
    onboardTenant(tx, {
      cnpj: EMPRESA_DEMO_CNPJ,
      razaoSocial: 'Empresa Demonstração LTDA',
      nomeFantasia: 'Empresa Demo',
      email: 'contato@demo.com',
      planoId: plano.id,
      admin: {
        nome: 'Admin Demo',
        email: EMPRESA_DEMO_ADMIN_EMAIL,
        senhaHash,
      },
    }),
  );

  console.log(
    `Empresa de demonstração criada (login: ${EMPRESA_DEMO_ADMIN_EMAIL} / ${EMPRESA_DEMO_ADMIN_SENHA}).`,
  );
}

/**
 * Usuário admin da PLATAFORMA (`superAdmin: true`) — equipe interna, não um
 * cliente. Alimenta o futuro painel de administração da plataforma (listar
 * todas as empresas clientes, gerenciar planos globais — rotas protegidas
 * por `SuperAdminGuard`). Só existe este caminho de bootstrap: a API nunca
 * concede `superAdmin` a ninguém que já não seja `superAdmin`
 * (`UsuariosService.create`) e o onboarding público (`POST /empresas`)
 * nunca concede o flag (`onboardTenant`) — de propósito, para não repetir o
 * vazamento de permissões de plataforma que este seed corrigiu.
 *
 * `Usuario.empresaId` é obrigatório no schema atual, então mesmo um admin
 * de plataforma precisa "pertencer" a uma empresa — usamos uma empresa
 * interna dedicada (`EMPRESA_PLATAFORMA_CNPJ`), que não é um tenant cliente.
 * Se isso for indesejável a longo prazo, o próximo passo é avaliar tornar
 * `Usuario.empresaId` opcional para usuários de plataforma (mudança de
 * schema deliberadamente fora desta correção).
 */
async function criarAdminPlataformaSeNaoExistir() {
  const existente = await prisma.usuario.findUnique({
    where: { email: PLATAFORMA_ADMIN_EMAIL },
  });
  if (existente) {
    return;
  }

  const plano = await prisma.plano.findUniqueOrThrow({
    where: { slug: 'enterprise' },
  });

  const empresaPlataforma = await prisma.empresa.upsert({
    where: { cnpj: EMPRESA_PLATAFORMA_CNPJ },
    create: {
      cnpj: EMPRESA_PLATAFORMA_CNPJ,
      razaoSocial: 'Operação da Plataforma (interno)',
      nomeFantasia: 'Plataforma',
      email: 'plataforma@erp.internal',
      planoId: plano.id,
    },
    update: {},
  });

  const senhaHash = await bcrypt.hash(PLATAFORMA_ADMIN_SENHA, BCRYPT_SALT_ROUNDS);

  await prisma.usuario.create({
    data: {
      empresaId: empresaPlataforma.id,
      nome: 'Admin Plataforma',
      email: PLATAFORMA_ADMIN_EMAIL,
      senha: senhaHash,
      superAdmin: true,
    },
  });

  console.log(
    `Admin de plataforma criado (login: ${PLATAFORMA_ADMIN_EMAIL} / ${PLATAFORMA_ADMIN_SENHA}).`,
  );
}

async function main() {
  for (const permissao of PERMISSOES) {
    await prisma.permissao.upsert({
      where: { codigo: permissao.codigo },
      create: permissao,
      update: { modulo: permissao.modulo, descricao: permissao.descricao },
    });
  }

  for (const plano of PLANOS) {
    await prisma.plano.upsert({
      where: { slug: plano.slug },
      create: plano,
      update: plano,
    });
  }

  const permissoesCadastrosLeitura = await prisma.permissao.findMany({
    where: {
      codigo: {
        in: ['cadastros.lojas.criar', 'cadastros.lojas.editar', 'cadastros.usuarios.criar', 'cadastros.usuarios.editar'],
      },
    },
    select: { id: true },
  });

  // `empresaId` é nulo para papéis globais do sistema — como esse campo é
  // nullable, o índice único (empresaId, nome) não cobre esse caso (NULL é
  // sempre distinto em uma UNIQUE constraint), então checamos manualmente.
  await criarPapelSistemaSeNaoExistir('Gerente', 'Gerencia lojas, usuários e operações do dia a dia', permissoesCadastrosLeitura.map((p) => p.id));
  await criarPapelSistemaSeNaoExistir('Operador', 'Acesso operacional básico, sem permissões administrativas', []);

  await criarEmpresaDemoSeNaoExistir();
  await criarAdminPlataformaSeNaoExistir();

  console.log('Seed concluído com sucesso.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
