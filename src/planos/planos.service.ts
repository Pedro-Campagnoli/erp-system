import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanoDto } from './dto/create-plano.dto';
import { UpdatePlanoDto } from './dto/update-plano.dto';

@Injectable()
export class PlanosService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreatePlanoDto) {
    return this.prisma.plano.create({ data: dto });
  }

  findAll(somenteAtivos = false) {
    return this.prisma.plano.findMany({
      where: somenteAtivos ? { ativo: true } : undefined,
      orderBy: { precoMensal: 'asc' },
    });
  }

  async findOne(id: string) {
    const plano = await this.prisma.plano.findUnique({ where: { id } });
    if (!plano) {
      throw new NotFoundException('Plano não encontrado');
    }
    return plano;
  }

  async update(id: string, dto: UpdatePlanoDto) {
    await this.findOne(id);
    return this.prisma.plano.update({ where: { id }, data: dto });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    const empresasVinculadas = await this.prisma.empresa.count({
      where: { planoId: id },
    });
    if (empresasVinculadas > 0) {
      throw new ConflictException(
        'Não é possível excluir um plano com empresas vinculadas. Desative-o em vez disso.',
      );
    }
    await this.prisma.plano.delete({ where: { id } });
  }
}
