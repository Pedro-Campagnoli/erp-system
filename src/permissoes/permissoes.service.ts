import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissoesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.permissao.findMany({
      orderBy: [{ modulo: 'asc' }, { codigo: 'asc' }],
    });
  }
}
