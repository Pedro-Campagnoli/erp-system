import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AlterarSenhaDto } from './dto/alterar-senha.dto';
import { AtualizarAcessoDto } from './dto/atualizar-acesso.dto';
import { ConcederAcessoDto } from './dto/conceder-acesso.dto';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

const SEM_SENHA = {
  id: true,
  empresaId: true,
  nome: true,
  email: true,
  telefone: true,
  ativo: true,
  superAdmin: true,
  ultimoLoginEm: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async create(
    empresaId: string,
    dto: CreateUsuarioDto,
    atorSuperAdmin: boolean,
  ) {
    // Escalação de privilégio: `superAdmin` é o flag de administração da
    // PLATAFORMA (ver `src/common/guards/super-admin.guard.ts`), não algo
    // que um admin de empresa comum (papel "Administrador", permissão
    // `cadastros.usuarios.criar`) possa conceder a si mesmo ou a terceiros.
    if (dto.superAdmin && !atorSuperAdmin) {
      throw new ForbiddenException(
        'Apenas um administrador da plataforma pode conceder superAdmin a um usuário',
      );
    }

    const empresa = await this.prisma.empresa.findUniqueOrThrow({
      where: { id: empresaId },
      include: { plano: true, _count: { select: { usuarios: true } } },
    });

    if (
      empresa.plano.limiteUsuarios !== null &&
      empresa._count.usuarios >= empresa.plano.limiteUsuarios
    ) {
      throw new BadRequestException(
        `O plano atual permite no máximo ${empresa.plano.limiteUsuarios} usuário(s)`,
      );
    }

    if (dto.lojas?.length) {
      await this.validarAcessos(empresaId, dto.lojas);
    }

    const saltRounds = this.configService.get<number>('bcryptSaltRounds')!;
    const senhaHash = await bcrypt.hash(dto.senha, saltRounds);

    return this.prisma.usuario.create({
      data: {
        empresaId,
        nome: dto.nome,
        email: dto.email,
        senha: senhaHash,
        telefone: dto.telefone,
        superAdmin: dto.superAdmin ?? false,
        usuarioLojas: dto.lojas?.length
          ? {
              create: dto.lojas.map((a) => ({
                lojaId: a.lojaId,
                papelId: a.papelId,
              })),
            }
          : undefined,
      },
      select: SEM_SENHA,
    });
  }

  findAll(empresaId: string) {
    return this.prisma.usuario.findMany({
      where: { empresaId, deletedAt: null },
      select: SEM_SENHA,
      orderBy: { nome: 'asc' },
    });
  }

  async findOne(empresaId: string, id: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id, empresaId, deletedAt: null },
      select: SEM_SENHA,
    });
    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return usuario;
  }

  async update(empresaId: string, id: string, dto: UpdateUsuarioDto) {
    await this.findOne(empresaId, id);
    return this.prisma.usuario.update({
      where: { id },
      data: dto,
      select: SEM_SENHA,
    });
  }

  async remove(empresaId: string, id: string): Promise<void> {
    await this.findOne(empresaId, id);
    await this.prisma.usuario.update({
      where: { id },
      data: { ativo: false, deletedAt: new Date() },
    });
  }

  async alterarSenha(usuarioId: string, dto: AlterarSenhaDto): Promise<void> {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({
      where: { id: usuarioId },
    });

    const senhaValida = await bcrypt.compare(dto.senhaAtual, usuario.senha);
    if (!senhaValida) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    const saltRounds = this.configService.get<number>('bcryptSaltRounds')!;
    const senhaHash = await bcrypt.hash(dto.novaSenha, saltRounds);

    await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { senha: senhaHash },
    });
    await this.prisma.refreshToken.updateMany({
      where: { usuarioId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async listarAcessos(empresaId: string, usuarioId: string) {
    await this.findOne(empresaId, usuarioId);
    const acessos = await this.prisma.usuarioLoja.findMany({
      where: { usuarioId },
      include: { loja: true, papel: true },
    });
    return acessos.map((a) => ({
      id: a.id,
      lojaId: a.lojaId,
      lojaNome: a.loja.nome,
      papelId: a.papelId,
      papelNome: a.papel.nome,
      ativo: a.ativo,
    }));
  }

  async concederAcesso(
    empresaId: string,
    usuarioId: string,
    dto: ConcederAcessoDto,
  ) {
    await this.findOne(empresaId, usuarioId);
    await this.validarAcessos(empresaId, [dto]);

    const acesso = await this.prisma.usuarioLoja.upsert({
      where: { usuarioId_lojaId: { usuarioId, lojaId: dto.lojaId } },
      create: { usuarioId, lojaId: dto.lojaId, papelId: dto.papelId },
      update: { papelId: dto.papelId, ativo: true },
      include: { loja: true, papel: true },
    });

    return {
      id: acesso.id,
      lojaId: acesso.lojaId,
      lojaNome: acesso.loja.nome,
      papelId: acesso.papelId,
      papelNome: acesso.papel.nome,
      ativo: acesso.ativo,
    };
  }

  async atualizarAcesso(
    empresaId: string,
    usuarioId: string,
    lojaId: string,
    dto: AtualizarAcessoDto,
  ) {
    await this.findOne(empresaId, usuarioId);
    if (dto.papelId) {
      await this.validarAcessos(empresaId, [{ lojaId, papelId: dto.papelId }]);
    }

    const acesso = await this.prisma.usuarioLoja.update({
      where: { usuarioId_lojaId: { usuarioId, lojaId } },
      data: dto,
      include: { loja: true, papel: true },
    });

    return {
      id: acesso.id,
      lojaId: acesso.lojaId,
      lojaNome: acesso.loja.nome,
      papelId: acesso.papelId,
      papelNome: acesso.papel.nome,
      ativo: acesso.ativo,
    };
  }

  async revogarAcesso(
    empresaId: string,
    usuarioId: string,
    lojaId: string,
  ): Promise<void> {
    await this.findOne(empresaId, usuarioId);
    await this.prisma.usuarioLoja.delete({
      where: { usuarioId_lojaId: { usuarioId, lojaId } },
    });
  }

  private async validarAcessos(
    empresaId: string,
    acessos: { lojaId: string; papelId: string }[],
  ): Promise<void> {
    const lojaIds = [...new Set(acessos.map((a) => a.lojaId))];
    const papelIds = [...new Set(acessos.map((a) => a.papelId))];

    const [lojasValidas, papeisValidos] = await Promise.all([
      this.prisma.loja.count({
        where: { id: { in: lojaIds }, empresaId, deletedAt: null },
      }),
      this.prisma.papel.count({
        where: {
          id: { in: papelIds },
          OR: [{ empresaId }, { empresaId: null }],
        },
      }),
    ]);

    if (lojasValidas !== lojaIds.length) {
      throw new BadRequestException(
        'Uma ou mais lojas informadas não pertencem à sua empresa',
      );
    }
    if (papeisValidos !== papelIds.length) {
      throw new BadRequestException(
        'Um ou mais papéis informados são inválidos',
      );
    }
  }
}
