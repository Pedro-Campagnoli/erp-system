import { ForbiddenException } from '@nestjs/common';
import { ModuloSistema } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { PapeisService } from './papeis.service';

/**
 * Regressão: papéis de uma empresa (tenant) nunca podem receber permissões
 * de módulos de plataforma (ex.: `ADMIN`) — nem na criação, nem ao
 * atualizar a lista de permissões de um papel já existente.
 */
describe('PapeisService — bloqueio de permissões de plataforma em papéis de empresa', () => {
  function buildPrismaMock() {
    return {
      papel: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      permissao: { count: jest.fn() },
      papelPermissao: { deleteMany: jest.fn(), createMany: jest.fn() },
      $transaction: jest.fn(),
    };
  }

  it('rejeita criar um papel de empresa com uma permissão de plataforma', async () => {
    const prisma = buildPrismaMock();
    prisma.permissao.count.mockResolvedValue(1);
    const service = new PapeisService(prisma as unknown as PrismaService);

    await expect(
      service.create('empresa-1', {
        nome: 'Papel Custom',
        permissoesIds: ['perm-admin-1'],
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(prisma.permissao.count).toHaveBeenCalledWith({
      where: {
        id: { in: ['perm-admin-1'] },
        modulo: { in: [ModuloSistema.ADMIN] },
      },
    });
    expect(prisma.papel.create).not.toHaveBeenCalled();
  });

  it('permite criar um papel de empresa só com permissões de escopo de tenant', async () => {
    const prisma = buildPrismaMock();
    prisma.permissao.count.mockResolvedValue(0);
    prisma.papel.create.mockResolvedValue({
      id: 'papel-1',
      nome: 'Papel Custom',
      descricao: null,
      sistema: false,
      empresaId: 'empresa-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      permissoes: [],
    });
    const service = new PapeisService(prisma as unknown as PrismaService);

    await expect(
      service.create('empresa-1', {
        nome: 'Papel Custom',
        permissoesIds: ['perm-cadastros-1'],
      }),
    ).resolves.toMatchObject({ id: 'papel-1' });
    expect(prisma.papel.create).toHaveBeenCalled();
  });

  it('rejeita atribuir uma permissão de plataforma a um papel já existente da empresa', async () => {
    const prisma = buildPrismaMock();
    prisma.papel.findUnique.mockResolvedValue({
      id: 'papel-1',
      empresaId: 'empresa-1',
      permissoes: [],
    });
    prisma.permissao.count.mockResolvedValue(1);
    const service = new PapeisService(prisma as unknown as PrismaService);

    await expect(
      service.atribuirPermissoes('empresa-1', 'papel-1', {
        permissoesIds: ['perm-admin-1'],
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
