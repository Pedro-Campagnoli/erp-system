import { Prisma, TipoLoja } from '../../../generated/prisma/client';

export class LojaResponseDto {
  id!: string;
  empresaId!: string;
  codigo!: string;
  nome!: string;
  tipo!: TipoLoja;
  cnpj!: string | null;
  inscricaoEstadual!: string | null;
  email!: string | null;
  telefone!: string | null;
  endereco!: Prisma.JsonValue;
  ativo!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}
