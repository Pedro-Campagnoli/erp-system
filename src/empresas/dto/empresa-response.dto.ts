import { Prisma, StatusAssinatura } from '../../../generated/prisma/client';

export class EmpresaResponseDto {
  id!: string;
  cnpj!: string;
  razaoSocial!: string;
  nomeFantasia!: string | null;
  inscricaoEstadual!: string | null;
  email!: string;
  telefone!: string | null;
  endereco!: Prisma.JsonValue;
  ativo!: boolean;
  statusAssinatura!: StatusAssinatura;
  planoId!: string;
  createdAt!: Date;
  updatedAt!: Date;
}
