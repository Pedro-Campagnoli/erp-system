import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { ModuloSistema, PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const PERMISSOES = [
  { codigo: 'admin.planos.gerenciar', modulo: ModuloSistema.ADMIN, descricao: 'Gerenciar planos de assinatura' },
  { codigo: 'admin.empresas.listar', modulo: ModuloSistema.ADMIN, descricao: 'Listar todas as empresas da plataforma' },

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

  console.log('Seed concluído com sucesso.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
