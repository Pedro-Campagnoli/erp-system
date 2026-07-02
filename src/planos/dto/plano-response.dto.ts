import { Prisma } from '../../../generated/prisma/client';

export class PlanoResponseDto {
  id!: string;
  nome!: string;
  slug!: string;
  descricao!: string | null;
  precoMensal!: Prisma.Decimal;
  limiteLojas!: number | null;
  limiteUsuarios!: number | null;
  recursos!: Prisma.JsonValue;
  ativo!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}
