import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MODULOS_PLATAFORMA } from '../common/constants/permissions.constant';
import { PrismaService } from '../prisma/prisma.service';
import { AtribuirPermissoesDto } from './dto/atribuir-permissoes.dto';
import { CreatePapelDto } from './dto/create-papel.dto';
import { UpdatePapelDto } from './dto/update-papel.dto';

const INCLUDE_PERMISSOES = {
  permissoes: { include: { permissao: true } },
} as const;

@Injectable()
export class PapeisService {
  constructor(private readonly prisma: PrismaService) {}

  async create(empresaId: string, dto: CreatePapelDto) {
    if (dto.permissoesIds?.length) {
      await this.garantirPermissoesDeTenant(dto.permissoesIds);
    }

    const papel = await this.prisma.papel.create({
      data: {
        nome: dto.nome,
        descricao: dto.descricao,
        empresaId,
        permissoes: dto.permissoesIds
          ? {
              create: dto.permissoesIds.map((permissaoId) => ({ permissaoId })),
            }
          : undefined,
      },
      include: INCLUDE_PERMISSOES,
    });
    return this.toResponse(papel);
  }

  async findAll(empresaId: string) {
    const papeis = await this.prisma.papel.findMany({
      where: { OR: [{ empresaId }, { empresaId: null }] },
      include: INCLUDE_PERMISSOES,
      orderBy: { nome: 'asc' },
    });
    return papeis.map((papel) => this.toResponse(papel));
  }

  async findOne(empresaId: string, id: string) {
    const papel = await this.buscarPapelAcessivel(empresaId, id);
    return this.toResponse(papel);
  }

  async update(empresaId: string, id: string, dto: UpdatePapelDto) {
    const papel = await this.buscarPapelDaEmpresa(empresaId, id);

    const atualizado = await this.prisma.papel.update({
      where: { id: papel.id },
      data: { nome: dto.nome, descricao: dto.descricao },
      include: INCLUDE_PERMISSOES,
    });
    return this.toResponse(atualizado);
  }

  async atribuirPermissoes(
    empresaId: string,
    id: string,
    dto: AtribuirPermissoesDto,
  ) {
    const papel = await this.buscarPapelDaEmpresa(empresaId, id);

    if (dto.permissoesIds.length) {
      await this.garantirPermissoesDeTenant(dto.permissoesIds);
    }

    await this.prisma.$transaction([
      this.prisma.papelPermissao.deleteMany({ where: { papelId: papel.id } }),
      this.prisma.papelPermissao.createMany({
        data: dto.permissoesIds.map((permissaoId) => ({
          papelId: papel.id,
          permissaoId,
        })),
      }),
    ]);

    const atualizado = await this.prisma.papel.findUniqueOrThrow({
      where: { id: papel.id },
      include: INCLUDE_PERMISSOES,
    });
    return this.toResponse(atualizado);
  }

  async remove(empresaId: string, id: string): Promise<void> {
    const papel = await this.buscarPapelDaEmpresa(empresaId, id);

    const vinculos = await this.prisma.usuarioLoja.count({
      where: { papelId: papel.id },
    });
    if (vinculos > 0) {
      throw new ConflictException(
        'Não é possível excluir um papel em uso por usuários',
      );
    }

    await this.prisma.papel.delete({ where: { id: papel.id } });
  }

  /**
   * Papéis de uma empresa (tenant) nunca podem receber permissões de módulos
   * de plataforma (ex.: `ADMIN` — listar todas as empresas, gerenciar
   * planos globais). Só papéis globais/de sistema (sem `empresaId`, criados
   * via seed) poderiam tê-las — e mesmo assim, hoje o seed não concede
   * nenhuma. `PapeisController` só expõe rotas escopadas a uma empresa, então
   * esta checagem cobre todo caminho de escrita deste service.
   */
  private async garantirPermissoesDeTenant(
    permissaoIds: string[],
  ): Promise<void> {
    const permissoesDePlataforma = await this.prisma.permissao.count({
      where: {
        id: { in: permissaoIds },
        modulo: { in: [...MODULOS_PLATAFORMA] },
      },
    });

    if (permissoesDePlataforma > 0) {
      throw new ForbiddenException(
        'Permissões de administração da plataforma não podem ser atribuídas a papéis de uma empresa',
      );
    }
  }

  /** Papel do próprio tenant ou papel padrão do sistema (somente leitura). */
  private async buscarPapelAcessivel(empresaId: string, id: string) {
    const papel = await this.prisma.papel.findUnique({
      where: { id },
      include: INCLUDE_PERMISSOES,
    });

    if (!papel || (papel.empresaId !== null && papel.empresaId !== empresaId)) {
      throw new NotFoundException('Papel não encontrado');
    }

    return papel;
  }

  /** Papel pertencente ao tenant, editável (papéis de sistema são somente leitura). */
  private async buscarPapelDaEmpresa(empresaId: string, id: string) {
    const papel = await this.buscarPapelAcessivel(empresaId, id);

    if (papel.empresaId === null) {
      throw new ForbiddenException(
        'Papéis padrão do sistema não podem ser alterados',
      );
    }

    return papel;
  }

  private toResponse(papel: {
    id: string;
    nome: string;
    descricao: string | null;
    sistema: boolean;
    empresaId: string | null;
    createdAt: Date;
    updatedAt: Date;
    permissoes: { permissao: { codigo: string } }[];
  }) {
    return {
      id: papel.id,
      nome: papel.nome,
      descricao: papel.descricao,
      sistema: papel.sistema,
      empresaId: papel.empresaId,
      permissoes: papel.permissoes.map((p) => p.permissao.codigo),
      createdAt: papel.createdAt,
      updatedAt: papel.updatedAt,
    };
  }
}
