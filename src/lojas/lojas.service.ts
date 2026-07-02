import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { toJsonInput } from '../common/utils/json.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLojaDto } from './dto/create-loja.dto';
import { UpdateLojaDto } from './dto/update-loja.dto';

@Injectable()
export class LojasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(empresaId: string, dto: CreateLojaDto) {
    const empresa = await this.prisma.empresa.findUniqueOrThrow({
      where: { id: empresaId },
      include: { plano: true, _count: { select: { lojas: true } } },
    });

    if (
      empresa.plano.limiteLojas !== null &&
      empresa._count.lojas >= empresa.plano.limiteLojas
    ) {
      throw new BadRequestException(
        `O plano atual permite no máximo ${empresa.plano.limiteLojas} loja(s)`,
      );
    }

    return this.prisma.loja.create({
      data: { ...dto, empresaId, endereco: toJsonInput(dto.endereco) },
    });
  }

  findAll(empresaId: string, allowedLojaIds?: string[]) {
    return this.prisma.loja.findMany({
      where: {
        empresaId,
        deletedAt: null,
        ...(allowedLojaIds ? { id: { in: allowedLojaIds } } : {}),
      },
      orderBy: { nome: 'asc' },
    });
  }

  async findOne(empresaId: string, id: string, allowedLojaIds?: string[]) {
    if (allowedLojaIds && !allowedLojaIds.includes(id)) {
      throw new NotFoundException('Loja não encontrada');
    }

    const loja = await this.prisma.loja.findFirst({
      where: { id, empresaId, deletedAt: null },
    });

    if (!loja) {
      throw new NotFoundException('Loja não encontrada');
    }

    return loja;
  }

  async update(empresaId: string, id: string, dto: UpdateLojaDto) {
    await this.findOne(empresaId, id);
    return this.prisma.loja.update({
      where: { id },
      data: { ...dto, endereco: toJsonInput(dto.endereco) },
    });
  }

  async remove(empresaId: string, id: string): Promise<void> {
    await this.findOne(empresaId, id);
    await this.prisma.loja.update({
      where: { id },
      data: { ativo: false, deletedAt: new Date() },
    });
  }
}
