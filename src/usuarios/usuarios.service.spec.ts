import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UsuariosService } from './usuarios.service';

/**
 * Regressão: `CreateUsuarioDto.superAdmin` só pode ser concedido por um
 * ator que já é `superAdmin` (administrador da plataforma). Um usuário com
 * papel intermediário (ex.: "Gerente", que também tem a permissão
 * `cadastros.usuarios.criar`) não pode se autopromover nem promover
 * terceiros a admin de plataforma criando um usuário com `superAdmin: true`.
 */
describe('UsuariosService#create — escalação de privilégio via superAdmin', () => {
  function buildDeps() {
    const prisma = {
      empresa: { findUniqueOrThrow: jest.fn() },
      usuario: { create: jest.fn() },
    };
    const configService = { get: jest.fn().mockReturnValue(4) };
    return { prisma, configService };
  }

  const dtoBase: CreateUsuarioDto = {
    nome: 'Novo Usuário',
    email: 'novo@empresa.com',
    senha: 'Senha123',
    superAdmin: true,
  };

  it('rejeita dto.superAdmin=true quando o ator não é superAdmin', async () => {
    const { prisma, configService } = buildDeps();
    const service = new UsuariosService(
      prisma as unknown as PrismaService,
      configService as unknown as ConfigService,
    );

    await expect(service.create('empresa-1', dtoBase, false)).rejects.toThrow(
      ForbiddenException,
    );

    // Nem chegou a consultar a empresa/gravar nada — falha antes de tocar o banco.
    expect(prisma.empresa.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(prisma.usuario.create).not.toHaveBeenCalled();
  });

  it('permite dto.superAdmin=true quando o ator já é superAdmin', async () => {
    const { prisma, configService } = buildDeps();
    prisma.empresa.findUniqueOrThrow.mockResolvedValue({
      plano: { limiteUsuarios: null },
      _count: { usuarios: 0 },
    });
    prisma.usuario.create.mockResolvedValue({ id: 'usuario-2' });
    const service = new UsuariosService(
      prisma as unknown as PrismaService,
      configService as unknown as ConfigService,
    );

    await expect(
      service.create('empresa-1', dtoBase, true),
    ).resolves.toMatchObject({ id: 'usuario-2' });
    expect(prisma.usuario.create).toHaveBeenCalled();
  });

  it('permite dto.superAdmin ausente/false independente do ator', async () => {
    const { prisma, configService } = buildDeps();
    prisma.empresa.findUniqueOrThrow.mockResolvedValue({
      plano: { limiteUsuarios: null },
      _count: { usuarios: 0 },
    });
    prisma.usuario.create.mockResolvedValue({ id: 'usuario-3' });
    const service = new UsuariosService(
      prisma as unknown as PrismaService,
      configService as unknown as ConfigService,
    );

    await expect(
      service.create('empresa-1', { ...dtoBase, superAdmin: false }, false),
    ).resolves.toMatchObject({ id: 'usuario-3' });
  });
});
