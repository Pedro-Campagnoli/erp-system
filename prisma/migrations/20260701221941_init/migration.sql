-- CreateEnum
CREATE TYPE "StatusAssinatura" AS ENUM ('TRIAL', 'ATIVA', 'INADIMPLENTE', 'CANCELADA', 'SUSPENSA');

-- CreateEnum
CREATE TYPE "TipoLoja" AS ENUM ('MATRIZ', 'FILIAL');

-- CreateEnum
CREATE TYPE "ModuloSistema" AS ENUM ('ADMIN', 'CADASTROS', 'FISCAL', 'FINANCEIRO', 'ESTOQUE', 'VENDAS');

-- CreateTable
CREATE TABLE "planos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descricao" TEXT,
    "precoMensal" DECIMAL(10,2) NOT NULL,
    "limiteLojas" INTEGER,
    "limiteUsuarios" INTEGER,
    "recursos" JSONB,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "inscricaoEstadual" TEXT,
    "email" TEXT NOT NULL,
    "telefone" TEXT,
    "endereco" JSONB,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "statusAssinatura" "StatusAssinatura" NOT NULL DEFAULT 'TRIAL',
    "dataInicioAssinatura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataFimTrial" TIMESTAMP(3),
    "dataProximaCobranca" TIMESTAMP(3),
    "planoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lojas" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoLoja" NOT NULL DEFAULT 'FILIAL',
    "cnpj" TEXT,
    "inscricaoEstadual" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "endereco" JSONB,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "empresaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "lojas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "telefone" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "superAdmin" BOOLEAN NOT NULL DEFAULT false,
    "ultimoLoginEm" TIMESTAMP(3),
    "empresaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissoes" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "modulo" "ModuloSistema" NOT NULL,
    "descricao" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "papeis" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "sistema" BOOLEAN NOT NULL DEFAULT false,
    "empresaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "papeis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "papel_permissoes" (
    "papelId" TEXT NOT NULL,
    "permissaoId" TEXT NOT NULL,

    CONSTRAINT "papel_permissoes_pkey" PRIMARY KEY ("papelId","permissaoId")
);

-- CreateTable
CREATE TABLE "usuario_lojas" (
    "id" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "usuarioId" TEXT NOT NULL,
    "lojaId" TEXT NOT NULL,
    "papelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_lojas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "planos_nome_key" ON "planos"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "planos_slug_key" ON "planos"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_cnpj_key" ON "empresas"("cnpj");

-- CreateIndex
CREATE INDEX "lojas_empresaId_idx" ON "lojas"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "lojas_empresaId_codigo_key" ON "lojas"("empresaId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_empresaId_idx" ON "usuarios"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_usuarioId_idx" ON "refresh_tokens"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "permissoes_codigo_key" ON "permissoes"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "papeis_empresaId_nome_key" ON "papeis"("empresaId", "nome");

-- CreateIndex
CREATE INDEX "usuario_lojas_lojaId_idx" ON "usuario_lojas"("lojaId");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_lojas_usuarioId_lojaId_key" ON "usuario_lojas"("usuarioId", "lojaId");

-- AddForeignKey
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "planos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lojas" ADD CONSTRAINT "lojas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "papeis" ADD CONSTRAINT "papeis_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "papel_permissoes" ADD CONSTRAINT "papel_permissoes_papelId_fkey" FOREIGN KEY ("papelId") REFERENCES "papeis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "papel_permissoes" ADD CONSTRAINT "papel_permissoes_permissaoId_fkey" FOREIGN KEY ("permissaoId") REFERENCES "permissoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_lojas" ADD CONSTRAINT "usuario_lojas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_lojas" ADD CONSTRAINT "usuario_lojas_lojaId_fkey" FOREIGN KEY ("lojaId") REFERENCES "lojas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_lojas" ADD CONSTRAINT "usuario_lojas_papelId_fkey" FOREIGN KEY ("papelId") REFERENCES "papeis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
