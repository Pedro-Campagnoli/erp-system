export class PapelResponseDto {
  id!: string;
  nome!: string;
  descricao!: string | null;
  sistema!: boolean;
  empresaId!: string | null;
  permissoes!: string[];
  createdAt!: Date;
  updatedAt!: Date;
}
