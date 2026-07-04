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
import { onboardTenant } from './tenant-onboarding';

@Injectable()
export class EmpresasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Onboarding de um novo tenant: cria a Empresa, a loja matriz, o papel de
   * Administrador (com todas as permissões de escopo de tenant — nunca as de
   * plataforma) e o usuário admin da empresa, já vinculado à loja matriz —
   * tudo em uma única transação. Lógica compartilhada com a empresa de
   * demonstração do seed via `onboardTenant` (ver `tenant-onboarding.ts`).
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

    const resultado = await this.prisma.$transaction((tx) =>
      onboardTenant(tx, {
        cnpj: dto.cnpj,
        razaoSocial: dto.razaoSocial,
        nomeFantasia: dto.nomeFantasia,
        inscricaoEstadual: dto.inscricaoEstadual,
        email: dto.email,
        telefone: dto.telefone,
        endereco: dto.endereco,
        planoId: plano.id,
        admin: {
          nome: dto.usuarioAdmin.nome,
          email: dto.usuarioAdmin.email,
          senhaHash,
        },
      }),
    );

    return this.prisma.empresa.findUniqueOrThrow({
      where: { id: resultado.empresaId },
    });
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
