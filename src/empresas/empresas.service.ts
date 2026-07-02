import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { toJsonInput } from '../common/utils/json.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';

@Injectable()
export class EmpresasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Onboarding de um novo tenant: cria a Empresa, a loja matriz, o papel de
   * Administrador (com todas as permissões do catálogo) e o usuário admin,
   * já vinculado à loja matriz — tudo em uma única transação.
   */
  async create(dto: CreateEmpresaDto) {
    const plano = await this.prisma.plano.findUnique({
      where: { id: dto.planoId },
    });
    if (!plano || !plano.ativo) {
      throw new BadRequestException('Plano inválido ou indisponível');
    }

    const saltRounds = this.configService.get<number>('bcryptSaltRounds')!;
    const senhaHash = await bcrypt.hash(dto.usuarioAdmin.senha, saltRounds);
    const todasPermissoes = await this.prisma.permissao.findMany({
      select: { id: true },
    });

    const empresa = await this.prisma.$transaction(async (tx) => {
      const novaEmpresa = await tx.empresa.create({
        data: {
          cnpj: dto.cnpj,
          razaoSocial: dto.razaoSocial,
          nomeFantasia: dto.nomeFantasia,
          inscricaoEstadual: dto.inscricaoEstadual,
          email: dto.email,
          telefone: dto.telefone,
          endereco: toJsonInput(dto.endereco),
          planoId: plano.id,
        },
      });

      const lojaMatriz = await tx.loja.create({
        data: {
          empresaId: novaEmpresa.id,
          codigo: 'MATRIZ',
          nome: dto.nomeFantasia ?? dto.razaoSocial,
          tipo: 'MATRIZ',
          cnpj: dto.cnpj,
          email: dto.email,
          telefone: dto.telefone,
          endereco: toJsonInput(dto.endereco),
        },
      });

      const papelAdmin = await tx.papel.create({
        data: {
          empresaId: novaEmpresa.id,
          nome: 'Administrador',
          descricao: 'Acesso completo a todos os módulos e lojas da empresa',
          sistema: true,
          permissoes: {
            create: todasPermissoes.map((permissao) => ({
              permissaoId: permissao.id,
            })),
          },
        },
      });

      const usuarioAdmin = await tx.usuario.create({
        data: {
          empresaId: novaEmpresa.id,
          nome: dto.usuarioAdmin.nome,
          email: dto.usuarioAdmin.email,
          senha: senhaHash,
          superAdmin: true,
        },
      });

      await tx.usuarioLoja.create({
        data: {
          usuarioId: usuarioAdmin.id,
          lojaId: lojaMatriz.id,
          papelId: papelAdmin.id,
        },
      });

      return novaEmpresa;
    });

    return empresa;
  }

  findAll() {
    return this.prisma.empresa.findMany({
      where: { deletedAt: null },
      include: { plano: true },
      orderBy: { razaoSocial: 'asc' },
    });
  }

  async findOne(id: string) {
    const empresa = await this.prisma.empresa.findFirst({
      where: { id, deletedAt: null },
      include: { plano: true },
    });
    if (!empresa) {
      throw new NotFoundException('Empresa não encontrada');
    }
    return empresa;
  }

  update(id: string, dto: UpdateEmpresaDto) {
    return this.prisma.empresa.update({
      where: { id },
      data: { ...dto, endereco: toJsonInput(dto.endereco) },
    });
  }
}
