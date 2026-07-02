import { ModuloSistema } from '../../../generated/prisma/enums';

export class PermissaoResponseDto {
  id!: string;
  codigo!: string;
  modulo!: ModuloSistema;
  descricao!: string;
}
