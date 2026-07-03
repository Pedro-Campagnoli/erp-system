import { Controller, Delete, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Rotas de apoio para a suíte de testes E2E (repo `erp-tests`) limpar estado
 * entre execuções sem precisar de acesso direto ao banco. Nunca registrado em
 * produção — ver o import condicional em `app.module.ts`.
 */
@Controller('testing')
export class TestingController {
  constructor(private readonly prisma: PrismaService) {}

  // Apaga a empresa (e, em cascata, lojas/usuários/papéis/tokens vinculados)
  // pelo CNPJ usado no fixture de teste. Idempotente: não falha se não existir.
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('empresas/:cnpj')
  async deleteEmpresaByCnpj(@Param('cnpj') cnpj: string): Promise<void> {
    await this.prisma.empresa.deleteMany({ where: { cnpj } });
  }
}
